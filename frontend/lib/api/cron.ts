import { api } from './http-client';

export interface CronJobView {
  id: string;
  schedule: string;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  project?: { id: string; name: string };
}

export interface CronExecutionView {
  id: string;
  deploymentId: string | null;
  triggeredAt: string;
}

export const cronApi = {
  listMine: () => api.get<CronJobView[]>('/v1/cron-jobs'),
  create: (projectId: string, schedule: string) => api.post<CronJobView>('/v1/cron-jobs', { projectId, schedule }),
  update: (id: string, updates: { schedule?: string; enabled?: boolean }) => api.patch<CronJobView>(`/v1/cron-jobs/${id}`, updates),
  remove: (id: string) => api.delete<null>(`/v1/cron-jobs/${id}`),
  runNow: (id: string) => api.post<{ queued: boolean }>(`/v1/cron-jobs/${id}/run-now`),
  listExecutions: (id: string) => api.get<CronExecutionView[]>(`/v1/cron-jobs/${id}/executions`),
};
