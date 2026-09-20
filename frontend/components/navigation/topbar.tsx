'use client';

import Link from 'next/link';
import { Search, Bell, LogOut, Coins } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useUiStore } from '@/stores/ui-store';
import { useCreditWallet } from '@/hooks/use-earn';
import { notificationsApi } from '@/lib/api/notifications';
import { ThemeSwitcher } from './theme-switcher';
import { Button } from '@/components/ui/button';

export function Topbar({ title }: { title?: string }) {
  const { user, logout } = useAuth();
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const walletQuery = useCreditWallet();
  const unreadQuery = useQuery({ queryKey: ['notifications', 'unread-count'], queryFn: notificationsApi.unreadCount, refetchInterval: 30_000 });

  const initials = (user?.displayName ?? user?.username ?? '?').slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur lg:px-6">
      <div className="flex-1 truncate text-sm font-semibold lg:text-base">{title}</div>

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="hidden items-center gap-2 rounded-md border border-input px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted sm:flex"
      >
        <Search className="h-4 w-4" aria-hidden />
        Search Adevos-X...
        <kbd className="ml-6 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </button>
      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        aria-label="Search"
        className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted sm:hidden"
      >
        <Search className="h-4 w-4" aria-hidden />
      </button>

      <Link
        href="/earn"
        className="hidden items-center gap-1.5 rounded-full border border-input px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted sm:flex"
      >
        <Coins className="h-3.5 w-3.5 text-primary" aria-hidden />
        {walletQuery.data ? walletQuery.data.balance : '—'}
      </Link>

      <Link
        href="/notifications"
        aria-label="Notifications"
        className="relative grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted"
      >
        <Bell className="h-4 w-4" aria-hidden />
        {Boolean(unreadQuery.data) && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" aria-hidden />
        )}
      </Link>

      <ThemeSwitcher />

      <div className="flex items-center gap-2 pl-1">
        <Link
          href="/account"
          className="grid h-9 w-9 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          aria-label="Account"
        >
          {initials}
        </Link>
        <Button variant="ghost" size="icon" aria-label="Log out" onClick={() => logout()}>
          <LogOut className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </header>
  );
}
