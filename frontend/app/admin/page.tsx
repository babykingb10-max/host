import Link from 'next/link';
import { Users, FolderKanban, Bot, Server, ScrollText, Flag } from 'lucide-react';

const CARDS = [
  { href: '/admin/users', icon: Users, title: 'Users', description: 'Search, suspend, and inspect accounts.' },
  { href: '/admin/projects', icon: FolderKanban, title: 'Projects', description: 'Restart, stop, suspend, or delete any project.' },
  { href: '/admin/bot-submissions', icon: Bot, title: 'Bot Submissions', description: 'Review and approve community bot submissions.' },
  { href: '/admin/providers', icon: Server, title: 'Providers', description: 'Enable providers and manage credentials.' },
  { href: '/admin/feature-flags', icon: Flag, title: 'Feature Flags', description: 'Toggle platform features on or off.' },
  { href: '/admin/audit-logs', icon: ScrollText, title: 'Audit Logs', description: 'Review every sensitive admin action.' },
];

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-100">Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-5 transition-colors hover:border-amber-400/40"
          >
            <c.icon className="h-5 w-5 text-amber-400" aria-hidden />
            <p className="text-sm font-semibold text-slate-100">{c.title}</p>
            <p className="text-xs text-slate-400">{c.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
