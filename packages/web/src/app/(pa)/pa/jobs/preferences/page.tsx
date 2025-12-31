'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useJobProfile } from '@/hooks/useJobProfile';
import { TagInput } from '@/components/jobs/TagInput';

export default function JobPreferencesPage() {
  const { profile, loading, error, saving, saveError, updateProfile } = useJobProfile();

  const [formData, setFormData] = useState({
    keywords: [] as string[],
    titles: [] as string[],
    locations: [] as string[],
    locationExclusions: [] as string[],
    titleExclusions: [] as string[],
    remoteOnly: false,
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const isInitialized = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync form with profile when loaded
  useEffect(() => {
    if (profile) {
      setFormData({
        keywords: profile.keywords || [],
        titles: profile.titles || [],
        locations: profile.locations || [],
        locationExclusions: profile.locationExclusions || [],
        titleExclusions: profile.titleExclusions || [],
        remoteOnly: profile.remoteOnly ?? false,
      });
      // Mark as initialized after first load
      setTimeout(() => {
        isInitialized.current = true;
      }, 100);
    }
  }, [profile]);

  // Auto-save with debounce
  const saveChanges = useCallback(async (data: typeof formData) => {
    setSaveStatus('saving');
    try {
      await updateProfile(data);
      setSaveStatus('saved');
      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  }, [updateProfile]);

  // Debounced auto-save when form data changes
  useEffect(() => {
    // Don't save on initial load
    if (!isInitialized.current || !profile) return;

    // Check if there are actual changes
    const hasChanges =
      JSON.stringify(formData.keywords) !== JSON.stringify(profile.keywords || []) ||
      JSON.stringify(formData.titles) !== JSON.stringify(profile.titles || []) ||
      JSON.stringify(formData.locations) !== JSON.stringify(profile.locations || []) ||
      JSON.stringify(formData.locationExclusions) !== JSON.stringify(profile.locationExclusions || []) ||
      JSON.stringify(formData.titleExclusions) !== JSON.stringify(profile.titleExclusions || []) ||
      formData.remoteOnly !== (profile.remoteOnly ?? false);

    if (!hasChanges) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 500ms
    saveTimeoutRef.current = setTimeout(() => {
      saveChanges(formData);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, profile, saveChanges]);

  return (
    <Layout>
      <div className="p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">
              Job Preferences
            </h1>
            {/* Auto-save status indicator */}
            {saveStatus === 'saving' && (
              <span className="text-sm text-foreground-muted animate-pulse">
                Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-sm text-success">
                ✓ Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-sm text-error">
                Failed to save
              </span>
            )}
          </div>
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

            <TagInput
              label="Location Exclusions"
              values={formData.locationExclusions}
              onChange={(locationExclusions) => setFormData((prev) => ({ ...prev, locationExclusions }))}
              placeholder="e.g. US, India, Washington..."
              description="Jobs with locations matching these will be filtered out"
            />

            <TagInput
              label="Job Title Exclusions"
              values={formData.titleExclusions}
              onChange={(titleExclusions) => setFormData((prev) => ({ ...prev, titleExclusions }))}
              placeholder="e.g. Customer Success Manager, Sales Development Representative..."
              description="Jobs with these exact titles (case-insensitive) will be filtered out"
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
          </div>
        )}
      </div>
    </Layout>
  );
}
