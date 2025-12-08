'use client';

import { useState, useRef } from 'react';
import { blogImages, ApiError } from '@/lib/api';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageUpload({ value, onChange, label = 'Featured Image' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPEG, PNG, GIF, and WebP images are allowed');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const result = await blogImages.upload(file);
      onChange(result.url);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to upload image';
      setError(message);
    } finally {
      setUploading(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onChange('');
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Determine if value is an internal URL (starts with /api/v1/blog/images/)
  const isInternalImage = value.startsWith('/api/v1/blog/images/');

  // Build full URL for preview
  const previewUrl = isInternalImage
    ? `${process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001/api/v1'}${value.replace('/api/v1', '')}`
    : value;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">{label}</label>

      {value ? (
        <div className="space-y-2">
          {/* Image Preview */}
          <div className="relative w-full h-40 bg-background-tertiary rounded-md overflow-hidden">
            <img
              src={previewUrl}
              alt="Featured image preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23333" width="100" height="100"/%3E%3Ctext fill="%23666" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>

          {/* URL Display */}
          <div className="text-xs text-foreground-muted truncate" title={value}>
            {value}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleButtonClick}
              disabled={uploading}
              className="px-3 py-1.5 text-sm bg-background-tertiary hover:bg-background-secondary rounded-md transition-colors"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="px-3 py-1.5 text-sm text-error hover:bg-error/10 rounded-md transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Upload Button */}
          <button
            type="button"
            onClick={handleButtonClick}
            disabled={uploading}
            className="w-full h-32 border-2 border-dashed border-background-tertiary hover:border-primary/50 rounded-md flex flex-col items-center justify-center gap-2 text-foreground-muted hover:text-foreground transition-colors"
          >
            {uploading ? (
              <>
                <svg className="w-8 h-8 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm">Uploading...</span>
              </>
            ) : (
              <>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">Click to upload image</span>
                <span className="text-xs">JPEG, PNG, GIF, WebP (max 5MB)</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Error message */}
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
