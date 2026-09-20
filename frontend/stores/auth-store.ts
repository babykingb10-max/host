import { create } from 'zustand';
import type { User } from '@/types/api';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  accessToken: string | null;
  setSession: (user: User, accessToken: string) => void;
  updateUser: (user: User) => void;
  setUnauthenticated: () => void;
  setLoading: () => void;
}

/**
 * Deliberately NOT persisted (no zustand `persist` middleware, no
 * localStorage/sessionStorage). The access token lives in memory for
 * the life of the tab; the refresh token never reaches client JS at
 * all — it's set as an httpOnly cookie by the /api/auth/* route
 * handlers (see lib/auth/*) and session restoration on load happens
 * by calling refresh, which reads that cookie server-side.
 */
export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  accessToken: null,
  setSession: (user, accessToken) => set({ status: 'authenticated', user, accessToken }),
  updateUser: (user) => set({ user }),
  setUnauthenticated: () => set({ status: 'unauthenticated', user: null, accessToken: null }),
  setLoading: () => set({ status: 'loading' }),
}));
