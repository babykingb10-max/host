import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { botsApi } from '@/lib/api/bots';
import { pairingApi } from '@/lib/api/pairing';

export function useBotCatalog(category?: string) {
  return useQuery({ queryKey: ['bots', 'catalog', category ?? 'all'], queryFn: () => botsApi.list(category) });
}

export function usePairingStatus(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['pairing', projectId],
    queryFn: () => pairingApi.status(projectId),
    enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const active = status === 'PENDING' || status === 'AWAITING_DEVICE';
      return active ? 3000 : false;
    },
  });
}

export function useRequestPairing(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (phoneNumber?: string) => pairingApi.request(projectId, phoneNumber),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pairing', projectId] }),
  });
}

export function useSubmitManualSession(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => pairingApi.submitManualSession(projectId, sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pairing', projectId] }),
  });
}
