import { CheckCircle2, XCircle, Loader2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { DeploymentEvent } from '@/lib/api/projects';

const STEP_ORDER = ['QUEUED', 'VALIDATING', 'PROVISIONING', 'BUILDING', 'DEPLOYING', 'STARTING', 'HEALTH_CHECK', 'RUNNING'];

export function DeploymentTimeline({ events, isComplete }: { events: DeploymentEvent[]; isComplete: boolean }) {
  const reachedSteps = new Set(events.filter((e) => e.step).map((e) => e.step));
  const failed = events.some((e) => e.type === 'ERROR');
  const lastStep = [...events].reverse().find((e) => e.step)?.step;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <ol className="space-y-3">
        {STEP_ORDER.map((step) => {
          const reached = reachedSteps.has(step);
          const isCurrent = step === lastStep && !isComplete;
          const isFailedHere = failed && step === lastStep;

          return (
            <li key={step} className="flex items-center gap-3">
              {isFailedHere ? (
                <XCircle className="h-4 w-4 shrink-0 text-danger" aria-hidden />
              ) : isCurrent ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
              ) : reached ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" aria-hidden />
              )}
              <span className={cn('text-sm', reached ? 'font-medium' : 'text-muted-foreground')}>
                {step.replace(/_/g, ' ')}
              </span>
            </li>
          );
        })}
      </ol>

      {events.length > 0 && (
        <div className="mt-5 max-h-48 overflow-y-auto rounded-md bg-muted/50 p-3 font-mono text-xs">
          {events.map((e, i) => (
            <div key={i} className={cn('py-0.5', e.type === 'ERROR' && 'text-danger')}>
              <span className="text-muted-foreground">{new Date(e.createdAt).toLocaleTimeString()} </span>
              {e.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
