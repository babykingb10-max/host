import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export function resolveIcon(key: string | undefined | null): LucideIcon {
  if (!key) return Icons.Box;
  const pascal = key.split('-').map((p) => p[0]?.toUpperCase() + p.slice(1)).join('');
  return (Icons as unknown as Record<string, LucideIcon>)[pascal] ?? Icons.Box;
}
