import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ProviderRegistryService } from './provider-registry.service';
import type { HostingProvider } from './provider.interface';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';

export interface RoutingContext {
  runtime?: string | null;
  plan?: string | null;
  region?: string | null;
}

const ROLE_ORDER = { PRIMARY: 0, SECONDARY: 1, FALLBACK: 2, DISABLED: 3 } as const;

@Injectable()
export class ProviderRouterService {
  private readonly logger = new Logger(ProviderRouterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ProviderRegistryService,
  ) {}

  /**
   * Returns the best available (provider, adapter) pair for a service,
   * trying PRIMARY rules first, then SECONDARY, then FALLBACK — skipping
   * any provider that is disabled, unhealthy, or missing credentials.
   * Never called with a provider hardcoded by the caller (spec §12,
   * §85): the caller only knows the service, not the infrastructure.
   */
  async resolve(serviceId: string, context: RoutingContext = {}): Promise<{ provider: { id: string; key: string }; adapter: HostingProvider }> {
    const rules = await this.prisma.providerRoutingRule.findMany({
      where: { serviceId, enabled: true, role: { not: 'DISABLED' } },
      include: { provider: true },
    });

    const sorted = rules.sort((a, b) => {
      const roleDiff = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
      return roleDiff !== 0 ? roleDiff : a.priority - b.priority;
    });

    for (const rule of sorted) {
      if (!this.conditionsMatch(rule.conditions as Record<string, unknown>, context)) continue;
      if (!rule.provider.enabled) continue;
      if (rule.provider.healthStatus === 'UNAVAILABLE' || rule.provider.healthStatus === 'MAINTENANCE' || rule.provider.healthStatus === 'DISABLED') continue;
      if (!this.registry.isConfigured(rule.provider.key)) continue;

      return { provider: { id: rule.provider.id, key: rule.provider.key }, adapter: this.registry.get(rule.provider.key) };
    }

    this.logger.warn(`No eligible provider found for service ${serviceId} with context ${JSON.stringify(context)}`);
    throw new AppError(ErrorCode.DEPLOYMENT_PROVIDER_UNAVAILABLE);
  }

  private conditionsMatch(conditions: Record<string, unknown>, context: RoutingContext): boolean {
    if (conditions.runtime && conditions.runtime !== context.runtime) return false;
    if (conditions.plan && conditions.plan !== context.plan) return false;
    if (conditions.region && conditions.region !== context.region) return false;
    return true;
  }
}
