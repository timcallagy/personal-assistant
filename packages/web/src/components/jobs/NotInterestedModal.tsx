'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { JobListing } from '@/lib/api';

interface NotInterestedModalProps {
  job: JobListing;
  isOpen: boolean;
  onClose: () => void;
  onDismiss: (options: { addTitleExclusion: boolean; addLocationExclusion: boolean }) => Promise<void>;
}

export function NotInterestedModal({
  job,
  isOpen,
  onClose,
  onDismiss,
}: NotInterestedModalProps) {
  const [loading, setLoading] = useState(false);
  const [addTitle, setAddTitle] = useState(false);
  const [addLocation, setAddLocation] = useState(false);

  if (!isOpen) return null;

  const handleDismiss = async () => {
    setLoading(true);
    try {
      await onDismiss({ addTitleExclusion: addTitle, addLocationExclusion: addLocation });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleJustDismiss = async () => {
    setLoading(true);
    try {
      await onDismiss({ addTitleExclusion: false, addLocationExclusion: false });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-background rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Not Interested
        </h2>

        <p className="text-foreground-secondary mb-4">
          Would you like to exclude similar jobs in the future?
        </p>

        <div className="space-y-3 mb-6">
          {/* Title exclusion option */}
          <label className="flex items-start gap-3 p-3 rounded-md border border-background-tertiary hover:border-accent cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={addTitle}
              onChange={(e) => setAddTitle(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-background-tertiary bg-background text-accent focus:ring-accent focus:ring-offset-0"
            />
            <div className="flex-1">
              <span className="text-foreground font-medium">Exclude this job title</span>
              <p className="text-sm text-foreground-muted mt-1 break-words">
                &ldquo;{job.title}&rdquo;
              </p>
            </div>
          </label>

          {/* Location exclusion option */}
          {job.location && (
            <label className="flex items-start gap-3 p-3 rounded-md border border-background-tertiary hover:border-accent cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={addLocation}
                onChange={(e) => setAddLocation(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-background-tertiary bg-background text-accent focus:ring-accent focus:ring-offset-0"
              />
              <div className="flex-1">
                <span className="text-foreground font-medium">Exclude this location</span>
                <p className="text-sm text-foreground-muted mt-1 break-words">
                  &ldquo;{job.location}&rdquo;
                </p>
              </div>
            </label>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleJustDismiss}
            disabled={loading}
          >
            Just Dismiss
          </Button>
          {(addTitle || addLocation) && (
            <Button
              variant="primary"
              onClick={handleDismiss}
              loading={loading}
            >
              Dismiss & Exclude
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
