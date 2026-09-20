import type { ReactNode } from 'react';
import { RequireAuth } from '@/components/layout/require-auth';
import { AppShell } from '@/components/layout/app-shell';

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
