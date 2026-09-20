'use client';

import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { useSubscriptionPlans, useMySubscription, useSubscribe } from '@/hooks/use-earn';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api/api-error';
import { cn } from '@/lib/utils/cn';

export default function BillingPage() {
  const plansQuery = useSubscriptionPlans();
  const mySubQuery = useMySubscription();
  const subscribeMutation = useSubscribe();

  const handleSubscribe = async (tier: string) => {
    try {
      await subscribeMutation.mutateAsync(tier);
      toast.success('Plan updated.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update your plan.');
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Billing</h1>
        {mySubQuery.data && (
          <p className="mt-1 text-sm text-muted-foreground">
            Current plan: <span className="font-medium text-foreground">{mySubQuery.data.name}</span>
          </p>
        )}
      </div>

      {plansQuery.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      )}

      {plansQuery.data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plansQuery.data.map((plan) => {
            const isCurrent = mySubQuery.data?.tier === plan.tier;
            return (
              <div key={plan.tier} className={cn('flex flex-col rounded-xl border p-5', isCurrent ? 'border-primary bg-primary/5' : 'border-border')}>
                <p className="text-sm font-semibold">{plan.name}</p>
                <p className="mt-1 text-2xl font-bold">
                  {plan.price.amount === 0 ? 'Free' : `${plan.price.amount} ${plan.price.currency}`}
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-success" aria-hidden /> {plan.maxProjects} projects</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-success" aria-hidden /> {plan.maxDeploymentsPerDay} deploys/day</li>
                  {plan.allowsCustomDomains && <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-success" aria-hidden /> Custom domains</li>}
                  {plan.allowsBackups && <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-success" aria-hidden /> Backups</li>}
                  {plan.alwaysOn && <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-success" aria-hidden /> Always-on</li>}
                </ul>
                <Button
                  size="sm"
                  className="mt-4"
                  variant={isCurrent ? 'outline' : 'default'}
                  disabled={isCurrent}
                  loading={subscribeMutation.isPending}
                  onClick={() => handleSubscribe(plan.tier)}
                >
                  {isCurrent ? 'Current Plan' : 'Choose Plan'}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
