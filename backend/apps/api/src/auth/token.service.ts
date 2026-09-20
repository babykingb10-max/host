import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../common/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import type { AccessTokenPayload } from './strategies/jwt.strategy';

interface IssuedTokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

/**
 * Refresh tokens are opaque random strings; only their SHA-256 hash is
 * stored, and each use rotates the token (old hash marked revoked,
 * pointing at the new one) within the same "family" so reuse of a
 * revoked token can be detected as token theft — spec §5: "Refresh
 * tokens must be securely stored/rotated."
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async issueTokenPair(userId: string, sessionId: string, roles: string[], family?: string): Promise<IssuedTokenPair> {
    const payload: AccessTokenPayload = { sub: userId, sessionId, roles };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL'),
    });

    const refreshTtlDays = this.config.get<number>('JWT_REFRESH_TTL_DAYS')!;
    const refreshToken = randomBytes(48).toString('hex');
    const refreshTokenExpiresAt = new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        sessionId,
        tokenHash: this.encryption.hashForLookup(refreshToken),
        family: family ?? randomBytes(16).toString('hex'),
        expiresAt: refreshTokenExpiresAt,
      },
    });

    return { accessToken, refreshToken, refreshTokenExpiresAt };
  }

  /** Verifies + rotates a refresh token. Returns null if invalid/expired/reused. */
  async rotateRefreshToken(presentedToken: string): Promise<{ userId: string; sessionId: string; family: string } | null> {
    const tokenHash = this.encryption.hashForLookup(presentedToken);
    const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!existing || existing.expiresAt < new Date()) return null;

    if (existing.revokedAt) {
      // Reuse of an already-rotated/revoked token: possible theft.
      // Revoke the entire token family defensively.
      await this.prisma.refreshToken.updateMany({
        where: { family: existing.family, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return null;
    }

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    return { userId: existing.userId, sessionId: existing.sessionId, family: existing.family };
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({ where: { sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.prisma.userSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
  }
}
