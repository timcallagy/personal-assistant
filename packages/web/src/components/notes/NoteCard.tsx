'use client';

import { Note } from '@/lib/api';
import { Card, Badge } from '@/components/ui';

interface NoteCardProps {
  note: Note;
  onClick?: () => void;
}

export function NoteCard({ note, onClick }: NoteCardProps) {
  const formattedDate = new Date(note.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Card
      className={`cursor-pointer transition-colors hover:border-accent/50 ${onClick ? '' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="accent">{note.project}</Badge>
          {note.important && <Badge variant="warning">Important</Badge>}
        </div>
        <span className="text-foreground-muted text-xs whitespace-nowrap">
          {formattedDate}
        </span>
      </div>

      <p className="text-foreground mb-3 line-clamp-3">{note.summary}</p>

      {note.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note.labels.map((label) => (
            <Badge key={label} variant="default" size="sm">
              {label}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-background-tertiary text-xs text-foreground-muted">
        Source: {note.source}
      </div>
    </Card>
  );
}
