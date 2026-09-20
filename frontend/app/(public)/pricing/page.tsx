import type { Metadata } from 'next';
import { getPublicServices } from '@/lib/api/public';
import { resolveIcon } from '@/lib/utils/resolve-icon';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Transparent, pay-for-what-you-use pricing across every Adevos-X hosting service.',
};

export default async function PricingPage() {
  const services = await getPublicServices();

  return (
    <div className="container max-w-4xl py-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Pricing</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          Every plan below is pulled live from Adevos-X — nothing here is hardcoded, so what you see is what you pay.
        </p>
      </div>

      {services && services.length > 0 ? (
        <div className="mt-12 space-y-10">
          {services.map((service) => {
            const Icon = resolveIcon(service.icon);
            return (
              <div key={service.id}>
                <div className="mb-3 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" aria-hidden />
                  <h2 className="text-sm font-semibold">{service.name}</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {service.plans.map((plan) => (
                    <div key={plan.key} className="rounded-xl border border-border p-5">
                      <p className="text-sm font-semibold">{plan.name}</p>
                      <p className="mt-1 text-2xl font-bold">
                        {plan.price.amount === 0 ? 'Free' : `${plan.price.amount} ${plan.price.currency}`}
                      </p>
                      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <li>{plan.cpuMillicores} mCPU</li>
                        <li>{plan.ramMb} MB RAM</li>
                        <li>{plan.storageMb} MB Storage</li>
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-12">
          <EmptyState title="Pricing will appear here" description="Please check back shortly." />
        </div>
      )}
    </div>
  );
}
