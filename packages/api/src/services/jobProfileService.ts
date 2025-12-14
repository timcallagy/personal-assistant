import { prisma } from '../lib/index.js';
import type { JobProfile } from '@pa/shared';

// ============================================
// Transform Functions
// ============================================

function transformJobProfile(profile: {
  id: number;
  keywords: string[];
  titles: string[];
  locations: string[];
  remoteOnly: boolean;
  createdAt: Date;
  updatedAt: Date;
}): JobProfile {
  return {
    id: profile.id,
    keywords: profile.keywords,
    titles: profile.titles,
    locations: profile.locations,
    remoteOnly: profile.remoteOnly,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

// ============================================
// Service Functions
// ============================================

export async function getJobProfile(userId: number): Promise<JobProfile | null> {
  const profile = await prisma.jobProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return null;
  }

  return transformJobProfile(profile);
}

export async function upsertJobProfile(
  userId: number,
  data: {
    keywords?: string[];
    titles?: string[];
    locations?: string[];
    remoteOnly?: boolean;
  }
): Promise<JobProfile> {
  const profile = await prisma.jobProfile.upsert({
    where: { userId },
    create: {
      userId,
      keywords: data.keywords || [],
      titles: data.titles || [],
      locations: data.locations || [],
      remoteOnly: data.remoteOnly || false,
    },
    update: {
      ...(data.keywords !== undefined && { keywords: data.keywords }),
      ...(data.titles !== undefined && { titles: data.titles }),
      ...(data.locations !== undefined && { locations: data.locations }),
      ...(data.remoteOnly !== undefined && { remoteOnly: data.remoteOnly }),
    },
  });

  return transformJobProfile(profile);
}

export async function deleteJobProfile(userId: number): Promise<void> {
  await prisma.jobProfile.deleteMany({
    where: { userId },
  });
}
