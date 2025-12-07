import { prisma, notFoundError } from '../lib/index.js';
import { findOrCreateProject } from './projectService.js';
import { findOrCreateLabels } from './labelService.js';
import type { Note, NotesFilter } from '@pa/shared';

interface CreateNoteData {
  summary: string;
  projectName: string;
  labelNames?: string[];
  important?: boolean;
  source: 'Claude Code' | 'Claude Web';
}

interface UpdateNoteData {
  summary?: string;
  projectName?: string;
  labelNames?: string[];
  important?: boolean;
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
 * Create a new note
 */
export async function createNote(userId: number, data: CreateNoteData): Promise<Note> {
  // Find or create project
  const project = await findOrCreateProject(userId, data.projectName);

  // Find or create labels
  const labels = await findOrCreateLabels(userId, data.labelNames || []);

  const note = await prisma.note.create({
    data: {
      userId,
      projectId: project.id,
      summary: data.summary,
      important: data.important || false,
      source: data.source,
      labels: {
        connect: labels.map((l) => ({ id: l.id })),
      },
    },
    include: {
      project: true,
      labels: true,
    },
  });

  return transformNote(note);
}

/**
 * Get a single note by ID
 */
export async function getNote(userId: number, noteId: number): Promise<Note> {
  const note = await prisma.note.findFirst({
    where: { id: noteId, userId },
    include: {
      project: true,
      labels: true,
    },
  });

  if (!note) {
    throw notFoundError('Note', noteId);
  }

  return transformNote(note);
}

/**
 * Update a note
 */
export async function updateNote(
  userId: number,
  noteId: number,
  data: UpdateNoteData
): Promise<Note> {
  // Check if note exists
  const existing = await prisma.note.findFirst({
    where: { id: noteId, userId },
  });

  if (!existing) {
    throw notFoundError('Note', noteId);
  }

  // Prepare update data
  const updateData: {
    summary?: string;
    important?: boolean;
    projectId?: number;
    labels?: { set: { id: number }[] };
  } = {};

  if (data.summary !== undefined) {
    updateData.summary = data.summary;
  }

  if (data.important !== undefined) {
    updateData.important = data.important;
  }

  if (data.projectName !== undefined) {
    const project = await findOrCreateProject(userId, data.projectName);
    updateData.projectId = project.id;
  }

  if (data.labelNames !== undefined) {
    const labels = await findOrCreateLabels(userId, data.labelNames);
    updateData.labels = { set: labels.map((l) => ({ id: l.id })) };
  }

  const note = await prisma.note.update({
    where: { id: noteId },
    data: updateData,
    include: {
      project: true,
      labels: true,
    },
  });

  return transformNote(note);
}

/**
 * Delete a note
 */
export async function deleteNote(userId: number, noteId: number): Promise<void> {
  const note = await prisma.note.findFirst({
    where: { id: noteId, userId },
  });

  if (!note) {
    throw notFoundError('Note', noteId);
  }

  await prisma.note.delete({
    where: { id: noteId },
  });
}

/**
 * Get notes with optional filters
 */
export async function getNotes(
  userId: number,
  filters: NotesFilter = {}
): Promise<{ notes: Note[]; total: number }> {
  const {
    project,
    labels,
    important,
    fromDate,
    toDate,
    search,
    limit = 50,
    offset = 0,
  } = filters;

  // Build where clause
  const where: {
    userId: number;
    project?: { name: string };
    labels?: { some: { name: { in: string[] } } };
    important?: boolean;
    createdAt?: { gte?: Date; lte?: Date };
    summary?: { contains: string; mode: 'insensitive' };
  } = { userId };

  if (project) {
    where.project = { name: project };
  }

  if (labels && labels.length > 0) {
    where.labels = { some: { name: { in: labels } } };
  }

  if (important !== undefined) {
    where.important = important;
  }

  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) {
      where.createdAt.gte = new Date(fromDate);
    }
    if (toDate) {
      where.createdAt.lte = new Date(toDate);
    }
  }

  if (search) {
    where.summary = { contains: search, mode: 'insensitive' };
  }

  // Get total count
  const total = await prisma.note.count({ where });

  // Get notes
  const notes = await prisma.note.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 100),
    skip: offset,
    include: {
      project: true,
      labels: true,
    },
  });

  return {
    notes: notes.map(transformNote),
    total,
  };
}
