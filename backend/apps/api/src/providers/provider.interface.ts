export interface CreateResourceInput {
  projectId: string;
  serviceSlug: string;
  runtime?: string | null;
  plan: { cpuMillicores: number; ramMb: number; storageMb: number };
  region?: string | null;
  environment: Record<string, string>;
  startCommand?: string | null;
  port?: number | null;
  source?: { type: string; repoUrl?: string; branch?: string; imageRef?: string } | null;
}

export interface ResourceResult {
  providerResourceId: string;
  metadata?: Record<string, unknown>;
}

export interface DeployInput {
  providerResourceId: string;
  source?: { type: string; repoUrl?: string; branch?: string; imageRef?: string } | null;
}

export interface DeployResult {
  success: boolean;
  logsUrl?: string;
}

export type ProviderResourceState = 'RUNNING' | 'STOPPED' | 'STARTING' | 'STOPPING' | 'CRASHED' | 'UNKNOWN';

export interface ResourceStatus {
  state: ProviderResourceState;
  raw?: Record<string, unknown>;
}

export interface ResourceUsage {
  cpuPercent: number;
  ramMb: number;
  storageMb: number;
  networkInBytes?: number;
  networkOutBytes?: number;
}

export interface BackupResult {
  providerBackupId: string;
  sizeBytes?: number;
}

/**
 * The common contract every provider adapter must implement. Controllers
 * and services depend only on this interface (injected per-provider via
 * the ProviderRouterService) — never on a specific adapter's SDK types.
 */
export interface HostingProvider {
  readonly key: string;

  isConfigured(): boolean;

  createResource(input: CreateResourceInput): Promise<ResourceResult>;
  deploy(input: DeployInput): Promise<DeployResult>;
  start(resourceId: string): Promise<void>;
  stop(resourceId: string): Promise<void>;
  restart(resourceId: string): Promise<void>;
  delete(resourceId: string): Promise<void>;
  getStatus(resourceId: string): Promise<ResourceStatus>;
  getLogs(resourceId: string): Promise<string>;
  getUsage(resourceId: string): Promise<ResourceUsage>;
  createBackup(resourceId: string): Promise<BackupResult>;
  restoreBackup(resourceId: string, backupId: string): Promise<void>;
}
