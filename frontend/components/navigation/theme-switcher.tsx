'use client';

import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '@/lib/utils/theme-provider';
import { cn } from '@/lib/utils/cn';

const OPTIONS = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Laptop, label: 'System' },
] as const;

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center rounded-md border border-input p-0.5" role="group" aria-label="Theme">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setTheme(opt.value)}
          aria-pressed={theme === opt.value}
          aria-label={opt.label}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-sm transition-colors',
            theme === opt.value ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <opt.icon className="h-3.5 w-3.5" aria-hidden />
        </button>
      ))}
    </div>
  );
}
