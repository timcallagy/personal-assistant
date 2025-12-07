'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Input, Select, MultiSelect } from '@/components/ui';
import { Action, Project, Label } from '@/lib/api';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  action?: Action | null;
  projects: Project[];
  labels: Label[];
  onSave: (data: {
    title: string;
    project: string;
    labels?: string[];
    urgency: number;
    importance: number;
  }) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

const ratingOptions = [
  { value: '1', label: '1 - Very Low' },
  { value: '2', label: '2 - Low' },
  { value: '3', label: '3 - Medium' },
  { value: '4', label: '4 - High' },
  { value: '5', label: '5 - Very High' },
];

export function ActionModal({
  isOpen,
  onClose,
  action,
  projects,
  labels,
  onSave,
  onDelete,
}: ActionModalProps) {
  const [title, setTitle] = useState('');
  const [project, setProject] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [urgency, setUrgency] = useState('3');
  const [importance, setImportance] = useState('3');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!action;

  useEffect(() => {
    if (action) {
      setTitle(action.title);
      setProject(action.project);
      setSelectedLabels(action.labels);
      setUrgency(String(action.urgency));
      setImportance(String(action.importance));
    } else {
      setTitle('');
      setProject('');
      setSelectedLabels([]);
      setUrgency('3');
      setImportance('3');
    }
    setError('');
  }, [action, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!project.trim()) {
      setError('Project is required');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        title: title.trim(),
        project: project.trim(),
        labels: selectedLabels.length > 0 ? selectedLabels : undefined,
        urgency: parseInt(urgency, 10),
        importance: parseInt(importance, 10),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save action');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!action || !onDelete) return;

    if (!confirm('Are you sure you want to delete this action?')) return;

    setLoading(true);
    try {
      await onDelete(action.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete action');
    } finally {
      setLoading(false);
    }
  };

  const projectOptions = projects.map((p) => ({ value: p.name, label: p.name }));
  const labelOptions = labels.map((l) => ({ value: l.name, label: l.name }));

  const priorityScore = parseInt(urgency, 10) * parseInt(importance, 10);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Action' : 'New Action'}
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
            {isEditing ? 'Save Changes' : 'Create Action'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          error={!title.trim() && error ? 'Required' : undefined}
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

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Urgency"
            value={urgency}
            options={ratingOptions}
            onChange={setUrgency}
          />
          <Select
            label="Importance"
            value={importance}
            options={ratingOptions}
            onChange={setImportance}
          />
        </div>

        <div className="p-3 bg-background rounded-md border border-background-tertiary">
          <div className="text-sm text-foreground-muted">Priority Score</div>
          <div className="text-2xl font-bold text-accent">{priorityScore}</div>
          <div className="text-xs text-foreground-muted">
            {priorityScore >= 20 ? 'Critical' : priorityScore >= 15 ? 'High' : priorityScore >= 10 ? 'Medium' : 'Low'}
          </div>
        </div>

        {error && <p className="text-sm text-error">{error}</p>}
      </form>
    </Modal>
  );
}
