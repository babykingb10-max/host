import { useAuthStore } from '@/stores/auth-store';
import { ApiError } from './api-error';
import type { ApiResponse } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

let refreshPromise: Promise<boolean> | null = null;

/** Restores a session using the httpOnly refresh cookie. Dedupes concurrent callers. */
async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        const body = (await res.json()) as ApiResponse<{ user: unknown; accessToken: string }>;
        if (!res.ok || !body.success) {
          useAuthStore.getState().setUnauthenticated();
          return false;
        }
        useAuthStore.getState().setSession(body.data.user as never, body.data.accessToken);
        return true;
      })
      .catch(() => {
        useAuthStore.getState().setUnauthenticated();
        return false;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

interface RequestOptions extends RequestInit {
  /** Set false for endpoints that must not trigger a silent refresh-and-retry (e.g. the refresh call itself). */
  autoRefresh?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { autoRefresh = true, ...init } = options;
  const accessToken = useAuthStore.getState().accessToken;

  const doFetch = () =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init.headers,
      },
    });

  let res = await doFetch();

  if (res.status === 401 && autoRefresh) {
    const restored = await refreshSession();
    if (restored) {
      res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
          ...init.headers,
        },
      });
    }
  }

  const body = (await res.json()) as ApiResponse<T>;

  if (!res.ok || !body.success) {
    const errorBody = !body.success ? body.error : { code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong.', requestId: 'unknown' };
    throw new ApiError(errorBody, res.status);
  }

  return body.data;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, data?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body: data !== undefined ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body: data !== undefined ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string, options?: RequestOptions) => apiRequest<T>(path, { ...options, method: 'DELETE' }),
};
