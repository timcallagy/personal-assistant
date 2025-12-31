'use client';

import { useState, KeyboardEvent, DragEvent } from 'react';

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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  const handleDragStart = (e: DragEvent<HTMLSpanElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: DragEvent<HTMLSpanElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: DragEvent<HTMLSpanElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newValues = [...values];
    const [draggedItem] = newValues.splice(draggedIndex, 1);
    if (draggedItem !== undefined) {
      newValues.splice(dropIndex, 0, draggedItem);
      onChange(newValues);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
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
      {values.length > 1 && (
        <p className="text-xs text-foreground-muted mb-1.5 italic">
          Drag to reorder — items at top score higher
        </p>
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
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-sm cursor-grab active:cursor-grabbing transition-all ${
              draggedIndex === index
                ? 'opacity-50 bg-accent/20 text-foreground'
                : dragOverIndex === index
                  ? 'bg-accent/40 text-foreground ring-2 ring-accent'
                  : 'bg-accent/20 text-foreground'
            }`}
            data-testid={`${labelId}-tag`}
          >
            <span className="text-foreground-muted text-xs font-mono mr-0.5 select-none">
              {index + 1}.
            </span>
            <span className="text-foreground-muted mr-0.5 cursor-grab select-none" title="Drag to reorder">
              ⋮⋮
            </span>
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-error cursor-pointer focus:outline-none ml-0.5"
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
