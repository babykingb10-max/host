'use client';

import { useAuthStore } from '@/stores/auth-store';
import { useAuthActions } from '@/lib/auth/auth-provider';

export function useAuth() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const actions = useAuthActions();

  return {
    status,
    user,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    ...actions,
  };
}
