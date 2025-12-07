'use client';

import { Note } from '@/lib/api';
import { NoteCard } from './NoteCard';

interface NotesListProps {
  notes: Note[];
  loading?: boolean;
  onNoteClick?: (note: Note) => void;
}

export function NotesList({ notes, loading, onNoteClick }: NotesListProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-40 bg-background-secondary rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-foreground-muted text-lg">No notes found</p>
        <p className="text-foreground-muted text-sm mt-1">
          Create your first note to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          onClick={onNoteClick ? () => onNoteClick(note) : undefined}
        />
      ))}
    </div>
  );
}
