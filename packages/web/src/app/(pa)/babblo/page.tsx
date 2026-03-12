'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/layout';
import { babblo, type BabbloStats, type BabbloUser, type BabbloLifecycleStage } from '@/lib/api';

// ─── Sub-components ───────────────────────────────────────────────────────────

const STAGE_LABELS: Record<BabbloLifecycleStage, string> = {
  trial_not_started: 'Not Started',
  trial_active: 'Trial Active',
  trial_exhausted: 'Trial Exhausted',
  purchased: 'Purchased',
};

const STAGE_COLOURS: Record<BabbloLifecycleStage, string> = {
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
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const STAGES: BabbloLifecycleStage[] = [
  'trial_not_started',
  'trial_active',
  'trial_exhausted',
  'purchased',
];

const STAGE_STAT_KEYS: Record<BabbloLifecycleStage, keyof BabbloStats> = {
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
