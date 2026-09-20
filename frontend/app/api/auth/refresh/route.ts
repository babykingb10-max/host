import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, REFRESH_COOKIE_NAME, refreshCookieOptions } from '@/lib/auth/backend-fetch.server';
import type { AuthTokens, User } from '@/types/api';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (!refreshToken) {
    return NextResponse.json(
      { success: false, error: { code: 'AUTH_SESSION_EXPIRED', message: 'No active session.', requestId: 'bff' } },
      { status: 401 },
    );
  }

  const refreshResult = await backendFetch<AuthTokens>('/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });

  if (!refreshResult.ok || !refreshResult.body.success) {
    const response = NextResponse.json(refreshResult.body, { status: refreshResult.status });
    response.cookies.delete(REFRESH_COOKIE_NAME);
    return response;
  }

  const { accessToken, refreshToken: newRefreshToken, refreshTokenExpiresAt } = refreshResult.body.data;

  const profileResult = await backendFetch<User>('/v1/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileResult.ok || !profileResult.body.success) {
    return NextResponse.json(profileResult.body, { status: profileResult.status });
  }

  const maxAge = Math.max(1, Math.floor((new Date(refreshTokenExpiresAt).getTime() - Date.now()) / 1000));
  const response = NextResponse.json({ success: true, data: { user: profileResult.body.data, accessToken } });
  response.cookies.set(REFRESH_COOKIE_NAME, newRefreshToken, refreshCookieOptions(maxAge));
  return response;
}
