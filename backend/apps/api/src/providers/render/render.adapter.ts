import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppError } from '../../common/errors/app-error';
import { ErrorCode } from '../../common/errors/error-codes';
import { providerFetch } from '../common/provider-http';
import type {
  BackupResult, CreateResourceInput, DeployInput, DeployResult,
  HostingProvider, ResourceResult, ResourceStatus, ResourceUsage,
} from '../provider.interface';

const RENDER_API_BASE = 'https://api.render.com/v1';

@Injectable()
export class RenderAdapter implements HostingProvider {
  readonly key = 'RENDER';

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('RENDER_API_KEY'));
  }

  private requireConfig(): { apiKey: string } {
    const apiKey = this.config.get<string>('RENDER_API_KEY');
    if (!apiKey) throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR);
    return { apiKey };
  }

  private authHeaders(apiKey: string) {
    return { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  }

  async createResource(input: CreateResourceInput): Promise<ResourceResult> {
    const { apiKey } = this.requireConfig();
    if (!input.source?.repoUrl) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, 'Render deployments require a connected Git repository.');
    }

    const res = await providerFetch(`${RENDER_API_BASE}/services`, {
      method: 'POST',
      headers: this.authHeaders(apiKey),
      body: JSON.stringify({
        type: 'web_service',
        name: `adevos-${input.projectId.slice(0, 8)}`,
        repo: input.source.repoUrl,
        branch: input.source.branch ?? 'main',
        envVars: Object.entries(input.environment).map(([key, value]) => ({ key, value })),
        serviceDetails: {
          env: input.runtime === 'PYTHON' ? 'python' : 'node',
          region: input.region ?? 'oregon',
          plan: 'starter',
          startCommand: input.startCommand ?? undefined,
        },
      }),
    });

    const body = (await res.json()) as { service: { id: string } };
    return { providerResourceId: body.service.id };
  }

  async deploy(input: DeployInput): Promise<DeployResult> {
    const { apiKey } = this.requireConfig();
    await providerFetch(`${RENDER_API_BASE}/services/${input.providerResourceId}/deploys`, {
      method: 'POST',
      headers: this.authHeaders(apiKey),
      body: JSON.stringify({ clearCache: 'do_not_clear' }),
    });
    return { success: true };
  }

  async start(resourceId: string): Promise<void> {
    const { apiKey } = this.requireConfig();
    await providerFetch(`${RENDER_API_BASE}/services/${resourceId}/resume`, { method: 'POST', headers: this.authHeaders(apiKey) });
  }

  async stop(resourceId: string): Promise<void> {
    const { apiKey } = this.requireConfig();
    await providerFetch(`${RENDER_API_BASE}/services/${resourceId}/suspend`, { method: 'POST', headers: this.authHeaders(apiKey) });
  }

  async restart(resourceId: string): Promise<void> {
    const { apiKey } = this.requireConfig();
    await providerFetch(`${RENDER_API_BASE}/services/${resourceId}/restart`, { method: 'POST', headers: this.authHeaders(apiKey) });
  }

  async delete(resourceId: string): Promise<void> {
    const { apiKey } = this.requireConfig();
    await providerFetch(`${RENDER_API_BASE}/services/${resourceId}`, { method: 'DELETE', headers: this.authHeaders(apiKey) });
  }

  async getStatus(resourceId: string): Promise<ResourceStatus> {
    const { apiKey } = this.requireConfig();
    const res = await providerFetch(`${RENDER_API_BASE}/services/${resourceId}`, { method: 'GET', headers: this.authHeaders(apiKey) });
    const body = (await res.json()) as { suspended: string };
    return { state: body.suspended === 'suspended' ? 'STOPPED' : 'RUNNING', raw: body };
  }

  async getLogs(resourceId: string): Promise<string> {
    const { apiKey } = this.requireConfig();
    const res = await providerFetch(`${RENDER_API_BASE}/logs?resource=${resourceId}&limit=200`, { method: 'GET', headers: this.authHeaders(apiKey) });
    const body = (await res.json()) as { logs?: { message: string }[] };
    return (body.logs ?? []).map((l) => l.message).join('\n');
  }

  async getUsage(): Promise<ResourceUsage> {
    // Render's public API does not expose live CPU/RAM metrics per
    // service (only via their metrics dashboard) — report zeroed usage
    // rather than inventing numbers; the Monitoring UI shows "not
    // available for this provider" when it sees this.
    return { cpuPercent: 0, ramMb: 0, storageMb: 0 };
  }

  async createBackup(): Promise<BackupResult> {
    throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR, 'Backups are not supported for Render-hosted services.');
  }

  async restoreBackup(): Promise<void> {
    throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR, 'Backups are not supported for Render-hosted services.');
  }
}
