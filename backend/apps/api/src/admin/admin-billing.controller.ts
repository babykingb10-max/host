import { Body, Controller, Get, Injectable, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequirePermissions } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';
import type { SubscriptionPlanTier } from '@prisma/client';

interface UpdatePlanInput {
  name?: string;
  priceAmount?: number;
  maxProjects?: number;
  maxDeploymentsPerDay?: number;
  allowsCustomDomains?: boolean;
  allowsBackups?: boolean;
  alwaysOn?: boolean;
  enabled?: boolean;
}

@Injectable()
export class AdminBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listPlans() {
    return this.prisma.subscriptionPlan.findMany({ orderBy: { priceAmount: 'asc' } });
  }

  async updatePlan(adminUserId: string, adminRole: string, tier: SubscriptionPlanTier, input: UpdatePlanInput) {
    const plan = await this.prisma.subscriptionPlan.update({ where: { tier }, data: input });
    await this.audit.record({ actorUserId: adminUserId, actorRole: adminRole, action: 'ADMIN_UPDATED_PLAN', targetType: 'SubscriptionPlan', targetId: tier, metadata: input });
    return plan;
  }

  async getRevenueOverview() {
    const [activeSubs, totalUsers] = await Promise.all([
      this.prisma.subscription.groupBy({ by: ['planId'], where: { status: 'ACTIVE' }, _count: { id: true } }),
      this.prisma.user.count(),
    ]);
    const plans = await this.prisma.subscriptionPlan.findMany();
    const byPlan = activeSubs.map((s) => {
      const plan = plans.find((p) => p.id === s.planId);
      return { tier: plan?.tier, name: plan?.name, activeSubscribers: s._count.id, monthlyRevenue: (plan?.priceAmount ?? 0) * s._count.id };
    });
    return { totalUsers, byPlan };
  }
}

@ApiTags('admin-billing')
@Controller('v1/admin/billing')
export class AdminBillingController {
  constructor(private readonly service: AdminBillingService) {}

  @RequirePermissions('billing.read')
  @Get('plans')
  listPlans() {
    return this.service.listPlans();
  }

  @RequirePermissions('billing.manage')
  @Patch('plans/:tier')
  updatePlan(@CurrentUser() admin: AccessTokenPayload, @Param('tier') tier: SubscriptionPlanTier, @Body() input: UpdatePlanInput) {
    return this.service.updatePlan(admin.sub, admin.roles[0] ?? 'ADMIN', tier, input);
  }

  @RequirePermissions('billing.read')
  @Get('revenue')
  getRevenue() {
    return this.service.getRevenueOverview();
  }
}
