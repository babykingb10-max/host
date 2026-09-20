'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminApi, type CreatePromotionInput } from '@/lib/api/admin';

const emptyForm: CreatePromotionInput = { title: '', description: '', rewardAmount: 50, startAt: '', endAt: '', perUserLimit: 1 };

export default function AdminPromotionsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'promotions'], queryFn: adminApi.listPromotions });
  const [form, setForm] = useState<CreatePromotionInput>(emptyForm);

  const createMutation = useMutation({
    mutationFn: () => adminApi.createPromotion(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'promotions'] });
      toast.success('Promotion created.');
      setForm(emptyForm);
    },
  });
  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => adminApi.setPromotionActive(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'promotions'] }),
  });

  const inputCls = 'rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100';

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-100">Promotions</h1>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="mb-3 text-sm font-medium text-slate-100">Create Campaign</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className={inputCls} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className={inputCls} placeholder="Reward amount" type="number" value={form.rewardAmount} onChange={(e) => setForm({ ...form, rewardAmount: Number(e.target.value) })} />
          <input className={`${inputCls} sm:col-span-2`} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className={inputCls} type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
          <input className={inputCls} type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
          <input className={inputCls} type="number" placeholder="Per-user limit" value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: Number(e.target.value) })} />
          <input className={inputCls} type="number" placeholder="Total usage limit (optional)" onChange={(e) => setForm({ ...form, usageLimit: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
        <button
          onClick={() => createMutation.mutate()}
          disabled={!form.title || !form.startAt || !form.endAt}
          className="mt-3 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-40"
        >
          Create Campaign
        </button>
      </div>

      <div className="space-y-2">
        {query.data?.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div>
              <p className="font-medium text-slate-100">{p.title}</p>
              <p className="text-xs text-slate-400">{p.description} · +{p.rewardAmount} credits · {p.claimCount} claim{p.claimCount === 1 ? '' : 's'}</p>
            </div>
            <button
              onClick={() => toggleMutation.mutate({ id: p.id, active: !p.active })}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${p.active ? 'border-emerald-700 text-emerald-400' : 'border-slate-700 text-slate-500'}`}
            >
              {p.active ? 'Active' : 'Inactive'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
