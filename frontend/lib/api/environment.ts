import { api } from './http-client';

export interface EnvVar {
  id: string;
  key: string;
  isSecret: boolean;
  value: string; // masked ("••••••••") for secrets until revealed
  updatedAt: string;
}

export const environmentApi = {
  list: (projectId: string) => api.get<EnvVar[]>(`/v1/projects/${projectId}/environment`),
  reveal: (projectId: string, varId: string) => api.get<{ value: string }>(`/v1/projects/${projectId}/environment/${varId}/reveal`),
  create: (projectId: string, payload: { key: string; value: string; isSecret?: boolean }) =>
    api.post<{ id: string; key: string; isSecret: boolean }>(`/v1/projects/${projectId}/environment`, payload),
  update: (projectId: string, varId: string, payload: { value: string; isSecret?: boolean }) =>
    api.patch<{ id: string; key: string; isSecret: boolean }>(`/v1/projects/${projectId}/environment/${varId}`, payload),
  remove: (projectId: string, varId: string) => api.delete<null>(`/v1/projects/${projectId}/environment/${varId}`),
  bulkImport: (projectId: string, content: string) =>
    api.post<{ imported: number; skipped: number }>(`/v1/projects/${projectId}/environment/bulk-import`, { content }),
};
