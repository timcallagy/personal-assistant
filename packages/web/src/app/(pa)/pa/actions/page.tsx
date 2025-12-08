'use client';

import { useState } from 'react';
import { Layout } from '@/components/layout';
import { ActionsList, ActionModal } from '@/components/actions';
import { Button } from '@/components/ui';
import { useActions, useProjects, useLabels } from '@/hooks';
import { Action } from '@/lib/api';

export default function ActionsPage() {
  const {
    actions,
    total,
    loading,
    error,
    refresh,
    createAction,
    updateAction,
    deleteAction,
    completeActions,
  } = useActions();
  const { projects } = useProjects();
  const { labels } = useLabels();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [completing, setCompleting] = useState(false);

  const handleNewAction = () => {
    setSelectedAction(null);
    setIsModalOpen(true);
  };

  const handleActionClick = (action: Action) => {
    setSelectedAction(action);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAction(null);
  };

  const handleSave = async (data: {
    title: string;
    project: string;
    labels?: string[];
    urgency: number;
    importance: number;
  }) => {
    if (selectedAction) {
      await updateAction(selectedAction.id, data);
    } else {
      await createAction(data);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteAction(id);
  };

  const handleSelect = (id: number, selected: boolean) => {
    if (selected) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    }
  };

  const handleCompleteSelected = async () => {
    if (selectedIds.length === 0) return;

    setCompleting(true);
    try {
      await completeActions(selectedIds);
      setSelectedIds([]);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Actions</h1>
            <p className="text-foreground-muted">
              {total} open action{total !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <Button
                variant="secondary"
                onClick={handleCompleteSelected}
                loading={completing}
              >
                Complete ({selectedIds.length})
              </Button>
            )}
            <Button variant="primary" onClick={handleNewAction}>
              + New Action
            </Button>
          </div>
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

        {/* Actions List */}
        <ActionsList
          actions={actions}
          loading={loading}
          onActionClick={handleActionClick}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          selectable
        />

        {/* Action Modal */}
        <ActionModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          action={selectedAction}
          projects={projects}
          labels={labels}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      </div>
    </Layout>
  );
}
