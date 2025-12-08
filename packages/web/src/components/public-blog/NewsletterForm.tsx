'use client';

import { useState } from 'react';
import { blogApi } from '@/lib/blog-api';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !consent) {
      setStatus('error');
      setMessage('Please enter your email and accept the terms.');
      return;
    }

    setStatus('loading');

    try {
      const result = await blogApi.subscribeNewsletter(email, consent);
      setStatus('success');
      setMessage(result.message);
      setEmail('');
      setConsent(false);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Subscription failed. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="p-4 bg-green-50 border border-green-200 text-green-800 text-sm">
        {message}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        className="newsletter-input"
        disabled={status === 'loading'}
      />

      <label className="flex items-start gap-2 text-xs text-blog-muted cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5"
          disabled={status === 'loading'}
        />
        <span>
          I agree to receive newsletter emails about AI topics. You can unsubscribe at any time.
        </span>
      </label>

      {status === 'error' && (
        <p className="text-red-600 text-sm">{message}</p>
      )}

      <button
        type="submit"
        className="newsletter-btn"
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
      </button>
    </form>
  );
}
