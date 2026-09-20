import type { ApiResponse, User } from '@/types/api';
import { ApiError } from './api-error';

async function bffRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const body = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !body.success) {
    const errorBody = !body.success ? body.error : { code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong.', requestId: 'unknown' };
    throw new ApiError(errorBody, res.status);
  }
  return body.data;
}

export const authApi = {
  login: (identifier: string, password: string) =>
    bffRequest<{ user: User; accessToken: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),

  register: (payload: { displayName: string; username: string; email: string; password: string; referralCode?: string }) =>
    bffRequest<{ user: User; accessToken: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  refresh: () => bffRequest<{ user: User; accessToken: string }>('/api/auth/refresh', { method: 'POST' }),

  logout: (accessToken: string | null) =>
    bffRequest<null>('/api/auth/logout', {
      method: 'POST',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    }),

  forgotPassword: (email: string) =>
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then((r) => r.json()),

  resetPassword: (token: string, newPassword: string) =>
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    }).then((r) => r.json()),

  verifyEmail: (token: string) =>
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).then((r) => r.json()),
};
