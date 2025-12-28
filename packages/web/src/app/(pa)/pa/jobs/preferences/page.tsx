'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { useJobProfile } from '@/hooks/useJobProfile';
import { TagInput } from '@/components/jobs/TagInput';

export default function JobPreferencesPage() {
  const { profile, loading, error, saving, saveError, updateProfile } = useJobProfile();

  const [formData, setFormData] = useState({
    keywords: [] as string[],
    titles: [] as string[],
    locations: [] as string[],
    remoteOnly: false,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync form with profile when loaded
  useEffect(() => {
    if (profile) {
      setFormData({
        keywords: profile.keywords,
        titles: profile.titles,
        locations: profile.locations,
        remoteOnly: profile.remoteOnly,
      });
      setHasChanges(false);
    }
  }, [profile]);

  // Track changes
  useEffect(() => {
    if (profile) {
      const changed =
        JSON.stringify(formData.keywords) !== JSON.stringify(profile.keywords) ||
        JSON.stringify(formData.titles) !== JSON.stringify(profile.titles) ||
        JSON.stringify(formData.locations) !== JSON.stringify(profile.locations) ||
        formData.remoteOnly !== profile.remoteOnly;
      setHasChanges(changed);
    }
  }, [formData, profile]);

  const handleSave = async () => {
    setSaveSuccess(false);
    try {
      await updateProfile(formData);
      setSaveSuccess(true);
      setHasChanges(false);
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      // Error is handled by the hook
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-foreground">
            Job Preferences
          </h1>
          <a
            href="/pa/jobs"
            className="text-sm text-accent hover:text-accent-hover"
          >
            ← Back to Jobs
          </a>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-error/20 text-error rounded-md">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-background-tertiary rounded w-24 mb-2" />
                <div className="h-12 bg-background-tertiary rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <TagInput
              label="Keywords"
              values={formData.keywords}
              onChange={(keywords) => setFormData((prev) => ({ ...prev, keywords }))}
              placeholder="Type a keyword and press Enter..."
            />

            <TagInput
              label="Job Titles"
              values={formData.titles}
              onChange={(titles) => setFormData((prev) => ({ ...prev, titles }))}
              placeholder="Type a job title and press Enter..."
            />

            <TagInput
              label="Locations"
              values={formData.locations}
              onChange={(locations) => setFormData((prev) => ({ ...prev, locations }))}
              placeholder="Type a location and press Enter..."
            />

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.remoteOnly}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, remoteOnly: e.target.checked }))
                  }
                  className="w-5 h-5 rounded border-background-tertiary bg-background text-accent focus:ring-accent focus:ring-offset-0"
                />
                <span className="text-foreground">Remote Only</span>
              </label>
              <p className="mt-1 text-sm text-foreground-muted ml-8">
                Only show jobs that are explicitly marked as remote
              </p>
            </div>

            {saveError && (
              <div className="p-3 bg-error/20 text-error text-sm rounded-md">
                {saveError}
              </div>
            )}

            {saveSuccess && (
              <div className="p-3 bg-success/20 text-success text-sm rounded-md" data-testid="save-success">
                Preferences saved successfully!
              </div>
            )}

            <div className="pt-4">
              <Button
                variant="primary"
                onClick={handleSave}
                loading={saving}
                disabled={!hasChanges}
                data-testid="save-button"
              >
                Save Preferences
              </Button>
              {!hasChanges && !saveSuccess && (
                <span className="ml-3 text-sm text-foreground-muted">
                  No changes to save
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
