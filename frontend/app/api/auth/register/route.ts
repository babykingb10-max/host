import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, REFRESH_COOKIE_NAME, refreshCookieOptions } from '@/lib/auth/backend-fetch.server';
import type { AuthTokens, User } from '@/types/api';

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const { ok, status, body } = await backendFetch<{ user: User } & AuthTokens>('/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!ok || !body.success) {
    return NextResponse.json(body, { status });
  }

  const { user, accessToken, refreshToken, refreshTokenExpiresAt } = body.data;
  const maxAge = Math.max(1, Math.floor((new Date(refreshTokenExpiresAt).getTime() - Date.now()) / 1000));

  const response = NextResponse.json({ success: true, data: { user, accessToken } });
  response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions(maxAge));
  return response;
}
