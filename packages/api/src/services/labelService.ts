import { prisma, notFoundError, conflictError } from '../lib/index.js';
import type { Label } from '@pa/shared';

/**
 * Get all labels for a user with note/action counts
 */
export async function getLabels(userId: number): Promise<Label[]> {
  const labels = await prisma.label.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          notes: true,
          actions: true,
        },
      },
    },
  });

  return labels.map((l: typeof labels[number]) => ({
    id: l.id,
    name: l.name,
    noteCount: l._count.notes,
    actionCount: l._count.actions,
    createdAt: l.createdAt,
  }));
}

/**
 * Get a single label by ID
 */
export async function getLabel(userId: number, labelId: number): Promise<Label> {
  const label = await prisma.label.findFirst({
    where: { id: labelId, userId },
    include: {
      _count: {
        select: {
          notes: true,
          actions: true,
        },
      },
    },
  });

  if (!label) {
    throw notFoundError('Label', labelId);
  }

  return {
    id: label.id,
    name: label.name,
    noteCount: label._count.notes,
    actionCount: label._count.actions,
    createdAt: label.createdAt,
  };
}

/**
 * Create a new label (name is stored lowercase)
 */
export async function createLabel(userId: number, name: string): Promise<Label> {
  const normalizedName = name.toLowerCase();

  // Check for existing label with same name (case-insensitive)
  const existing = await prisma.label.findFirst({
    where: { userId, name: normalizedName },
  });

  if (existing) {
    throw conflictError(`Label "${name}" already exists.`);
  }

  const label = await prisma.label.create({
    data: { userId, name: normalizedName },
  });

  return {
    id: label.id,
    name: label.name,
    noteCount: 0,
    actionCount: 0,
    createdAt: label.createdAt,
  };
}

/**
 * Delete a label (removes from junction tables)
 */
export async function deleteLabel(userId: number, labelId: number): Promise<void> {
  const label = await prisma.label.findFirst({
    where: { id: labelId, userId },
  });

  if (!label) {
    throw notFoundError('Label', labelId);
  }

  await prisma.label.delete({
    where: { id: labelId },
  });
}

/**
 * Find or create multiple labels by name
 * Returns all labels (existing or newly created)
 */
export async function findOrCreateLabels(userId: number, names: string[]): Promise<Label[]> {
  if (!names || names.length === 0) {
    return [];
  }

  const normalizedNames = names.map((n) => n.toLowerCase().trim()).filter((n) => n.length > 0);
  const uniqueNames = [...new Set(normalizedNames)];

  const results: Label[] = [];

  for (const name of uniqueNames) {
    let label = await prisma.label.findFirst({
      where: { userId, name },
      include: {
        _count: {
          select: {
            notes: true,
            actions: true,
          },
        },
      },
    });

    if (!label) {
      const created = await prisma.label.create({
        data: { userId, name },
      });
      results.push({
        id: created.id,
        name: created.name,
        noteCount: 0,
        actionCount: 0,
        createdAt: created.createdAt,
      });
    } else {
      results.push({
        id: label.id,
        name: label.name,
        noteCount: label._count.notes,
        actionCount: label._count.actions,
        createdAt: label.createdAt,
      });
    }
  }

  return results;
}
