'use client';

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api/auth';

interface AuthContextValue {
  login: (identifier: string, password: string) => Promise<void>;
  register: (payload: { displayName: string; username: string; email: string; password: string; referralCode?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    let cancelled = false;
    authApi
      .refresh()
      .then(({ user, accessToken: token }) => {
        if (!cancelled) setSession(user, token);
      })
      .catch(() => {
        if (!cancelled) setUnauthenticated();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      login: async (identifier, password) => {
        const { user, accessToken: token } = await authApi.login(identifier, password);
        setSession(user, token);
      },
      register: async (payload: { displayName: string; username: string; email: string; password: string; referralCode?: string }) => {
        const { user, accessToken: token } = await authApi.register(payload);
        setSession(user, token);
      },
      logout: async () => {
        await authApi.logout(accessToken).catch(() => undefined);
        setUnauthenticated();
        router.push('/login');
      },
    }),
    [accessToken, router, setSession, setUnauthenticated],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthActions(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthActions must be used within <AuthProvider>');
  return ctx;
}
