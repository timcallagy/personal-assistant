'use client';

import { useState } from 'react';
import { Layout } from '@/components/layout';
import { NotesList, NoteModal } from '@/components/notes';
import { Button } from '@/components/ui';
import { useNotes, useProjects, useLabels } from '@/hooks';
import { Note } from '@/lib/api';

export default function NotesPage() {
  const { notes, total, loading, error, refresh, createNote, updateNote, deleteNote } = useNotes();
  const { projects } = useProjects();
  const { labels } = useLabels();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const handleNewNote = () => {
    setSelectedNote(null);
    setIsModalOpen(true);
  };

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedNote(null);
  };

  const handleSave = async (data: {
    summary: string;
    project: string;
    labels?: string[];
    important?: boolean;
  }) => {
    if (selectedNote) {
      await updateNote(selectedNote.id, data);
    } else {
      await createNote(data);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteNote(id);
  };

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notes</h1>
            <p className="text-foreground-muted">
              {total} note{total !== 1 ? 's' : ''} saved
            </p>
          </div>
          <Button variant="primary" onClick={handleNewNote}>
            + New Note
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-error/20 text-error rounded-md">
            {error}
            <Button
              variant="ghost"
              size="sm"
              className="ml-4"
              onClick={refresh}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Notes List */}
        <NotesList
          notes={notes}
          loading={loading}
          onNoteClick={handleNoteClick}
        />

        {/* Note Modal */}
        <NoteModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          note={selectedNote}
          projects={projects}
          labels={labels}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      </div>
    </Layout>
  );
}
