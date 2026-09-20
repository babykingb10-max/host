'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';

export default function AdminFeatureFlagsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'feature-flags'], queryFn: adminApi.listFeatureFlags });

  const toggleMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) => adminApi.setFeatureFlag(key, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'feature-flags'] }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-100">Feature Flags</h1>
      <div className="divide-y divide-slate-800 rounded-xl border border-slate-800">
        {query.data?.map((flag) => (
          <div key={flag.key} className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-slate-100">{flag.label}</p>
              <p className="text-xs text-slate-500">{flag.key}</p>
            </div>
            <button
              onClick={() => toggleMutation.mutate({ key: flag.key, enabled: !flag.enabled })}
              className={`relative h-6 w-11 rounded-full transition-colors ${flag.enabled ? 'bg-emerald-600' : 'bg-slate-700'}`}
              aria-pressed={flag.enabled}
              aria-label={flag.label}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${flag.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
