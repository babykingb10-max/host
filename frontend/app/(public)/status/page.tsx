import type { Metadata } from 'next';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { getPlatformHealth } from '@/lib/api/public';

export const metadata: Metadata = { title: 'System Status' };

const CHECK_LABELS: Record<string, string> = {
  database: 'Database',
  queue: 'Job Queue',
};

export default async function StatusPage() {
  const health = await getPlatformHealth();

  const overall = health?.status === 'ok' ? 'operational' : health ? 'degraded' : 'unknown';

  return (
    <div className="container max-w-2xl py-16">
      <h1 className="text-3xl font-bold">Adevos-X Platform Status</h1>

      <div className="mt-8 rounded-xl border border-border p-5">
        <div className="flex items-center gap-3">
          {overall === 'operational' && <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />}
          {overall === 'degraded' && <AlertTriangle className="h-5 w-5 text-warning" aria-hidden />}
          {overall === 'unknown' && <XCircle className="h-5 w-5 text-muted-foreground" aria-hidden />}
          <span className="font-medium">
            {overall === 'operational' && 'All systems operational'}
            {overall === 'degraded' && 'Some systems are degraded'}
            {overall === 'unknown' && 'Status temporarily unavailable'}
          </span>
        </div>

        {health?.checks && (
          <ul className="mt-5 divide-y divide-border border-t border-border">
            {Object.entries(health.checks).map(([key, ok]) => (
              <li key={key} className="flex items-center justify-between py-3 text-sm">
                <span>{CHECK_LABELS[key] ?? key}</span>
                <span className={ok ? 'flex items-center gap-1.5 text-success' : 'flex items-center gap-1.5 text-danger'}>
                  {ok ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <XCircle className="h-4 w-4" aria-hidden />}
                  {ok ? 'Operational' : 'Unavailable'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Per-provider hosting status (WhatsApp Hosting, Website Hosting, etc.) is added once the Provider Router
        reports live health data in Phase 3.
      </p>
    </div>
  );
}
