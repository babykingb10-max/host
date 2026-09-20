'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PlusCircle, FolderKanban, Search } from 'lucide-react';
import { useProjects } from '@/hooks/use-projects';
import { ProjectCard } from '@/components/project/project-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

const STATUS_FILTERS = ['', 'RUNNING', 'FAILED', 'STOPPED', 'CREATING'] as const;

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);

  const query = useProjects({ search: search || undefined, status: status || undefined, page, pageSize: 12 });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Projects</h1>
        <Link href="/create" className={cn(buttonVariants(), 'gap-2')}>
          <PlusCircle className="h-4 w-4" aria-hidden /> Create New Project
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s || 'all'}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                status === s ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {query.isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}

      {query.isError && <ErrorState onRetry={() => query.refetch()} description="We couldn't load your projects." />}

      {query.data && query.data.items.length === 0 && (
        <EmptyState
          icon={FolderKanban}
          title={search || status ? 'No matching projects' : 'No projects yet'}
          description={search || status ? 'Try a different search or filter.' : 'Create your first project and start hosting.'}
          action={
            !search && !status ? (
              <Link href="/create" className={cn(buttonVariants({ size: 'sm' }), 'gap-2')}>
                <PlusCircle className="h-4 w-4" aria-hidden /> Create Project
              </Link>
            ) : undefined
          }
        />
      )}

      {query.data && query.data.items.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.items.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>

          {query.data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {query.data.pagination.page} of {query.data.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= query.data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
