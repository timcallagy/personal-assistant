'use client';

import { useState, KeyboardEvent } from 'react';

interface TagInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  description?: string;
  error?: string;
}

export function TagInput({ label, values, onChange, placeholder, description, error }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed && !values.includes(trimmed)) {
        onChange([...values, trimmed]);
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && inputValue === '' && values.length > 0) {
      // Remove last tag on backspace when input is empty
      onChange(values.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(values.filter(tag => tag !== tagToRemove));
  };

  const labelId = label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {label}
        </label>
      )}
      {description && (
        <p className="text-sm text-foreground-muted mb-1.5">{description}</p>
      )}
      <div
        className={`flex flex-wrap gap-2 rounded-md border bg-background p-2 focus-within:ring-1 ${
          error
            ? 'border-error focus-within:border-error focus-within:ring-error'
            : 'border-background-tertiary focus-within:border-accent focus-within:ring-accent'
        }`}
        data-testid={`${labelId}-input`}
      >
        {values.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="inline-flex items-center gap-1 rounded bg-accent/20 px-2 py-1 text-sm text-foreground"
            data-testid={`${labelId}-tag`}
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-error cursor-pointer focus:outline-none"
              data-testid="remove-tag"
              aria-label={`Remove ${tag}`}
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={values.length === 0 ? placeholder : 'Add more...'}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-foreground placeholder:text-foreground-muted text-sm"
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-error">{error}</p>
      )}
    </div>
  );
}
