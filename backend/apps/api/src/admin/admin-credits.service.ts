import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';

@Injectable()
export class AdminCreditsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly audit: AuditService,
  ) {}

  async getStats() {
    const [issued, spent] = await Promise.all([
      this.prisma.creditTransaction.aggregate({ where: { amount: { gt: 0 } }, _sum: { amount: true } }),
      this.prisma.creditTransaction.aggregate({ where: { amount: { lt: 0 } }, _sum: { amount: true } }),
    ]);
    return {
      totalIssued: issued._sum.amount ?? 0,
      totalSpent: Math.abs(spent._sum.amount ?? 0),
      outstanding: (issued._sum.amount ?? 0) + (spent._sum.amount ?? 0),
    };
  }

  async adjust(adminUserId: string, adminRole: string, targetUserId: string, amount: number, reason: string): Promise<void> {
    if (amount === 0) throw new AppError(ErrorCode.VALIDATION_FAILED, 'Adjustment amount cannot be zero.');
    if (!reason?.trim()) throw new AppError(ErrorCode.VALIDATION_FAILED, 'A reason is required for manual credit adjustments.');

    if (amount > 0) {
      await this.credits.credit(targetUserId, amount, 'ADMIN_ADJUSTMENT', reason, adminUserId);
    } else {
      await this.credits.debit(targetUserId, Math.abs(amount), 'ADMIN_ADJUSTMENT', reason, adminUserId);
    }

    await this.audit.record({
      actorUserId: adminUserId, actorRole: adminRole, action: 'ADMIN_ADJUSTED_CREDITS',
      targetType: 'User', targetId: targetUserId, metadata: { amount, reason },
    });
  }
}
