import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PrismaService } from '../common/prisma.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import { isValidCronExpression } from './dto/cron.dto';

function repeatJobName(cronJobId: string): string {
  return `cron:${cronJobId}`;
}

@Injectable()
export class CronJobsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('cron') private readonly cronQueue: Queue,
  ) {}

  async create(ownerId: string, projectId: string, schedule: string) {
    await this.requireOwnedProject(ownerId, projectId);
    if (!isValidCronExpression(schedule)) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, 'Invalid cron expression. Expected 5 fields: minute hour day month weekday.');
    }

    const existing = await this.prisma.cronJob.findUnique({ where: { projectId } });
    if (existing) throw new AppError(ErrorCode.VALIDATION_FAILED, 'This project already has a scheduled task.');

    const cronJob = await this.prisma.cronJob.create({ data: { projectId, schedule, enabled: true } });
    await this.scheduleRepeatable(cronJob.id, schedule);
    return this.toPublic(cronJob);
  }

  async listMine(ownerId: string) {
    const jobs = await this.prisma.cronJob.findMany({
      where: { project: { ownerId } },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return jobs.map(this.toPublic);
  }

  async update(ownerId: string, cronJobId: string, updates: { schedule?: string; enabled?: boolean }) {
    const cronJob = await this.requireOwnedCronJob(ownerId, cronJobId);

    if (updates.schedule && updates.schedule !== cronJob.schedule) {
      if (!isValidCronExpression(updates.schedule)) {
        throw new AppError(ErrorCode.VALIDATION_FAILED, 'Invalid cron expression.');
      }
      await this.unscheduleRepeatable(cronJob.id, cronJob.schedule);
      if (updates.enabled !== false && cronJob.enabled) await this.scheduleRepeatable(cronJob.id, updates.schedule);
    }

    if (updates.enabled !== undefined && updates.enabled !== cronJob.enabled) {
      if (updates.enabled) await this.scheduleRepeatable(cronJob.id, updates.schedule ?? cronJob.schedule);
      else await this.unscheduleRepeatable(cronJob.id, updates.schedule ?? cronJob.schedule);
    }

    const updated = await this.prisma.cronJob.update({ where: { id: cronJobId }, data: updates });
    return this.toPublic(updated);
  }

  async remove(ownerId: string, cronJobId: string): Promise<void> {
    const cronJob = await this.requireOwnedCronJob(ownerId, cronJobId);
    await this.unscheduleRepeatable(cronJob.id, cronJob.schedule).catch(() => undefined);
    await this.prisma.cronJob.delete({ where: { id: cronJobId } });
  }

  async runNow(ownerId: string, cronJobId: string): Promise<{ queued: boolean }> {
    const cronJob = await this.requireOwnedCronJob(ownerId, cronJobId);
    await this.cronQueue.add('run-cron', { cronJobId: cronJob.id, projectId: cronJob.projectId }, { removeOnComplete: 100, removeOnFail: 100 });
    return { queued: true };
  }

  async listExecutions(ownerId: string, cronJobId: string) {
    await this.requireOwnedCronJob(ownerId, cronJobId);
    return this.prisma.cronExecution.findMany({ where: { cronJobId }, orderBy: { triggeredAt: 'desc' }, take: 50 });
  }

  // -- internals -------------------------------------------------------

  private async scheduleRepeatable(cronJobId: string, schedule: string): Promise<void> {
    await this.cronQueue.add(
      'run-cron',
      { cronJobId },
      { repeat: { pattern: schedule }, jobId: repeatJobName(cronJobId), removeOnComplete: 50, removeOnFail: 50 },
    );
  }

  private async unscheduleRepeatable(cronJobId: string, schedule: string): Promise<void> {
    await this.cronQueue.removeRepeatable('run-cron', { pattern: schedule }, repeatJobName(cronJobId));
  }

  private async requireOwnedProject(ownerId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.deletedAt || project.ownerId !== ownerId) throw new AppError(ErrorCode.PROJECT_NOT_FOUND);
    return project;
  }

  private async requireOwnedCronJob(ownerId: string, cronJobId: string) {
    const cronJob = await this.prisma.cronJob.findUnique({ where: { id: cronJobId }, include: { project: true } });
    if (!cronJob || cronJob.project.ownerId !== ownerId) throw new AppError(ErrorCode.NOT_FOUND);
    return cronJob;
  }

  private toPublic(job: { id: string; schedule: string; enabled: boolean; lastRunAt: Date | null; nextRunAt: Date | null; createdAt: Date; project?: { id: string; name: string } }) {
    return {
      id: job.id, schedule: job.schedule, enabled: job.enabled,
      lastRunAt: job.lastRunAt, nextRunAt: job.nextRunAt, createdAt: job.createdAt, project: job.project,
    };
  }
}
