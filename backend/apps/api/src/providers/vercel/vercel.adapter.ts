import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppError } from '../../common/errors/app-error';
import { ErrorCode } from '../../common/errors/error-codes';
import { providerFetch } from '../common/provider-http';
import type {
  BackupResult, CreateResourceInput, DeployInput, DeployResult,
  HostingProvider, ResourceResult, ResourceStatus, ResourceUsage,
} from '../provider.interface';

const VERCEL_API_BASE = 'https://api.vercel.com';

/**
 * Vercel is deploy-oriented, not server-oriented: there is no persistent
 * "resource" to start/stop/restart — each deploy is immutable and the
 * latest one is what's live. start/stop/restart are implemented as
 * no-ops or clear errors rather than pretending Vercel has server
 * lifecycle semantics it doesn't have.
 */
@Injectable()
export class VercelAdapter implements HostingProvider {
  readonly key = 'VERCEL';

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('VERCEL_API_TOKEN'));
  }

  private requireConfig(): { token: string } {
    const token = this.config.get<string>('VERCEL_API_TOKEN');
    if (!token) throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR);
    return { token };
  }

  private authHeaders(token: string) {
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  async createResource(input: CreateResourceInput): Promise<ResourceResult> {
    const { token } = this.requireConfig();
    const res = await providerFetch(`${VERCEL_API_BASE}/v10/projects`, {
      method: 'POST',
      headers: this.authHeaders(token),
      body: JSON.stringify({
        name: `adevos-${input.projectId.slice(0, 8)}`,
        framework: input.runtime?.toLowerCase() ?? null,
        environmentVariables: Object.entries(input.environment).map(([key, value]) => ({
          key, value, type: 'encrypted', target: ['production'],
        })),
      }),
    });
    const body = (await res.json()) as { id: string };
    return { providerResourceId: body.id };
  }

  async deploy(input: DeployInput): Promise<DeployResult> {
    const { token } = this.requireConfig();
    if (!input.source?.repoUrl) throw new AppError(ErrorCode.VALIDATION_FAILED, 'A Git repository or ZIP source is required to deploy.');

    const res = await providerFetch(`${VERCEL_API_BASE}/v13/deployments`, {
      method: 'POST',
      headers: this.authHeaders(token),
      body: JSON.stringify({
        name: input.providerResourceId,
        gitSource: { type: 'github', repoId: input.source.repoUrl, ref: input.source.branch ?? 'main' },
        target: 'production',
      }),
    });
    const body = (await res.json()) as { url?: string };
    return { success: true, logsUrl: body.url ? `https://${body.url}` : undefined };
  }

  async start(): Promise<void> {
    // No-op: Vercel deployments are always "on" once live; there is no
    // separate start action.
  }

  async stop(resourceId: string): Promise<void> {
    // Closest equivalent: pause the project so new requests are rejected.
    const { token } = this.requireConfig();
    await providerFetch(`${VERCEL_API_BASE}/v9/projects/${resourceId}/pause`, { method: 'POST', headers: this.authHeaders(token) });
  }

  async restart(): Promise<void> {
    throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR, 'Vercel deployments are immutable — redeploy instead of restarting.');
  }

  async delete(resourceId: string): Promise<void> {
    const { token } = this.requireConfig();
    await providerFetch(`${VERCEL_API_BASE}/v9/projects/${resourceId}`, { method: 'DELETE', headers: this.authHeaders(token) });
  }

  async getStatus(resourceId: string): Promise<ResourceStatus> {
    const { token } = this.requireConfig();
    const res = await providerFetch(`${VERCEL_API_BASE}/v6/deployments?projectId=${resourceId}&limit=1`, { method: 'GET', headers: this.authHeaders(token) });
    const body = (await res.json()) as { deployments: { readyState: string }[] };
    const map: Record<string, ResourceStatus['state']> = { READY: 'RUNNING', BUILDING: 'STARTING', ERROR: 'CRASHED', CANCELED: 'STOPPED' };
    return { state: map[body.deployments[0]?.readyState ?? ''] ?? 'UNKNOWN', raw: body.deployments[0] };
  }

  async getLogs(resourceId: string): Promise<string> {
    const { token } = this.requireConfig();
    const res = await providerFetch(`${VERCEL_API_BASE}/v2/deployments/${resourceId}/events`, { method: 'GET', headers: this.authHeaders(token) });
    const body = (await res.json()) as { text?: string }[];
    return body.map((e) => e.text ?? '').filter(Boolean).join('\n');
  }

  async getUsage(): Promise<ResourceUsage> {
    return { cpuPercent: 0, ramMb: 0, storageMb: 0 };
  }

  async createBackup(): Promise<BackupResult> {
    throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR, 'Backups are not applicable to Vercel deployments — every deploy is already immutable and reversible via rollback.');
  }

  async restoreBackup(): Promise<void> {
    throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR, 'Use a deployment rollback instead of restore for Vercel projects.');
  }
}
