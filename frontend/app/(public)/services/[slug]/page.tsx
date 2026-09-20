import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { getPublicServiceBySlug } from '@/lib/api/public';
import { resolveIcon } from '@/lib/utils/resolve-icon';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const service = await getPublicServiceBySlug(params.slug);
  if (!service) return { title: 'Service not found' };
  return { title: service.name, description: service.description };
}

export default async function ServiceDetailPage({ params }: { params: { slug: string } }) {
  const service = await getPublicServiceBySlug(params.slug);
  if (!service) notFound();

  const Icon = resolveIcon(service.icon);

  return (
    <div className="container max-w-4xl py-16">
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-7 w-7" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{service.name}</h1>
          <p className="mt-2 text-muted-foreground">{service.description}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {service.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold">Supported sources</h2>
          <ul className="mt-3 space-y-2">
            {service.supportedSources.map((s) => (
              <li key={s} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-success" aria-hidden /> {s.replace(/_/g, ' ')}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold">Supported runtimes</h2>
          <ul className="mt-3 space-y-2">
            {service.supportedRuntimes.map((r) => (
              <li key={r} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-success" aria-hidden /> {r.replace(/_/g, ' ')}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {service.plans.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold">Plans</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {service.plans.map((plan) => (
              <div key={plan.key} className="rounded-xl border border-border p-5">
                <p className="text-sm font-semibold">{plan.name}</p>
                <p className="mt-1 text-2xl font-bold">
                  {plan.price.amount === 0 ? 'Free' : `${plan.price.amount} ${plan.price.currency}`}
                </p>
                <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  <li>{plan.cpuMillicores} mCPU</li>
                  <li>{plan.ramMb} MB RAM</li>
                  <li>{plan.storageMb} MB Storage</li>
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link href="/register" className={cn(buttonVariants({ size: 'lg' }), 'mt-10 gap-2')}>
        Deploy {service.name} <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
