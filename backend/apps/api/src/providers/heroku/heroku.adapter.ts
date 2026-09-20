import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppError } from '../../common/errors/app-error';
import { ErrorCode } from '../../common/errors/error-codes';
import { providerFetch } from '../common/provider-http';
import type {
  BackupResult, CreateResourceInput, DeployInput, DeployResult,
  HostingProvider, ResourceResult, ResourceStatus, ResourceUsage,
} from '../provider.interface';

const HEROKU_API_BASE = 'https://api.heroku.com';

@Injectable()
export class HerokuAdapter implements HostingProvider {
  readonly key = 'HEROKU';

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('HEROKU_API_KEY'));
  }

  private requireConfig(): { apiKey: string } {
    const apiKey = this.config.get<string>('HEROKU_API_KEY');
    if (!apiKey) throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR);
    return { apiKey };
  }

  private authHeaders(apiKey: string) {
    return { Authorization: `Bearer ${apiKey}`, Accept: 'application/vnd.heroku+json; version=3', 'Content-Type': 'application/json' };
  }

  async createResource(input: CreateResourceInput): Promise<ResourceResult> {
    const { apiKey } = this.requireConfig();
    const res = await providerFetch(`${HEROKU_API_BASE}/apps`, {
      method: 'POST',
      headers: this.authHeaders(apiKey),
      body: JSON.stringify({ name: `adevos-${input.projectId.slice(0, 8)}`, region: input.region ?? 'us' }),
    });
    const body = (await res.json()) as { id: string; name: string };

    if (Object.keys(input.environment).length > 0) {
      await providerFetch(`${HEROKU_API_BASE}/apps/${body.id}/config-vars`, {
        method: 'PATCH',
        headers: this.authHeaders(apiKey),
        body: JSON.stringify(input.environment),
      });
    }

    return { providerResourceId: body.id, metadata: { name: body.name } };
  }

  async deploy(input: DeployInput): Promise<DeployResult> {
    const { apiKey } = this.requireConfig();
    if (!input.source?.imageRef) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, 'Heroku deployments require a container image reference in this adapter.');
    }
    await providerFetch(`${HEROKU_API_BASE}/apps/${input.providerResourceId}/formation`, {
      method: 'PATCH',
      headers: this.authHeaders(apiKey),
      body: JSON.stringify({ updates: [{ type: 'web', quantity: 1 }] }),
    });
    return { success: true };
  }

  async start(resourceId: string): Promise<void> {
    const { apiKey } = this.requireConfig();
    await providerFetch(`${HEROKU_API_BASE}/apps/${resourceId}/formation`, {
      method: 'PATCH',
      headers: this.authHeaders(apiKey),
      body: JSON.stringify({ updates: [{ type: 'web', quantity: 1 }] }),
    });
  }

  async stop(resourceId: string): Promise<void> {
    const { apiKey } = this.requireConfig();
    await providerFetch(`${HEROKU_API_BASE}/apps/${resourceId}/formation`, {
      method: 'PATCH',
      headers: this.authHeaders(apiKey),
      body: JSON.stringify({ updates: [{ type: 'web', quantity: 0 }] }),
    });
  }

  async restart(resourceId: string): Promise<void> {
    const { apiKey } = this.requireConfig();
    await providerFetch(`${HEROKU_API_BASE}/apps/${resourceId}/dynos`, { method: 'DELETE', headers: this.authHeaders(apiKey) });
  }

  async delete(resourceId: string): Promise<void> {
    const { apiKey } = this.requireConfig();
    await providerFetch(`${HEROKU_API_BASE}/apps/${resourceId}`, { method: 'DELETE', headers: this.authHeaders(apiKey) });
  }

  async getStatus(resourceId: string): Promise<ResourceStatus> {
    const { apiKey } = this.requireConfig();
    const res = await providerFetch(`${HEROKU_API_BASE}/apps/${resourceId}/dynos`, { method: 'GET', headers: this.authHeaders(apiKey) });
    const body = (await res.json()) as { state: string }[];
    const map: Record<string, ResourceStatus['state']> = { up: 'RUNNING', down: 'STOPPED', starting: 'STARTING', crashed: 'CRASHED' };
    return { state: map[body[0]?.state ?? ''] ?? 'UNKNOWN', raw: { dynos: body } };
  }

  async getLogs(resourceId: string): Promise<string> {
    const { apiKey } = this.requireConfig();
    const sessionRes = await providerFetch(`${HEROKU_API_BASE}/apps/${resourceId}/log-sessions`, {
      method: 'POST',
      headers: this.authHeaders(apiKey),
      body: JSON.stringify({ tail: false, lines: 200 }),
    });
    const session = (await sessionRes.json()) as { logplex_url: string };
    const logRes = await providerFetch(session.logplex_url, { method: 'GET' });
    return logRes.text();
  }

  async getUsage(): Promise<ResourceUsage> {
    return { cpuPercent: 0, ramMb: 0, storageMb: 0 };
  }

  async createBackup(): Promise<BackupResult> {
    throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR, 'Application backups are not supported by this Heroku adapter (only database backups are, via the Databases module).');
  }

  async restoreBackup(): Promise<void> {
    throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR, 'Application backups are not supported by this Heroku adapter.');
  }
}
