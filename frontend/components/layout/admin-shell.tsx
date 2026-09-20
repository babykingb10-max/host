'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, LogOut } from 'lucide-react';
import { ADMIN_NAV } from '@/config/admin-navigation';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string) => pathname === href || (href !== '/admin' && pathname?.startsWith(href));

  return (
    <div className="flex min-h-dvh bg-slate-950 text-slate-100">
      <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-800 bg-slate-900 lg:flex">
        <div className="flex h-16 items-center gap-2 px-6">
          <ShieldCheck className="h-5 w-5 text-amber-400" aria-hidden />
          <span className="text-sm font-semibold tracking-wide text-slate-100">ADEVOS-X ADMIN</span>
        </div>
        <nav className="flex-1 px-3 pb-6">
          {ADMIN_NAV.map((group) => (
            <div key={group.label} className="mb-4">
              <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {group.label}
              </div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive(item.href) ? 'bg-amber-400/10 text-amber-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
                  )}
                >
                  <item.icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4 backdrop-blur lg:px-6">
          <span className="text-xs font-medium text-slate-400">
            Signed in as <span className="text-slate-200">{user?.displayName ?? user?.username}</span>
          </span>
          <Button variant="ghost" size="icon" aria-label="Log out" onClick={() => logout()} className="text-slate-400 hover:text-slate-100">
            <LogOut className="h-4 w-4" aria-hidden />
          </Button>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
