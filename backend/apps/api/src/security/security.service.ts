import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import type { SecurityEventType, SecuritySeverity } from '@prisma/client';

@Injectable()
export class SecurityService {
  constructor(private readonly prisma: PrismaService) {}

  async record(type: SecurityEventType, severity: SecuritySeverity, message: string, opts: { userId?: string; ipAddress?: string; metadata?: Record<string, unknown> } = {}): Promise<void> {
    await this.prisma.securityEvent.create({
      data: { type, severity, message, userId: opts.userId, ipAddress: opts.ipAddress, metadata: (opts.metadata ?? {}) as never },
    });
  }

  async list(filters: { severity?: SecuritySeverity; resolved?: boolean; page?: number; pageSize?: number }) {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
    const where = {
      ...(filters.severity ? { severity: filters.severity } : {}),
      ...(filters.resolved !== undefined ? { resolved: filters.resolved } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.securityEvent.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.securityEvent.count({ where }),
    ]);
    return { items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async resolve(id: string): Promise<void> {
    await this.prisma.securityEvent.update({ where: { id }, data: { resolved: true } });
  }

  /** Checks recent failed logins for this identifier and flags a brute-force pattern once past the threshold. */
  async checkBruteForce(identifier: string, ipAddress?: string): Promise<void> {
    const since = new Date(Date.now() - 15 * 60 * 1000);
    const recentFailures = await this.prisma.loginHistoryEntry.count({
      where: { success: false, createdAt: { gte: since }, ipAddress: ipAddress ?? undefined },
    });
    if (recentFailures >= 5) {
      await this.record('BRUTE_FORCE_ATTEMPT', recentFailures >= 10 ? 'HIGH' : 'MEDIUM', `${recentFailures} failed login attempts in the last 15 minutes for identifier "${identifier}".`, { ipAddress });
    }
  }
}
