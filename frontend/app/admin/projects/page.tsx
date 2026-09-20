'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminApi } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/api-error';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function AdminProjectsPage() {
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'projects', search],
    queryFn: () => adminApi.listProjects({ search: search || undefined }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'projects'] });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'restart' | 'stop' | 'suspend' | 'resume' }) => {
      if (action === 'restart') return adminApi.restartProject(id);
      if (action === 'stop') return adminApi.stopProject(id);
      if (action === 'suspend') return adminApi.suspendProject(id);
      return adminApi.resumeProject(id);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Action completed.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Action failed.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteProject(id),
    onSuccess: () => {
      invalidate();
      toast.success('Project deleted.');
      setConfirmDeleteId(null);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete project.');
      setConfirmDeleteId(null);
    },
  });

  const btn = 'rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40';

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-100">Projects</h1>

      <input
        placeholder="Search by project name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-xs rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
      />

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Project</th>
              <th className="p-3">Owner</th>
              <th className="p-3">Service</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {query.data?.items.map((p) => (
              <tr key={p.id}>
                <td className="p-3 font-medium text-slate-100">{p.name}</td>
                <td className="p-3 text-xs text-slate-400">{p.owner.username}</td>
                <td className="p-3 text-xs text-slate-400">{p.service.name}</td>
                <td className="p-3"><StatusBadge status={p.status as never} /></td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1.5">
                    <button className={btn} onClick={() => actionMutation.mutate({ id: p.id, action: 'restart' })}>Restart</button>
                    <button className={btn} onClick={() => actionMutation.mutate({ id: p.id, action: 'stop' })}>Stop</button>
                    <button className={btn} onClick={() => actionMutation.mutate({ id: p.id, action: 'suspend' })}>Suspend</button>
                    <button className={btn} onClick={() => actionMutation.mutate({ id: p.id, action: 'resume' })}>Resume</button>
                    <button
                      className="rounded-md border border-red-900 px-2 py-1 text-xs text-red-400 hover:bg-red-950"
                      onClick={() => setConfirmDeleteId(p.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {query.data?.items.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No projects found.</p>}
      </div>

      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Delete this project?"
        description="This permanently removes the project for its owner. This cannot be undone."
        confirmLabel="Delete Project"
        loading={deleteMutation.isPending}
        onConfirm={() => confirmDeleteId && deleteMutation.mutate(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
