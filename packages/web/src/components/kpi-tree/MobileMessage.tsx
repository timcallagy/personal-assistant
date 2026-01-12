'use client';

import { Monitor } from 'lucide-react';

export function MobileMessage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <div className="bg-[#16213e] rounded-xl p-8 max-w-md shadow-lg border border-[#0f3460]">
        <Monitor className="w-16 h-16 text-[#94a3b8] mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-white mb-4">
          Desktop Required
        </h1>
        <p className="text-[#94a3b8] text-lg leading-relaxed">
          The KPI Driver Tree visualization requires a larger screen for optimal viewing.
          Please visit this page on a desktop or laptop computer.
        </p>
      </div>
    </div>
  );
}
