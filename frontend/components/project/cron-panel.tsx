'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Play, Trash2 } from 'lucide-react';
import { cronApi } from '@/lib/api/cron';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/api-error';

export function CronPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [schedule, setSchedule] = useState('*/15 * * * *');

  const cronJobsQuery = useQuery({ queryKey: ['cron-jobs'], queryFn: cronApi.listMine });
  const cronJob = cronJobsQuery.data?.find((j) => j.project?.id === projectId);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['cron-jobs'] });
  const createMutation = useMutation({
    mutationFn: () => cronApi.create(projectId, schedule),
    onSuccess: () => { invalidate(); toast.success('Schedule created.'); },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Invalid cron expression.'),
  });
  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => cronApi.update(cronJob!.id, { enabled }),
    onSuccess: invalidate,
  });
  const removeMutation = useMutation({
    mutationFn: () => cronApi.remove(cronJob!.id),
    onSuccess: invalidate,
  });
  const runNowMutation = useMutation({
    mutationFn: () => cronApi.runNow(cronJob!.id),
    onSuccess: () => toast.success('Run queued.'),
  });

  if (cronJobsQuery.isLoading) return null;

  if (!cronJob) {
    return (
      <div className="space-y-3 rounded-xl border border-dashed border-border p-5">
        <p className="text-sm font-medium">No schedule set</p>
        <p className="text-xs text-muted-foreground">Run this project automatically on a schedule, e.g. every 15 minutes.</p>
        <div className="flex gap-2">
          <Input value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="*/15 * * * *" className="max-w-[200px] font-mono text-xs" />
          <Button size="sm" onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
            Create Schedule
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-sm font-medium">{cronJob.schedule}</p>
          <p className="text-xs text-muted-foreground">
            {cronJob.lastRunAt ? `Last run ${new Date(cronJob.lastRunAt).toLocaleString()}` : 'Never run yet'}
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cronJob.enabled ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
          {cronJob.enabled ? 'Active' : 'Paused'}
        </span>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => runNowMutation.mutate()} loading={runNowMutation.isPending} className="gap-1.5">
          <Play className="h-3.5 w-3.5" aria-hidden /> Run Now
        </Button>
        <Button size="sm" variant="outline" onClick={() => toggleMutation.mutate(!cronJob.enabled)}>
          {cronJob.enabled ? 'Pause' : 'Resume'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => removeMutation.mutate()} className="gap-1.5 text-danger hover:text-danger">
          <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
        </Button>
      </div>
    </div>
  );
}
