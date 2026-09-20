import { api } from './http-client';
import type { ProjectStatus } from '@/config/design-tokens';

export interface ProjectCapabilities {
  start: boolean;
  stop: boolean;
  restart: boolean;
  logs: boolean;
  console: boolean;
  backups: boolean;
  domains: boolean;
}

export interface ProjectListItem {
  id: string;
  name: string;
  slug: string;
  status: ProjectStatus;
  region: string | null;
  runtime: string | null;
  capabilities: ProjectCapabilities;
  source?: { type?: string; botId?: string; owner?: string; repo?: string; branch?: string } | null;
  service?: { slug: string; name: string; icon: string };
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedProjects {
  items: ProjectListItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface ListProjectsParams {
  status?: string;
  serviceSlug?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

function toQueryString(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const projectsApi = {
  list: (params: ListProjectsParams = {}) => api.get<PaginatedProjects>(`/v1/projects${toQueryString(params)}`),
  get: (id: string) => api.get<ProjectListItem>(`/v1/projects/${id}`),
  create: (payload: { name: string; serviceId: string; servicePlanId: string }) =>
    api.post<ProjectListItem>('/v1/projects', payload),
  rename: (id: string, name: string) => api.patch<ProjectListItem>(`/v1/projects/${id}`, { name }),
  remove: (id: string) => api.delete<null>(`/v1/projects/${id}`),

  deploy: (projectId: string, payload?: { source?: Record<string, unknown>; environment?: Record<string, string> }) =>
    api.post<{ deploymentId: string; status: string }>(`/v1/projects/${projectId}/deploy`, payload ?? {}),
  listDeployments: (projectId: string) => api.get<DeploymentSummary[]>(`/v1/projects/${projectId}/deployments`),
  getDeployment: (deploymentId: string) => api.get<DeploymentSummary>(`/v1/deployments/${deploymentId}`),
  getDeploymentEvents: (deploymentId: string) => api.get<DeploymentEvent[]>(`/v1/deployments/${deploymentId}/events`),
};

export interface DeploymentSummary {
  id: string;
  projectId: string;
  status: string;
  attempt: number;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface DeploymentEvent {
  deploymentId: string;
  type: 'STEP' | 'LOG' | 'ERROR';
  step?: string;
  message: string;
  createdAt: string;
}
