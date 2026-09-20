import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PrismaService } from '../common/prisma.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import { ACTIVE_PROJECT_STATUSES } from '../common/constants/project-status';
import { DeploymentEventsService } from './deployment-events.service';
import type { TriggerDeploymentDto } from './dto/deployments.dto';

@Injectable()
export class DeploymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: DeploymentEventsService,
    @InjectQueue('deployment') private readonly deploymentQueue: Queue,
  ) {}

  async trigger(ownerId: string, projectId: string, dto: TriggerDeploymentDto) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.deletedAt || project.ownerId !== ownerId) {
      throw new AppError(ErrorCode.PROJECT_NOT_FOUND);
    }

    // Atomic lock: the WHERE clause (status NOT IN active-set) is
    // evaluated by Postgres itself, so two concurrent "Deploy" clicks
    // can't both pass — only one updateMany call will affect a row.
    const locked = await this.prisma.project.updateMany({
      where: { id: projectId, status: { notIn: ACTIVE_PROJECT_STATUSES } },
      data: { status: 'QUEUED' },
    });
    if (locked.count === 0) {
      throw new AppError(ErrorCode.DEPLOYMENT_ALREADY_RUNNING);
    }

    if (dto.source) {
      const source = dto.source as { type?: string; owner?: string; repo?: string; branch?: string; repoUrl?: string };
      const normalizedSource =
        source.type === 'GITHUB' && source.owner && source.repo
          ? { ...source, repoUrl: `https://github.com/${source.owner}/${source.repo}` }
          : source;

      await this.prisma.project.update({ where: { id: projectId }, data: { source: normalizedSource as never } });

      if (source.type === 'GITHUB' && source.owner && source.repo && source.branch) {
        await this.prisma.githubRepositoryLink.upsert({
          where: { projectId },
          update: { ownerLogin: source.owner, repoName: source.repo, branch: source.branch },
          create: { projectId, ownerLogin: source.owner, repoName: source.repo, branch: source.branch },
        });
      }
    }

    const deployment = await this.prisma.deployment.create({
      data: { projectId, status: 'QUEUED', attempt: 1 },
    });

    await this.events.emit(deployment.id, 'STEP', 'Deployment queued.', 'QUEUED');

    await this.deploymentQueue.add(
      'run-deployment',
      { deploymentId: deployment.id, environment: dto.environment ?? {} },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 500, removeOnFail: 500 },
    );

    return { deploymentId: deployment.id, status: deployment.status };
  }

  /**
   * Webhook-initiated deploy (spec §17: "Support GitHub webhooks...
   * queue deployment"). No ownerId here — trust comes from the
   * caller having already verified the GitHub HMAC signature and
   * resolved an explicit GithubRepositoryLink, not from a user session.
   */
  async triggerFromWebhook(projectId: string, environment: Record<string, string> = {}): Promise<{ deploymentId: string } | null> {
    const locked = await this.prisma.project.updateMany({
      where: { id: projectId, deletedAt: null, status: { notIn: ACTIVE_PROJECT_STATUSES } },
      data: { status: 'QUEUED' },
    });
    if (locked.count === 0) return null; // already deploying — silently skip, not an error for a webhook

    const deployment = await this.prisma.deployment.create({ data: { projectId, status: 'QUEUED', attempt: 1 } });
    await this.events.emit(deployment.id, 'STEP', 'Deployment queued by GitHub push.', 'QUEUED');
    await this.deploymentQueue.add(
      'run-deployment',
      { deploymentId: deployment.id, environment },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 500, removeOnFail: 500 },
    );
    return { deploymentId: deployment.id };
  }

  async listForProject(ownerId: string, projectId: string) {    await this.requireOwnedProject(ownerId, projectId);
    const deployments = await this.prisma.deployment.findMany({
      where: { projectId },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
    return deployments;
  }

  async getById(ownerId: string, deploymentId: string) {
    const deployment = await this.prisma.deployment.findUnique({ where: { id: deploymentId }, include: { project: true } });
    if (!deployment || deployment.project.ownerId !== ownerId) throw new AppError(ErrorCode.NOT_FOUND);
    return deployment;
  }

  async getEventHistory(ownerId: string, deploymentId: string) {
    await this.getById(ownerId, deploymentId); // ownership check
    return this.events.history(deploymentId);
  }

  private async requireOwnedProject(ownerId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.deletedAt || project.ownerId !== ownerId) throw new AppError(ErrorCode.PROJECT_NOT_FOUND);
    return project;
  }
}
