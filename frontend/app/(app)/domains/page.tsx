'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Globe, Plus, Trash2, RefreshCw } from 'lucide-react';
import { domainsApi } from '@/lib/api/domains';
import { useProjects } from '@/hooks/use-projects';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api/api-error';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-muted text-muted-foreground',
  VERIFYING: 'bg-info/10 text-info',
  VERIFIED: 'bg-success/10 text-success',
  CONNECTED: 'bg-success/10 text-success',
  FAILED: 'bg-danger/10 text-danger',
  DISCONNECTED: 'bg-muted text-muted-foreground',
};

export default function DomainsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['domains'], queryFn: domainsApi.listMine });
  const projectsQuery = useProjects({ pageSize: 100 });

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [domainName, setDomainName] = useState('');

  const invalidate = () => qc.invalidateQueries({ queryKey: ['domains'] });
  const addMutation = useMutation({
    mutationFn: () => domainsApi.add(selectedProjectId, domainName),
    onSuccess: () => {
      invalidate();
      setDomainName('');
      toast.success('Domain added — add the DNS record to verify it.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not add domain.'),
  });
  const verifyMutation = useMutation({
    mutationFn: (id: string) => domainsApi.verify(id),
    onSuccess: () => {
      invalidate();
      toast.success('Domain verified and connected!');
    },
    onError: (err) => {
      invalidate();
      toast.error(err instanceof ApiError ? err.message : 'Verification failed.');
    },
  });
  const removeMutation = useMutation({ mutationFn: (id: string) => domainsApi.remove(id), onSuccess: invalidate });

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Domains</h1>

      <div className="space-y-3 rounded-xl border border-border p-4">
        <p className="text-sm font-medium">Add Domain</p>
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select project...</option>
            {projectsQuery.data?.items.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Input placeholder="example.com" value={domainName} onChange={(e) => setDomainName(e.target.value)} className="flex-1 min-w-[160px]" />
          <Button
            onClick={() => addMutation.mutate()}
            disabled={!selectedProjectId || !domainName.trim() || addMutation.isPending}
            loading={addMutation.isPending}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" aria-hidden /> Add
          </Button>
        </div>
      </div>

      {query.isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      )}

      {query.data && query.data.length === 0 && (
        <EmptyState icon={Globe} title="No domains yet" description="Add a custom domain to one of your projects above." />
      )}

      {query.data && query.data.length > 0 && (
        <div className="space-y-3">
          {query.data.map((d) => (
            <div key={d.id} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{d.domainName}</p>
                  <p className="text-xs text-muted-foreground">{d.project?.name}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[d.status] ?? ''}`}>{d.status}</span>
              </div>

              {d.status !== 'CONNECTED' && (
                <div className="mt-3 rounded-md bg-muted/50 p-3 text-xs">
                  <p className="font-medium">Add this DNS record:</p>
                  <p className="mt-1">Type: <code>{d.dnsInstructions.type}</code></p>
                  <p>Name: <code className="break-all">{d.dnsInstructions.name}</code></p>
                  <p>Value: <code className="break-all">{d.dnsInstructions.value}</code></p>
                  {d.failureReason && <p className="mt-2 text-danger">{d.failureReason}</p>}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                {d.status !== 'CONNECTED' && (
                  <Button size="sm" variant="outline" onClick={() => verifyMutation.mutate(d.id)} loading={verifyMutation.isPending} className="gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Check Verification
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => removeMutation.mutate(d.id)} className="gap-1.5 text-danger hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
