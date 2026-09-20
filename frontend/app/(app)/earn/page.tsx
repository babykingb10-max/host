'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Coins, Gift, Users, Calendar, Copy, PlayCircle } from 'lucide-react';
import {
  useCreditWallet, useCreditTransactions, useClaimDailyCheckin,
  useAdProviders, useCompleteAd, useReferralInfo, usePromotions, useClaimPromotion,
} from '@/hooks/use-earn';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ApiError } from '@/lib/api/api-error';

export default function EarnPage() {
  const walletQuery = useCreditWallet();
  const [txFilter, setTxFilter] = useState<'all' | 'earned' | 'spent'>('all');
  const txQuery = useCreditTransactions(txFilter === 'all' ? undefined : txFilter);
  const checkinMutation = useClaimDailyCheckin();
  const adProvidersQuery = useAdProviders();
  const completeAdMutation = useCompleteAd();
  const referralQuery = useReferralInfo();
  const promotionsQuery = usePromotions();
  const claimPromotionMutation = useClaimPromotion();

  const handleCheckin = async () => {
    const result = await checkinMutation.mutateAsync();
    if (result.alreadyClaimedToday) {
      toast.info("You've already checked in today.");
    } else {
      toast.success(`+${result.amount} credits!`);
    }
  };

  const handleWatchAd = async (providerId: string) => {
    try {
      // A real ad SDK would play the ad here and hand back a
      // verification token; the server independently verifies
      // completion before granting any reward (spec §34).
      await completeAdMutation.mutateAsync({ providerId });
      toast.success('Reward granted!');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'This ad reward is not available right now.');
    }
  };

  const handleClaimPromotion = async (id: string) => {
    try {
      const result = await claimPromotionMutation.mutateAsync(id);
      toast.success(`+${result.rewarded} credits!`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not claim this promotion.');
    }
  };

  const copyReferralLink = () => {
    if (!referralQuery.data?.referralLink) return;
    navigator.clipboard.writeText(referralQuery.data.referralLink).then(() => toast.success('Copied.'));
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Earn Credits</h1>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-card p-4">
          <Coins className="h-5 w-5 text-primary" aria-hidden />
          {walletQuery.isLoading ? <Skeleton className="h-6 w-20" /> : <span className="text-2xl font-bold">{walletQuery.data?.balance ?? 0}</span>}
          <span className="text-sm text-muted-foreground">credits</span>
        </div>
      </div>

      {/* Daily Check-in */}
      <section className="rounded-xl border border-border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="text-sm font-semibold">Daily Check-in</h2>
          </div>
          <Button size="sm" onClick={handleCheckin} loading={checkinMutation.isPending}>
            Check In
          </Button>
        </div>
      </section>

      {/* Rewarded Ads */}
      <section className="rounded-xl border border-border p-5">
        <div className="mb-3 flex items-center gap-2">
          <PlayCircle className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="text-sm font-semibold">Rewarded Ads</h2>
        </div>
        {adProvidersQuery.isLoading && <Skeleton className="h-16" />}
        {adProvidersQuery.data && adProvidersQuery.data.length === 0 && (
          <p className="text-sm text-muted-foreground">No ad providers are available right now — check back soon.</p>
        )}
        {adProvidersQuery.data && adProvidersQuery.data.length > 0 && (
          <div className="space-y-2">
            {adProvidersQuery.data.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">+{p.rewardAmount} credits · limit {p.dailyLimit}/day</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleWatchAd(p.id)} loading={completeAdMutation.isPending}>
                  Watch Ad
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Referrals */}
      <section className="rounded-xl border border-border p-5">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="text-sm font-semibold">Referrals</h2>
        </div>
        {referralQuery.isLoading && <Skeleton className="h-16" />}
        {referralQuery.data && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 text-xs">{referralQuery.data.referralLink}</code>
              <Button variant="outline" size="icon" aria-label="Copy" onClick={copyReferralLink}>
                <Copy className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
            <div className="flex gap-6 text-sm">
              <div><span className="font-semibold">{referralQuery.data.totalReferred}</span> <span className="text-muted-foreground">referred</span></div>
              <div><span className="font-semibold">{referralQuery.data.totalRewardsEarned}</span> <span className="text-muted-foreground">credits earned</span></div>
            </div>
            <p className="text-xs text-muted-foreground">Rewards are granted once your referral verifies their email.</p>
          </div>
        )}
      </section>

      {/* Promotions */}
      <section className="rounded-xl border border-border p-5">
        <div className="mb-3 flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="text-sm font-semibold">Promotions</h2>
        </div>
        {promotionsQuery.isLoading && <Skeleton className="h-16" />}
        {promotionsQuery.data && promotionsQuery.data.length === 0 && (
          <EmptyState title="No active promotions" description="Check back later for new campaigns." />
        )}
        {promotionsQuery.data && promotionsQuery.data.length > 0 && (
          <div className="space-y-2">
            {promotionsQuery.data.map((promo) => (
              <div key={promo.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{promo.title}</p>
                  <p className="text-xs text-muted-foreground">{promo.description} · +{promo.rewardAmount} credits</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={promo.alreadyClaimed || promo.soldOut}
                  onClick={() => handleClaimPromotion(promo.id)}
                  loading={claimPromotionMutation.isPending}
                >
                  {promo.alreadyClaimed ? 'Claimed' : promo.soldOut ? 'Sold Out' : 'Claim'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Credit history */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Credit History</h2>
          <div className="flex gap-1.5">
            {(['all', 'earned', 'spent'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTxFilter(f)}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${txFilter === f ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        {txQuery.data && txQuery.data.length === 0 && <p className="text-sm text-muted-foreground">No transactions yet.</p>}
        {txQuery.data && txQuery.data.length > 0 && (
          <div className="divide-y divide-border rounded-lg border border-border">
            {txQuery.data.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-2.5 text-sm">
                <span>{tx.reason}</span>
                <span className={tx.amount > 0 ? 'font-medium text-success' : 'font-medium text-danger'}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
