import { api } from './http-client';

export interface DomainView {
  id: string;
  domainName: string;
  status: string;
  sslStatus: string;
  verifiedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  project?: { id: string; name: string };
  dnsInstructions: { type: string; name: string; value: string };
}

export const domainsApi = {
  listMine: () => api.get<DomainView[]>('/v1/domains'),
  add: (projectId: string, domainName: string) => api.post<DomainView>(`/v1/projects/${projectId}/domains`, { domainName }),
  verify: (id: string) => api.post<DomainView>(`/v1/domains/${id}/verify`),
  remove: (id: string) => api.delete<null>(`/v1/domains/${id}`),
};
