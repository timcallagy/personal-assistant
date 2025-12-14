/**
 * Job Listing Service
 * CRUD operations for job listings discovered by crawling
 */

import { prisma } from '../lib/prisma.js';
import type { JobListing, JobStatus, JobListingsFilter } from '@pa/shared';

/**
 * Transform Prisma job listing to API format
 */
function transformListing(listing: {
  id: number;
  companyId: number;
  externalId: string;
  title: string;
  url: string;
  location: string | null;
  remote: boolean;
  department: string | null;
  description: string | null;
  postedAt: Date | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  status: string;
  matchScore: number | null;
  company?: { name: string };
}): JobListing {
  return {
    id: listing.id,
    companyId: listing.companyId,
    companyName: listing.company?.name,
    externalId: listing.externalId,
    title: listing.title,
    url: listing.url,
    location: listing.location,
    remote: listing.remote,
    department: listing.department,
    description: listing.description,
    postedAt: listing.postedAt,
    firstSeenAt: listing.firstSeenAt,
    lastSeenAt: listing.lastSeenAt,
    status: listing.status as JobStatus,
    matchScore: listing.matchScore,
  };
}

/**
 * Get job listings for a user with filtering
 */
export async function getJobListings(
  userId: number,
  filter: JobListingsFilter = {}
): Promise<{ listings: JobListing[]; total: number }> {
  const { companyId, status, minScore, limit = 50, offset = 0 } = filter;

  // Build where clause
  const where: {
    company: { userId: number; id?: number };
    status?: string;
    matchScore?: { gte: number };
  } = {
    company: { userId },
  };

  if (companyId) {
    where.company.id = companyId;
  }

  if (status) {
    where.status = status;
  }

  if (minScore !== undefined) {
    where.matchScore = { gte: minScore };
  }

  // Get total count
  const total = await prisma.jobListing.count({ where });

  // Get listings
  const listings = await prisma.jobListing.findMany({
    where,
    include: {
      company: {
        select: { name: true },
      },
    },
    orderBy: [{ matchScore: 'desc' }, { firstSeenAt: 'desc' }],
    take: limit,
    skip: offset,
  });

  return {
    listings: listings.map(transformListing),
    total,
  };
}

/**
 * Get a single job listing by ID
 */
export async function getJobListing(
  userId: number,
  listingId: number
): Promise<JobListing | null> {
  const listing = await prisma.jobListing.findFirst({
    where: {
      id: listingId,
      company: { userId },
    },
    include: {
      company: {
        select: { name: true },
      },
    },
  });

  return listing ? transformListing(listing) : null;
}

/**
 * Update a job listing's status
 */
export async function updateJobStatus(
  userId: number,
  listingId: number,
  status: JobStatus
): Promise<JobListing | null> {
  // Verify ownership
  const existing = await prisma.jobListing.findFirst({
    where: {
      id: listingId,
      company: { userId },
    },
  });

  if (!existing) {
    return null;
  }

  const updated = await prisma.jobListing.update({
    where: { id: listingId },
    data: { status },
    include: {
      company: {
        select: { name: true },
      },
    },
  });

  return transformListing(updated);
}

/**
 * Batch update job statuses
 */
export async function batchUpdateJobStatus(
  userId: number,
  listingIds: number[],
  status: JobStatus
): Promise<number> {
  const result = await prisma.jobListing.updateMany({
    where: {
      id: { in: listingIds },
      company: { userId },
    },
    data: { status },
  });

  return result.count;
}

/**
 * Get job statistics for a user
 */
export async function getJobStats(userId: number): Promise<{
  total: number;
  byStatus: Record<string, number>;
  newSinceLastWeek: number;
}> {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [total, byStatus, newSinceLastWeek] = await Promise.all([
    prisma.jobListing.count({
      where: { company: { userId } },
    }),
    prisma.jobListing.groupBy({
      by: ['status'],
      where: { company: { userId } },
      _count: true,
    }),
    prisma.jobListing.count({
      where: {
        company: { userId },
        firstSeenAt: { gte: oneWeekAgo },
      },
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const item of byStatus) {
    statusCounts[item.status] = item._count;
  }

  return {
    total,
    byStatus: statusCounts,
    newSinceLastWeek,
  };
}

/**
 * Delete old dismissed jobs to keep the database clean
 */
export async function cleanupDismissedJobs(userId: number, olderThanDays: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await prisma.jobListing.deleteMany({
    where: {
      company: { userId },
      status: 'dismissed',
      lastSeenAt: { lt: cutoffDate },
    },
  });

  return result.count;
}
