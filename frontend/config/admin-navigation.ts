import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Users, FolderKanban, Rocket, Bot, FileCheck, Layers, LayoutTemplate,
  Server, Route, Cpu, HeartPulse, Wallet, Coins, Megaphone, Tag, BarChart3,
  Globe, Bell, Radio, SlidersHorizontal, ShieldAlert, ScrollText, Flag,
} from 'lucide-react';

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}
export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: 'Main',
    items: [
      { label: 'Overview', href: '/admin', icon: LayoutDashboard },
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Projects', href: '/admin/projects', icon: FolderKanban },
      { label: 'Deployments', href: '/admin/deployments', icon: Rocket },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { label: 'Bots', href: '/admin/bots', icon: Bot },
      { label: 'Bot Submissions', href: '/admin/bot-submissions', icon: FileCheck },
      { label: 'Services', href: '/admin/services', icon: Layers },
      { label: 'Templates', href: '/admin/templates', icon: LayoutTemplate },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { label: 'Providers', href: '/admin/providers', icon: Server },
      { label: 'Provider Router', href: '/admin/provider-router', icon: Route },
      { label: 'Resources', href: '/admin/resources', icon: Cpu },
      { label: 'System Health', href: '/admin/system-health', icon: HeartPulse },
    ],
  },
  {
    label: 'Business',
    items: [
      { label: 'Billing', href: '/admin/billing', icon: Wallet },
      { label: 'Credits', href: '/admin/credits', icon: Coins },
      { label: 'Ads', href: '/admin/ads', icon: Megaphone },
      { label: 'Promotions', href: '/admin/promotions', icon: Tag },
      { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Domains', href: '/admin/domains', icon: Globe },
      { label: 'Notifications', href: '/admin/notifications', icon: Bell },
      { label: 'Announcements', href: '/admin/announcements', icon: Radio },
      { label: 'Settings', href: '/admin/settings', icon: SlidersHorizontal },
    ],
  },
  {
    label: 'Security',
    items: [
      { label: 'Security Center', href: '/admin/security', icon: ShieldAlert },
      { label: 'Audit Logs', href: '/admin/audit-logs', icon: ScrollText },
      { label: 'Feature Flags', href: '/admin/feature-flags', icon: Flag },
    ],
  },
];
