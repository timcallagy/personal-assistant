'use client';

import { Action } from '@/lib/api';
import { Card, Badge, PriorityBadge } from '@/components/ui';

interface ActionCardProps {
  action: Action;
  onClick?: () => void;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
}

export function ActionCard({ action, onClick, selected, onSelect }: ActionCardProps) {
  const formattedDate = new Date(action.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Card
      className={`transition-colors ${onClick ? 'cursor-pointer hover:border-accent/50' : ''} ${selected ? 'border-accent ring-1 ring-accent' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {onSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 h-4 w-4 rounded border-background-tertiary bg-background text-accent focus:ring-accent"
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <PriorityBadge score={action.priorityScore} />
            <Badge variant="accent">{action.project}</Badge>
            {action.status === 'completed' && (
              <Badge variant="success">Completed</Badge>
            )}
          </div>

          <p className="text-foreground font-medium line-clamp-2">{action.title}</p>

          <div className="flex items-center gap-4 mt-2 text-sm text-foreground-muted">
            <span>U: {action.urgency}</span>
            <span>I: {action.importance}</span>
            <span>{formattedDate}</span>
          </div>

          {action.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {action.labels.map((label) => (
                <Badge key={label} variant="default" size="sm">
                  {label}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
