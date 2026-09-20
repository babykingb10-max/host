'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useBotCatalog } from '@/hooks/use-pairing';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';
import type { CatalogBot } from '@/lib/api/bots';

export interface AdminCatalogSource {
  type: 'ADMIN_CATALOG';
  botId: string;
}

export function BotCatalogPicker({ onReady }: { onReady: (source: AdminCatalogSource, bot: CatalogBot) => void }) {
  const catalogQuery = useBotCatalog();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (catalogQuery.isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (!catalogQuery.data || catalogQuery.data.length === 0) {
    return <p className="text-sm text-muted-foreground">No bots are available in the catalog right now.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {catalogQuery.data.map((bot) => (
          <button
            key={bot.id}
            onClick={() => {
              setSelectedId(bot.id);
              onReady({ type: 'ADMIN_CATALOG', botId: bot.id }, bot);
            }}
            className={cn(
              'flex flex-col items-start gap-1.5 rounded-lg border p-4 text-left transition-colors',
              selectedId === bot.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted',
            )}
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-sm font-semibold">{bot.name}</span>
              {selectedId === bot.id && <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />}
            </div>
            <p className="line-clamp-2 text-xs text-muted-foreground">{bot.description}</p>
            <span className="mt-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {bot.runtime}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
