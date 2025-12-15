'use client';

import { useDroppable } from '@dnd-kit/core';
import { Action } from '@/lib/api';
import { DraggableActionCard } from './DraggableActionCard';

interface ActionsGridCellProps {
  urgency: number;
  importance: number;
  actions: Action[];
  onActionClick?: (action: Action) => void;
}

/**
 * Get background color based on urgency/importance position
 * - Top-right (5,5): Green - Do Now!
 * - Top-left (1,5): Orange - Schedule
 * - Bottom-right (5,1): Yellow - Delegate
 * - Bottom-left (1,1): Red - Eliminate
 */
function getCellBackground(urgency: number, importance: number): string {
  // Calculate position in the gradient
  // High urgency + high importance = green (do now)
  // Low urgency + low importance = red (eliminate)
  const score = urgency + importance; // 2-10 range

  if (score >= 9) return 'bg-success/10'; // Green - Do Now (9-10)
  if (score >= 7) return 'bg-success/5'; // Light green (7-8)
  if (score >= 5) return 'bg-warning/5'; // Yellow/amber (5-6)
  if (score >= 3) return 'bg-error/5'; // Light red (3-4)
  return 'bg-error/10'; // Red - Eliminate (2)
}

export function ActionsGridCell({
  urgency,
  importance,
  actions,
  onActionClick,
}: ActionsGridCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `cell-${urgency}-${importance}`,
    data: { urgency, importance },
  });

  const showMore = actions.length > 3;
  const visibleActions = showMore ? actions.slice(0, 3) : actions;
  const hiddenCount = actions.length - 3;

  return (
    <div
      ref={setNodeRef}
      className={`
        relative rounded-md p-1.5 min-h-[80px] sm:min-h-[100px]
        border transition-all duration-200 overflow-hidden
        ${getCellBackground(urgency, importance)}
        ${isOver
          ? 'border-accent ring-2 ring-accent/30 scale-[1.02]'
          : 'border-background-tertiary/50'
        }
      `}
    >
      <div className="flex flex-col gap-1 overflow-y-auto max-h-[180px]">
        {visibleActions.map((action) => (
          <DraggableActionCard
            key={action.id}
            action={action}
            onClick={() => onActionClick?.(action)}
          />
        ))}
        {showMore && (
          <div className="text-xs text-foreground-muted text-center py-1 bg-background-secondary/50 rounded">
            +{hiddenCount} more
          </div>
        )}
      </div>
      {actions.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-foreground-muted/30">
            {urgency},{importance}
          </span>
        </div>
      )}
    </div>
  );
}
