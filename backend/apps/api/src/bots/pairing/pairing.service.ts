import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../common/prisma.service';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { ConfigService } from '@nestjs/config';
import { HttpPairingAdapter } from './http-pairing.adapter';
import { AppError } from '../../common/errors/app-error';
import { ErrorCode } from '../../common/errors/error-codes';
import type { PairingMode } from '@prisma/client';

const SESSION_TTL_MINUTES = 5;

// Modes fulfilled synchronously by calling an external HTTP pairing service.
const API_DRIVEN_MODES: PairingMode[] = ['PAIRING_CODE_SESSION_API', 'EXTERNAL_PAIRING'];
// Modes fulfilled by the deployed bot container itself, which calls back once it generates a code/QR via its own WhatsApp link.
const DEVICE_DRIVEN_MODES: PairingMode[] = ['QR_CODE', 'PAIRING_CODE_SESSION_WHATSAPP'];

@Injectable()
export class PairingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly config: ConfigService,
    private readonly httpAdapter: HttpPairingAdapter,
  ) {}

  async requestPairing(ownerId: string, projectId: string, phoneNumber?: string) {
    const { project, bot } = await this.requireCatalogProject(ownerId, projectId);

    const callbackToken = randomBytes(24).toString('hex');
    const session = await this.prisma.pairingSession.upsert({
      where: { projectId },
      update: {
        mode: bot.pairingMode,
        status: 'PENDING',
        phoneNumber,
        pairingCode: null,
        qrCodeData: null,
        sessionEncrypted: null,
        errorMessage: null,
        callbackTokenHash: this.encryption.hashForLookup(callbackToken),
        expiresAt: new Date(Date.now() + SESSION_TTL_MINUTES * 60_000),
      },
      create: {
        projectId,
        mode: bot.pairingMode,
        status: 'PENDING',
        phoneNumber,
        callbackTokenHash: this.encryption.hashForLookup(callbackToken),
        expiresAt: new Date(Date.now() + SESSION_TTL_MINUTES * 60_000),
      },
    });

    if (bot.pairingMode === 'NO_PAIRING') {
      return this.toPublic(await this.prisma.pairingSession.update({ where: { projectId }, data: { status: 'CONNECTED' } }));
    }

    if (bot.pairingMode === 'MANUAL_SESSION') {
      return this.toPublic(session); // stays PENDING until submitManualSession()
    }

    if (DEVICE_DRIVEN_MODES.includes(bot.pairingMode)) {
      // Inject the callback URL/token as env vars so the next
      // deploy/restart lets the bot container report its own QR/code.
      await this.injectCallbackEnvVars(projectId, session.id, callbackToken);
      return this.toPublic(await this.prisma.pairingSession.update({ where: { projectId }, data: { status: 'AWAITING_DEVICE' } }));
    }

    if (API_DRIVEN_MODES.includes(bot.pairingMode)) {
      if (!bot.pairingServiceUrl) throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR, 'This bot has no pairing service configured.');
      const result = await this.httpAdapter.requestPairing({ phoneNumber, serviceUrl: bot.pairingServiceUrl });
      return this.toPublic(
        await this.prisma.pairingSession.update({
          where: { projectId },
          data: {
            status: result.qrCodeData ? 'QR_ISSUED' : 'CODE_ISSUED',
            pairingCode: result.pairingCode,
            qrCodeData: result.qrCodeData,
            expiresAt: new Date(Date.now() + result.expiresInSeconds * 1000),
          },
        }),
      );
    }

    return this.toPublic(session);
  }

  async getStatus(ownerId: string, projectId: string) {
    await this.requireOwnedProject(ownerId, projectId);
    const session = await this.prisma.pairingSession.findUnique({ where: { projectId } });
    return session ? this.toPublic(session) : null;
  }

  async submitManualSession(ownerId: string, projectId: string, sessionId: string): Promise<void> {
    await this.requireOwnedProject(ownerId, projectId);
    const session = await this.prisma.pairingSession.findUnique({ where: { projectId } });
    if (!session || session.mode !== 'MANUAL_SESSION') {
      throw new AppError(ErrorCode.VALIDATION_FAILED, 'This project is not awaiting a manual session.');
    }

    await this.storeSessionSecret(projectId, sessionId);
    await this.prisma.pairingSession.update({ where: { projectId }, data: { status: 'CONNECTED', sessionEncrypted: this.encryption.encrypt(sessionId) } });
  }

  async cancel(ownerId: string, projectId: string): Promise<void> {
    await this.requireOwnedProject(ownerId, projectId);
    await this.prisma.pairingSession.update({ where: { projectId }, data: { status: 'CANCELLED' } }).catch(() => undefined);
  }

  /** Called by the deployed bot container itself — auth is the callback token, not a user JWT. */
  async handleCallback(sessionId: string, presentedToken: string, payload: { pairingCode?: string; qrCodeData?: string; sessionData?: string; connected?: boolean; errorMessage?: string }): Promise<void> {
    const session = await this.prisma.pairingSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError(ErrorCode.NOT_FOUND);
    if (session.callbackTokenHash !== this.encryption.hashForLookup(presentedToken)) {
      throw new AppError(ErrorCode.FORBIDDEN_RESOURCE);
    }

    if (payload.errorMessage) {
      await this.prisma.pairingSession.update({ where: { id: sessionId }, data: { status: 'FAILED', errorMessage: payload.errorMessage } });
      return;
    }

    if (payload.connected && payload.sessionData) {
      await this.storeSessionSecret(session.projectId, payload.sessionData);
      await this.prisma.pairingSession.update({
        where: { id: sessionId },
        data: { status: 'CONNECTED', sessionEncrypted: this.encryption.encrypt(payload.sessionData) },
      });
      return;
    }

    await this.prisma.pairingSession.update({
      where: { id: sessionId },
      data: {
        status: payload.qrCodeData ? 'QR_ISSUED' : 'CODE_ISSUED',
        pairingCode: payload.pairingCode,
        qrCodeData: payload.qrCodeData,
      },
    });
  }

  // -- internals -------------------------------------------------------

  private async injectCallbackEnvVars(projectId: string, sessionId: string, callbackToken: string): Promise<void> {
    const apiUrl = this.config.get<string>('API_URL');
    const callbackUrl = `${apiUrl}/api/v1/pairing/callback/${sessionId}`;
    await this.setEncryptedEnvVar(projectId, 'PAIRING_CALLBACK_URL', callbackUrl, false);
    await this.setEncryptedEnvVar(projectId, 'PAIRING_CALLBACK_TOKEN', callbackToken, true);
  }

  private async storeSessionSecret(projectId: string, sessionData: string): Promise<void> {
    await this.setEncryptedEnvVar(projectId, 'SESSION_ID', sessionData, true);
  }

  private async setEncryptedEnvVar(projectId: string, key: string, value: string, isSecret: boolean): Promise<void> {
    await this.prisma.projectEnvironmentVariable.upsert({
      where: { projectId_key: { projectId, key } },
      update: { valueEncrypted: this.encryption.encrypt(value), isSecret },
      create: { projectId, key, valueEncrypted: this.encryption.encrypt(value), isSecret },
    });
  }

  private async requireCatalogProject(ownerId: string, projectId: string) {
    const project = await this.requireOwnedProject(ownerId, projectId);
    const source = project.source as { type?: string; botId?: string } | null;
    if (!source || source.type !== 'ADMIN_CATALOG' || !source.botId) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, 'Pairing is only available for projects deployed from the Bot Catalog.');
    }
    const bot = await this.prisma.bot.findUnique({ where: { id: source.botId } });
    if (!bot) throw new AppError(ErrorCode.NOT_FOUND, 'The catalog bot for this project could not be found.');
    return { project, bot };
  }

  private async requireOwnedProject(ownerId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.deletedAt || project.ownerId !== ownerId) throw new AppError(ErrorCode.PROJECT_NOT_FOUND);
    return project;
  }

  private toPublic(session: {
    id: string; mode: PairingMode; status: string; phoneNumber: string | null;
    pairingCode: string | null; qrCodeData: string | null; errorMessage: string | null; expiresAt: Date;
  }) {
    // sessionEncrypted and callbackTokenHash are intentionally never returned.
    return {
      id: session.id,
      mode: session.mode,
      status: session.status,
      phoneNumber: session.phoneNumber,
      pairingCode: session.pairingCode,
      qrCodeData: session.qrCodeData,
      errorMessage: session.errorMessage,
      expiresAt: session.expiresAt,
    };
  }
}
