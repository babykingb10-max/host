'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Trash2 } from 'lucide-react';
import { notificationsApi } from '@/lib/api/notifications';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils/cn';

export default function NotificationsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['notifications'], queryFn: () => notificationsApi.list() });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  const markReadMutation = useMutation({ mutationFn: (id: string) => notificationsApi.markRead(id), onSuccess: invalidate });
  const markAllReadMutation = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: invalidate });
  const removeMutation = useMutation({ mutationFn: (id: string) => notificationsApi.remove(id), onSuccess: invalidate });

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Notifications</h1>
        <Button variant="outline" size="sm" onClick={() => markAllReadMutation.mutate()} loading={markAllReadMutation.isPending}>
          Mark all read
        </Button>
      </div>

      {query.isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      )}

      {query.data && query.data.length === 0 && (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />
      )}

      {query.data && query.data.length > 0 && (
        <div className="divide-y divide-border rounded-xl border border-border">
          {query.data.map((n) => (
            <div key={n.id} className={cn('flex items-start justify-between gap-3 p-4', !n.readAt && 'bg-primary/5')}>
              <div>
                <p className="text-sm font-medium">{n.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                {!n.readAt && (
                  <Button variant="ghost" size="icon" aria-label="Mark read" onClick={() => markReadMutation.mutate(n.id)}>
                    <Check className="h-4 w-4" aria-hidden />
                  </Button>
                )}
                <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => removeMutation.mutate(n.id)}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
