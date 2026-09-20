'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminApi, type AdminAdProviderInput } from '@/lib/api/admin';

export default function AdminAdsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'ads'], queryFn: adminApi.listAdProviders });
  const [form, setForm] = useState<AdminAdProviderInput>({ key: '', name: '', rewardAmount: 10, dailyLimit: 5, cooldownSeconds: 300, enabled: false, verificationUrl: '' });

  const saveMutation = useMutation({
    mutationFn: () => adminApi.saveAdProvider(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ads'] });
      toast.success('Ad provider saved.');
      setForm({ key: '', name: '', rewardAmount: 10, dailyLimit: 5, cooldownSeconds: 300, enabled: false, verificationUrl: '' });
    },
  });
  const toggleMutation = useMutation({
    mutationFn: (p: { key: string; enabled: boolean; name: string; rewardAmount: number; dailyLimit: number; cooldownSeconds: number; verificationUrl?: string }) =>
      adminApi.updateAdProvider(p.key, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'ads'] }),
  });

  const inputCls = 'rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100';

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-100">Ads</h1>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="mb-3 text-sm font-medium text-slate-100">Add / Update Provider</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <input className={inputCls} placeholder="key (e.g. ADSTERRA)" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value.toUpperCase() })} />
          <input className={inputCls} placeholder="Display name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={inputCls} type="number" placeholder="Reward" value={form.rewardAmount} onChange={(e) => setForm({ ...form, rewardAmount: Number(e.target.value) })} />
          <input className={inputCls} type="number" placeholder="Daily limit" value={form.dailyLimit} onChange={(e) => setForm({ ...form, dailyLimit: Number(e.target.value) })} />
          <input className={inputCls} type="number" placeholder="Cooldown (s)" value={form.cooldownSeconds} onChange={(e) => setForm({ ...form, cooldownSeconds: Number(e.target.value) })} />
          <input className={inputCls} placeholder="Verification URL (server-to-server)" value={form.verificationUrl} onChange={(e) => setForm({ ...form, verificationUrl: e.target.value })} />
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!form.key || !form.name}
          className="mt-3 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-40"
        >
          Save Provider
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {query.data?.map((p) => (
          <div key={p.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-100">{p.name}</p>
              <button
                onClick={() => toggleMutation.mutate({ key: p.key, enabled: !p.enabled, name: p.name, rewardAmount: p.rewardAmount, dailyLimit: p.dailyLimit, cooldownSeconds: p.cooldownSeconds, verificationUrl: p.verificationUrl ?? undefined })}
                className={`text-xs font-medium ${p.enabled ? 'text-emerald-400' : 'text-slate-500'}`}
              >
                {p.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400">+{p.rewardAmount} credits · {p.dailyLimit}/day · {p.cooldownSeconds}s cooldown</p>
            <p className="mt-2 text-xs text-slate-500">
              Impressions: {p.analytics.impressions} · Completions: {p.analytics.completions} · Rewarded: {p.analytics.rewards}
            </p>
            {!p.verificationUrl && <p className="mt-1 text-xs text-amber-400">No verification URL — rewards are blocked until one is set.</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
