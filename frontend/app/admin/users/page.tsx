'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminApi } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/api-error';

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'users', search],
    queryFn: () => adminApi.listUsers({ search: search || undefined }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED' }) => adminApi.setUserStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User updated.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not update user.'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-100">Users</h1>

      <input
        placeholder="Search by email or username..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-xs rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
      />

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Status</th>
              <th className="p-3">Joined</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {query.data?.items.map((u) => (
              <tr key={u.id}>
                <td className="p-3">
                  <p className="font-medium text-slate-100">{u.displayName ?? u.username}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </td>
                <td className="p-3">
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{u.status}</span>
                </td>
                <td className="p-3 text-xs text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    {u.status !== 'SUSPENDED' ? (
                      <button
                        onClick={() => statusMutation.mutate({ id: u.id, status: 'SUSPENDED' })}
                        className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => statusMutation.mutate({ id: u.id, status: 'ACTIVE' })}
                        className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                      >
                        Unsuspend
                      </button>
                    )}
                    {u.status !== 'DISABLED' && (
                      <button
                        onClick={() => statusMutation.mutate({ id: u.id, status: 'DISABLED' })}
                        className="rounded-md border border-red-900 px-2 py-1 text-xs text-red-400 hover:bg-red-950"
                      >
                        Disable
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {query.data?.items.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No users found.</p>}
      </div>
    </div>
  );
}
