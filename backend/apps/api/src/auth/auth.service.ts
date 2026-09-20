import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../common/prisma.service';
import { PasswordHasherService } from './password-hasher.service';
import { TokenService } from './token.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { MailerService } from '../common/utils/mailer.service';
import { CreditsService } from '../credits/credits.service';
import { SecurityService } from '../security/security.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import type { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto } from './dto/auth.dto';
import { RoleKey, UserStatus } from '@prisma/client';

const RESET_TOKEN_TTL_MINUTES = 30;
const VERIFY_TOKEN_TTL_HOURS = 24;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly tokens: TokenService,
    private readonly encryption: EncryptionService,
    private readonly mailer: MailerService,
    private readonly credits: CreditsService,
    private readonly security: SecurityService,
  ) {}

  async register(dto: RegisterDto, ctx: { ip?: string; userAgent?: string }) {
    const [emailTaken, usernameTaken] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } }),
      this.prisma.user.findUnique({ where: { username: dto.username } }),
    ]);
    if (emailTaken) throw new AppError(ErrorCode.AUTH_EMAIL_ALREADY_IN_USE);
    if (usernameTaken) throw new AppError(ErrorCode.AUTH_USERNAME_ALREADY_IN_USE);

    const passwordHash = await this.passwordHasher.hash(dto.password);

    const referrer = dto.referralCode
      ? await this.prisma.user.findUnique({ where: { referralCode: dto.referralCode } })
      : null;

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          username: dto.username,
          displayName: dto.displayName,
          passwordHash,
          status: UserStatus.PENDING_VERIFICATION,
          referralCode: randomBytes(5).toString('hex'),
        },
      });

      const userRole = await tx.role.findUnique({ where: { key: RoleKey.USER } });
      if (userRole) {
        await tx.userRole.create({ data: { userId: created.id, roleId: userRole.id } });
      }

      if (referrer && referrer.id !== created.id) {
        await tx.referralEvent.create({ data: { referrerUserId: referrer.id, referredUserId: created.id } });
      }

      return created;
    });

    await this.sendVerificationEmail(user.id, user.email);

    const session = await this.createSession(user.id, ctx);
    const tokenPair = await this.tokens.issueTokenPair(user.id, session.id, [RoleKey.USER]);

    return { user: this.toPublicUser(user), ...tokenPair };
  }

  async login(dto: LoginDto, ctx: { ip?: string; userAgent?: string }) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.identifier.toLowerCase() }, { username: dto.identifier }] },
    });

    const valid = user ? await this.passwordHasher.verify(user.passwordHash, dto.password) : false;

    await this.prisma.loginHistoryEntry.create({
      data: {
        userId: user?.id ?? '00000000-0000-0000-0000-000000000000',
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        success: Boolean(user && valid),
        reason: !user ? 'no_such_user' : !valid ? 'bad_password' : null,
      },
    }).catch(() => undefined); // never let audit-trail issues block login flow

    if (!user || !valid) {
      await this.security.checkBruteForce(dto.identifier, ctx.ip).catch(() => undefined);
    }

    if (!user || !valid) throw new AppError(ErrorCode.AUTH_INVALID_CREDENTIALS);
    if (user.status === UserStatus.SUSPENDED) throw new AppError(ErrorCode.AUTH_ACCOUNT_SUSPENDED);
    if (user.status === UserStatus.DISABLED) throw new AppError(ErrorCode.AUTH_ACCOUNT_DISABLED);

    const roles = await this.getUserRoleKeys(user.id);
    const session = await this.createSession(user.id, ctx);
    const tokenPair = await this.tokens.issueTokenPair(user.id, session.id, roles);

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return { user: this.toPublicUser(user), ...tokenPair };
  }

  async refresh(refreshToken: string) {
    const rotated = await this.tokens.rotateRefreshToken(refreshToken);
    if (!rotated) throw new AppError(ErrorCode.AUTH_SESSION_EXPIRED);

    const roles = await this.getUserRoleKeys(rotated.userId);
    const tokenPair = await this.tokens.issueTokenPair(rotated.userId, rotated.sessionId, roles, rotated.family);
    return tokenPair;
  }

  async logout(sessionId: string): Promise<void> {
    await this.tokens.revokeSession(sessionId);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    // Always respond as if successful — never reveal whether an email is registered.
    if (!user) return;

    const rawToken = randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.encryption.hashForLookup(rawToken),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
      },
    });

    await this.mailer.send({
      to: user.email,
      subject: 'Reset your Adevos-X password',
      templateKey: 'password-reset',
      templateData: { token: rawToken, displayName: user.displayName ?? user.username },
    });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = this.encryption.hashForLookup(dto.token);
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new AppError(ErrorCode.AUTH_RESET_TOKEN_INVALID);
    }

    const passwordHash = await this.passwordHasher.hash(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      // Reset invalidates all existing sessions — standard security practice.
      this.prisma.refreshToken.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
      this.prisma.userSession.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    const tokenHash = this.encryption.hashForLookup(dto.token);
    const record = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new AppError(ErrorCode.AUTH_TOKEN_INVALID, 'This verification link is invalid or has expired.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date(), status: UserStatus.ACTIVE } }),
      this.prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    const referral = await this.prisma.referralEvent.findUnique({ where: { referredUserId: record.userId } });
    if (referral && !referral.rewardedAt) {
      const REFERRAL_REWARD_AMOUNT = 100; // fallback default — DB-driven via SystemSettingsService once Admin > Credits rule editing ships (Phase 9)
      await this.credits.credit(referral.referrerUserId, REFERRAL_REWARD_AMOUNT, 'REFERRAL', 'Referral reward — referred user verified their email', referral.id);
      await this.prisma.referralEvent.update({ where: { id: referral.id }, data: { rewardedAt: new Date(), rewardAmount: REFERRAL_REWARD_AMOUNT } });
    }
  }

  async listSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastSeenAt: 'desc' },
      select: { id: true, userAgent: true, ipAddress: true, deviceLabel: true, createdAt: true, lastSeenAt: true },
    });
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.userSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) throw new AppError(ErrorCode.FORBIDDEN_RESOURCE);
    await this.tokens.revokeSession(sessionId);
  }

  // -- internals -------------------------------------------------------

  private async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const rawToken = randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: this.encryption.hashForLookup(rawToken),
        expiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_HOURS * 60 * 60 * 1000),
      },
    });
    await this.mailer.send({
      to: email,
      subject: 'Verify your Adevos-X account',
      templateKey: 'verify-email',
      templateData: { token: rawToken },
    });
  }

  private async createSession(userId: string, ctx: { ip?: string; userAgent?: string }) {
    return this.prisma.userSession.create({
      data: { userId, ipAddress: ctx.ip, userAgent: ctx.userAgent },
    });
  }

  private async getUserRoleKeys(userId: string): Promise<string[]> {
    const roles = await this.prisma.userRole.findMany({ where: { userId }, select: { role: { select: { key: true } } } });
    return roles.map((r) => r.role.key);
  }

  private toPublicUser(user: { id: string; email: string; username: string; displayName: string | null; avatarUrl: string | null; status: UserStatus; emailVerifiedAt: Date | null }) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      emailVerified: Boolean(user.emailVerifiedAt),
    };
  }
}
