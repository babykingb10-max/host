import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import type { SubmitBotDto } from './dto/submit-bot.dto';

@Injectable()
export class BotsService {
  constructor(private readonly prisma: PrismaService) {}

  async listCatalog(category?: string) {
    const bots = await this.prisma.bot.findMany({
      where: { approved: true, disabled: false, visibility: 'PUBLIC', ...(category ? { category } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return bots.map(this.toPublicBot);
  }

  async getById(id: string) {
    const bot = await this.prisma.bot.findUnique({ where: { id } });
    if (!bot || !bot.approved || bot.disabled || bot.visibility !== 'PUBLIC') throw new AppError(ErrorCode.NOT_FOUND);
    return this.toPublicBot(bot);
  }

  async submit(userId: string, dto: SubmitBotDto) {
    const submission = await this.prisma.botSubmission.create({
      data: {
        submittedByUserId: userId,
        name: dto.name,
        description: dto.description,
        repository: dto.repository,
        branch: dto.branch,
        demoUrl: dto.demoUrl,
        screenshots: dto.screenshots ?? [],
        documentationUrl: dto.documentationUrl,
        runtime: dto.runtime,
        startCommand: dto.startCommand,
        packageManager: dto.packageManager,
        pairingMode: dto.pairingMode as never,
        pairingServiceUrl: dto.pairingServiceUrl,
        environmentVariables: (dto.environmentVariables ?? []) as never,
        resourceRequirements: (dto.resourceRequirements ?? {}) as never,
        ownershipNotes: dto.ownershipNotes,
        contactEmail: dto.contactEmail,
        status: 'PENDING',
      },
    });
    return { id: submission.id, status: submission.status };
  }

  async listMySubmissions(userId: string) {
    const submissions = await this.prisma.botSubmission.findMany({
      where: { submittedByUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return submissions.map((s) => ({
      id: s.id, name: s.name, status: s.status, reviewNotes: s.reviewNotes, createdAt: s.createdAt, updatedAt: s.updatedAt,
    }));
  }

  private toPublicBot(bot: {
    id: string; name: string; description: string; logoUrl: string | null; bannerUrl: string | null;
    category: string; tags: string[]; runtime: string; runtimeVersion: string | null;
    pairingMode: string; documentationUrl: string | null; resourceRequirements: unknown;
  }) {
    return {
      id: bot.id,
      name: bot.name,
      description: bot.description,
      logoUrl: bot.logoUrl,
      bannerUrl: bot.bannerUrl,
      category: bot.category,
      tags: bot.tags,
      runtime: bot.runtime,
      runtimeVersion: bot.runtimeVersion,
      pairingMode: bot.pairingMode,
      documentationUrl: bot.documentationUrl,
      resourceRequirements: bot.resourceRequirements,
    };
  }
}
