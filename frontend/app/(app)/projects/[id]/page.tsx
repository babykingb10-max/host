'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Rocket, MoreHorizontal } from 'lucide-react';
import { useProject, useProjectDeployments, useTriggerDeployment, useDeleteProject } from '@/hooks/use-projects';
import { useDeploymentStream } from '@/hooks/use-deployment-stream';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DeploymentTimeline } from '@/components/deployment/deployment-timeline';
import { GithubSourcePicker, type GithubSource } from '@/components/project/github-source-picker';
import { BotCatalogPicker, type AdminCatalogSource } from '@/components/project/bot-catalog-picker';
import { PairingPanel } from '@/components/project/pairing-panel';
import { EnvironmentVariablesPanel } from '@/components/project/environment-variables-panel';
import { LogViewer } from '@/components/project/log-viewer';
import { CronPanel } from '@/components/project/cron-panel';
import { ApiError } from '@/lib/api/api-error';

const ACTIVE_STATUSES = new Set(['CREATING', 'QUEUED', 'PROVISIONING', 'BUILDING', 'DEPLOYING', 'STARTING', 'HEALTH_CHECK', 'RESTARTING', 'DELETING']);

type Tab = 'overview' | 'deployments' | 'environment' | 'logs' | 'schedule';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeDeploymentId, setActiveDeploymentId] = useState<string | null>(null);
  const [chosenSource, setChosenSource] = useState<GithubSource | AdminCatalogSource | null>(null);
  const [sourceTab, setSourceTab] = useState<'github' | 'catalog'>('github');

  const projectQuery = useProject(id);
  const deploymentsQuery = useProjectDeployments(id);
  const deployMutation = useTriggerDeployment(id);
  const deleteMutation = useDeleteProject();

  const latestDeploymentId = activeDeploymentId ?? deploymentsQuery.data?.[0]?.id ?? null;
  const isProjectActive = projectQuery.data ? ACTIVE_STATUSES.has(projectQuery.data.status) : false;
  const { events, isComplete } = useDeploymentStream(isProjectActive ? latestDeploymentId : null, id);

  const handleDeploy = async () => {
    try {
      const result = await deployMutation.mutateAsync(
        chosenSource ? { source: chosenSource as unknown as Record<string, unknown> } : undefined,
      );
      setActiveDeploymentId(result.deploymentId);
      setTab('overview');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not start deployment.');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Project deleted.');
      router.replace('/projects');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete project.');
    } finally {
      setConfirmDelete(false);
    }
  };

  if (projectQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return <ErrorState description="We couldn't load this project." onRetry={() => projectQuery.refetch()} />;
  }

  const project = projectQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{project.service?.name}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleDeploy} loading={deployMutation.isPending} disabled={deployMutation.isPending || isProjectActive} className="gap-2">
            <Rocket className="h-4 w-4" aria-hidden /> Deploy
          </Button>
          <Button variant="outline" size="icon" aria-label="More actions" onClick={() => setConfirmDelete(true)}>
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {(['overview', 'deployments', 'environment', 'logs', 'schedule'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          {!latestDeploymentId && !chosenSource && !project.source && (
            <div className="space-y-3">
              <div className="flex gap-1.5">
                <button
                  onClick={() => setSourceTab('github')}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${sourceTab === 'github' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                >
                  Deploy from GitHub
                </button>
                <button
                  onClick={() => setSourceTab('catalog')}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${sourceTab === 'catalog' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                >
                  Choose from Bot Catalog
                </button>
              </div>

              {sourceTab === 'github' ? (
                <GithubSourcePicker
                  onReady={(source) => {
                    setChosenSource(source);
                    toast.success('Source ready — click Deploy to continue.');
                  }}
                />
              ) : (
                <BotCatalogPicker
                  onReady={(source) => {
                    setChosenSource(source);
                    toast.success('Bot selected — click Deploy to continue.');
                  }}
                />
              )}
            </div>
          )}

          {chosenSource && !latestDeploymentId && (
            <p className="text-xs text-muted-foreground">
              {chosenSource.type === 'GITHUB'
                ? <>Ready to deploy <span className="font-medium text-foreground">{chosenSource.owner}/{chosenSource.repo}</span> ({chosenSource.branch}).</>
                : 'Ready to deploy the selected bot.'}
            </p>
          )}

          {latestDeploymentId ? (
            <DeploymentTimeline events={events} isComplete={isComplete} />
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No deployments yet — click Deploy to get this project running.
            </div>
          )}

          {project.source?.type === 'ADMIN_CATALOG' && <PairingPanel projectId={id} />}
        </div>
      )}

      {tab === 'deployments' && (
        <div className="space-y-2">
          {deploymentsQuery.data && deploymentsQuery.data.length === 0 && (
            <p className="text-sm text-muted-foreground">No deployment history yet.</p>
          )}
          {deploymentsQuery.data?.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Deployment #{d.id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">{new Date(d.startedAt).toLocaleString()}</p>
              </div>
              <StatusBadge status={d.status as never} />
            </div>
          ))}
        </div>
      )}

      {tab === 'environment' && <EnvironmentVariablesPanel projectId={id} />}

      {tab === 'logs' && (
        latestDeploymentId ? (
          <LogViewer projectId={id} />
        ) : (
          <p className="text-sm text-muted-foreground">Deploy this project to see its logs.</p>
        )
      )}

      {tab === 'schedule' && <CronPanel projectId={id} />}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this project?"
        description="This will stop and permanently remove the project and its deployment history. This cannot be undone."
        confirmLabel="Delete Project"
        requireTypedName={project.slug}
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
