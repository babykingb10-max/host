'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Github, CheckCircle2 } from 'lucide-react';
import { useGithubConnection, useDisconnectGithub } from '@/hooks/use-github';
import { githubApi } from '@/lib/api/github';
import { Button } from '@/components/ui/button';

export function GithubConnectionCard() {
  const connectionQuery = useGithubConnection();
  const disconnectMutation = useDisconnectGithub();
  const [connecting, setConnecting] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const github = searchParams.get('github');
    if (github === 'connected') toast.success('GitHub connected.');
    if (github === 'error') toast.error('Could not connect GitHub. Please try again.');
    if (github === 'expired') toast.error('That connection link expired — please try again.');
    if (github) router.replace('/account/settings');
  }, [searchParams, router]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { url } = await githubApi.getAuthorizeUrl();
      window.location.href = url;
    } catch {
      toast.error('Could not start GitHub connection.');
      setConnecting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Github className="h-4.5 w-4.5" aria-hidden />
        <h2 className="text-sm font-semibold">GitHub</h2>
      </div>

      {connectionQuery.isLoading && <p className="mt-3 text-sm text-muted-foreground">Checking connection...</p>}

      {connectionQuery.data ? (
        <div className="mt-3 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm">
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
            Connected as <span className="font-medium">{connectionQuery.data.githubUsername}</span>
          </p>
          <Button
            variant="outline"
            size="sm"
            loading={disconnectMutation.isPending}
            onClick={() => disconnectMutation.mutate()}
          >
            Disconnect
          </Button>
        </div>
      ) : (
        !connectionQuery.isLoading && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Connect GitHub to deploy directly from your repositories.</p>
            <Button size="sm" loading={connecting} onClick={handleConnect}>
              Connect GitHub
            </Button>
          </div>
        )
      )}
    </div>
  );
}
