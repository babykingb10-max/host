import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { PrismaService } from '../common/prisma.service';
import { DeploymentEventsService } from '../deployments/deployment-events.service';
import { ACTIVE_PROJECT_STATUSES } from '../common/constants/project-status';

interface RunCronJobData {
  cronJobId: string;
  projectId?: string;
}

@Processor('cron', { concurrency: 5 })
export class CronProcessor extends WorkerHost {
  private readonly logger = new Logger(CronProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: DeploymentEventsService,
    @InjectQueue('deployment') private readonly deploymentQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<RunCronJobData>): Promise<void> {
    const cronJob = await this.prisma.cronJob.findUnique({ where: { id: job.data.cronJobId } });
    if (!cronJob) {
      this.logger.warn(`Cron job ${job.data.cronJobId} no longer exists — skipping tick.`);
      return;
    }
    if (!cronJob.enabled) return;

    const projectId = job.data.projectId ?? cronJob.projectId;

    // Same atomic lock the manual Deploy button uses — a cron tick
    // never queues a duplicate run on top of one still in progress.
    const locked = await this.prisma.project.updateMany({
      where: { id: projectId, deletedAt: null, status: { notIn: ACTIVE_PROJECT_STATUSES } },
      data: { status: 'QUEUED' },
    });

    let deploymentId: string | null = null;
    if (locked.count > 0) {
      const deployment = await this.prisma.deployment.create({ data: { projectId, status: 'QUEUED', attempt: 1 } });
      deploymentId = deployment.id;
      await this.events.emit(deployment.id, 'STEP', 'Run triggered by scheduled task.', 'QUEUED');
      // Reuse the exact same queue the manual/webhook paths use, so the
      // existing DeploymentProcessor executes it identically.
      await this.deploymentQueue.add(
        'run-deployment',
        { deploymentId: deployment.id, environment: {} },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 500, removeOnFail: 500 },
      );
    } else {
      this.logger.debug(`Cron job ${cronJob.id}: project ${projectId} already has a run in progress — skipped this tick.`);
    }

    await this.prisma.$transaction([
      this.prisma.cronJob.update({ where: { id: cronJob.id }, data: { lastRunAt: new Date() } }),
      this.prisma.cronExecution.create({ data: { cronJobId: cronJob.id, deploymentId } }),
    ]);
  }
}
