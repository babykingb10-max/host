'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';

const SEVERITY_COLORS: Record<string, string> = {
  INFO: 'text-slate-400', LOW: 'text-sky-400', MEDIUM: 'text-amber-400', HIGH: 'text-orange-400', CRITICAL: 'text-red-400',
};

export default function AdminSecurityPage() {
  const [severity, setSeverity] = useState<string>('');
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'security', severity], queryFn: () => adminApi.listSecurityEvents({ severity: severity || undefined }) });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => adminApi.resolveSecurityEvent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'security'] }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-100">Security Center</h1>

      <div className="flex gap-1.5">
        {['', 'INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setSeverity(s)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${severity === s ? 'border-amber-400 bg-amber-400/10 text-amber-300' : 'border-slate-700 text-slate-400'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {query.data?.items.length === 0 && <p className="text-sm text-slate-500">No security events.</p>}
        {query.data?.items.map((e) => (
          <div key={e.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div>
              <p className={`text-xs font-semibold uppercase ${SEVERITY_COLORS[e.severity]}`}>{e.severity} · {e.type.replace(/_/g, ' ')}</p>
              <p className="mt-1 text-sm text-slate-200">{e.message}</p>
              <p className="mt-1 text-xs text-slate-500">{new Date(e.createdAt).toLocaleString()}</p>
            </div>
            {!e.resolved && (
              <button
                onClick={() => resolveMutation.mutate(e.id)}
                className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
              >
                Mark Resolved
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
