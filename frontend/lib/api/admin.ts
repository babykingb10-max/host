import { api } from './http-client';

export interface AdminUserListItem {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminUserDetail extends AdminUserListItem {
  emailVerified: boolean;
  roles: string[];
  creditBalance: number;
  subscriptionTier: string;
  projectCount: number;
}

export interface AdminProjectListItem {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  owner: { username: string; email: string };
  service: { name: string; slug: string };
}

export interface Paginated<T> {
  items: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface AdminBotSubmission {
  id: string;
  name: string;
  description: string;
  repository: string;
  branch: string;
  runtime: string;
  status: string;
  reviewNotes: string | null;
  createdAt: string;
  submittedBy: { username: string; email: string };
}

export interface AdminProvider {
  id: string;
  key: string;
  name: string;
  enabled: boolean;
  healthStatus: string;
  hasCredentials: boolean;
  envConfigured: boolean;
}

export interface AuditLogEntry {
  id: string;
  actorUserId: string;
  actorRole: string | null;
  action: string;
  targetType: string;
  targetId: string;
  result: string;
  createdAt: string;
}

export interface FeatureFlagItem {
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
}

export const adminApi = {
  listUsers: (params: { search?: string; status?: string; page?: number } = {}) =>
    api.get<Paginated<AdminUserListItem>>(`/v1/admin/users?${new URLSearchParams(params as never).toString()}`),
  getUserDetail: (id: string) => api.get<AdminUserDetail>(`/v1/admin/users/${id}`),
  setUserStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED') =>
    api.patch<{ message: string }>(`/v1/admin/users/${id}/status`, { status }),

  listProjects: (params: { search?: string; status?: string; page?: number } = {}) =>
    api.get<Paginated<AdminProjectListItem>>(`/v1/admin/projects?${new URLSearchParams(params as never).toString()}`),
  restartProject: (id: string) => api.post<{ message: string }>(`/v1/admin/projects/${id}/restart`),
  stopProject: (id: string) => api.post<{ message: string }>(`/v1/admin/projects/${id}/stop`),
  suspendProject: (id: string) => api.post<{ message: string }>(`/v1/admin/projects/${id}/suspend`),
  resumeProject: (id: string) => api.post<{ message: string }>(`/v1/admin/projects/${id}/resume`),
  deleteProject: (id: string) => api.delete<null>(`/v1/admin/projects/${id}`),

  listBotSubmissions: (status?: string) => api.get<AdminBotSubmission[]>(`/v1/admin/bot-submissions${status ? `?status=${status}` : ''}`),
  approveBotSubmission: (id: string, reviewNotes?: string) => api.post<{ botId: string }>(`/v1/admin/bot-submissions/${id}/approve`, { reviewNotes }),
  rejectBotSubmission: (id: string, reviewNotes: string) => api.post<{ message: string }>(`/v1/admin/bot-submissions/${id}/reject`, { reviewNotes }),
  requestBotChanges: (id: string, reviewNotes: string) => api.post<{ message: string }>(`/v1/admin/bot-submissions/${id}/request-changes`, { reviewNotes }),

  listProviders: () => api.get<AdminProvider[]>('/v1/admin/providers'),
  enableProvider: (key: string) => api.post<{ message: string }>(`/v1/admin/providers/${key}/enable`),
  disableProvider: (key: string) => api.post<{ message: string }>(`/v1/admin/providers/${key}/disable`),
  testProvider: (key: string) => api.post<{ configured: boolean; message: string }>(`/v1/admin/providers/${key}/test`),

  listAuditLogs: (params: { page?: number } = {}) =>
    api.get<Paginated<AuditLogEntry>>(`/v1/admin/audit-logs?${new URLSearchParams(params as never).toString()}`),

  listFeatureFlags: () => api.get<FeatureFlagItem[]>('/v1/admin/feature-flags'),
  setFeatureFlag: (key: string, enabled: boolean) => api.patch<FeatureFlagItem>(`/v1/admin/feature-flags/${key}`, { enabled }),

  adjustCredits: (userId: string, amount: number, reason: string) =>
    api.post<{ message: string }>(`/v1/admin/credits/users/${userId}/adjust`, { amount, reason }),

  listAdProviders: () => api.get<AdminAdProvider[]>('/v1/admin/ads'),
  saveAdProvider: (payload: AdminAdProviderInput) => api.post<AdminAdProvider>('/v1/admin/ads', payload),
  updateAdProvider: (key: string, payload: Omit<AdminAdProviderInput, 'key'>) => api.patch<AdminAdProvider>(`/v1/admin/ads/${key}`, payload),

  listPromotions: () => api.get<AdminPromotion[]>('/v1/admin/promotions'),
  createPromotion: (payload: CreatePromotionInput) => api.post<AdminPromotion>('/v1/admin/promotions', payload),
  setPromotionActive: (id: string, active: boolean) => api.patch<AdminPromotion>(`/v1/admin/promotions/${id}/active`, { active }),

  listBillingPlans: () => api.get<AdminBillingPlan[]>('/v1/admin/billing/plans'),
  updateBillingPlan: (tier: string, payload: Partial<AdminBillingPlan>) => api.patch<AdminBillingPlan>(`/v1/admin/billing/plans/${tier}`, payload),
  getRevenue: () => api.get<{ totalUsers: number; byPlan: { tier?: string; name?: string; activeSubscribers: number; monthlyRevenue: number }[] }>('/v1/admin/billing/revenue'),

  listSecurityEvents: (params: { severity?: string; page?: number } = {}) =>
    api.get<Paginated<SecurityEvent>>(`/v1/admin/security/events?${new URLSearchParams(params as never).toString()}`),
  resolveSecurityEvent: (id: string) => api.patch<{ message: string }>(`/v1/admin/security/events/${id}/resolve`),

  getMaintenanceMode: () => api.get<MaintenanceMode>('/v1/admin/settings/maintenance'),
  setMaintenanceMode: (payload: MaintenanceMode) => api.put<MaintenanceMode>('/v1/admin/settings/maintenance', payload),
};

export interface AdminAdProvider {
  id: string; key: string; name: string; enabled: boolean;
  rewardAmount: number; dailyLimit: number; cooldownSeconds: number;
  verificationUrl: string | null;
  analytics: { impressions: number; completions: number; rewards: number };
}
export interface AdminAdProviderInput {
  key: string; name: string; rewardAmount: number; dailyLimit: number; cooldownSeconds: number; enabled: boolean; verificationUrl?: string;
}

export interface AdminPromotion {
  id: string; title: string; description: string; rewardAmount: number;
  startAt: string; endAt: string; usageLimit: number | null; perUserLimit: number;
  active: boolean; claimCount: number;
}
export interface CreatePromotionInput {
  title: string; description: string; rewardAmount: number; startAt: string; endAt: string; usageLimit?: number; perUserLimit: number;
}

export interface AdminBillingPlan {
  tier: string; name: string; priceAmount: number; priceCurrency: string;
  maxProjects: number; maxDeploymentsPerDay: number;
  allowsCustomDomains: boolean; allowsBackups: boolean; alwaysOn: boolean; enabled: boolean;
}

export interface SecurityEvent {
  id: string; type: string; severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId: string | null; ipAddress: string | null; message: string; resolved: boolean; createdAt: string;
}

export interface MaintenanceMode {
  enabled: boolean; message?: string; start?: string; expectedEnd?: string;
}
