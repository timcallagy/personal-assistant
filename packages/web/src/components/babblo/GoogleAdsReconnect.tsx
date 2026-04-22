'use client';

import { useState } from 'react';
import { babbloFunnel } from '@/lib/api';

export function GoogleAdsReconnect() {
  const [loading, setLoading] = useState(false);

  async function handleReconnect() {
    setLoading(true);
    try {
      const { authUrl } = await babbloFunnel.getGoogleAdsAuthUrl();
      window.open(authUrl, '_blank', 'width=600,height=700');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-yellow-900/30 border border-yellow-700/50 text-yellow-300 text-xs">
      <span>Google Ads disconnected</span>
      <button
        onClick={handleReconnect}
        disabled={loading}
        className="px-2 py-0.5 rounded bg-yellow-700/50 hover:bg-yellow-600/60 transition-colors disabled:opacity-50"
      >
        {loading ? 'Opening…' : 'Reconnect'}
      </button>
    </div>
  );
}
