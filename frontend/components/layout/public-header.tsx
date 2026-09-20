import Link from 'next/link';
import { Server, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

const NAV_LINKS = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'Services', href: '/services' },
  { label: 'Docs', href: '/docs' },
  { label: 'Status', href: '/status' },
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" aria-hidden />
          <span className="text-sm font-bold tracking-wide">ADEVOS-X</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Site">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            Log in
          </Link>
          <Link href="/register" className={cn(buttonVariants({ size: 'sm' }))}>
            Start Hosting
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
            <Menu className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </header>
  );
}
