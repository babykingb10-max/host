'use client';

import Link from 'next/link';
import { PlusCircle, FolderKanban } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useProjects } from '@/hooks/use-projects';
import { useServices } from '@/hooks/use-services';
import { ProjectCard } from '@/components/project/project-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { resolveIcon } from '@/lib/utils/resolve-icon';

export default function DashboardPage() {
  const { user } = useAuth();
  const projectsQuery = useProjects({ pageSize: 6 });
  const servicesQuery = useServices();

  const firstName = user?.displayName?.split(' ')[0] ?? user?.username;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Welcome back, {firstName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here&apos;s what&apos;s happening with your projects.</p>
        </div>
        <Link href="/create" className={cn(buttonVariants(), 'gap-2')}>
          <PlusCircle className="h-4 w-4" aria-hidden /> Create New Project
        </Link>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Quick Actions</h2>
        </div>
        {servicesQuery.isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        )}
        {servicesQuery.data && servicesQuery.data.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {servicesQuery.data.slice(0, 8).map((s) => {
              const Icon = resolveIcon(s.icon);
              return (
                <Link
                  key={s.id}
                  href={`/create?service=${s.slug}`}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-colors hover:border-primary/40"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4.5 w-4.5" aria-hidden />
                  </div>
                  <span className="text-xs font-medium">{s.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Your Projects</h2>
          <Link href="/projects" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>

        {projectsQuery.isLoading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        )}

        {projectsQuery.isError && <ErrorState onRetry={() => projectsQuery.refetch()} description="We couldn't load your projects." />}

        {projectsQuery.data && projectsQuery.data.items.length === 0 && (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create your first project and start hosting."
            action={
              <Link href="/create" className={cn(buttonVariants({ size: 'sm' }), 'gap-2')}>
                <PlusCircle className="h-4 w-4" aria-hidden /> Create Project
              </Link>
            }
          />
        )}

        {projectsQuery.data && projectsQuery.data.items.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projectsQuery.data.items.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
