import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { resolveIcon } from '@/lib/utils/resolve-icon';
import type { PublicService } from '@/lib/api/public';

export function ServiceCard({ service }: { service: PublicService }) {
  const Icon = resolveIcon(service.icon);
  const startingPrice = service.plans.find((p) => p.isDefault) ?? service.plans[0];

  return (
    <Link
      href={`/services/${service.slug}`}
      className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
    >
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="mt-4 text-sm font-semibold">{service.name}</h3>
      <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{service.description}</p>

      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {startingPrice
            ? startingPrice.price.amount === 0
              ? 'Free to start'
              : `From ${startingPrice.price.amount} ${startingPrice.price.currency}`
            : 'Pricing available'}
        </span>
        <span className="flex items-center gap-1 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          Explore <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
