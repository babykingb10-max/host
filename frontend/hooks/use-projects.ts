import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi, type ListProjectsParams } from '@/lib/api/projects';

export const projectKeys = {
  all: ['projects'] as const,
  list: (params: ListProjectsParams) => ['projects', 'list', params] as const,
  detail: (id: string) => ['projects', 'detail', id] as const,
  deployments: (projectId: string) => ['projects', projectId, 'deployments'] as const,
};

export function useProjects(params: ListProjectsParams = {}) {
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: () => projectsApi.list(params),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectsApi.get(id),
    enabled: Boolean(id),
    // Poll gently while a deployment might be transitioning; the SSE
    // stream (useDeploymentStream) drives the *live* deployment view,
    // this just keeps the surrounding project record fresh.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const active = status && !['RUNNING', 'STOPPED', 'FAILED', 'CRASHED', 'SUSPENDED', 'DELETED'].includes(status);
      return active ? 4000 : false;
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useTriggerDeployment(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload?: { source?: Record<string, unknown>; environment?: Record<string, string> }) =>
      projectsApi.deploy(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.deployments(projectId) });
    },
  });
}

export function useProjectDeployments(projectId: string) {
  return useQuery({
    queryKey: projectKeys.deployments(projectId),
    queryFn: () => projectsApi.listDeployments(projectId),
    enabled: Boolean(projectId),
  });
}
