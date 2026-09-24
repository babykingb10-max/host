import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, REFRESH_COOKIE_NAME } from '@/lib/auth/backend-fetch.server';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    await backendFetch('/v1/auth/logout', { method: 'POST', headers: { Authorization: authHeader } }).catch(() => undefined);
  }

  const response = NextResponse.json({ success: true, data: null });
  response.cookies.delete({ name: REFRESH_COOKIE_NAME, path: '/' });
  return response;
}
