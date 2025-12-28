'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';

const navItems = [
  { href: '/pa/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/pa/notes', label: 'Notes', icon: '📝' },
  { href: '/pa/actions', label: 'Actions', icon: '✅' },
  { href: '/pa/jobs', label: 'Jobs', icon: '💼' },
  { href: '/pa/blog', label: 'Blog', icon: '✍️' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-background-secondary rounded-md border border-background-tertiary"
        aria-label="Toggle menu"
      >
        <span className="text-xl">{isOpen ? '✕' : '☰'}</span>
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-40
        w-64 bg-background-secondary border-r border-background-tertiary flex flex-col h-full
        transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
      {/* Logo */}
      <div className="p-4 border-b border-background-tertiary">
        <Link href="/pa/dashboard" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-accent">PA</span>
          <span className="text-foreground-secondary text-sm">Personal Assistant</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-md transition-colors
                    ${isActive
                      ? 'bg-accent/20 text-accent'
                      : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
                    }
                  `}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-background-tertiary">
        <div className="flex items-center justify-between">
          <span className="text-foreground-secondary text-sm truncate">
            {user?.username}
          </span>
          <Button variant="ghost" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>
      </aside>
    </>
  );
}
