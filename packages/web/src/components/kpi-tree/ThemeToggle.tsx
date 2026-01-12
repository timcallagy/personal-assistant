'use client';

import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
}

export function ThemeToggle({ theme, onThemeChange }: ThemeToggleProps) {
  return (
    <button
      onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
        ${theme === 'dark'
          ? 'bg-[#1a1a2e] border border-[#374151] text-[#94a3b8] hover:text-white'
          : 'bg-white border border-gray-300 text-gray-600 hover:text-gray-900'
        }
      `}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <>
          <Sun className="w-4 h-4" />
          <span className="hidden sm:inline">Light</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4" />
          <span className="hidden sm:inline">Dark</span>
        </>
      )}
    </button>
  );
}
