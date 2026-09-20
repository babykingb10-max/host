import type { Metadata } from 'next';
import { getPublicServices } from '@/lib/api/public';
import { ServiceCard } from '@/components/services/service-card';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = {
  title: 'Services',
  description: 'Everything you can host on Adevos-X — WhatsApp bots, websites, APIs, game servers, databases and more.',
};

export default async function ServicesPage() {
  const services = await getPublicServices();

  return (
    <div className="container py-16">
      <div className="mb-10 max-w-2xl">
        <h1 className="text-3xl font-bold">Services</h1>
        <p className="mt-2 text-muted-foreground">
          Pick what you want to host. Adevos-X figures out where and how to run it.
        </p>
      </div>

      {services && services.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>
      ) : (
        <EmptyState title="No services available right now" description="Please check back shortly." />
      )}
    </div>
  );
}
