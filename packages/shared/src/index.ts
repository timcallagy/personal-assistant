// ============================================
// PA (Personal Assistant) - Shared Types
// ============================================

// ============================================
// Enums and Constants
// ============================================

export const SOURCE = {
  CLAUDE_CODE: 'Claude Code',
  CLAUDE_WEB: 'Claude Web',
} as const;

export type Source = (typeof SOURCE)[keyof typeof SOURCE];

export const ACTION_STATUS = {
  OPEN: 'open',
  COMPLETED: 'completed',
} as const;

export type ActionStatus = (typeof ACTION_STATUS)[keyof typeof ACTION_STATUS];

// ============================================
// Core Entity Types
// ============================================

export interface Note {
  id: number;
  summary: string;
  project: string;
  labels: string[];
  important: boolean;
  source: Source;
  createdAt: Date;
  updatedAt: Date;
}

export interface Action {
  id: number;
  title: string;
  project: string;
  labels: string[];
  urgency: number; // 1-5
  importance: number; // 1-5
  priorityScore: number; // urgency * importance (1-25)
  status: ActionStatus;
  source: Source;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface Project {
  id: number;
  name: string;
  noteCount: number;
  actionCount: number;
  createdAt: Date;
}

export interface Label {
  id: number;
  name: string;
  noteCount: number;
  actionCount: number;
  createdAt: Date;
}

// ============================================
// API Request Types
// ============================================

export interface CreateNoteRequest {
  summary: string;
  project: string;
  labels?: string[];
  important?: boolean;
  source: Source;
}

export interface UpdateNoteRequest {
  summary?: string;
  project?: string;
  labels?: string[];
  important?: boolean;
}

export interface CreateActionRequest {
  title: string;
  project: string;
  labels?: string[];
  urgency: number;
  importance: number;
  source: Source;
}

export interface UpdateActionRequest {
  title?: string;
  project?: string;
  labels?: string[];
  urgency?: number;
  importance?: number;
}

export interface CompleteActionsRequest {
  ids: number[];
}

export interface CreateProjectRequest {
  name: string;
}

export interface CreateLabelRequest {
  name: string;
}

// ============================================
// API Filter/Query Types
// ============================================

export interface NotesFilter {
  project?: string;
  labels?: string[];
  important?: boolean;
  fromDate?: string;
  toDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ActionsFilter {
  project?: string;
  labels?: string[];
  status?: ActionStatus;
  sort?: 'priority' | 'created_at' | 'urgency' | 'importance';
  order?: 'asc' | 'desc';
  top?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface SearchParams {
  query: string;
  type?: 'all' | 'notes' | 'actions';
  project?: string;
  labels?: string[];
  limit?: number;
}

// ============================================
// API Response Types
// ============================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// Specific response data types
export interface NotesResponseData {
  notes: Note[];
  total: number;
  limit: number;
  offset: number;
}

export interface ActionsResponseData {
  actions: Action[];
  total: number;
  limit: number;
  offset: number;
}

export interface SearchResponseData {
  notes: Note[];
  actions: Action[];
  totalNotes: number;
  totalActions: number;
}

export interface CompleteActionsResponseData {
  completed: number[];
  notFound: number[];
  alreadyCompleted: number[];
}

export interface ProjectsResponseData {
  projects: Project[];
}

export interface LabelsResponseData {
  labels: Label[];
}

// ============================================
// Utility Types
// ============================================

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

export function getPriorityLevel(score: number): PriorityLevel {
  if (score >= 20) return 'critical';
  if (score >= 12) return 'high';
  if (score >= 6) return 'medium';
  return 'low';
}

export function calculatePriorityScore(urgency: number, importance: number): number {
  return urgency * importance;
}
