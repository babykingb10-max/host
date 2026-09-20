import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { resolveIcon } from '@/lib/utils/resolve-icon';
import { StatusBadge } from '@/components/ui/status-badge';
import type { ProjectListItem } from '@/lib/api/projects';

export function ProjectCard({ project }: { project: ProjectListItem }) {
  const Icon = resolveIcon(project.service?.icon);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4.5 w-4.5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{project.name}</p>
            <p className="truncate text-xs text-muted-foreground">{project.service?.name ?? 'Service'}</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </div>

      <div className="flex items-center justify-between">
        <StatusBadge status={project.status} />
        {project.region && <span className="text-xs text-muted-foreground">{project.region}</span>}
      </div>
    </Link>
  );
}
