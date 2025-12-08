import Link from 'next/link';

interface FooterProps {
  siteTitle: string;
}

export function Footer({ siteTitle }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface py-8 mt-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-muted text-sm">
            &copy; {currentYear} {siteTitle}. All rights reserved.
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/" className="text-muted hover:text-accent transition-colors">
              Home
            </Link>
            <Link href="/about" className="text-muted hover:text-accent transition-colors">
              About
            </Link>
            <Link href="/privacy" className="text-muted hover:text-accent transition-colors">
              Privacy Policy
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
