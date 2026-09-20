import { Body, Controller, Get, Injectable, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequirePermissions } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';

interface CreatePromotionInput {
  title: string;
  description: string;
  rewardAmount: number;
  startAt: string;
  endAt: string;
  usageLimit?: number;
  perUserLimit: number;
}

@Injectable()
export class AdminPromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const campaigns = await this.prisma.promotionCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { claims: true } } },
    });
    return campaigns.map((c) => ({
      id: c.id, title: c.title, description: c.description, rewardAmount: c.rewardAmount,
      startAt: c.startAt, endAt: c.endAt, usageLimit: c.usageLimit, perUserLimit: c.perUserLimit,
      active: c.active, claimCount: c._count.claims,
    }));
  }

  async create(adminUserId: string, adminRole: string, input: CreatePromotionInput) {
    const campaign = await this.prisma.promotionCampaign.create({
      data: {
        title: input.title, description: input.description, rewardAmount: input.rewardAmount,
        startAt: new Date(input.startAt), endAt: new Date(input.endAt),
        usageLimit: input.usageLimit, perUserLimit: input.perUserLimit, active: true,
      },
    });
    await this.audit.record({ actorUserId: adminUserId, actorRole: adminRole, action: 'ADMIN_CREATED_PROMOTION', targetType: 'PromotionCampaign', targetId: campaign.id });
    return campaign;
  }

  async setActive(adminUserId: string, adminRole: string, id: string, active: boolean) {
    const campaign = await this.prisma.promotionCampaign.update({ where: { id }, data: { active } });
    await this.audit.record({
      actorUserId: adminUserId, actorRole: adminRole,
      action: active ? 'ADMIN_ACTIVATED_PROMOTION' : 'ADMIN_DEACTIVATED_PROMOTION',
      targetType: 'PromotionCampaign', targetId: id,
    });
    return campaign;
  }
}

@ApiTags('admin-promotions')
@Controller('v1/admin/promotions')
export class AdminPromotionsController {
  constructor(private readonly service: AdminPromotionsService) {}

  @RequirePermissions('billing.read')
  @Get()
  list() {
    return this.service.list();
  }

  @RequirePermissions('billing.manage')
  @Post()
  create(@CurrentUser() admin: AccessTokenPayload, @Body() input: CreatePromotionInput) {
    return this.service.create(admin.sub, admin.roles[0] ?? 'ADMIN', input);
  }

  @RequirePermissions('billing.manage')
  @Patch(':id/active')
  setActive(@CurrentUser() admin: AccessTokenPayload, @Param('id') id: string, @Body('active') active: boolean) {
    return this.service.setActive(admin.sub, admin.roles[0] ?? 'ADMIN', id, active);
  }
}
