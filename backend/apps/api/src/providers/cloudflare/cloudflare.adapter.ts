import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppError } from '../../common/errors/app-error';
import { ErrorCode } from '../../common/errors/error-codes';
import { providerFetch } from '../common/provider-http';
import type {
  BackupResult, CreateResourceInput, DeployInput, DeployResult,
  HostingProvider, ResourceResult, ResourceStatus, ResourceUsage,
} from '../provider.interface';

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

@Injectable()
export class CloudflareAdapter implements HostingProvider {
  readonly key = 'CLOUDFLARE';

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('CLOUDFLARE_API_TOKEN') && this.config.get<string>('CLOUDFLARE_ACCOUNT_ID'));
  }

  private requireConfig(): { token: string; accountId: string } {
    const token = this.config.get<string>('CLOUDFLARE_API_TOKEN');
    const accountId = this.config.get<string>('CLOUDFLARE_ACCOUNT_ID');
    if (!token || !accountId) throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR);
    return { token, accountId };
  }

  private authHeaders(token: string) {
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  async createResource(input: CreateResourceInput): Promise<ResourceResult> {
    const { token, accountId } = this.requireConfig();
    const projectName = `adevos-${input.projectId.slice(0, 8)}`;

    const res = await providerFetch(`${CF_API_BASE}/accounts/${accountId}/pages/projects`, {
      method: 'POST',
      headers: this.authHeaders(token),
      body: JSON.stringify({
        name: projectName,
        production_branch: input.source?.branch ?? 'main',
        deployment_configs: {
          production: { env_vars: Object.fromEntries(Object.entries(input.environment).map(([k, v]) => [k, { value: v }])) },
        },
      }),
    });

    const body = (await res.json()) as { result: { name: string } };
    return { providerResourceId: body.result.name };
  }

  async deploy(input: DeployInput): Promise<DeployResult> {
    const { token, accountId } = this.requireConfig();
    const res = await providerFetch(`${CF_API_BASE}/accounts/${accountId}/pages/projects/${input.providerResourceId}/deployments`, {
      method: 'POST',
      headers: this.authHeaders(token),
      body: JSON.stringify({ branch: input.source?.branch ?? 'main' }),
    });
    const body = (await res.json()) as { result: { url: string } };
    return { success: true, logsUrl: body.result.url };
  }

  async start(): Promise<void> {
    // No-op — Cloudflare Pages sites are static and always served.
  }

  async stop(resourceId: string): Promise<void> {
    // Closest equivalent: pause deployment serving isn't a native Pages
    // action; deleting is the honest option here.
    throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR, 'Cloudflare Pages sites cannot be stopped independently — delete the project instead.');
  }

  async restart(): Promise<void> {
    throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR, 'Cloudflare Pages has no restart action — trigger a new deployment instead.');
  }

  async delete(resourceId: string): Promise<void> {
    const { token, accountId } = this.requireConfig();
    await providerFetch(`${CF_API_BASE}/accounts/${accountId}/pages/projects/${resourceId}`, { method: 'DELETE', headers: this.authHeaders(token) });
  }

  async getStatus(resourceId: string): Promise<ResourceStatus> {
    const { token, accountId } = this.requireConfig();
    const res = await providerFetch(`${CF_API_BASE}/accounts/${accountId}/pages/projects/${resourceId}`, { method: 'GET', headers: this.authHeaders(token) });
    const body = (await res.json()) as { result: { latest_deployment?: { latest_stage?: { status?: string } } } };
    const status = body.result.latest_deployment?.latest_stage?.status;
    return { state: status === 'success' ? 'RUNNING' : status === 'failure' ? 'CRASHED' : 'UNKNOWN', raw: body.result };
  }

  async getLogs(resourceId: string): Promise<string> {
    throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR, 'Build logs for Cloudflare Pages are available via the deployment detail endpoint, not a live stream.');
  }

  async getUsage(): Promise<ResourceUsage> {
    return { cpuPercent: 0, ramMb: 0, storageMb: 0 };
  }

  async createBackup(): Promise<BackupResult> {
    throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR, 'Backups are not applicable to Cloudflare Pages — deployments are already versioned.');
  }

  async restoreBackup(): Promise<void> {
    throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR, 'Use Cloudflare Pages deployment rollback instead of restore.');
  }
}
