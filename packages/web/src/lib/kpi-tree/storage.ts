/**
 * KPI Tree LocalStorage Persistence
 * Functions for saving and loading user state
 */

import type { AspirationalChanges, TreeLayout, StoredState } from './types';

const STORAGE_KEY = 'kpi-driver-tree-state';

/**
 * Theme type
 */
export type Theme = 'dark' | 'light';

/**
 * Default state when nothing is stored
 */
const DEFAULT_STATE: StoredState & { theme: Theme } = {
  periodId: null,
  baselinePeriodId: null,
  aspirationalChanges: {},
  layout: 'horizontal-rtl',
  theme: 'dark',
};

/**
 * Save state to localStorage
 * @param state The state to save
 */
export function saveState(state: Partial<StoredState>): void {
  try {
    const currentState = loadState();
    const newState = { ...currentState, ...state };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  } catch (error) {
    console.warn('Failed to save state to localStorage:', error);
  }
}

/**
 * Load state from localStorage
 * @returns The stored state or default values
 */
export function loadState(): StoredState & { theme: Theme } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_STATE;
    }

    const parsed = JSON.parse(stored);

    // Validate and sanitize the stored data
    return {
      periodId: typeof parsed.periodId === 'number' ? parsed.periodId : null,
      baselinePeriodId:
        typeof parsed.baselinePeriodId === 'number' ? parsed.baselinePeriodId : null,
      aspirationalChanges: isValidAspirationalChanges(parsed.aspirationalChanges)
        ? parsed.aspirationalChanges
        : {},
      layout: migrateLayout(parsed.layout),
      theme: isValidTheme(parsed.theme) ? parsed.theme : 'dark',
    };
  } catch (error) {
    console.warn('Failed to load state from localStorage:', error);
    return DEFAULT_STATE;
  }
}

/**
 * Clear all stored state
 */
export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear state from localStorage:', error);
  }
}

/**
 * Clear just the aspirational changes
 */
export function clearAspirationalChanges(): void {
  saveState({ aspirationalChanges: {} });
}

/**
 * Save aspirational changes
 */
export function saveAspirationalChanges(changes: AspirationalChanges): void {
  saveState({ aspirationalChanges: changes });
}

/**
 * Save period selection
 */
export function savePeriodId(periodId: number | null): void {
  saveState({ periodId });
}

/**
 * Save baseline period selection
 */
export function saveBaselinePeriodId(baselinePeriodId: number | null): void {
  saveState({ baselinePeriodId });
}

/**
 * Save layout preference
 */
export function saveLayout(layout: TreeLayout): void {
  saveState({ layout });
}

/**
 * Save theme preference
 */
export function saveTheme(theme: Theme): void {
  saveState({ theme });
}

/**
 * Validate that a value is a valid AspirationalChanges object
 */
function isValidAspirationalChanges(value: unknown): value is AspirationalChanges {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  for (const [key, val] of Object.entries(value)) {
    if (typeof key !== 'string' || typeof val !== 'number') {
      return false;
    }
  }

  return true;
}

/**
 * Validate that a value is a valid TreeLayout
 */
function isValidLayout(value: unknown): value is TreeLayout {
  return value === 'vertical' || value === 'horizontal-ltr' || value === 'horizontal-rtl';
}

/**
 * Migrate old layout values to new format
 */
function migrateLayout(value: unknown): TreeLayout {
  // Migrate old 'horizontal' to 'horizontal-ltr'
  if (value === 'horizontal') {
    return 'horizontal-ltr';
  }
  // Migrate old 'radial' to 'vertical'
  if (value === 'radial') {
    return 'vertical';
  }
  if (isValidLayout(value)) {
    return value;
  }
  return 'horizontal-rtl'; // New default
}

/**
 * Validate that a value is a valid Theme
 */
function isValidTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}
