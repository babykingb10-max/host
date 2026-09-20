import { cn } from '@/lib/utils/cn';
import { statusTokens, type ProjectStatus } from '@/config/design-tokens';
import { resolveIcon } from '@/lib/utils/resolve-icon';

const COLOR_CLASSES: Record<string, string> = {
  success: 'bg-success/10 text-success border-success/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  info: 'bg-info/10 text-info border-info/20',
  neutral: 'bg-muted text-muted-foreground border-border',
};

export function StatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  const token = statusTokens[status];
  const Icon = resolveIcon(token.icon);
  const spin = status === 'CREATING' || status === 'PROVISIONING' || status === 'RESTARTING';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        COLOR_CLASSES[token.color],
        className,
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', spin && 'animate-spin')} aria-hidden />
      {token.label}
    </span>
  );
}
