import type { LucideIcon } from 'lucide-react';
import { Home, FolderKanban, PlusCircle, Coins, Bell, User, Globe, CreditCard, Settings, LifeBuoy, HardDrive } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Shown in both the mobile bottom nav and (as the primary group) the desktop sidebar. */
export const PRIMARY_NAV: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Create', href: '/create', icon: PlusCircle },
  { label: 'Earn', href: '/earn', icon: Coins },
  { label: 'Account', href: '/account', icon: User },
];

/** Mobile bottom nav swaps "Create" for "Notifications" to match spec §81. */
export const MOBILE_NAV: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Earn', href: '/earn', icon: Coins },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Account', href: '/account', icon: User },
];

/** Desktop sidebar secondary section (spec §5). */
export const SECONDARY_NAV: NavItem[] = [
  { label: 'Domains', href: '/domains', icon: Globe },
  { label: 'Storage', href: '/storage', icon: HardDrive },
  { label: 'Billing', href: '/billing', icon: CreditCard },
  { label: 'Settings', href: '/account/settings', icon: Settings },
  { label: 'Support', href: '/support', icon: LifeBuoy },
];
