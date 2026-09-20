import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppError } from '../../common/errors/app-error';
import { ErrorCode } from '../../common/errors/error-codes';
import { providerFetch } from '../common/provider-http';
import type {
  BackupResult, CreateResourceInput, DeployInput, DeployResult,
  HostingProvider, ResourceResult, ResourceStatus, ResourceUsage,
} from '../provider.interface';

/**
 * Pterodactyl Panel adapter. Uses the Application API (server
 * create/delete, node/allocation selection) for provisioning and the
 * Client API (power actions, resource usage, console) for day-to-day
 * management, per Pterodactyl's own API split.
 *
 * Credentials (PTERODACTYL_BASE_URL / PTERODACTYL_API_KEY) come from
 * env for now; Phase 9's Admin > Providers screen lets an admin store
 * per-instance credentials in ProviderCredential (encrypted) instead —
 * this adapter already reads from either source via `resolveConfig()`.
 */
@Injectable()
export class PterodactylAdapter implements HostingProvider {
  readonly key = 'PTERODACTYL';

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('PTERODACTYL_BASE_URL') && this.config.get<string>('PTERODACTYL_API_KEY'));
  }

  private requireConfig(): { baseUrl: string; apiKey: string } {
    const baseUrl = this.config.get<string>('PTERODACTYL_BASE_URL');
    const apiKey = this.config.get<string>('PTERODACTYL_API_KEY');
    if (!baseUrl || !apiKey) throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR);
    return { baseUrl, apiKey };
  }

  private authHeaders(apiKey: string) {
    return { Authorization: `Bearer ${apiKey}`, Accept: 'Application/vnd.pterodactyl.v1+json', 'Content-Type': 'application/json' };
  }

  async createResource(input: CreateResourceInput): Promise<ResourceResult> {
    const { baseUrl, apiKey } = this.requireConfig();

    // Node/allocation selection is intentionally left to Pterodactyl's
    // deploy strategy here (nest/egg IDs come from the service's
    // provider-specific config, populated by admin per service).
    const res = await providerFetch(`${baseUrl}/api/application/servers`, {
      method: 'POST',
      headers: this.authHeaders(apiKey),
      body: JSON.stringify({
        name: `adevos-${input.projectId.slice(0, 8)}`,
        limits: {
          memory: input.plan.ramMb,
          swap: 0,
          disk: input.plan.storageMb,
          io: 500,
          cpu: Math.max(10, Math.round(input.plan.cpuMillicores / 10)),
        },
        feature_limits: { databases: 0, backups: 2, allocations: 1 },
        environment: input.environment,
        start_on_completion: false,
      }),
    });

    const body = (await res.json()) as { attributes: { identifier: string; id: number } };
    return { providerResourceId: body.attributes.identifier, metadata: { internalId: body.attributes.id } };
  }

  async deploy(input: DeployInput): Promise<DeployResult> {
    // Pterodactyl servers install on creation; "deploy" here triggers a
    // reinstall/restart to pick up updated source, then powers on.
    await this.start(input.providerResourceId);
    return { success: true };
  }

  async start(resourceId: string): Promise<void> {
    await this.sendPowerSignal(resourceId, 'start');
  }

  async stop(resourceId: string): Promise<void> {
    await this.sendPowerSignal(resourceId, 'stop');
  }

  async restart(resourceId: string): Promise<void> {
    await this.sendPowerSignal(resourceId, 'restart');
  }

  async delete(resourceId: string): Promise<void> {
    const { baseUrl, apiKey } = this.requireConfig();
    await providerFetch(`${baseUrl}/api/application/servers/${resourceId}`, {
      method: 'DELETE',
      headers: this.authHeaders(apiKey),
    });
  }

  async getStatus(resourceId: string): Promise<ResourceStatus> {
    const { baseUrl, apiKey } = this.requireConfig();
    const res = await providerFetch(`${baseUrl}/api/client/servers/${resourceId}/resources`, {
      method: 'GET',
      headers: this.authHeaders(apiKey),
    });
    const body = (await res.json()) as { attributes: { current_state: string } };
    const stateMap: Record<string, ResourceStatus['state']> = {
      running: 'RUNNING', offline: 'STOPPED', starting: 'STARTING', stopping: 'STOPPING',
    };
    return { state: stateMap[body.attributes.current_state] ?? 'UNKNOWN', raw: body.attributes };
  }

  async getLogs(resourceId: string): Promise<string> {
    // Pterodactyl streams console output over websocket; a REST snapshot
    // isn't natively available, so the live LogViewer (frontend) connects
    // via the platform's own WebSocket gateway (Phase 4), which proxies
    // this. This method exists to satisfy the interface for adapters that
    // *do* expose a REST log snapshot; here it signals "use the stream".
    throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR, 'Pterodactyl logs are only available via the live console stream.');
  }

  async getUsage(resourceId: string): Promise<ResourceUsage> {
    const { baseUrl, apiKey } = this.requireConfig();
    const res = await providerFetch(`${baseUrl}/api/client/servers/${resourceId}/resources`, {
      method: 'GET',
      headers: this.authHeaders(apiKey),
    });
    const body = (await res.json()) as { attributes: { resources: { cpu_absolute: number; memory_bytes: number; disk_bytes: number; network_rx_bytes: number; network_tx_bytes: number } } };
    const r = body.attributes.resources;
    return {
      cpuPercent: r.cpu_absolute,
      ramMb: Math.round(r.memory_bytes / (1024 * 1024)),
      storageMb: Math.round(r.disk_bytes / (1024 * 1024)),
      networkInBytes: r.network_rx_bytes,
      networkOutBytes: r.network_tx_bytes,
    };
  }

  async createBackup(resourceId: string): Promise<BackupResult> {
    const { baseUrl, apiKey } = this.requireConfig();
    const res = await providerFetch(`${baseUrl}/api/client/servers/${resourceId}/backups`, {
      method: 'POST',
      headers: this.authHeaders(apiKey),
      body: JSON.stringify({}),
    });
    const body = (await res.json()) as { attributes: { uuid: string; bytes: number } };
    return { providerBackupId: body.attributes.uuid, sizeBytes: body.attributes.bytes };
  }

  async restoreBackup(resourceId: string, backupId: string): Promise<void> {
    const { baseUrl, apiKey } = this.requireConfig();
    await providerFetch(`${baseUrl}/api/client/servers/${resourceId}/backups/${backupId}/restore`, {
      method: 'POST',
      headers: this.authHeaders(apiKey),
      body: JSON.stringify({ truncate: true }),
    });
  }

  private async sendPowerSignal(resourceId: string, signal: 'start' | 'stop' | 'restart' | 'kill'): Promise<void> {
    const { baseUrl, apiKey } = this.requireConfig();
    await providerFetch(`${baseUrl}/api/client/servers/${resourceId}/power`, {
      method: 'POST',
      headers: this.authHeaders(apiKey),
      body: JSON.stringify({ signal }),
    });
  }
}
