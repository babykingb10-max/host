'use client';

import { useAuth } from '@/hooks/use-auth';
import { Settings } from 'lucide-react';
import Link from 'next/link';

export default function AccountPage() {
  const { user } = useAuth();
  const initials = (user?.displayName ?? user?.username ?? '?').slice(0, 2).toUpperCase();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Account</h1>

      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{user?.displayName ?? user?.username}</p>
          <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
          {!user?.emailVerified && <p className="mt-1 text-xs text-warning">Email not verified</p>}
        </div>
        <Link href="/account/settings" className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <Settings className="h-4 w-4" aria-hidden /> Settings
        </Link>
      </div>
    </div>
  );
}
