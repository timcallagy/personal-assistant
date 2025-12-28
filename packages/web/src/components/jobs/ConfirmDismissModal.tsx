'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface ConfirmDismissModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  jobTitle: string;
  companyName: string;
  loading?: boolean;
}

export function ConfirmDismissModal({
  isOpen,
  onClose,
  onConfirm,
  jobTitle,
  companyName,
  loading = false,
}: ConfirmDismissModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dismiss Job?"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            loading={loading}
            data-testid="confirm-dismiss"
          >
            Dismiss
          </Button>
        </>
      }
    >
      <div className="space-y-3" data-testid="confirm-modal">
        <p className="text-foreground">
          Are you sure you want to dismiss{' '}
          <span className="font-medium">&ldquo;{jobTitle}&rdquo;</span> at{' '}
          <span className="font-medium">&ldquo;{companyName}&rdquo;</span>?
        </p>
        <p className="text-foreground-secondary text-sm">
          This job will be hidden from all views and cannot be undone.
        </p>
      </div>
    </Modal>
  );
}
