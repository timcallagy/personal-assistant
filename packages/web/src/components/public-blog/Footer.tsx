import Link from 'next/link';

interface FooterProps {
  siteTitle: string;
}

export function Footer({ siteTitle }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-blog-border bg-blog-surface py-8 mt-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-blog-muted text-sm">
            &copy; {currentYear} {siteTitle}. All rights reserved.
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/" className="text-blog-muted hover:text-blog-accent transition-colors">
              Home
            </Link>
            <Link href="/about" className="text-blog-muted hover:text-blog-accent transition-colors">
              About
            </Link>
            <Link href="/privacy" className="text-blog-muted hover:text-blog-accent transition-colors">
              Privacy Policy
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
