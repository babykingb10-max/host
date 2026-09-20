import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { githubApi } from '@/lib/api/github';
import { repositoryAnalyzerApi } from '@/lib/api/repository-analyzer';

export function useGithubConnection() {
  return useQuery({ queryKey: ['github', 'connection'], queryFn: githubApi.getConnection, retry: false });
}

export function useDisconnectGithub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: githubApi.disconnect,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['github', 'connection'] }),
  });
}

export function useGithubRepositories(enabled: boolean) {
  return useQuery({ queryKey: ['github', 'repositories'], queryFn: githubApi.listRepositories, enabled });
}

export function useGithubBranches(owner: string | null, repo: string | null) {
  return useQuery({
    queryKey: ['github', 'branches', owner, repo],
    queryFn: () => githubApi.listBranches(owner!, repo!),
    enabled: Boolean(owner && repo),
  });
}

export function useAnalyzeRepository() {
  return useMutation({
    mutationFn: ({ owner, repo, branch }: { owner: string; repo: string; branch: string }) =>
      repositoryAnalyzerApi.analyze(owner, repo, branch),
  });
}
