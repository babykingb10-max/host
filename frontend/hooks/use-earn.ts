import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { creditsApi } from '@/lib/api/credits';
import { adsApi, referralsApi, promotionsApi, subscriptionsApi } from '@/lib/api/earn';

export function useCreditWallet() {
  return useQuery({ queryKey: ['credits', 'wallet'], queryFn: creditsApi.getWallet });
}

export function useCreditTransactions(filter?: 'earned' | 'spent') {
  return useQuery({ queryKey: ['credits', 'transactions', filter ?? 'all'], queryFn: () => creditsApi.listTransactions(filter) });
}

export function useClaimDailyCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: creditsApi.claimDailyCheckin,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credits'] });
    },
  });
}

export function useAdProviders() {
  return useQuery({ queryKey: ['ads', 'providers'], queryFn: adsApi.listProviders });
}

export function useCompleteAd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ providerId, token }: { providerId: string; token?: string }) => adsApi.complete(providerId, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credits'] }),
  });
}

export function useReferralInfo() {
  return useQuery({ queryKey: ['referrals', 'me'], queryFn: referralsApi.getMine });
}

export function usePromotions() {
  return useQuery({ queryKey: ['promotions'], queryFn: promotionsApi.list });
}

export function useClaimPromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => promotionsApi.claim(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promotions'] });
      qc.invalidateQueries({ queryKey: ['credits'] });
    },
  });
}

export function useSubscriptionPlans() {
  return useQuery({ queryKey: ['subscriptions', 'plans'], queryFn: subscriptionsApi.listPlans });
}

export function useMySubscription() {
  return useQuery({ queryKey: ['subscriptions', 'me'], queryFn: subscriptionsApi.getMine });
}

export function useSubscribe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tier: string) => subscriptionsApi.subscribe(tier),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      qc.invalidateQueries({ queryKey: ['credits'] });
    },
  });
}
