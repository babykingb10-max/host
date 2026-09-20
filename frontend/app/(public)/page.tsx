import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, ShieldCheck, Zap, Globe2 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { getPublicServices } from '@/lib/api/public';
import { ServiceCard } from '@/components/services/service-card';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = {
  title: 'Adevos-X Tech Host — One Platform. Every Way to Host.',
  description: 'Host WhatsApp bots, websites, Node.js and Python apps, game servers, databases and more — without worrying about infrastructure.',
};

const HIGHLIGHTS = [
  { icon: Zap, title: 'Deploy in minutes', description: 'Connect GitHub, upload a ZIP, or pick a Docker image — we detect the rest.' },
  { icon: ShieldCheck, title: 'Secure by default', description: 'Secrets encrypted at rest, isolated projects, and audited admin actions.' },
  { icon: Globe2, title: 'One platform, many providers', description: 'We route your workload to the right infrastructure behind the scenes.' },
];

export default async function LandingPage() {
  const services = await getPublicServices();

  return (
    <>
      <section className="container flex flex-col items-center gap-6 py-20 text-center sm:py-28">
        <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          One hosting platform for everything you build
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Host anything. <span className="text-primary">One platform.</span>
        </h1>
        <p className="max-w-xl text-balance text-muted-foreground sm:text-lg">
          WhatsApp bots, websites, APIs, game servers, and databases — deployed, monitored,
          and managed from one dashboard. You choose what to host; we handle where and how.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/register" className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}>
            Start Hosting <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link href="/services" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
            Explore Services
          </Link>
        </div>
      </section>

      <section className="container grid gap-6 pb-16 sm:grid-cols-3">
        {HIGHLIGHTS.map((h) => (
          <div key={h.title} className="rounded-xl border border-border bg-card p-6">
            <h.icon className="h-5 w-5 text-primary" aria-hidden />
            <h3 className="mt-3 text-sm font-semibold">{h.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{h.description}</p>
          </div>
        ))}
      </section>

      <section className="border-t border-border py-16">
        <div className="container">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold">Supported hosting services</h2>
              <p className="mt-1 text-sm text-muted-foreground">Enabled services are shown automatically — nothing here is hardcoded.</p>
            </div>
            <Link href="/services" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>

          {services && services.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {services.slice(0, 8).map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Services will appear here"
              description="The service catalog is loading — check back shortly, or explore the full list."
            />
          )}
        </div>
      </section>

      <section className="border-t border-border py-16 text-center">
        <div className="container">
          <h2 className="text-2xl font-bold">Ready to host your first project?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Create a free account and deploy in minutes — no infrastructure knowledge required.
          </p>
          <Link href="/register" className={cn(buttonVariants({ size: 'lg' }), 'mt-6 gap-2')}>
            Start Hosting <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}
