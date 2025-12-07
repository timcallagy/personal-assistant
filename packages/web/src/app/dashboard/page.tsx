'use client';

import Link from 'next/link';
import { Layout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent, Badge, PriorityBadge, Button } from '@/components/ui';
import { useDashboard } from '@/hooks';

export default function DashboardPage() {
  const { stats, loading, error, refresh } = useDashboard();

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
            Refresh
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-error/20 text-error rounded-md">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-accent">
                {loading ? '-' : stats.notesCount}
              </p>
              <p className="text-foreground-muted text-sm">Total notes saved</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Open Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-accent">
                {loading ? '-' : stats.openActionsCount}
              </p>
              <p className="text-foreground-muted text-sm">Tasks to complete</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-success">
                {loading ? '-' : stats.completedActionsCount}
              </p>
              <p className="text-foreground-muted text-sm">Tasks done</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mt-8">
          {/* Top Actions */}
          <Card padding="none">
            <CardHeader className="p-4 border-b border-background-tertiary">
              <div className="flex items-center justify-between">
                <CardTitle>Top Priority Actions</CardTitle>
                <Link href="/actions" className="text-accent text-sm hover:underline">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 text-foreground-muted">Loading...</div>
              ) : stats.topActions.length === 0 ? (
                <div className="p-4 text-foreground-muted">No open actions</div>
              ) : (
                <ul className="divide-y divide-background-tertiary">
                  {stats.topActions.map((action) => (
                    <li key={action.id} className="p-4 hover:bg-background-tertiary/50">
                      <div className="flex items-start gap-3">
                        <PriorityBadge score={action.priorityScore} />
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground font-medium truncate">{action.title}</p>
                          <p className="text-foreground-muted text-sm">{action.project}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Recent Notes */}
          <Card padding="none">
            <CardHeader className="p-4 border-b border-background-tertiary">
              <div className="flex items-center justify-between">
                <CardTitle>Recent Notes</CardTitle>
                <Link href="/notes" className="text-accent text-sm hover:underline">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 text-foreground-muted">Loading...</div>
              ) : stats.recentNotes.length === 0 ? (
                <div className="p-4 text-foreground-muted">No notes yet</div>
              ) : (
                <ul className="divide-y divide-background-tertiary">
                  {stats.recentNotes.map((note) => (
                    <li key={note.id} className="p-4 hover:bg-background-tertiary/50">
                      <div className="flex items-start gap-3">
                        <Badge variant="accent">{note.project}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground line-clamp-2">{note.summary}</p>
                          <p className="text-foreground-muted text-xs mt-1">
                            {new Date(note.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="flex gap-4">
            <Link
              href="/notes"
              className="inline-flex items-center justify-center rounded-md border border-background-tertiary bg-background-secondary px-4 py-2 font-medium text-foreground transition-colors hover:bg-background-tertiary"
            >
              View All Notes
            </Link>
            <Link
              href="/actions"
              className="inline-flex items-center justify-center rounded-md border border-background-tertiary bg-background-secondary px-4 py-2 font-medium text-foreground transition-colors hover:bg-background-tertiary"
            >
              View All Actions
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
