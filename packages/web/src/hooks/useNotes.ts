'use client';

import { useState, useEffect, useCallback } from 'react';
import { notes as notesApi, Note, NotesFilter, ApiError } from '@/lib/api';

interface UseNotesOptions {
  initialFilters?: NotesFilter;
  autoFetch?: boolean;
}

interface UseNotesReturn {
  notes: Note[];
  total: number;
  loading: boolean;
  error: string | null;
  filters: NotesFilter;
  setFilters: (filters: NotesFilter) => void;
  refresh: () => Promise<void>;
  createNote: (data: {
    summary: string;
    project: string;
    labels?: string[];
    important?: boolean;
  }) => Promise<Note>;
  updateNote: (
    id: number,
    data: {
      summary?: string;
      project?: string;
      labels?: string[];
      important?: boolean;
    }
  ) => Promise<Note>;
  deleteNote: (id: number) => Promise<void>;
}

export function useNotes(options: UseNotesOptions = {}): UseNotesReturn {
  const { initialFilters = {}, autoFetch = true } = options;

  const [notes, setNotes] = useState<Note[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<NotesFilter>(initialFilters);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await notesApi.list(filters);
      setNotes(response.notes);
      setTotal(response.total);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch notes';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (autoFetch) {
      fetchNotes();
    }
  }, [fetchNotes, autoFetch]);

  const createNote = async (data: {
    summary: string;
    project: string;
    labels?: string[];
    important?: boolean;
  }): Promise<Note> => {
    const response = await notesApi.create(data);
    await fetchNotes(); // Refresh list
    return response.note;
  };

  const updateNote = async (
    id: number,
    data: {
      summary?: string;
      project?: string;
      labels?: string[];
      important?: boolean;
    }
  ): Promise<Note> => {
    const response = await notesApi.update(id, data);
    await fetchNotes(); // Refresh list
    return response.note;
  };

  const deleteNote = async (id: number): Promise<void> => {
    await notesApi.delete(id);
    await fetchNotes(); // Refresh list
  };

  return {
    notes,
    total,
    loading,
    error,
    filters,
    setFilters,
    refresh: fetchNotes,
    createNote,
    updateNote,
    deleteNote,
  };
}
