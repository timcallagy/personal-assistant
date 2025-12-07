'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Input, Textarea, Select, MultiSelect } from '@/components/ui';
import { Note, Project, Label } from '@/lib/api';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note?: Note | null;
  projects: Project[];
  labels: Label[];
  onSave: (data: {
    summary: string;
    project: string;
    labels?: string[];
    important?: boolean;
  }) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

export function NoteModal({
  isOpen,
  onClose,
  note,
  projects,
  labels,
  onSave,
  onDelete,
}: NoteModalProps) {
  const [summary, setSummary] = useState('');
  const [project, setProject] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [important, setImportant] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!note;

  useEffect(() => {
    if (note) {
      setSummary(note.summary);
      setProject(note.project);
      setSelectedLabels(note.labels);
      setImportant(note.important);
    } else {
      setSummary('');
      setProject('');
      setSelectedLabels([]);
      setImportant(false);
    }
    setError('');
  }, [note, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!summary.trim()) {
      setError('Summary is required');
      return;
    }
    if (!project.trim()) {
      setError('Project is required');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        summary: summary.trim(),
        project: project.trim(),
        labels: selectedLabels.length > 0 ? selectedLabels : undefined,
        important,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!note || !onDelete) return;

    if (!confirm('Are you sure you want to delete this note?')) return;

    setLoading(true);
    try {
      await onDelete(note.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
    } finally {
      setLoading(false);
    }
  };

  const projectOptions = projects.map((p) => ({ value: p.name, label: p.name }));
  const labelOptions = labels.map((l) => ({ value: l.name, label: l.name }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Note' : 'New Note'}
      footer={
        <>
          {isEditing && onDelete && (
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={loading}
              className="mr-auto"
            >
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={loading}
          >
            {isEditing ? 'Save Changes' : 'Create Note'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          label="Summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Enter note summary..."
          rows={4}
          error={!summary.trim() && error ? 'Required' : undefined}
        />

        <Select
          label="Project"
          value={project}
          options={projectOptions}
          onChange={setProject}
          placeholder="Select or create project..."
          allowCreate
          onCreateOption={(name) => setProject(name)}
          error={!project.trim() && error ? 'Required' : undefined}
        />

        <MultiSelect
          label="Labels"
          values={selectedLabels}
          options={labelOptions}
          onChange={setSelectedLabels}
          placeholder="Add labels..."
          allowCreate
          onCreateOption={(name) => setSelectedLabels([...selectedLabels, name])}
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="important"
            checked={important}
            onChange={(e) => setImportant(e.target.checked)}
            className="h-4 w-4 rounded border-background-tertiary bg-background text-accent focus:ring-accent"
          />
          <label htmlFor="important" className="text-sm text-foreground-secondary">
            Mark as important
          </label>
        </div>

        {error && <p className="text-sm text-error">{error}</p>}
      </form>
    </Modal>
  );
}
