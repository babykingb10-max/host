import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/dashboard', '/projects', '/create', '/earn', '/notifications', '/account', '/billing', '/domains', '/storage', '/support', '/admin'];
const REFRESH_COOKIE_NAME = 'adevos_rt';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected) return NextResponse.next();

  const hasSessionCookie = req.cookies.has(REFRESH_COOKIE_NAME);
  if (!hasSessionCookie) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/projects/:path*', '/create/:path*', '/earn/:path*', '/notifications/:path*', '/account/:path*', '/billing/:path*', '/domains/:path*', '/storage/:path*', '/support/:path*', '/admin/:path*'],
};
