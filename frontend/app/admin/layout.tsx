import type { ReactNode } from 'react';
import { RequireAdmin } from '@/components/layout/require-admin';
import { AdminShell } from '@/components/layout/admin-shell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAdmin>
      <AdminShell>{children}</AdminShell>
    </RequireAdmin>
  );
}
