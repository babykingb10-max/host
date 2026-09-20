import { api } from './http-client';

export interface GithubConnection {
  githubUsername: string;
  connectedAt: string;
  scopes: string[];
}

export interface GithubRepo {
  id: number;
  fullName: string;
  owner: string;
  name: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
}

export const githubApi = {
  getConnection: () => api.get<GithubConnection | null>('/v1/github/connection'),
  getAuthorizeUrl: () => api.get<{ url: string }>('/v1/github/oauth/url'),
  disconnect: () => api.delete<null>('/v1/github/connection'),
  listRepositories: () => api.get<GithubRepo[]>('/v1/github/repositories'),
  listBranches: (owner: string, repo: string) => api.get<string[]>(`/v1/github/repositories/${owner}/${repo}/branches`),
};
