'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminApi, type MaintenanceMode } from '@/lib/api/admin';

export default function AdminSettingsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'settings', 'maintenance'], queryFn: adminApi.getMaintenanceMode });
  const [form, setForm] = useState<MaintenanceMode>({ enabled: false, message: '' });

  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: () => adminApi.setMaintenanceMode(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
      toast.success('Settings saved.');
    },
  });

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-100">Settings</h1>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-100">Maintenance Mode</p>
          <button
            onClick={() => setForm({ ...form, enabled: !form.enabled })}
            className={`relative h-6 w-11 rounded-full transition-colors ${form.enabled ? 'bg-red-600' : 'bg-slate-700'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${form.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">When enabled, normal users see a maintenance message; admins keep access.</p>

        <textarea
          value={form.message ?? ''}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Adevos-X is currently undergoing maintenance. We'll be back shortly."
          rows={2}
          className="mt-3 w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-100"
        />

        <button
          onClick={() => saveMutation.mutate()}
          className="mt-3 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-amber-400"
        >
          Save
        </button>
      </div>
    </div>
  );
}
