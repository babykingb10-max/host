import { ProviderRouterService } from '../../apps/api/src/providers/provider-router.service';
import { ErrorCode } from '../../apps/api/src/common/errors/error-codes';

describe('ProviderRouterService', () => {
  function buildService(rules: unknown[], isConfigured: (key: string) => boolean = () => true) {
    const prisma = { providerRoutingRule: { findMany: jest.fn().mockResolvedValue(rules) } } as never;
    const registry = {
      isConfigured,
      get: (key: string) => ({ key }),
    } as never;
    return new ProviderRouterService(prisma, registry);
  }

  it('prefers PRIMARY over SECONDARY and FALLBACK', async () => {
    const service = buildService([
      { role: 'FALLBACK', priority: 0, conditions: {}, provider: { id: 'p3', key: 'HEROKU', enabled: true, healthStatus: 'HEALTHY' } },
      { role: 'PRIMARY', priority: 0, conditions: {}, provider: { id: 'p1', key: 'PTERODACTYL', enabled: true, healthStatus: 'HEALTHY' } },
      { role: 'SECONDARY', priority: 0, conditions: {}, provider: { id: 'p2', key: 'RENDER', enabled: true, healthStatus: 'HEALTHY' } },
    ]);

    const result = await service.resolve('svc-1');
    expect(result.provider.key).toBe('PTERODACTYL');
  });

  it('skips a disabled provider and falls through to the next eligible rule', async () => {
    const service = buildService([
      { role: 'PRIMARY', priority: 0, conditions: {}, provider: { id: 'p1', key: 'PTERODACTYL', enabled: false, healthStatus: 'HEALTHY' } },
      { role: 'FALLBACK', priority: 0, conditions: {}, provider: { id: 'p2', key: 'RENDER', enabled: true, healthStatus: 'HEALTHY' } },
    ]);

    const result = await service.resolve('svc-1');
    expect(result.provider.key).toBe('RENDER');
  });

  it('skips a provider with no credentials configured', async () => {
    const service = buildService(
      [{ role: 'PRIMARY', priority: 0, conditions: {}, provider: { id: 'p1', key: 'PTERODACTYL', enabled: true, healthStatus: 'HEALTHY' } }],
      () => false,
    );

    await expect(service.resolve('svc-1')).rejects.toMatchObject({ code: ErrorCode.DEPLOYMENT_PROVIDER_UNAVAILABLE });
  });

  it('respects rule conditions (e.g. region) and skips non-matching rules', async () => {
    const service = buildService([
      { role: 'PRIMARY', priority: 0, conditions: { region: 'eu' }, provider: { id: 'p1', key: 'PTERODACTYL', enabled: true, healthStatus: 'HEALTHY' } },
      { role: 'FALLBACK', priority: 0, conditions: {}, provider: { id: 'p2', key: 'RENDER', enabled: true, healthStatus: 'HEALTHY' } },
    ]);

    const result = await service.resolve('svc-1', { region: 'us' });
    expect(result.provider.key).toBe('RENDER');
  });

  it('throws DEPLOYMENT_PROVIDER_UNAVAILABLE when no rules exist', async () => {
    const service = buildService([]);
    await expect(service.resolve('svc-1')).rejects.toMatchObject({ code: ErrorCode.DEPLOYMENT_PROVIDER_UNAVAILABLE });
  });
});
