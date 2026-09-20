'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Check } from 'lucide-react';
import { useServices } from '@/hooks/use-services';
import { useCreateProject } from '@/hooks/use-projects';
import { resolveIcon } from '@/lib/utils/resolve-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import type { PublicService } from '@/lib/api/public';

function CreateProjectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const servicesQuery = useServices();
  const createMutation = useCreateProject();

  const [selectedSlug, setSelectedSlug] = useState<string | null>(searchParams.get('service'));
  const [name, setName] = useState('');
  const [planKey, setPlanKey] = useState<string | null>(null);

  const selectedService = servicesQuery.data?.find((s) => s.slug === selectedSlug) ?? null;

  const selectService = (service: PublicService) => {
    setSelectedSlug(service.slug);
    setName((prev) => prev || `My ${service.name}`);
    setPlanKey(service.plans.find((p) => p.isDefault)?.key ?? service.plans[0]?.key ?? null);
  };

  const handleCreate = async () => {
    if (!selectedService || !planKey || !name.trim()) return;
    const plan = selectedService.plans.find((p) => p.key === planKey);
    if (!plan) return;

    try {
      const project = await createMutation.mutateAsync({
        name: name.trim(),
        serviceId: selectedService.id,
        servicePlanId: plan.id,
      });
      toast.success('Project created.');
      router.push(`/projects/${project.id}`);
    } catch {
      toast.error('Could not create project. Please check the details and try again.');
    }
  };

  if (servicesQuery.isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (servicesQuery.isError) {
    return <ErrorState onRetry={() => servicesQuery.refetch()} description="We couldn't load the service catalog." />;
  }

  if (!servicesQuery.data || servicesQuery.data.length === 0) {
    return <EmptyState title="No services available" description="Please check back shortly." />;
  }

  if (!selectedService) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">What do you want to host?</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pick a service to get started — we&apos;ll handle the infrastructure.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {servicesQuery.data.map((service) => {
            const Icon = resolveIcon(service.icon);
            return (
              <button
                key={service.id}
                onClick={() => selectService(service)}
                className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
              >
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4.5 w-4.5" aria-hidden />
                </div>
                <span className="text-sm font-semibold">{service.name}</span>
                <span className="line-clamp-2 text-xs text-muted-foreground">{service.description}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const Icon = resolveIcon(selectedService.icon);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <button onClick={() => setSelectedSlug(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Choose a different service
      </button>

      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h1 className="text-lg font-semibold">{selectedService.name}</h1>
          <p className="text-xs text-muted-foreground">{selectedService.description}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="project-name">Project name</Label>
        <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My project" />
      </div>

      {selectedService.plans.length > 0 && (
        <div className="space-y-1.5">
          <Label>Plan</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {selectedService.plans.map((plan) => (
              <button
                key={plan.key}
                onClick={() => setPlanKey(plan.key)}
                className={cn(
                  'rounded-lg border p-3 text-left transition-colors',
                  planKey === plan.key ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{plan.name}</span>
                  {planKey === plan.key && <Check className="h-3.5 w-3.5 text-primary" aria-hidden />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {plan.price.amount === 0 ? 'Free' : `${plan.price.amount} ${plan.price.currency}`}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      <Button className="w-full" onClick={handleCreate} loading={createMutation.isPending} disabled={createMutation.isPending || !name.trim() || !planKey}>
        Create Project
      </Button>
    </div>
  );
}

export default function CreateProjectPage() {
  return (
    <Suspense fallback={null}>
      <CreateProjectContent />
    </Suspense>
  );
}
