import { useQuery } from '@tanstack/react-query';
import { servicesApi } from '@/lib/api/services';

export function useServices(category?: string) {
  return useQuery({
    queryKey: ['services', 'list', category ?? 'all'],
    queryFn: () => servicesApi.list(category),
    staleTime: 5 * 60_000,
  });
}
