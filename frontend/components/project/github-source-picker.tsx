'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Github, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useGithubConnection, useGithubRepositories, useGithubBranches, useAnalyzeRepository } from '@/hooks/use-github';
import { Button } from '@/components/ui/button';
import type { AnalysisResult } from '@/lib/api/repository-analyzer';

export interface GithubSource {
  type: 'GITHUB';
  owner: string;
  repo: string;
  branch: string;
}

export function GithubSourcePicker({
  onReady,
}: {
  onReady: (source: GithubSource, analysis: AnalysisResult) => void;
}) {
  const connectionQuery = useGithubConnection();
  const [repoFullName, setRepoFullName] = useState('');
  const [branch, setBranch] = useState('');

  const isConnected = Boolean(connectionQuery.data);
  const reposQuery = useGithubRepositories(isConnected);
  const [owner, repo] = repoFullName.split('/');
  const branchesQuery = useGithubBranches(owner || null, repo || null);
  const analyzeMutation = useAnalyzeRepository();

  if (connectionQuery.isLoading) {
    return <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">Checking GitHub connection...</div>;
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-dashed border-border p-4">
        <div className="flex items-center gap-2 text-sm">
          <Github className="h-4 w-4" aria-hidden />
          Connect GitHub to deploy from a repository.
        </div>
        <Link href="/account/settings" className="text-sm font-medium text-primary hover:underline">
          Connect
        </Link>
      </div>
    );
  }

  const handleAnalyze = () => {
    if (!owner || !repo || !branch) return;
    analyzeMutation.mutate(
      { owner, repo, branch },
      { onSuccess: (result) => onReady({ type: 'GITHUB', owner, repo, branch }, result) },
    );
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Github className="h-4 w-4" aria-hidden /> Deploy from GitHub
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={repoFullName}
          onChange={(e) => {
            setRepoFullName(e.target.value);
            setBranch('');
          }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Select repository...</option>
          {reposQuery.data?.map((r) => (
            <option key={r.id} value={r.fullName}>
              {r.fullName}
            </option>
          ))}
        </select>

        <select
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          disabled={!repoFullName}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
        >
          <option value="">Select branch...</option>
          {branchesQuery.data?.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleAnalyze}
        disabled={!owner || !repo || !branch || analyzeMutation.isPending}
        loading={analyzeMutation.isPending}
      >
        Analyze Project
      </Button>

      {analyzeMutation.data && (
        <div className="rounded-md bg-muted/50 p-3 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
            Detected {analyzeMutation.data.runtime}
            {analyzeMutation.data.framework ? ` (${analyzeMutation.data.framework})` : ''}
          </div>
          {analyzeMutation.data.startCommand && (
            <p className="mt-1 font-mono text-xs text-muted-foreground">{analyzeMutation.data.startCommand}</p>
          )}
          {analyzeMutation.data.warnings.map((w, i) => (
            <p key={i} className="mt-1 flex items-start gap-1.5 text-xs text-warning">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {w}
            </p>
          ))}
        </div>
      )}

      {analyzeMutation.isPending && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Analyzing project...
        </div>
      )}
    </div>
  );
}
