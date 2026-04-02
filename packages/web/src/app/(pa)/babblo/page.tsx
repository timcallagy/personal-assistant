'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/layout';
import { babblo, type BabbloStats, type BabbloUser, type BabbloLifecycleStage } from '@/lib/api';

// ─── Sub-components ───────────────────────────────────────────────────────────

const STAGE_LABELS: Record<BabbloLifecycleStage, string> = {
  email_not_verified: 'Email Not Verified',
  trial_not_started: 'Not Started',
  trial_active: 'Trial Active',
  trial_exhausted: 'Trial Exhausted',
  purchased: 'Purchased',
};

const STAGE_COLOURS: Record<BabbloLifecycleStage, string> = {
  email_not_verified: 'bg-orange-100 text-orange-800',
  trial_not_started: 'bg-yellow-100 text-yellow-800',
  trial_active: 'bg-blue-100 text-blue-800',
  trial_exhausted: 'bg-red-100 text-red-800',
  purchased: 'bg-green-100 text-green-800',
};

function StageBadge({ stage }: { stage: BabbloLifecycleStage }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STAGE_COLOURS[stage]}`}>
      {STAGE_LABELS[stage]}
    </span>
  );
}

function StatsCard({
  label,
  count,
  stage,
  active,
  onClick,
}: {
  label: string;
  count: number;
  stage: BabbloLifecycleStage;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-start p-4 rounded-lg border transition-colors text-left w-full
        ${active
          ? 'border-accent bg-accent/10'
          : 'border-background-tertiary bg-background-secondary hover:bg-background-tertiary'
        }
      `}
    >
      <span className="text-2xl font-bold text-foreground">{count}</span>
      <span className={`mt-1 text-xs font-medium ${STAGE_COLOURS[stage]} px-2 py-0.5 rounded`}>
        {label}
      </span>
    </button>
  );
}

function UserRow({ user }: { user: BabbloUser }) {
  const displayName = user.displayName ?? user.userId;
  return (
    <tr className="border-b border-background-tertiary hover:bg-background-secondary/50">
      <td className="px-4 py-3 text-sm">
        <Link href={`/babblo/${encodeURIComponent(user.userId)}`} className="text-accent hover:underline">
          {displayName}
        </Link>
      </td>
      <td className="px-4 py-3 text-sm text-foreground-secondary">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        <StageBadge stage={user.lifecycleStage} />
      </td>
      <td className="px-4 py-3 text-sm text-center">
        {user.bonusRequested ? '✓' : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-right">{user.callsMade}</td>
      <td className="px-4 py-3 text-sm text-right">{user.minutesPurchased}</td>
      <td className="px-4 py-3 text-sm text-right">{user.minutesRemaining}</td>
      <td className="px-4 py-3 text-sm text-right">{user.totalCorrections}</td>
    </tr>
  );
}

// ─── Test Email Panel ─────────────────────────────────────────────────────────

const EMAIL_JOB_OPTIONS = [
  'email_not_verified_1',
  'trial_not_started_1',
  'trial_not_started_2',
  'trial_active_1',
  'trial_active_2',
  'trial_exhausted_1',
];

const LANGUAGE_OPTIONS = ['en', 'fr', 'es', 'de', 'it', 'pt', 'nl', 'ru', 'ja', 'zh', 'ko', 'ar', 'el', 'hi'];

function TestEmailPanel() {
  const [email, setEmail] = useState('');
  const [jobName, setJobName] = useState<string>(EMAIL_JOB_OPTIONS[0] as string);
  const [language, setLanguage] = useState('en');
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!email) return;
    setSending(true);
    setStatus(null);
    try {
      const res = await babblo.testEmail(jobName, email, language);
      setStatus({ ok: true, message: res.message });
    } catch (e) {
      setStatus({ ok: false, message: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mb-6 p-4 bg-background-secondary rounded-lg border border-background-tertiary">
      <h2 className="text-sm font-semibold text-foreground mb-3">Send Test Email</h2>
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-foreground-secondary">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="px-3 py-1.5 rounded border border-background-tertiary bg-background text-sm text-foreground w-52 focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-foreground-secondary">Email type</label>
          <select
            value={jobName}
            onChange={(e) => setJobName(e.target.value)}
            className="px-3 py-1.5 rounded border border-background-tertiary bg-background text-sm text-foreground focus:outline-none focus:border-accent"
          >
            {EMAIL_JOB_OPTIONS.map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-foreground-secondary">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-3 py-1.5 rounded border border-background-tertiary bg-background text-sm text-foreground focus:outline-none focus:border-accent"
          >
            {LANGUAGE_OPTIONS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleSend}
          disabled={sending || !email}
          className="px-4 py-1.5 rounded bg-accent text-white text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
      {status && (
        <p className={`mt-2 text-xs ${status.ok ? 'text-green-600' : 'text-red-600'}`}>
          {status.message}
        </p>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const STAGES: BabbloLifecycleStage[] = [
  'email_not_verified',
  'trial_not_started',
  'trial_active',
  'trial_exhausted',
  'purchased',
];

const STAGE_STAT_KEYS: Record<BabbloLifecycleStage, keyof BabbloStats> = {
  email_not_verified: 'emailNotVerified',
  trial_not_started: 'trialNotStarted',
  trial_active: 'trialActive',
  trial_exhausted: 'trialExhausted',
  purchased: 'purchased',
};

export default function BabbloPage() {
  const [stats, setStats] = useState<BabbloStats | null>(null);
  const [users, setUsers] = useState<BabbloUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [stageFilter, setStageFilter] = useState<BabbloLifecycleStage | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const PAGE_SIZE = 50;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, usersData] = await Promise.all([
        babblo.getStats(),
        babblo.listUsers({ page, pageSize: PAGE_SIZE, stage: stageFilter }),
      ]);
      setStats(statsData);
      setUsers(usersData.users);
      setTotal(usersData.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [page, stageFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStageClick = (stage: BabbloLifecycleStage) => {
    setStageFilter((prev) => (prev === stage ? undefined : stage));
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Babblo Users</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-md text-sm">{error}</div>
        )}

        <TestEmailPanel />

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {STAGES.map((stage) => (
            <StatsCard
              key={stage}
              label={STAGE_LABELS[stage]}
              count={stats ? (stats[STAGE_STAT_KEYS[stage]] as number) : 0}
              stage={stage}
              active={stageFilter === stage}
              onClick={() => handleStageClick(stage)}
            />
          ))}
        </div>

        {/* Table */}
        <div className="bg-background-secondary rounded-lg border border-background-tertiary overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-foreground-secondary text-sm">Loading...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-foreground-secondary text-sm">No users found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-background-tertiary text-foreground-secondary text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Stage</th>
                  <th className="px-4 py-3 text-center">Bonus</th>
                  <th className="px-4 py-3 text-right">Calls</th>
                  <th className="px-4 py-3 text-right">Min Purchased</th>
                  <th className="px-4 py-3 text-right">Min Remaining</th>
                  <th className="px-4 py-3 text-right">Corrections</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <UserRow key={user.userId} user={user} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4 text-sm text-foreground-secondary">
            <span>
              Page {page} of {totalPages} ({total} users)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border border-background-tertiary disabled:opacity-40 hover:bg-background-secondary"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded border border-background-tertiary disabled:opacity-40 hover:bg-background-secondary"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
