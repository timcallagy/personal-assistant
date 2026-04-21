'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-red-700 bg-red-900 px-4 py-3 text-sm text-red-200 shadow-lg">
      <span>{message}</span>
      <button onClick={onDismiss} className="text-red-300 hover:text-red-100 ml-2">✕</button>
    </div>
  );
}
