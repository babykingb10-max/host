import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';

@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
  ) {}

  async listActive(userId: string) {
    const now = new Date();
    const campaigns = await this.prisma.promotionCampaign.findMany({
      where: { active: true, startAt: { lte: now }, endAt: { gte: now } },
      orderBy: { endAt: 'asc' },
    });

    const myClaims = await this.prisma.promotionClaim.findMany({
      where: { userId, campaignId: { in: campaigns.map((c) => c.id) } },
    });
    const claimedIds = new Set(myClaims.map((c) => c.campaignId));

    return Promise.all(
      campaigns.map(async (c) => {
        const totalClaims = c.usageLimit ? await this.prisma.promotionClaim.count({ where: { campaignId: c.id } }) : null;
        return {
          id: c.id,
          title: c.title,
          description: c.description,
          rewardAmount: c.rewardAmount,
          endAt: c.endAt,
          alreadyClaimed: claimedIds.has(c.id),
          soldOut: c.usageLimit ? (totalClaims ?? 0) >= c.usageLimit : false,
        };
      }),
    );
  }

  async claim(userId: string, campaignId: string): Promise<{ rewarded: number }> {
    const now = new Date();
    const campaign = await this.prisma.promotionCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign || !campaign.active || campaign.startAt > now || campaign.endAt < now) {
      throw new AppError(ErrorCode.NOT_FOUND, 'This promotion is not currently active.');
    }

    const myClaimCount = await this.prisma.promotionClaim.count({ where: { campaignId, userId } });
    if (myClaimCount >= campaign.perUserLimit) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, "You've already claimed this promotion.");
    }

    if (campaign.usageLimit) {
      const totalClaims = await this.prisma.promotionClaim.count({ where: { campaignId } });
      if (totalClaims >= campaign.usageLimit) {
        throw new AppError(ErrorCode.VALIDATION_FAILED, 'This promotion has reached its claim limit.');
      }
    }

    // Unique(campaignId, userId) constraint is the real double-claim
    // guard under concurrency — the count checks above are a fast
    // pre-check, this create() is what's actually atomic.
    try {
      await this.prisma.promotionClaim.create({ data: { campaignId, userId } });
    } catch {
      throw new AppError(ErrorCode.VALIDATION_FAILED, "You've already claimed this promotion.");
    }

    await this.credits.credit(userId, campaign.rewardAmount, 'PROMOTION', `Promotion: ${campaign.title}`, campaign.id);
    return { rewarded: campaign.rewardAmount };
  }
}
