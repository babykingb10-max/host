import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getMyReferralInfo(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
    const events = await this.prisma.referralEvent.findMany({
      where: { referrerUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: { referred: { select: { username: true, displayName: true } } },
    });

    const appUrl = this.config.get<string>('APP_URL');
    return {
      referralCode: user?.referralCode ?? null,
      referralLink: user?.referralCode ? `${appUrl}/register?ref=${user.referralCode}` : null,
      totalReferred: events.length,
      totalRewarded: events.filter((e) => e.rewardedAt).length,
      totalRewardsEarned: events.reduce((sum, e) => sum + (e.rewardAmount ?? 0), 0),
      history: events.map((e) => ({
        username: e.referred.displayName ?? e.referred.username,
        status: e.rewardedAt ? 'rewarded' : 'pending_verification',
        rewardAmount: e.rewardAmount,
        createdAt: e.createdAt,
      })),
    };
  }
}
