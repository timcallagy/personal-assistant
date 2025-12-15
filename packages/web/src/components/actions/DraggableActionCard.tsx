'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Action } from '@/lib/api';
import { PriorityBadge } from '@/components/ui';

interface DraggableActionCardProps {
  action: Action;
  onClick?: () => void;
}

export function DraggableActionCard({ action, onClick }: DraggableActionCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: action.id,
    data: { action },
  });

  const style = transform
    ? {
        transform: CSS.Transform.toString(transform),
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`
        bg-background-secondary border border-background-tertiary rounded p-2
        cursor-grab active:cursor-grabbing
        transition-all duration-150
        hover:border-accent/50 hover:bg-background-tertiary/50
        ${isDragging ? 'opacity-50 shadow-lg scale-105 z-50' : ''}
      `}
    >
      <div className="flex items-start gap-2">
        <PriorityBadge score={action.priorityScore} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight">
            {action.title}
          </p>
          <p className="text-[10px] text-foreground-muted mt-0.5 truncate">
            {action.project}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Overlay version shown during drag
 */
export function DragOverlayCard({ action }: { action: Action }) {
  return (
    <div className="bg-background-secondary border-2 border-accent rounded p-2 shadow-xl rotate-3 opacity-90">
      <div className="flex items-start gap-2">
        <PriorityBadge score={action.priorityScore} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight">
            {action.title}
          </p>
          <p className="text-[10px] text-foreground-muted mt-0.5 truncate">
            {action.project}
          </p>
        </div>
      </div>
    </div>
  );
}
