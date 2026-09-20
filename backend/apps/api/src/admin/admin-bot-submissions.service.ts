import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import type { BotSubmissionStatus } from '@prisma/client';

@Injectable()
export class AdminBotSubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(status?: BotSubmissionStatus) {
    return this.prisma.botSubmission.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      include: { submittedBy: { select: { username: true, email: true } } },
    });
  }

  async getDetail(id: string) {
    const submission = await this.prisma.botSubmission.findUnique({
      where: { id },
      include: { submittedBy: { select: { username: true, email: true } } },
    });
    if (!submission) throw new AppError(ErrorCode.NOT_FOUND);
    return submission;
  }

  async approve(adminUserId: string, adminRole: string, id: string, reviewNotes?: string) {
    const submission = await this.prisma.botSubmission.findUnique({ where: { id } });
    if (!submission) throw new AppError(ErrorCode.NOT_FOUND);
    if (submission.status === 'APPROVED') throw new AppError(ErrorCode.VALIDATION_FAILED, 'This submission is already approved.');

    const bot = await this.prisma.$transaction(async (tx) => {
      const created = await tx.bot.create({
        data: {
          name: submission.name,
          description: submission.description,
          category: 'community',
          tags: [],
          repository: submission.repository,
          branch: submission.branch,
          runtime: submission.runtime,
          packageManager: submission.packageManager,
          startCommand: submission.startCommand,
          optionalEnvFields: submission.environmentVariables as never,
          resourceRequirements: submission.resourceRequirements as never,
          pairingMode: submission.pairingMode,
          pairingServiceUrl: submission.pairingServiceUrl,
          documentationUrl: submission.documentationUrl,
          submittedByUserId: submission.submittedByUserId,
          visibility: 'PUBLIC',
          approved: true,
          disabled: false,
        },
      });
      await tx.botSubmission.update({
        where: { id },
        data: { status: 'APPROVED', botId: created.id, reviewNotes, reviewedByUserId: adminUserId, reviewedAt: new Date() },
      });
      return created;
    });

    await this.audit.record({ actorUserId: adminUserId, actorRole: adminRole, action: 'ADMIN_APPROVED_BOT', targetType: 'BotSubmission', targetId: id, metadata: { botId: bot.id } });
    return { botId: bot.id };
  }

  async reject(adminUserId: string, adminRole: string, id: string, reviewNotes: string): Promise<void> {
    await this.updateStatus(id, 'REJECTED', reviewNotes, adminUserId);
    await this.audit.record({ actorUserId: adminUserId, actorRole: adminRole, action: 'ADMIN_REJECTED_BOT_SUBMISSION', targetType: 'BotSubmission', targetId: id });
  }

  async requestChanges(adminUserId: string, adminRole: string, id: string, reviewNotes: string): Promise<void> {
    await this.updateStatus(id, 'CHANGES_REQUESTED', reviewNotes, adminUserId);
    await this.audit.record({ actorUserId: adminUserId, actorRole: adminRole, action: 'ADMIN_REQUESTED_BOT_CHANGES', targetType: 'BotSubmission', targetId: id });
  }

  private async updateStatus(id: string, status: BotSubmissionStatus, reviewNotes: string, adminUserId: string): Promise<void> {
    const submission = await this.prisma.botSubmission.findUnique({ where: { id } });
    if (!submission) throw new AppError(ErrorCode.NOT_FOUND);
    await this.prisma.botSubmission.update({
      where: { id },
      data: { status, reviewNotes, reviewedByUserId: adminUserId, reviewedAt: new Date() },
    });
  }
}
