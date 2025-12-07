'use client';

import { Action } from '@/lib/api';
import { ActionCard } from './ActionCard';

interface ActionsListProps {
  actions: Action[];
  loading?: boolean;
  onActionClick?: (action: Action) => void;
  selectedIds?: number[];
  onSelect?: (id: number, selected: boolean) => void;
  selectable?: boolean;
}

export function ActionsList({
  actions,
  loading,
  onActionClick,
  selectedIds = [],
  onSelect,
  selectable,
}: ActionsListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-background-secondary rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-foreground-muted text-lg">No actions found</p>
        <p className="text-foreground-muted text-sm mt-1">
          Create your first action to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {actions.map((action) => (
        <ActionCard
          key={action.id}
          action={action}
          onClick={onActionClick ? () => onActionClick(action) : undefined}
          selected={selectedIds.includes(action.id)}
          onSelect={selectable && onSelect ? (sel) => onSelect(action.id, sel) : undefined}
        />
      ))}
    </div>
  );
}
