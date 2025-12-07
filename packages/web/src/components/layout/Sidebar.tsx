'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/notes', label: 'Notes', icon: '📝' },
  { href: '/actions', label: 'Actions', icon: '✅' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-background-secondary border-r border-background-tertiary flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-background-tertiary">
        <Link href="/dashboard" className="flex items-center gap-2">
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
  );
}
