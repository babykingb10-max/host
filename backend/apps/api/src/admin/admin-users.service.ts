import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import type { UserStatus } from '@prisma/client';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(params: { search?: string; status?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 25));

    const where = {
      ...(params.status ? { status: params.status as UserStatus } : {}),
      ...(params.search
        ? { OR: [{ email: { contains: params.search, mode: 'insensitive' as const } }, { username: { contains: params.search, mode: 'insensitive' as const } }] }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
        select: { id: true, email: true, username: true, displayName: true, status: true, createdAt: true, lastLoginAt: true },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async getDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: { select: { role: { select: { key: true, name: true } } } },
        creditWallet: true,
        subscription: { include: { plan: true } },
        _count: { select: { projects: true } },
      },
    });
    if (!user) throw new AppError(ErrorCode.NOT_FOUND);
    return {
      id: user.id, email: user.email, username: user.username, displayName: user.displayName,
      status: user.status, emailVerified: Boolean(user.emailVerifiedAt), createdAt: user.createdAt, lastLoginAt: user.lastLoginAt,
      roles: user.userRoles.map((r) => r.role.key),
      creditBalance: user.creditWallet?.balance ?? 0,
      subscriptionTier: user.subscription?.plan.tier ?? 'FREE',
      projectCount: user._count.projects,
    };
  }

  async setStatus(adminUserId: string, adminRole: string, targetUserId: string, status: UserStatus, ipAddress?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new AppError(ErrorCode.NOT_FOUND);
    if (user.id === adminUserId) throw new AppError(ErrorCode.VALIDATION_FAILED, 'You cannot change your own account status.');

    await this.prisma.user.update({ where: { id: targetUserId }, data: { status } });

    const actionMap: Record<UserStatus, string> = {
      ACTIVE: 'ADMIN_RESTORED_USER', SUSPENDED: 'ADMIN_SUSPENDED_USER', DISABLED: 'ADMIN_DISABLED_USER', PENDING_VERIFICATION: 'ADMIN_RESET_USER_STATUS',
    };
    await this.audit.record({
      actorUserId: adminUserId, actorRole: adminRole, action: actionMap[status],
      targetType: 'User', targetId: targetUserId, ipAddress,
    });
  }
}
