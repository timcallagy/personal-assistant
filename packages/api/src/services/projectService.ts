import { prisma, notFoundError, conflictError } from '../lib/index.js';
import type { Project } from '@pa/shared';

/**
 * Get all projects for a user with note/action counts
 */
export async function getProjects(userId: number): Promise<Project[]> {
  const projects = await prisma.project.findMany({
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

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    noteCount: p._count.notes,
    actionCount: p._count.actions,
    createdAt: p.createdAt,
  }));
}

/**
 * Get a single project by ID
 */
export async function getProject(userId: number, projectId: number): Promise<Project> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      _count: {
        select: {
          notes: true,
          actions: true,
        },
      },
    },
  });

  if (!project) {
    throw notFoundError('Project', projectId);
  }

  return {
    id: project.id,
    name: project.name,
    noteCount: project._count.notes,
    actionCount: project._count.actions,
    createdAt: project.createdAt,
  };
}

/**
 * Create a new project
 */
export async function createProject(userId: number, name: string): Promise<Project> {
  // Check for existing project with same name
  const existing = await prisma.project.findFirst({
    where: { userId, name },
  });

  if (existing) {
    throw conflictError(`Project "${name}" already exists.`);
  }

  const project = await prisma.project.create({
    data: { userId, name },
  });

  return {
    id: project.id,
    name: project.name,
    noteCount: 0,
    actionCount: 0,
    createdAt: project.createdAt,
  };
}

/**
 * Delete a project (notes/actions get projectId set to null)
 */
export async function deleteProject(userId: number, projectId: number): Promise<void> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) {
    throw notFoundError('Project', projectId);
  }

  await prisma.project.delete({
    where: { id: projectId },
  });
}

/**
 * Find or create a project by name
 */
export async function findOrCreateProject(userId: number, name: string): Promise<Project> {
  let project = await prisma.project.findFirst({
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

  if (!project) {
    const created = await prisma.project.create({
      data: { userId, name },
    });
    return {
      id: created.id,
      name: created.name,
      noteCount: 0,
      actionCount: 0,
      createdAt: created.createdAt,
    };
  }

  return {
    id: project.id,
    name: project.name,
    noteCount: project._count.notes,
    actionCount: project._count.actions,
    createdAt: project.createdAt,
  };
}
