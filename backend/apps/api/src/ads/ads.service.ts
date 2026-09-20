import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { providerFetch } from '../providers/common/provider-http';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';

@Injectable()
export class AdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
  ) {}

  async listProviders() {
    const providers = await this.prisma.adProvider.findMany({ where: { enabled: true } });
    return providers.map((p) => ({
      id: p.id, key: p.key, name: p.name, rewardAmount: p.rewardAmount,
      dailyLimit: p.dailyLimit, cooldownSeconds: p.cooldownSeconds,
    }));
  }

  async trackImpression(userId: string, providerId: string): Promise<void> {
    const provider = await this.requireEnabledProvider(providerId);
    await this.prisma.adRewardEvent.create({ data: { userId, providerId: provider.id, stage: 'IMPRESSION' } });
  }

  async completeAd(userId: string, providerId: string, verificationToken?: string) {
    const provider = await this.requireEnabledProvider(providerId);

    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setUTCHours(0, 0, 0, 0);

    const [todayCount, lastReward] = await Promise.all([
      this.prisma.adRewardEvent.count({ where: { userId, providerId: provider.id, stage: 'REWARDED', createdAt: { gte: startOfDay } } }),
      this.prisma.adRewardEvent.findFirst({ where: { userId, providerId: provider.id, stage: 'REWARDED' }, orderBy: { createdAt: 'desc' } }),
    ]);

    if (todayCount >= provider.dailyLimit) {
      await this.reject(userId, provider.id, 'daily_limit_reached');
      throw new AppError(ErrorCode.RESOURCE_LIMIT_EXCEEDED, "You've reached today's ad reward limit for this provider.");
    }
    if (lastReward && now.getTime() - lastReward.createdAt.getTime() < provider.cooldownSeconds * 1000) {
      await this.reject(userId, provider.id, 'cooldown_active');
      throw new AppError(ErrorCode.RATE_LIMIT_EXCEEDED, 'Please wait before watching another ad.');
    }

    // Server-to-server verification is mandatory before any reward —
    // never trust a bare "I watched it" claim from the browser. Ad
    // providers without a configured verification endpoint cannot
    // reward yet; this is a configuration gap, not something a client
    // claim can substitute for.
    const verificationUrl = (provider.config as Record<string, unknown>).verificationUrl as string | undefined;
    if (!verificationUrl) {
      throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR, 'This ad provider is not fully configured for reward verification yet.');
    }

    const verifyRes = await providerFetch(verificationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, providerId: provider.id, token: verificationToken }),
    });
    const verifyBody = (await verifyRes.json()) as { valid?: boolean };
    if (!verifyBody.valid) {
      await this.reject(userId, provider.id, 'verification_failed');
      throw new AppError(ErrorCode.VALIDATION_FAILED, 'This ad completion could not be verified.');
    }

    await this.prisma.adRewardEvent.create({ data: { userId, providerId: provider.id, stage: 'REWARDED' } });
    await this.credits.credit(userId, provider.rewardAmount, 'REWARDED_AD', `Watched ad (${provider.name})`, provider.id);

    return { rewarded: provider.rewardAmount };
  }

  private async reject(userId: string, providerId: string, reason: string): Promise<void> {
    await this.prisma.adRewardEvent.create({ data: { userId, providerId, stage: 'REJECTED', rejectionReason: reason } });
  }

  private async requireEnabledProvider(providerId: string) {
    const provider = await this.prisma.adProvider.findUnique({ where: { id: providerId } });
    if (!provider || !provider.enabled) throw new AppError(ErrorCode.NOT_FOUND, 'This ad provider is not available.');
    return provider;
  }
}
