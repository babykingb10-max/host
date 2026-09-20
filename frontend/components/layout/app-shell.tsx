import type { ReactNode } from 'react';
import { Sidebar } from '@/components/navigation/sidebar';
import { MobileBottomNav } from '@/components/navigation/mobile-bottom-nav';
import { Topbar } from '@/components/navigation/topbar';
import { CommandPalette } from '@/components/navigation/command-palette';

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} />
        <main className="flex-1 px-4 pb-24 pt-4 lg:px-6 lg:pb-6">{children}</main>
      </div>
      <MobileBottomNav />
      <CommandPalette />
    </div>
  );
}
