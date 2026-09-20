'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE', 'INFRASTRUCTURE', 'CONTENT_MANAGER']);

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();

  const hasAdminRole = Boolean(user?.roles?.some((r) => ADMIN_ROLES.has(r)));

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?next=/admin');
    } else if (status === 'authenticated' && !hasAdminRole) {
      router.replace('/dashboard');
    }
  }, [status, hasAdminRole, router]);

  if (status === 'loading' || (status === 'authenticated' && !hasAdminRole)) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" aria-label="Loading" role="status" />
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  return <>{children}</>;
}
