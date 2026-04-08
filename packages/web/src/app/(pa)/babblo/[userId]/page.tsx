'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Layout } from '@/components/layout';
import { babblo, type BabbloUserProfile, type BabbloCall, type BabbloLifecycleStage } from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STAGE_COLOURS: Record<BabbloLifecycleStage, string> = {
  email_not_verified: 'bg-orange-100 text-orange-800',
  trial_not_started: 'bg-yellow-100 text-yellow-800',
  trial_active: 'bg-blue-100 text-blue-800',
  trial_exhausted: 'bg-red-100 text-red-800',
  purchased: 'bg-green-100 text-green-800',
};

const STAGE_LABELS: Record<BabbloLifecycleStage, string> = {
  email_not_verified: 'Email Not Verified',
  trial_not_started: 'Not Started',
  trial_active: 'Trial Active',
  trial_exhausted: 'Trial Exhausted',
  purchased: 'Purchased',
};

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function fmtMin(seconds: number) {
  return `${Math.round(seconds / 60)} min`;
}

// ─── Call row with expandable corrections ────────────────────────────────────

function CallRow({ call, userId }: { call: BabbloCall; userId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        className="border-b border-background-tertiary hover:bg-background-secondary/50 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <td className="px-4 py-3 text-sm">
          <Link
            href={`/babblo/${encodeURIComponent(userId)}/calls/${encodeURIComponent(call.sessionId)}`}
            className="text-accent hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {fmtDate(call.createdAt)}
          </Link>
        </td>
        <td className="px-4 py-3 text-sm font-mono">{fmt(call.durationSeconds)}</td>
        <td className="px-4 py-3 text-sm">{call.language}</td>
        <td className="px-4 py-3 text-sm">{call.personaName}</td>
        <td className="px-4 py-3 text-sm text-foreground-secondary text-right">
          {call.corrections.length > 0 ? (
            <span className="text-accent">{call.corrections.length} corrections {open ? '▲' : '▼'}</span>
          ) : (
            <span className="text-foreground-muted">—</span>
          )}
        </td>
      </tr>
      {open && call.corrections.length > 0 && (
        <tr className="bg-background-secondary/30">
          <td colSpan={5} className="px-6 py-3">
            <ul className="space-y-1 text-sm">
              {call.corrections.map((c, i) => (
                <li key={i} className="text-foreground-secondary">
                  Said: <span className="text-red-600">{c.original}</span>
                  {' → '}
                  Should be: <span className="text-green-600">{c.corrected}</span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
      {open && call.corrections.length === 0 && (
        <tr className="bg-background-secondary/30">
          <td colSpan={5} className="px-6 py-2 text-sm text-foreground-secondary italic">
            No corrections
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BabbloUserPage() {
  const params = useParams();
  const userId = decodeURIComponent(params['userId'] as string);

  const [data, setData] = useState<BabbloUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    babblo
      .getUser(userId)
      .then(setData)
      .catch((e) => {
        if (e?.code === 'NOT_FOUND') {
          setNotFound(true);
        } else {
          setError(e instanceof Error ? e.message : 'Failed to load user');
        }
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <Layout>
        <div className="p-6 text-foreground-secondary text-sm">Loading...</div>
      </Layout>
    );
  }

  if (notFound) {
    return (
      <Layout>
        <div className="p-6">
          <p className="text-foreground-secondary mb-4">User not found.</p>
          <Link href="/babblo" className="text-accent hover:underline text-sm">← Back to users</Link>
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="p-6">
          <p className="text-red-600 text-sm mb-4">{error ?? 'Unknown error'}</p>
          <Link href="/babblo" className="text-accent hover:underline text-sm">← Back to users</Link>
        </div>
      </Layout>
    );
  }

  const { profile, calls, personaMemory, totalCostUsd, totalRevenueSeconds, transactions } = data;

  return (
    <Layout>
      <div className="p-6 space-y-8 max-w-5xl">
        {/* Back link */}
        <Link href="/babblo" className="text-accent hover:underline text-sm">
          ← Back to users
        </Link>

        {/* Header */}
        <div className="bg-background-secondary rounded-lg border border-background-tertiary p-5">
          <div className="flex flex-wrap items-start gap-3 mb-3">
            <h1 className="text-xl font-bold text-foreground">
              {profile.displayName ?? 'Anonymous'}
            </h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STAGE_COLOURS[profile.lifecycleStage]}`}>
              {STAGE_LABELS[profile.lifecycleStage]}
            </span>
            {profile.bonusRequested && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                Bonus Requested
              </span>
            )}
          </div>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-foreground-secondary">User ID</dt>
              <dd className="font-mono text-xs break-all">{profile.userId}</dd>
            </div>
            {profile.email && (
              <div>
                <dt className="text-foreground-secondary">Email</dt>
                <dd>{profile.email}</dd>
              </div>
            )}
            <div>
              <dt className="text-foreground-secondary">Created</dt>
              <dd>{new Date(profile.createdAt).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-foreground-secondary">Languages</dt>
              <dd>{profile.nativeLanguage ?? '?'} → {profile.targetLanguage ?? '?'}</dd>
            </div>
            <div>
              <dt className="text-foreground-secondary">Minutes Remaining</dt>
              <dd>{profile.minutesRemaining} min</dd>
            </div>
          </dl>
        </div>

        {/* Cost & Revenue */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-background-secondary rounded-lg border border-background-tertiary p-4">
            <p className="text-xs text-foreground-secondary uppercase tracking-wide mb-1">Total Cost</p>
            <p className="text-2xl font-bold text-foreground">${totalCostUsd.toFixed(4)}</p>
          </div>
          <div className="bg-background-secondary rounded-lg border border-background-tertiary p-4">
            <p className="text-xs text-foreground-secondary uppercase tracking-wide mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-foreground">{fmtMin(totalRevenueSeconds)} purchased</p>
          </div>
        </div>

        {/* Call History */}
        <section id="call-history">
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Call History ({calls.length})
          </h2>
          {calls.length === 0 ? (
            <p className="text-foreground-secondary text-sm">No calls yet.</p>
          ) : (
            <div className="bg-background-secondary rounded-lg border border-background-tertiary overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-background-tertiary text-foreground-secondary text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Duration</th>
                    <th className="px-4 py-3 text-left">Language</th>
                    <th className="px-4 py-3 text-left">Persona</th>
                    <th className="px-4 py-3 text-right">Corrections</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map((call) => (
                    <CallRow key={call.sessionId} call={call} userId={userId} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Persona Memory */}
        {personaMemory.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Persona Memory</h2>
            <div className="space-y-3">
              {personaMemory.map((m) => (
                <div
                  key={m.personaName}
                  className="bg-background-secondary rounded-lg border border-background-tertiary p-4"
                >
                  <div className="flex justify-between items-baseline mb-2">
                    <h3 className="font-medium text-foreground">{m.personaName}</h3>
                    <span className="text-xs text-foreground-secondary">{fmtDate(m.updatedAt)}</span>
                  </div>
                  <pre className="text-sm text-foreground-secondary whitespace-pre-wrap font-mono">
                    {m.memoryText}
                  </pre>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Transaction History */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Transactions ({transactions.length})
          </h2>
          {transactions.length === 0 ? (
            <p className="text-foreground-secondary text-sm">No transactions yet.</p>
          ) : (
            <div className="bg-background-secondary rounded-lg border border-background-tertiary overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-background-tertiary text-foreground-secondary text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-background-tertiary hover:bg-background-secondary/50">
                      <td className="px-4 py-3 text-sm">{fmtDate(tx.createdAt)}</td>
                      <td className="px-4 py-3 text-sm capitalize">{tx.type}</td>
                      <td className="px-4 py-3 text-sm text-right">{fmtMin(tx.amountSeconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
