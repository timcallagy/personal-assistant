'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Action } from '@/lib/api';
import { ActionsGridCell } from './ActionsGridCell';
import { DragOverlayCard } from './DraggableActionCard';

interface ActionsGridProps {
  actions: Action[];
  loading?: boolean;
  onActionClick?: (action: Action) => void;
  onActionMove?: (id: number, urgency: number, importance: number) => Promise<void>;
}

/**
 * Group actions by their urgency and importance
 */
function groupActionsByPosition(actions: Action[]): Map<string, Action[]> {
  const map = new Map<string, Action[]>();

  // Initialize all cells
  for (let u = 1; u <= 5; u++) {
    for (let i = 1; i <= 5; i++) {
      map.set(`${u}-${i}`, []);
    }
  }

  // Place actions in cells
  for (const action of actions) {
    const key = `${action.urgency}-${action.importance}`;
    const cell = map.get(key);
    if (cell) {
      cell.push(action);
    }
  }

  return map;
}

export function ActionsGrid({
  actions,
  loading,
  onActionClick,
  onActionMove,
}: ActionsGridProps) {
  const [activeAction, setActiveAction] = useState<Action | null>(null);

  // Configure sensors for pointer and touch
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // Long press to drag on touch
        tolerance: 5,
      },
    })
  );

  const actionsByPosition = groupActionsByPosition(actions);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const action = actions.find((a) => a.id === active.id);
    if (action) {
      setActiveAction(action);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveAction(null);

    if (!over) return;

    const actionId = active.id as number;
    const targetData = over.data.current as { urgency: number; importance: number } | undefined;

    if (!targetData) return;

    const { urgency: newUrgency, importance: newImportance } = targetData;
    const action = actions.find((a) => a.id === actionId);

    if (!action) return;

    // Only update if position changed
    if (action.urgency !== newUrgency || action.importance !== newImportance) {
      onActionMove?.(actionId, newUrgency, newImportance);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-[40px_repeat(5,1fr)] gap-1">
          {/* Y-axis label placeholder */}
          <div className="row-span-5" />
          {/* Grid cells placeholder */}
          {Array.from({ length: 25 }).map((_, i) => (
            <div
              key={i}
              className="bg-background-secondary rounded-md min-h-[80px] sm:min-h-[100px]"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto">
        <div className="min-w-[500px]">
          {/* Grid container */}
          <div className="grid grid-cols-[40px_repeat(5,1fr)] gap-1">
            {/* Y-axis label (Importance) - rotated text */}
            <div className="row-span-5 flex items-center justify-center">
              <span className="text-xs sm:text-sm text-foreground-muted font-medium -rotate-90 whitespace-nowrap">
                Importance
              </span>
            </div>

            {/* Grid rows (importance 5 to 1, top to bottom) */}
            {[5, 4, 3, 2, 1].map((importance) => (
              <>
                {/* Row cells */}
                {[1, 2, 3, 4, 5].map((urgency) => (
                  <ActionsGridCell
                    key={`${urgency}-${importance}`}
                    urgency={urgency}
                    importance={importance}
                    actions={actionsByPosition.get(`${urgency}-${importance}`) || []}
                    onActionClick={onActionClick}
                  />
                ))}
              </>
            ))}

            {/* Empty corner cell */}
            <div />

            {/* X-axis labels (Urgency 1-5) */}
            {[1, 2, 3, 4, 5].map((u) => (
              <div
                key={`x-label-${u}`}
                className="flex items-center justify-center py-1"
              >
                <span className="text-xs sm:text-sm text-foreground-muted font-medium">
                  {u}
                </span>
              </div>
            ))}

            {/* Empty cell */}
            <div />

            {/* X-axis title */}
            <div className="col-span-5 flex justify-center">
              <span className="text-xs sm:text-sm text-foreground-muted font-medium">
                Urgency
              </span>
            </div>
          </div>

          {/* Y-axis numbers (right side for clarity) */}
          <div className="absolute left-0 top-0 hidden">
            {[5, 4, 3, 2, 1].map((i) => (
              <span key={`y-${i}`} className="text-xs text-foreground-muted">
                {i}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-foreground-muted justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-success/20" />
          <span>Do Now (5,5)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-warning/20" />
          <span>Schedule/Delegate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-error/20" />
          <span>Eliminate (1,1)</span>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeAction && <DragOverlayCard action={activeAction} />}
      </DragOverlay>
    </DndContext>
  );
}
