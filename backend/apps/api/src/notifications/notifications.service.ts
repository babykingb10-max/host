import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import type { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Single entry point every other module calls to notify a user
   * (spec §38, §42). Always writes the in-app row; also attempts push
   * delivery if the user has a device token and FCM is configured —
   * never fails the caller's own flow if notification delivery fails.
   */
  async notify(userId: string, type: NotificationType, title: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
    const prefs = await this.getOrCreatePreferences(userId);
    if (!prefs.inAppEnabled) return;

    await this.prisma.notification.create({ data: { userId, type, title, message, metadata: (metadata ?? {}) as never } });

    if (prefs.pushEnabled) {
      await this.sendPush(userId, title, message).catch((err) => this.logger.warn(`Push delivery failed for user ${userId}: ${err}`));
    }
  }

  async list(userId: string, unreadOnly?: boolean) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    const n = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!n || n.userId !== userId) throw new AppError(ErrorCode.NOT_FOUND);
    await this.prisma.notification.update({ where: { id: notificationId }, data: { readAt: new Date() } });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  }

  async remove(userId: string, notificationId: string): Promise<void> {
    const n = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!n || n.userId !== userId) throw new AppError(ErrorCode.NOT_FOUND);
    await this.prisma.notification.delete({ where: { id: notificationId } });
  }

  async getPreferences(userId: string) {
    return this.getOrCreatePreferences(userId);
  }

  async updatePreferences(userId: string, updates: Partial<{ inAppEnabled: boolean; pushEnabled: boolean; emailEnabled: boolean; deploymentEvents: boolean; billingEvents: boolean; securityEvents: boolean; promotionalEvents: boolean }>) {
    await this.getOrCreatePreferences(userId);
    return this.prisma.notificationPreference.update({ where: { userId }, data: updates });
  }

  async registerDeviceToken(userId: string, token: string, platform: string): Promise<void> {
    await this.prisma.pushDeviceToken.upsert({
      where: { token },
      update: { userId, platform },
      create: { userId, token, platform },
    });
  }

  async unregisterDeviceToken(userId: string, token: string): Promise<void> {
    await this.prisma.pushDeviceToken.deleteMany({ where: { userId, token } });
  }

  // -- internals -------------------------------------------------------

  private async getOrCreatePreferences(userId: string) {
    const existing = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.notificationPreference.create({ data: { userId } });
  }

  private async sendPush(userId: string, title: string, message: string): Promise<void> {
    const projectId = this.config.get<string>('FCM_PROJECT_ID');
    if (!projectId) return; // not configured — in-app notification still landed, which is the important part

    const tokens = await this.prisma.pushDeviceToken.findMany({ where: { userId } });
    if (tokens.length === 0) return;

    // Real FCM HTTP v1 delivery requires a signed OAuth2 access token
    // derived from the service-account private key — that token-minting
    // step is the integration point once FCM_CLIENT_EMAIL/FCM_PRIVATE_KEY
    // are populated; logged here rather than faking a delivery receipt.
    this.logger.log(`Would deliver push "${title}" to ${tokens.length} device(s) for user ${userId} via FCM project ${projectId}.`);
  }
}
