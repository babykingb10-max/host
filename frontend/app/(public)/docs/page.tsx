import type { Metadata } from 'next';
import Link from 'next/link';
import { Rocket, Github, MessageCircle, Globe } from 'lucide-react';

export const metadata: Metadata = { title: 'Documentation' };

const GUIDES = [
  { icon: Rocket, title: 'Getting started', description: 'Create an account and deploy your first project in minutes.' },
  { icon: Github, title: 'Deploying from GitHub', description: 'Connect a repository and let Adevos-X detect your runtime.' },
  { icon: MessageCircle, title: 'WhatsApp bot hosting', description: 'Pairing modes, environment variables, and bot submission.' },
  { icon: Globe, title: 'Connecting a domain', description: 'Verify DNS records and attach a custom domain to your project.' },
];

export default function DocsPage() {
  return (
    <div className="container max-w-3xl py-16">
      <h1 className="text-3xl font-bold">Documentation</h1>
      <p className="mt-2 text-muted-foreground">Guides for deploying and managing projects on Adevos-X.</p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {GUIDES.map((g) => (
          <div key={g.title} className="rounded-xl border border-border p-5">
            <g.icon className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="mt-3 text-sm font-semibold">{g.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        Need help with something specific?{' '}
        <Link href="/support" className="font-medium text-primary hover:underline">
          Visit Support
        </Link>
        .
      </p>
    </div>
  );
}
