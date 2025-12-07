import { validationError } from './errors.js';

/**
 * Validate project name
 */
export function validateProjectName(name: unknown): string {
  if (!name || typeof name !== 'string') {
    throw validationError('Project name is required.', {
      name: 'Project name is required',
    });
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    throw validationError('Project name cannot be empty.', {
      name: 'Project name cannot be empty',
    });
  }

  if (trimmed.length > 100) {
    throw validationError('Project name is too long.', {
      name: 'Project name must be 100 characters or less',
    });
  }

  return trimmed;
}

/**
 * Validate label name
 */
export function validateLabelName(name: unknown): string {
  if (!name || typeof name !== 'string') {
    throw validationError('Label name is required.', {
      name: 'Label name is required',
    });
  }

  const trimmed = name.trim().toLowerCase();

  if (trimmed.length === 0) {
    throw validationError('Label name cannot be empty.', {
      name: 'Label name cannot be empty',
    });
  }

  if (trimmed.length > 50) {
    throw validationError('Label name is too long.', {
      name: 'Label name must be 50 characters or less',
    });
  }

  return trimmed;
}

/**
 * Validate source enum
 */
export function validateSource(source: unknown): 'Claude Code' | 'Claude Web' {
  if (source !== 'Claude Code' && source !== 'Claude Web') {
    throw validationError('Invalid source.', {
      source: 'Source must be "Claude Code" or "Claude Web"',
    });
  }
  return source;
}

/**
 * Validate note input
 */
export function validateNoteInput(data: Record<string, unknown>): {
  summary: string;
  source: 'Claude Code' | 'Claude Web';
  important: boolean;
} {
  const errors: Record<string, string> = {};

  if (!data['summary'] || typeof data['summary'] !== 'string' || data['summary'].trim().length === 0) {
    errors['summary'] = 'Summary is required';
  }

  if (!data['source']) {
    errors['source'] = 'Source is required';
  } else if (data['source'] !== 'Claude Code' && data['source'] !== 'Claude Web') {
    errors['source'] = 'Source must be "Claude Code" or "Claude Web"';
  }

  if (Object.keys(errors).length > 0) {
    throw validationError('Invalid note data.', errors);
  }

  return {
    summary: (data['summary'] as string).trim(),
    source: data['source'] as 'Claude Code' | 'Claude Web',
    important: Boolean(data['important']),
  };
}

/**
 * Validate action input
 */
export function validateActionInput(data: Record<string, unknown>): {
  title: string;
  urgency: number;
  importance: number;
  source: 'Claude Code' | 'Claude Web';
} {
  const errors: Record<string, string> = {};

  if (!data['title'] || typeof data['title'] !== 'string' || data['title'].trim().length === 0) {
    errors['title'] = 'Title is required';
  }

  const urgency = Number(data['urgency']);
  if (isNaN(urgency) || urgency < 1 || urgency > 5) {
    errors['urgency'] = 'Urgency must be a number between 1 and 5';
  }

  const importance = Number(data['importance']);
  if (isNaN(importance) || importance < 1 || importance > 5) {
    errors['importance'] = 'Importance must be a number between 1 and 5';
  }

  if (!data['source']) {
    errors['source'] = 'Source is required';
  } else if (data['source'] !== 'Claude Code' && data['source'] !== 'Claude Web') {
    errors['source'] = 'Source must be "Claude Code" or "Claude Web"';
  }

  if (Object.keys(errors).length > 0) {
    throw validationError('Invalid action data.', errors);
  }

  return {
    title: (data['title'] as string).trim(),
    urgency,
    importance,
    source: data['source'] as 'Claude Code' | 'Claude Web',
  };
}
