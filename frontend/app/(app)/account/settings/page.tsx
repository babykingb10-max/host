import { Suspense } from 'react';
import { GithubConnectionCard } from '@/components/project/github-connection-card';

export default function AccountSettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Integrations</h2>
        <Suspense fallback={null}>
          <GithubConnectionCard />
        </Suspense>
      </section>
    </div>
  );
}
