import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import type { CreditTransactionType } from '@prisma/client';

@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    return { balance: wallet.balance };
  }

  async listTransactions(userId: string, filter?: 'earned' | 'spent') {
    const wallet = await this.getOrCreateWallet(userId);
    const transactions = await this.prisma.creditTransaction.findMany({
      where: {
        walletId: wallet.id,
        ...(filter === 'earned' ? { amount: { gt: 0 } } : filter === 'spent' ? { amount: { lt: 0 } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return transactions;
  }

  /**
   * Credits a wallet. Always inside a transaction so the wallet balance
   * and the ledger row move together — never mutate `balance` directly
   * elsewhere in the codebase (spec §31: "Never only mutate
   * users.credits").
   */
  async credit(userId: string, amount: number, type: CreditTransactionType, reason: string, reference?: string, metadata?: Record<string, unknown>): Promise<void> {
    if (amount <= 0) throw new AppError(ErrorCode.VALIDATION_FAILED, 'Credit amount must be positive.');
    const wallet = await this.getOrCreateWallet(userId);
    await this.prisma.$transaction([
      this.prisma.creditWallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } }),
      this.prisma.creditTransaction.create({
        data: { walletId: wallet.id, amount, type, reason, reference, metadata: (metadata ?? {}) as never },
      }),
    ]);
  }

  /**
   * Debits a wallet atomically, rejecting if it would go negative.
   * The `WHERE balance >= amount` guard is enforced by the database
   * itself via updateMany's affected-row count, closing the race
   * window a read-then-write pattern would leave open (double-spend
   * prevention, spec §31).
   */
  async debit(userId: string, amount: number, type: CreditTransactionType, reason: string, reference?: string): Promise<void> {
    if (amount <= 0) throw new AppError(ErrorCode.VALIDATION_FAILED, 'Debit amount must be positive.');
    const wallet = await this.getOrCreateWallet(userId);

    const result = await this.prisma.creditWallet.updateMany({
      where: { id: wallet.id, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    });
    if (result.count === 0) throw new AppError(ErrorCode.INSUFFICIENT_CREDITS);

    await this.prisma.creditTransaction.create({
      data: { walletId: wallet.id, amount: -amount, type, reason, reference },
    });
  }

  /** One claim per UTC calendar day — idempotent via a unique reference per user+date, not client trust. */
  async claimDailyCheckin(userId: string): Promise<{ amount: number; alreadyClaimedToday: boolean }> {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const wallet = await this.getOrCreateWallet(userId);
    const reference = `daily-checkin:${today}`;

    const alreadyClaimed = await this.prisma.creditTransaction.findFirst({
      where: { walletId: wallet.id, type: 'DAILY_CHECKIN', reference },
    });
    if (alreadyClaimed) return { amount: 0, alreadyClaimedToday: true };

    const amount = await this.dailyCheckinAmount();
    await this.credit(userId, amount, 'DAILY_CHECKIN', 'Daily check-in reward', reference);
    return { amount, alreadyClaimedToday: false };
  }

  async dailyCheckinAmount(): Promise<number> {
    return 5; // fallback default — becomes DB-driven via SystemSettingsService once Admin > Credits (Phase 9) ships rule editing
  }

  private async getOrCreateWallet(userId: string) {
    const existing = await this.prisma.creditWallet.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.creditWallet.create({ data: { userId, balance: 0 } });
  }
}
