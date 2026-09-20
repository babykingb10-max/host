import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../common/prisma.service';
import { ProviderRouterService } from '../providers/provider-router.service';
import { DeploymentEventsService } from '../deployments/deployment-events.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import type { DeploymentStatus } from '@prisma/client';

interface RunDeploymentJobData {
  deploymentId: string;
  environment: Record<string, string>;
}

/**
 * Non-retryable error codes — retrying these can't succeed (bad config,
 * bad input), so the worker marks FAILED and returns normally instead
 * of throwing, which would otherwise trigger BullMQ's retry/backoff
 * (spec §44: "Do not blindly retry permanent failures.").
 */
const PERMANENT_ERROR_CODES = new Set([ErrorCode.PROVIDER_CONFIGURATION_ERROR, ErrorCode.VALIDATION_FAILED]);

@Processor('deployment', { concurrency: 5 })
export class DeploymentProcessor extends WorkerHost {
  private readonly logger = new Logger(DeploymentProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRouter: ProviderRouterService,
    private readonly events: DeploymentEventsService,
    private readonly encryption: EncryptionService,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<RunDeploymentJobData>): Promise<void> {
    const { deploymentId, environment } = job.data;

    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { project: { include: { service: true, servicePlan: true } } },
    });
    if (!deployment) {
      this.logger.warn(`Deployment ${deploymentId} no longer exists — skipping.`);
      return;
    }
    const { project } = deployment;

    try {
      await this.advance(deploymentId, project.id, 'VALIDATING', 'Validating project configuration...');
      // Merge stored env vars (decrypted) with any provided for this run.
      const storedVars = await this.prisma.projectEnvironmentVariable.findMany({ where: { projectId: project.id } });
      const resolvedEnv: Record<string, string> = { ...environment };
      for (const v of storedVars) resolvedEnv[v.key] = this.encryption.decrypt(v.valueEncrypted);

      const { provider, adapter } = await this.providerRouter.resolve(project.serviceId, {
        runtime: project.runtime,
        plan: project.servicePlan.key,
        region: project.region,
      });

      await this.advance(deploymentId, project.id, 'PROVISIONING', `Provisioning resources via ${provider.key}...`);
      const resolvedSource = await this.resolveDeploySource(project.source as { type?: string; botId?: string; repoUrl?: string; branch?: string; imageRef?: string } | null);
      let providerResourceId = project.providerResourceId;
      if (!providerResourceId) {
        const created = await adapter.createResource({
          projectId: project.id,
          serviceSlug: project.service.slug,
          runtime: project.runtime,
          plan: { cpuMillicores: project.servicePlan.cpuMillicores, ramMb: project.servicePlan.ramMb, storageMb: project.servicePlan.storageMb },
          region: project.region,
          environment: resolvedEnv,
          startCommand: project.startCommand,
          port: project.port,
          source: resolvedSource,
        });
        providerResourceId = created.providerResourceId;
        await this.prisma.project.update({
          where: { id: project.id },
          data: { providerId: provider.key, providerResourceId },
        });
      }

      await this.advance(deploymentId, project.id, 'BUILDING', 'Building project...');
      await this.advance(deploymentId, project.id, 'DEPLOYING', 'Deploying...');
      await adapter.deploy({ providerResourceId, source: resolvedSource });

      await this.advance(deploymentId, project.id, 'STARTING', 'Starting application...');
      await adapter.start(providerResourceId);

      await this.advance(deploymentId, project.id, 'HEALTH_CHECK', 'Running health check...');
      const status = await adapter.getStatus(providerResourceId);
      if (status.state !== 'RUNNING' && status.state !== 'STARTING') {
        throw new AppError(ErrorCode.DEPLOYMENT_PROVIDER_UNAVAILABLE, 'The hosting provider did not report a healthy status after deployment.');
      }

      await this.prisma.project.update({
        where: { id: project.id },
        data: { status: 'RUNNING', capabilities: project.service.capabilities as never },
      });
      await this.prisma.deployment.update({ where: { id: deploymentId }, data: { status: 'RUNNING', completedAt: new Date() } });
      await this.events.emit(deploymentId, 'STEP', 'Deployment successful — your project is now running.', 'RUNNING');
      await this.notifications.notify(
        project.ownerId,
        'DEPLOYMENT_COMPLETED',
        'Deployment completed',
        `${project.name} is now running.`,
        { projectId: project.id, deploymentId },
      ).catch(() => undefined);
    } catch (err) {
      await this.handleFailure(job, deploymentId, project.id, project.ownerId, project.name, err);
    }
  }

  private async resolveDeploySource(
    source: { type?: string; botId?: string; repoUrl?: string; branch?: string; imageRef?: string } | null,
  ): Promise<{ type: string; repoUrl?: string; branch?: string; imageRef?: string } | null> {
    if (!source) return null;
    if (source.type === 'ADMIN_CATALOG' && source.botId) {
      const bot = await this.prisma.bot.findUnique({ where: { id: source.botId } });
      if (!bot) return null;
      return { type: 'ADMIN_CATALOG', repoUrl: bot.repository ?? undefined, branch: bot.branch ?? 'main', imageRef: bot.dockerImage ?? undefined };
    }
    return source as { type: string; repoUrl?: string; branch?: string; imageRef?: string };
  }

  private async advance(deploymentId: string, projectId: string, step: DeploymentStatus, message: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.deployment.update({ where: { id: deploymentId }, data: { status: step } }),
      this.prisma.project.update({ where: { id: projectId }, data: { status: step as never } }),
    ]);
    await this.events.emit(deploymentId, 'STEP', message, step);
  }

  private async handleFailure(job: Job<RunDeploymentJobData>, deploymentId: string, projectId: string, ownerId: string, projectName: string, err: unknown): Promise<void> {
    const isAppError = err instanceof AppError;
    const code = isAppError ? err.code : ErrorCode.INTERNAL_SERVER_ERROR;
    // Never leak internals into the user-facing deployment log — same
    // safe message the HTTP layer would have returned (spec §30, §47).
    const safeMessage = isAppError ? err.message : 'An unexpected error occurred during deployment.';

    this.logger.error(`Deployment ${deploymentId} failed [${code}]`, err instanceof Error ? err.stack : String(err));

    const isPermanent = isAppError && PERMANENT_ERROR_CODES.has(code as ErrorCode);
    const attemptsExhausted = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

    if (!isPermanent && !attemptsExhausted) {
      // Rethrow so BullMQ retries with backoff — record the attempt but
      // don't mark the deployment FAILED yet.
      await this.events.emit(deploymentId, 'LOG', `Attempt ${job.attemptsMade + 1} failed: ${safeMessage} Retrying...`);
      throw err;
    }

    await this.prisma.$transaction([
      this.prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: 'FAILED', errorCode: code, errorMessage: safeMessage, completedAt: new Date() },
      }),
      this.prisma.project.update({ where: { id: projectId }, data: { status: 'FAILED' } }),
    ]);
    await this.events.emit(deploymentId, 'ERROR', safeMessage, 'FAILED');
    await this.notifications.notify(
      ownerId,
      'DEPLOYMENT_FAILED',
      'Deployment failed',
      `${projectName}: ${safeMessage}`,
      { projectId, deploymentId },
    ).catch(() => undefined);
    // Intentionally does not rethrow — a terminal, non-retryable state
    // is a normal outcome, not a worker crash.
  }
}
