import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import type { SubscriptionPlanTier } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
  ) {}

  async listPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({ where: { enabled: true }, orderBy: { priceAmount: 'asc' } });
    return plans.map((p) => ({
      tier: p.tier,
      name: p.name,
      price: { amount: p.priceAmount, currency: p.priceCurrency },
      maxProjects: p.maxProjects,
      maxDeploymentsPerDay: p.maxDeploymentsPerDay,
      allowsCustomDomains: p.allowsCustomDomains,
      allowsBackups: p.allowsBackups,
      alwaysOn: p.alwaysOn,
    }));
  }

  async getMine(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId }, include: { plan: true } });
    if (!sub) return null;
    return {
      tier: sub.plan.tier,
      name: sub.plan.name,
      status: sub.status,
      startedAt: sub.startedAt,
      expiresAt: sub.expiresAt,
      maxProjects: sub.plan.maxProjects,
    };
  }

  async subscribe(userId: string, tier: SubscriptionPlanTier) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { tier } });
    if (!plan || !plan.enabled) throw new AppError(ErrorCode.NOT_FOUND, 'This plan is not available.');

    if (plan.priceAmount > 0) {
      await this.credits.debit(userId, plan.priceAmount, 'SUBSCRIPTION_PURCHASE', `Subscribed to ${plan.name}`, plan.id);
    }

    const sub = await this.prisma.subscription.upsert({
      where: { userId },
      update: { planId: plan.id, status: 'ACTIVE', startedAt: new Date(), expiresAt: null, cancelledAt: null },
      create: { userId, planId: plan.id, status: 'ACTIVE' },
    });
    return { tier: plan.tier, status: sub.status };
  }

  async cancel(userId: string): Promise<void> {
    await this.prisma.subscription.update({ where: { userId }, data: { status: 'CANCELLED', cancelledAt: new Date() } }).catch(() => undefined);
  }

  /** Used by ProjectsService for quota enforcement — falls back to the free-tier default when no subscription exists. */
  async getEffectiveMaxProjects(userId: string, fallback: number): Promise<number> {
    const sub = await this.prisma.subscription.findUnique({ where: { userId }, include: { plan: true } });
    if (sub && sub.status === 'ACTIVE') return sub.plan.maxProjects;
    return fallback;
  }
}
