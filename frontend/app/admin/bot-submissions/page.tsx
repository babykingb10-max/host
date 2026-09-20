'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminApi } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/api-error';

export default function AdminBotSubmissionsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'bot-submissions', statusFilter],
    queryFn: () => adminApi.listBotSubmissions(statusFilter || undefined),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'bot-submissions'] });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveBotSubmission(id, notes[id]),
    onSuccess: () => { invalidate(); toast.success('Bot approved and added to the catalog.'); },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not approve submission.'),
  });
  const rejectMutation = useMutation({
    mutationFn: (id: string) => adminApi.rejectBotSubmission(id, notes[id] ?? 'Rejected.'),
    onSuccess: () => { invalidate(); toast.success('Submission rejected.'); },
  });
  const requestChangesMutation = useMutation({
    mutationFn: (id: string) => adminApi.requestBotChanges(id, notes[id] ?? 'Please revise and resubmit.'),
    onSuccess: () => { invalidate(); toast.success('Changes requested.'); },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-100">Bot Submissions</h1>

      <div className="flex gap-1.5">
        {['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusFilter === s ? 'border-amber-400 bg-amber-400/10 text-amber-300' : 'border-slate-700 text-slate-400'}`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {query.data?.length === 0 && <p className="text-sm text-slate-500">No submissions in this status.</p>}
        {query.data?.map((s) => (
          <div key={s.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-slate-100">{s.name}</p>
                <p className="text-xs text-slate-500">by {s.submittedBy.username} · {s.repository} ({s.branch}) · {s.runtime}</p>
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-400">{s.description}</p>

            {statusFilter === 'PENDING' || statusFilter === 'UNDER_REVIEW' ? (
              <div className="mt-3 space-y-2">
                <textarea
                  placeholder="Review notes (optional for approve, required for reject/changes)"
                  value={notes[s.id] ?? ''}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [s.id]: e.target.value }))}
                  rows={2}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-xs text-slate-100"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => approveMutation.mutate(s.id)}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => requestChangesMutation.mutate(s.id)}
                    className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    Request Changes
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate(s.id)}
                    className="rounded-md border border-red-900 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ) : (
              s.reviewNotes && <p className="mt-2 text-xs italic text-slate-500">&quot;{s.reviewNotes}&quot;</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
