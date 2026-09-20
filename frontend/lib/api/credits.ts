import { api } from './http-client';

export interface CreditWallet {
  balance: number;
}

export interface CreditTransaction {
  id: string;
  amount: number;
  type: string;
  reason: string;
  createdAt: string;
}

export const creditsApi = {
  getWallet: () => api.get<CreditWallet>('/v1/credits'),
  listTransactions: (filter?: 'earned' | 'spent') =>
    api.get<CreditTransaction[]>(`/v1/credits/transactions${filter ? `?filter=${filter}` : ''}`),
  claimDailyCheckin: () => api.post<{ amount: number; alreadyClaimedToday: boolean }>('/v1/credits/daily-checkin'),
};
