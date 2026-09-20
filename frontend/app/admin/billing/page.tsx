'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminApi } from '@/lib/api/admin';

export default function AdminBillingPage() {
  const qc = useQueryClient();
  const plansQuery = useQuery({ queryKey: ['admin', 'billing', 'plans'], queryFn: adminApi.listBillingPlans });
  const revenueQuery = useQuery({ queryKey: ['admin', 'billing', 'revenue'], queryFn: adminApi.getRevenue });

  const updateMutation = useMutation({
    mutationFn: ({ tier, priceAmount }: { tier: string; priceAmount: number }) => adminApi.updateBillingPlan(tier, { priceAmount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'billing'] });
      toast.success('Plan updated.');
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-100">Billing</h1>

      {revenueQuery.data && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm font-medium text-slate-100">Revenue Overview</p>
          <p className="mt-1 text-xs text-slate-400">{revenueQuery.data.totalUsers} total users</p>
          <div className="mt-3 space-y-1.5">
            {revenueQuery.data.byPlan.map((p) => (
              <div key={p.tier} className="flex justify-between text-sm text-slate-300">
                <span>{p.name}</span>
                <span>{p.activeSubscribers} active · {p.monthlyRevenue} credits/mo</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plansQuery.data?.map((plan) => (
          <div key={plan.tier} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="font-medium text-slate-100">{plan.name}</p>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                defaultValue={plan.priceAmount}
                onBlur={(e) => {
                  const value = Number(e.target.value);
                  if (value !== plan.priceAmount) updateMutation.mutate({ tier: plan.tier, priceAmount: value });
                }}
                className="w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
              />
              <span className="text-xs text-slate-500">{plan.priceCurrency}</span>
            </div>
            <ul className="mt-3 space-y-1 text-xs text-slate-400">
              <li>{plan.maxProjects} projects</li>
              <li>{plan.maxDeploymentsPerDay} deploys/day</li>
              {plan.allowsCustomDomains && <li>Custom domains</li>}
              {plan.allowsBackups && <li>Backups</li>}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
