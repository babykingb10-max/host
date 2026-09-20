import { api } from './http-client';

export interface AdProviderView {
  id: string;
  key: string;
  name: string;
  rewardAmount: number;
  dailyLimit: number;
  cooldownSeconds: number;
}

export const adsApi = {
  listProviders: () => api.get<AdProviderView[]>('/v1/ads/providers'),
  trackImpression: (providerId: string) => api.post<void>(`/v1/ads/${providerId}/impression`),
  complete: (providerId: string, token?: string) => api.post<{ rewarded: number }>(`/v1/ads/${providerId}/complete`, { token }),
};

export interface ReferralInfo {
  referralCode: string | null;
  referralLink: string | null;
  totalReferred: number;
  totalRewarded: number;
  totalRewardsEarned: number;
  history: { username: string; status: string; rewardAmount: number | null; createdAt: string }[];
}

export const referralsApi = {
  getMine: () => api.get<ReferralInfo>('/v1/referrals/me'),
};

export interface PromotionView {
  id: string;
  title: string;
  description: string;
  rewardAmount: number;
  endAt: string;
  alreadyClaimed: boolean;
  soldOut: boolean;
}

export const promotionsApi = {
  list: () => api.get<PromotionView[]>('/v1/promotions'),
  claim: (id: string) => api.post<{ rewarded: number }>(`/v1/promotions/${id}/claim`),
};

export interface SubscriptionPlanView {
  tier: 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS';
  name: string;
  price: { amount: number; currency: string };
  maxProjects: number;
  maxDeploymentsPerDay: number;
  allowsCustomDomains: boolean;
  allowsBackups: boolean;
  alwaysOn: boolean;
}

export interface MySubscription {
  tier: string;
  name: string;
  status: string;
  startedAt: string;
  expiresAt: string | null;
  maxProjects: number;
}

export const subscriptionsApi = {
  listPlans: () => api.get<SubscriptionPlanView[]>('/v1/subscriptions/plans'),
  getMine: () => api.get<MySubscription | null>('/v1/subscriptions/me'),
  subscribe: (tier: string) => api.post<{ tier: string; status: string }>('/v1/subscriptions/subscribe', { tier }),
  cancel: () => api.delete<null>('/v1/subscriptions/me'),
};
