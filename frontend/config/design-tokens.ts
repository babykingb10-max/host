/**
 * Centralized design tokens. Tailwind config reads these via CSS
 * variables (see styles/globals.css) so both light and dark themes
 * stay in sync from one source. Do not scatter arbitrary hex/px
 * values in components — extend this file instead (spec §91).
 */
export const brand = {
  name: 'Adevos-X',
} as const;

export const radii = {
  sm: '6px',
  md: '10px',
  lg: '14px',
  xl: '20px',
  full: '9999px',
} as const;

export const spacingScale = [0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96] as const;

export const typography = {
  fontSans: 'var(--font-sans)',
  fontMono: 'var(--font-mono)',
  scale: {
    xs: ['0.75rem', '1rem'],
    sm: ['0.875rem', '1.25rem'],
    base: ['1rem', '1.5rem'],
    lg: ['1.125rem', '1.75rem'],
    xl: ['1.25rem', '1.875rem'],
    '2xl': ['1.5rem', '2rem'],
    '3xl': ['1.875rem', '2.25rem'],
    '4xl': ['2.25rem', '2.5rem'],
  },
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const transitions = {
  fast: '120ms ease',
  base: '200ms ease',
  slow: '320ms ease',
} as const;

/** Project/deployment status → semantic color token + icon key + human label (spec §93, §111). */
export const statusTokens = {
  CREATING: { color: 'info', icon: 'loader', label: 'Creating' },
  QUEUED: { color: 'info', icon: 'clock', label: 'Queued' },
  PROVISIONING: { color: 'info', icon: 'loader', label: 'Provisioning' },
  BUILDING: { color: 'info', icon: 'hammer', label: 'Building' },
  DEPLOYING: { color: 'info', icon: 'rocket', label: 'Deploying' },
  STARTING: { color: 'info', icon: 'play', label: 'Starting' },
  HEALTH_CHECK: { color: 'info', icon: 'heart-pulse', label: 'Health Check' },
  RUNNING: { color: 'success', icon: 'check-circle', label: 'Running' },
  STOPPED: { color: 'neutral', icon: 'square', label: 'Stopped' },
  FAILED: { color: 'danger', icon: 'x-circle', label: 'Failed' },
  CRASHED: { color: 'danger', icon: 'alert-triangle', label: 'Crashed' },
  RESTARTING: { color: 'info', icon: 'refresh-cw', label: 'Restarting' },
  UNHEALTHY: { color: 'warning', icon: 'alert-triangle', label: 'Unhealthy' },
  SUSPENDED: { color: 'warning', icon: 'pause-circle', label: 'Suspended' },
  DELETING: { color: 'neutral', icon: 'trash-2', label: 'Deleting' },
  DELETED: { color: 'neutral', icon: 'trash-2', label: 'Deleted' },
} as const;

export type ProjectStatus = keyof typeof statusTokens;
