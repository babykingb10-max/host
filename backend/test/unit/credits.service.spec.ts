import { CreditsService } from '../../apps/api/src/credits/credits.service';
import { ErrorCode } from '../../apps/api/src/common/errors/error-codes';

describe('CreditsService', () => {
  function buildService(walletBalance: number, updateManyCount: number) {
    const wallet = { id: 'wallet-1', userId: 'user-1', balance: walletBalance };
    const prisma = {
      creditWallet: {
        findUnique: jest.fn().mockResolvedValue(wallet),
        create: jest.fn().mockResolvedValue(wallet),
        update: jest.fn().mockResolvedValue(wallet),
        updateMany: jest.fn().mockResolvedValue({ count: updateManyCount }),
      },
      creditTransaction: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as never;
    return new CreditsService(prisma);
  }

  it('debits successfully when balance is sufficient', async () => {
    const service = buildService(100, 1); // updateMany affects 1 row => balance was >= amount
    await expect(service.debit('user-1', 40, 'HOSTING_CHARGE', 'test charge')).resolves.toBeUndefined();
  });

  it('throws INSUFFICIENT_CREDITS when the atomic guard affects zero rows', async () => {
    const service = buildService(10, 0); // updateMany affects 0 rows => balance < amount
    await expect(service.debit('user-1', 40, 'HOSTING_CHARGE', 'test charge')).rejects.toMatchObject({
      code: ErrorCode.INSUFFICIENT_CREDITS,
    });
  });

  it('rejects a non-positive credit amount', async () => {
    const service = buildService(100, 1);
    await expect(service.credit('user-1', 0, 'REFERRAL', 'test')).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_FAILED,
    });
  });
});
