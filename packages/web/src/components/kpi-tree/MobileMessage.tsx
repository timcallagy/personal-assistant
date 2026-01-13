'use client';

import { Monitor, X } from 'lucide-react';

interface MobileOverlayProps {
  onDismiss: () => void;
}

export function MobileOverlay({ onDismiss }: MobileOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8 text-center bg-[#0f172a]/95 backdrop-blur-sm">
      <div className="bg-[#16213e] rounded-xl p-8 max-w-md shadow-lg border border-[#0f3460] relative">
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-[#94a3b8] hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <Monitor className="w-16 h-16 text-[#94a3b8] mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-white mb-4">
          Better on Desktop
        </h1>
        <p className="text-[#94a3b8] text-lg leading-relaxed mb-6">
          The KPI Driver Tree visualization is optimized for larger screens.
          For the best experience, please visit on a desktop or laptop.
        </p>
        <button
          onClick={onDismiss}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Continue Anyway
        </button>
      </div>
    </div>
  );
}
