'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, XCircle } from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/api-error';

export default function AdminProvidersPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'providers'], queryFn: adminApi.listProviders });

  const toggleMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) => (enabled ? adminApi.enableProvider(key) : adminApi.disableProvider(key)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'providers'] });
      toast.success('Provider updated.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not update provider.'),
  });

  const testMutation = useMutation({
    mutationFn: (key: string) => adminApi.testProvider(key),
    onSuccess: (result) => {
      if (result.configured) toast.success(result.message);
      else toast.info(result.message);
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-100">Providers</h1>
      <p className="text-sm text-slate-500">Credentials are set via environment variables in this environment and are never displayed here.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {query.data?.map((p) => (
          <div key={p.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-100">{p.name}</p>
              <span className={`text-xs font-medium ${p.enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                {p.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
              {p.envConfigured ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden /> : <XCircle className="h-3.5 w-3.5 text-slate-600" aria-hidden />}
              {p.envConfigured ? 'Credentials configured' : 'No credentials configured'}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => toggleMutation.mutate({ key: p.key, enabled: !p.enabled })}
                className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
              >
                {p.enabled ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => testMutation.mutate(p.key)}
                className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
              >
                Test Connection
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
