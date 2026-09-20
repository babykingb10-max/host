'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ['admin', 'audit-logs', page], queryFn: () => adminApi.listAuditLogs({ page }) });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-100">Audit Logs</h1>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Action</th>
              <th className="p-3">Target</th>
              <th className="p-3">Actor</th>
              <th className="p-3">Result</th>
              <th className="p-3">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {query.data?.items.map((log) => (
              <tr key={log.id}>
                <td className="p-3 font-mono text-xs text-slate-200">{log.action}</td>
                <td className="p-3 text-xs text-slate-400">{log.targetType} · {log.targetId.slice(0, 8)}</td>
                <td className="p-3 text-xs text-slate-400">{log.actorUserId.slice(0, 8)} ({log.actorRole ?? '—'})</td>
                <td className="p-3 text-xs">
                  <span className={log.result === 'SUCCESS' ? 'text-emerald-400' : 'text-red-400'}>{log.result}</span>
                </td>
                <td className="p-3 text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {query.data?.items.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No audit entries yet.</p>}
      </div>

      {query.data && query.data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 disabled:opacity-40">
            Previous
          </button>
          <span className="text-xs text-slate-500">Page {query.data.pagination.page} of {query.data.pagination.totalPages}</span>
          <button disabled={page >= query.data.pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
