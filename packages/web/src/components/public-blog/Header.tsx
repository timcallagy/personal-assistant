'use client';

import { useState } from 'react';
import Link from 'next/link';

interface HeaderProps {
  siteTitle: string;
  categories: { name: string; slug: string }[];
  socialLinkedIn: string | null;
  socialGitHub: string | null;
}

export function Header({ siteTitle, categories, socialLinkedIn, socialGitHub }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="border-b border-blog-border bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="font-serif text-2xl font-bold text-blog-primary hover:text-blog-accent transition-colors">
            {siteTitle}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-blog-secondary hover:text-blog-accent transition-colors">
              Home
            </Link>
            <div className="relative group">
              <button className="text-blog-secondary hover:text-blog-accent transition-colors flex items-center gap-1">
                Categories
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute top-full left-0 w-56 bg-white border border-blog-border shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                {categories.filter((cat) => cat.slug !== 'book-reviews').map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/category/${cat.slug}`}
                    className="block px-4 py-2 text-blog-secondary hover:bg-blog-surface hover:text-blog-accent transition-colors"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
            <Link href="/category/book-reviews" className="text-blog-secondary hover:text-blog-accent transition-colors">
              Book Reviews
            </Link>
            <Link href="/about" className="text-blog-secondary hover:text-blog-accent transition-colors">
              About
            </Link>
          </nav>

          {/* Social Links */}
          <div className="hidden md:flex items-center gap-4">
            {socialLinkedIn && (
              <a
                href={socialLinkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blog-muted hover:text-blog-accent transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            )}
            {socialGitHub && (
              <a
                href={socialGitHub}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blog-muted hover:text-blog-accent transition-colors"
                aria-label="GitHub"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-blog-border">
            <nav className="flex flex-col gap-2">
              <Link
                href="/"
                className="px-4 py-2 text-blog-secondary hover:text-blog-accent transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <div className="px-4 py-2 text-blog-muted text-sm uppercase tracking-wider">Categories</div>
              {categories.filter((cat) => cat.slug !== 'book-reviews').map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="px-8 py-2 text-blog-secondary hover:text-blog-accent transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {cat.name}
                </Link>
              ))}
              <Link
                href="/category/book-reviews"
                className="px-4 py-2 text-blog-secondary hover:text-blog-accent transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Book Reviews
              </Link>
              <Link
                href="/about"
                className="px-4 py-2 text-blog-secondary hover:text-blog-accent transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
