'use client';

import { useState } from 'react';
import { Layout } from '@/components/layout';
import { ActionsList, ActionModal, ActionsGrid, ViewToggle } from '@/components/actions';
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
    updateActionOptimistic,
    deleteAction,
    completeActions,
  } = useActions();
  const { projects } = useProjects();
  const { labels } = useLabels();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [completing, setCompleting] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

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

  const handleActionMove = async (id: number, urgency: number, importance: number) => {
    await updateActionOptimistic(id, { urgency, importance });
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
          <div className="flex items-center gap-3">
            <ViewToggle view={viewMode} onChange={setViewMode} />
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

        {/* Actions List or Grid */}
        {viewMode === 'list' ? (
          <ActionsList
            actions={actions}
            loading={loading}
            onActionClick={handleActionClick}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            selectable
          />
        ) : (
          <ActionsGrid
            actions={actions}
            loading={loading}
            onActionClick={handleActionClick}
            onActionMove={handleActionMove}
          />
        )}

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
