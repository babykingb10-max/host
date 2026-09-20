import Link from 'next/link';

const COLUMNS = [
  {
    heading: 'Product',
    links: [
      { label: 'Pricing', href: '/pricing' },
      { label: 'Services', href: '/services' },
      { label: 'Status', href: '/status' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'Support', href: '/support' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-border py-12">
      <div className="container grid gap-8 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <span className="text-sm font-bold tracking-wide">ADEVOS-X</span>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            One platform to host WhatsApp bots, websites, APIs, game servers and more.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.heading}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{col.heading}</p>
            <ul className="mt-3 space-y-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Adevos-X Tech Host Platform. All rights reserved.
      </div>
    </footer>
  );
}
