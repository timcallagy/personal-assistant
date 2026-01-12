'use client';

import { ArrowDown, ArrowRight } from 'lucide-react';
import type { TreeLayout } from '@/lib/kpi-tree/types';

interface LayoutToggleProps {
  layout: TreeLayout;
  onLayoutChange: (layout: TreeLayout) => void;
}

const LAYOUTS: { value: TreeLayout; label: string; icon: typeof ArrowDown }[] = [
  { value: 'vertical', label: 'Top-Down', icon: ArrowDown },
  { value: 'horizontal', label: 'Left-Right', icon: ArrowRight },
];

export function LayoutToggle({ layout, onLayoutChange }: LayoutToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-[#1a1a2e] rounded-lg p-1 border border-[#374151]">
      {LAYOUTS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => onLayoutChange(value)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all
            ${
              layout === value
                ? 'bg-[#0f3460] text-white'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#16213e]'
            }
          `}
          title={label}
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
