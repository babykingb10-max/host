import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import type { ProviderKey } from '@prisma/client';

@Injectable()
export class AdminProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly registry: ProviderRegistryService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const providers = await this.prisma.provider.findMany({ include: { credential: { select: { updatedAt: true } } } });
    return providers.map((p) => ({
      id: p.id, key: p.key, name: p.name, enabled: p.enabled,
      healthStatus: p.healthStatus, healthLatencyMs: p.healthLatencyMs, lastHealthCheckAt: p.lastHealthCheckAt,
      hasCredentials: Boolean(p.credential),
      // Reports whether env-based config is present too (adapters can be
      // configured either via env vars or the encrypted DB credential).
      envConfigured: this.registry.isConfigured(p.key),
    }));
  }

  async setEnabled(adminUserId: string, adminRole: string, key: ProviderKey, enabled: boolean): Promise<void> {
    await this.prisma.provider.update({ where: { key }, data: { enabled } });
    await this.audit.record({
      actorUserId: adminUserId, actorRole: adminRole,
      action: enabled ? 'ADMIN_ENABLED_PROVIDER' : 'ADMIN_DISABLED_PROVIDER',
      targetType: 'Provider', targetId: key,
    });
  }

  /** Credentials are opaque JSON (shape varies per provider); always encrypted before storage, never logged. */
  async setCredentials(adminUserId: string, adminRole: string, key: ProviderKey, credentials: Record<string, unknown>): Promise<void> {
    const provider = await this.prisma.provider.findUnique({ where: { key } });
    if (!provider) throw new AppError(ErrorCode.NOT_FOUND);

    await this.prisma.providerCredential.upsert({
      where: { providerId: provider.id },
      update: { encryptedPayload: this.encryption.encrypt(JSON.stringify(credentials)) },
      create: { providerId: provider.id, encryptedPayload: this.encryption.encrypt(JSON.stringify(credentials)) },
    });

    await this.audit.record({ actorUserId: adminUserId, actorRole: adminRole, action: 'ADMIN_ROTATED_PROVIDER_CREDENTIALS', targetType: 'Provider', targetId: key });
  }

  async testConnection(key: ProviderKey): Promise<{ configured: boolean; message: string }> {
    const configured = this.registry.isConfigured(key);
    return {
      configured,
      message: configured
        ? 'Provider credentials are present. (Live connectivity test requires a real account/environment to execute a read-only API call.)'
        : 'No credentials configured for this provider yet.',
    };
  }
}
