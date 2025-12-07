import { prisma } from '../lib/index.js';
import type { Note, Action, SearchParams } from '@pa/shared';

interface SearchResult {
  notes: Note[];
  actions: Action[];
  totalNotes: number;
  totalActions: number;
}

/**
 * Transform Prisma note to API Note type
 */
function transformNote(note: {
  id: number;
  summary: string;
  important: boolean;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  project: { name: string } | null;
  labels: { name: string }[];
}): Note {
  return {
    id: note.id,
    summary: note.summary,
    project: note.project?.name || '',
    labels: note.labels.map((l) => l.name),
    important: note.important,
    source: note.source as Note['source'],
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

/**
 * Transform Prisma action to API Action type
 */
function transformAction(action: {
  id: number;
  title: string;
  urgency: number;
  importance: number;
  priorityScore: number;
  status: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  project: { name: string } | null;
  labels: { name: string }[];
}): Action {
  return {
    id: action.id,
    title: action.title,
    project: action.project?.name || '',
    labels: action.labels.map((l) => l.name),
    urgency: action.urgency,
    importance: action.importance,
    priorityScore: action.priorityScore,
    status: action.status as Action['status'],
    source: action.source as Action['source'],
    createdAt: action.createdAt,
    updatedAt: action.updatedAt,
    completedAt: action.completedAt,
  };
}

/**
 * Unified search across notes and actions
 */
export async function search(userId: number, params: SearchParams): Promise<SearchResult> {
  const { query, type = 'all', project, labels, limit = 20 } = params;

  const result: SearchResult = {
    notes: [],
    actions: [],
    totalNotes: 0,
    totalActions: 0,
  };

  // Search notes if type is 'all' or 'notes'
  if (type === 'all' || type === 'notes') {
    const noteWhere: {
      userId: number;
      summary: { contains: string; mode: 'insensitive' };
      project?: { name: string };
      labels?: { some: { name: { in: string[] } } };
    } = {
      userId,
      summary: { contains: query, mode: 'insensitive' },
    };

    if (project) {
      noteWhere.project = { name: project };
    }

    if (labels && labels.length > 0) {
      noteWhere.labels = { some: { name: { in: labels } } };
    }

    const [notes, totalNotes] = await Promise.all([
      prisma.note.findMany({
        where: noteWhere,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 100),
        include: {
          project: true,
          labels: true,
        },
      }),
      prisma.note.count({ where: noteWhere }),
    ]);

    result.notes = notes.map(transformNote);
    result.totalNotes = totalNotes;
  }

  // Search actions if type is 'all' or 'actions'
  if (type === 'all' || type === 'actions') {
    const actionWhere: {
      userId: number;
      title: { contains: string; mode: 'insensitive' };
      project?: { name: string };
      labels?: { some: { name: { in: string[] } } };
    } = {
      userId,
      title: { contains: query, mode: 'insensitive' },
    };

    if (project) {
      actionWhere.project = { name: project };
    }

    if (labels && labels.length > 0) {
      actionWhere.labels = { some: { name: { in: labels } } };
    }

    const [actions, totalActions] = await Promise.all([
      prisma.action.findMany({
        where: actionWhere,
        orderBy: { priorityScore: 'desc' },
        take: Math.min(limit, 100),
        include: {
          project: true,
          labels: true,
        },
      }),
      prisma.action.count({ where: actionWhere }),
    ]);

    result.actions = actions.map(transformAction);
    result.totalActions = totalActions;
  }

  return result;
}
