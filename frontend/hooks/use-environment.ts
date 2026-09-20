import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { environmentApi } from '@/lib/api/environment';

const key = (projectId: string) => ['projects', projectId, 'environment'];

export function useEnvironmentVariables(projectId: string) {
  return useQuery({ queryKey: key(projectId), queryFn: () => environmentApi.list(projectId), enabled: Boolean(projectId) });
}

export function useCreateEnvVar(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { key: string; value: string; isSecret?: boolean }) => environmentApi.create(projectId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId) }),
  });
}

export function useUpdateEnvVar(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ varId, ...payload }: { varId: string; value: string; isSecret?: boolean }) => environmentApi.update(projectId, varId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId) }),
  });
}

export function useDeleteEnvVar(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (varId: string) => environmentApi.remove(projectId, varId),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId) }),
  });
}

export function useBulkImportEnv(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => environmentApi.bulkImport(projectId, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId) }),
  });
}
