import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { select: { role: { select: { key: true, name: true } } } } },
    });
    if (!user) throw new AppError(ErrorCode.NOT_FOUND);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      phoneNumber: user.phoneNumber,
      status: user.status,
      emailVerified: Boolean(user.emailVerifiedAt),
      roles: user.userRoles.map((ur) => ur.role.key),
      createdAt: user.createdAt,
    };
  }
}
