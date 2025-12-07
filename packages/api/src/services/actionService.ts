import { prisma, notFoundError } from '../lib/index.js';
import { findOrCreateProject } from './projectService.js';
import { findOrCreateLabels } from './labelService.js';
import type { Action, ActionsFilter } from '@pa/shared';

interface CreateActionData {
  title: string;
  projectName: string;
  labelNames?: string[];
  urgency: number;
  importance: number;
  source: 'Claude Code' | 'Claude Web';
}

interface UpdateActionData {
  title?: string;
  projectName?: string;
  labelNames?: string[];
  urgency?: number;
  importance?: number;
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
 * Create a new action
 */
export async function createAction(userId: number, data: CreateActionData): Promise<Action> {
  // Find or create project
  const project = await findOrCreateProject(userId, data.projectName);

  // Find or create labels
  const labels = await findOrCreateLabels(userId, data.labelNames || []);

  // Calculate priority score
  const priorityScore = data.urgency * data.importance;

  const action = await prisma.action.create({
    data: {
      userId,
      projectId: project.id,
      title: data.title,
      urgency: data.urgency,
      importance: data.importance,
      priorityScore,
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

  return transformAction(action);
}

/**
 * Get a single action by ID
 */
export async function getAction(userId: number, actionId: number): Promise<Action> {
  const action = await prisma.action.findFirst({
    where: { id: actionId, userId },
    include: {
      project: true,
      labels: true,
    },
  });

  if (!action) {
    throw notFoundError('Action', actionId);
  }

  return transformAction(action);
}

/**
 * Update an action
 */
export async function updateAction(
  userId: number,
  actionId: number,
  data: UpdateActionData
): Promise<Action> {
  // Check if action exists
  const existing = await prisma.action.findFirst({
    where: { id: actionId, userId },
  });

  if (!existing) {
    throw notFoundError('Action', actionId);
  }

  // Prepare update data
  const updateData: {
    title?: string;
    urgency?: number;
    importance?: number;
    priorityScore?: number;
    projectId?: number;
    labels?: { set: { id: number }[] };
  } = {};

  if (data.title !== undefined) {
    updateData.title = data.title;
  }

  if (data.urgency !== undefined || data.importance !== undefined) {
    const newUrgency = data.urgency ?? existing.urgency;
    const newImportance = data.importance ?? existing.importance;
    updateData.urgency = newUrgency;
    updateData.importance = newImportance;
    updateData.priorityScore = newUrgency * newImportance;
  }

  if (data.projectName !== undefined) {
    const project = await findOrCreateProject(userId, data.projectName);
    updateData.projectId = project.id;
  }

  if (data.labelNames !== undefined) {
    const labels = await findOrCreateLabels(userId, data.labelNames);
    updateData.labels = { set: labels.map((l) => ({ id: l.id })) };
  }

  const action = await prisma.action.update({
    where: { id: actionId },
    data: updateData,
    include: {
      project: true,
      labels: true,
    },
  });

  return transformAction(action);
}

/**
 * Delete an action
 */
export async function deleteAction(userId: number, actionId: number): Promise<void> {
  const action = await prisma.action.findFirst({
    where: { id: actionId, userId },
  });

  if (!action) {
    throw notFoundError('Action', actionId);
  }

  await prisma.action.delete({
    where: { id: actionId },
  });
}

/**
 * Complete multiple actions
 */
export async function completeActions(
  userId: number,
  actionIds: number[]
): Promise<{ completed: number[]; notFound: number[]; alreadyCompleted: number[] }> {
  const completed: number[] = [];
  const notFound: number[] = [];
  const alreadyCompleted: number[] = [];

  for (const id of actionIds) {
    const action = await prisma.action.findFirst({
      where: { id, userId },
    });

    if (!action) {
      notFound.push(id);
    } else if (action.status === 'completed') {
      alreadyCompleted.push(id);
    } else {
      await prisma.action.update({
        where: { id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });
      completed.push(id);
    }
  }

  return { completed, notFound, alreadyCompleted };
}

/**
 * Reopen a completed action
 */
export async function reopenAction(userId: number, actionId: number): Promise<Action> {
  const action = await prisma.action.findFirst({
    where: { id: actionId, userId },
  });

  if (!action) {
    throw notFoundError('Action', actionId);
  }

  const updated = await prisma.action.update({
    where: { id: actionId },
    data: {
      status: 'open',
      completedAt: null,
    },
    include: {
      project: true,
      labels: true,
    },
  });

  return transformAction(updated);
}

/**
 * Get actions with optional filters
 */
export async function getActions(
  userId: number,
  filters: ActionsFilter = {}
): Promise<{ actions: Action[]; total: number }> {
  const {
    project,
    labels,
    status = 'open',
    sort = 'priority',
    order = 'desc',
    top,
    search,
    limit = 50,
    offset = 0,
  } = filters;

  // Build where clause
  const where: {
    userId: number;
    status: string;
    project?: { name: string };
    labels?: { some: { name: { in: string[] } } };
    title?: { contains: string; mode: 'insensitive' };
  } = { userId, status };

  if (project) {
    where.project = { name: project };
  }

  if (labels && labels.length > 0) {
    where.labels = { some: { name: { in: labels } } };
  }

  if (search) {
    where.title = { contains: search, mode: 'insensitive' };
  }

  // Build order by
  const orderByMap: Record<string, string> = {
    priority: 'priorityScore',
    created_at: 'createdAt',
    urgency: 'urgency',
    importance: 'importance',
  };

  const orderByField = orderByMap[sort] || 'priorityScore';
  const orderBy = { [orderByField]: order };

  // Get total count
  const total = await prisma.action.count({ where });

  // Determine limit
  const effectiveLimit = top ? Math.min(top, 100) : Math.min(limit, 100);
  const effectiveOffset = top ? 0 : offset;

  // Get actions
  const actions = await prisma.action.findMany({
    where,
    orderBy,
    take: effectiveLimit,
    skip: effectiveOffset,
    include: {
      project: true,
      labels: true,
    },
  });

  return {
    actions: actions.map(transformAction),
    total,
  };
}
