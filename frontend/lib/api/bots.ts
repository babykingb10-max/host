import { api } from './http-client';

export interface CatalogBot {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  category: string;
  tags: string[];
  runtime: string;
  runtimeVersion: string | null;
  pairingMode: string;
  documentationUrl: string | null;
  resourceRequirements: { cpuMillicores?: number; ramMb?: number; storageMb?: number };
}

export const botsApi = {
  list: (category?: string) => api.get<CatalogBot[]>(`/v1/bots${category ? `?category=${category}` : ''}`),
  get: (id: string) => api.get<CatalogBot>(`/v1/bots/${id}`),
  submit: (payload: Record<string, unknown>) => api.post<{ id: string; status: string }>('/v1/bots/submit', payload),
  listMine: () => api.get<{ id: string; name: string; status: string; reviewNotes: string | null; createdAt: string }[]>('/v1/bots/submissions/mine'),
};
