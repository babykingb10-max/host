import { Body, Controller, Get, Injectable, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequirePermissions } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';

interface UpsertAdProviderInput {
  key: string;
  name: string;
  rewardAmount: number;
  dailyLimit: number;
  cooldownSeconds: number;
  enabled: boolean;
  verificationUrl?: string;
}

@Injectable()
export class AdminAdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const providers = await this.prisma.adProvider.findMany({ orderBy: { key: 'asc' } });
    return Promise.all(
      providers.map(async (p) => {
        const [impressions, completions, rewards] = await Promise.all([
          this.prisma.adRewardEvent.count({ where: { providerId: p.id, stage: 'IMPRESSION' } }),
          this.prisma.adRewardEvent.count({ where: { providerId: p.id, stage: 'REWARDED' } }),
          this.prisma.adRewardEvent.aggregate({ where: { providerId: p.id, stage: 'REWARDED' }, _count: { id: true } }),
        ]);
        return {
          id: p.id, key: p.key, name: p.name, enabled: p.enabled,
          rewardAmount: p.rewardAmount, dailyLimit: p.dailyLimit, cooldownSeconds: p.cooldownSeconds,
          verificationUrl: (p.config as Record<string, unknown>).verificationUrl ?? null,
          analytics: { impressions, completions, rewards: rewards._count.id },
        };
      }),
    );
  }

  async upsert(adminUserId: string, adminRole: string, input: UpsertAdProviderInput) {
    const provider = await this.prisma.adProvider.upsert({
      where: { key: input.key },
      update: {
        name: input.name, rewardAmount: input.rewardAmount, dailyLimit: input.dailyLimit,
        cooldownSeconds: input.cooldownSeconds, enabled: input.enabled,
        config: input.verificationUrl ? { verificationUrl: input.verificationUrl } : {},
      },
      create: {
        key: input.key, name: input.name, rewardAmount: input.rewardAmount, dailyLimit: input.dailyLimit,
        cooldownSeconds: input.cooldownSeconds, enabled: input.enabled,
        config: input.verificationUrl ? { verificationUrl: input.verificationUrl } : {},
      },
    });
    await this.audit.record({ actorUserId: adminUserId, actorRole: adminRole, action: 'ADMIN_CONFIGURED_AD_PROVIDER', targetType: 'AdProvider', targetId: provider.key });
    return provider;
  }
}

@ApiTags('admin-ads')
@Controller('v1/admin/ads')
export class AdminAdsController {
  constructor(private readonly service: AdminAdsService) {}

  @RequirePermissions('billing.read')
  @Get()
  list() {
    return this.service.list();
  }

  @RequirePermissions('billing.manage')
  @Post()
  create(@CurrentUser() admin: AccessTokenPayload, @Body() input: UpsertAdProviderInput) {
    return this.service.upsert(admin.sub, admin.roles[0] ?? 'ADMIN', input);
  }

  @RequirePermissions('billing.manage')
  @Patch(':key')
  update(@CurrentUser() admin: AccessTokenPayload, @Param('key') key: string, @Body() input: Omit<UpsertAdProviderInput, 'key'>) {
    return this.service.upsert(admin.sub, admin.roles[0] ?? 'ADMIN', { ...input, key });
  }
}
