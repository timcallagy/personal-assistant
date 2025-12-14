/**
 * Crawling Service
 * Orchestrates job crawling from company career pages
 */

import { prisma } from '../lib/prisma.js';
import { getParser, hasParser } from './atsParsers/index.js';
import { crawlCustomPage, closeBrowser } from './customCrawler.js';
import { calculateMatchScore } from './matchingService.js';
import { getJobProfile } from './jobProfileService.js';
import type { ParsedJob, CrawlResult } from './atsParsers/types.js';
import type { CrawlLog, JobProfile } from '@pa/shared';

/**
 * Transform Prisma crawl log to API format
 */
function transformCrawlLog(log: {
  id: number;
  companyId: number;
  startedAt: Date;
  completedAt: Date | null;
  status: string;
  jobsFound: number;
  newJobs: number;
  error: string | null;
  company?: { name: string };
}): CrawlLog {
  return {
    id: log.id,
    companyId: log.companyId,
    companyName: log.company?.name,
    startedAt: log.startedAt,
    completedAt: log.completedAt,
    status: log.status as 'running' | 'success' | 'failed',
    jobsFound: log.jobsFound,
    newJobs: log.newJobs,
    error: log.error,
  };
}

/**
 * Start a crawl log entry
 */
async function startCrawlLog(companyId: number): Promise<number> {
  const log = await prisma.crawlLog.create({
    data: {
      companyId,
      status: 'running',
    },
  });
  return log.id;
}

/**
 * Complete a crawl log entry
 */
async function completeCrawlLog(
  logId: number,
  status: 'success' | 'failed',
  jobsFound: number,
  newJobs: number,
  error?: string
): Promise<void> {
  await prisma.crawlLog.update({
    where: { id: logId },
    data: {
      completedAt: new Date(),
      status,
      jobsFound,
      newJobs,
      error: error || null,
    },
  });
}

/**
 * Save parsed jobs to the database
 */
async function saveJobs(
  companyId: number,
  jobs: ParsedJob[],
  profile: JobProfile | null
): Promise<{ found: number; new: number }> {
  let newCount = 0;
  const now = new Date();

  for (const job of jobs) {
    const matchScore = calculateMatchScore(job, profile);

    // Upsert job listing
    const existing = await prisma.jobListing.findUnique({
      where: {
        companyId_externalId: {
          companyId,
          externalId: job.externalId,
        },
      },
    });

    if (existing) {
      // Update existing job
      await prisma.jobListing.update({
        where: { id: existing.id },
        data: {
          title: job.title,
          url: job.url,
          location: job.location,
          remote: job.remote,
          department: job.department,
          description: job.description,
          postedAt: job.postedAt,
          lastSeenAt: now,
          matchScore,
        },
      });
    } else {
      // Create new job
      await prisma.jobListing.create({
        data: {
          companyId,
          externalId: job.externalId,
          title: job.title,
          url: job.url,
          location: job.location,
          remote: job.remote,
          department: job.department,
          description: job.description,
          postedAt: job.postedAt,
          firstSeenAt: now,
          lastSeenAt: now,
          status: 'new',
          matchScore,
        },
      });
      newCount++;
    }
  }

  return {
    found: jobs.length,
    new: newCount,
  };
}

/**
 * Crawl a single company's career page
 */
export async function crawlCompany(
  userId: number,
  companyId: number
): Promise<CrawlResult> {
  // Get company
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId },
  });

  if (!company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  const startTime = Date.now();
  const logId = await startCrawlLog(companyId);

  try {
    // Get user's job profile for match scoring
    const profile = await getJobProfile(userId);

    // Parse jobs based on ATS type
    let jobs: ParsedJob[];

    if (company.atsType && hasParser(company.atsType)) {
      // Use ATS-specific parser
      const parser = getParser(company.atsType)!;
      jobs = await parser.parse(company.careerPageUrl);
    } else {
      // Use custom page crawler
      jobs = await crawlCustomPage(company.careerPageUrl);
    }

    // Save jobs to database
    const { found, new: newJobs } = await saveJobs(companyId, jobs, profile);

    // Complete log
    await completeCrawlLog(logId, 'success', found, newJobs);

    return {
      companyId,
      companyName: company.name,
      status: 'success',
      jobsFound: found,
      newJobs,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await completeCrawlLog(logId, 'failed', 0, 0, errorMessage);

    return {
      companyId,
      companyName: company.name,
      status: 'failed',
      jobsFound: 0,
      newJobs: 0,
      error: errorMessage,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Crawl all active companies for a user
 */
export async function crawlAllCompanies(userId: number): Promise<{
  results: CrawlResult[];
  totalJobsFound: number;
  newJobsFound: number;
}> {
  const companies = await prisma.company.findMany({
    where: { userId, active: true },
    orderBy: { name: 'asc' },
  });

  const results: CrawlResult[] = [];
  let totalJobsFound = 0;
  let newJobsFound = 0;

  // Crawl sequentially to avoid overwhelming servers
  for (const company of companies) {
    const result = await crawlCompany(userId, company.id);
    results.push(result);

    if (result.status === 'success') {
      totalJobsFound += result.jobsFound;
      newJobsFound += result.newJobs;
    }

    // Small delay between companies
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Close browser after batch crawl
  await closeBrowser();

  return {
    results,
    totalJobsFound,
    newJobsFound,
  };
}

/**
 * Get crawl logs for a company
 */
export async function getCrawlLogs(
  userId: number,
  companyId?: number,
  limit: number = 20
): Promise<CrawlLog[]> {
  const where: { company: { userId: number; id?: number } } = {
    company: { userId },
  };

  if (companyId) {
    where.company.id = companyId;
  }

  const logs = await prisma.crawlLog.findMany({
    where,
    include: {
      company: {
        select: { name: true },
      },
    },
    orderBy: { startedAt: 'desc' },
    take: limit,
  });

  return logs.map(transformCrawlLog);
}

/**
 * Recalculate match scores for all jobs when profile changes
 */
export async function recalculateMatchScores(userId: number): Promise<number> {
  const profile = await getJobProfile(userId);

  const jobs = await prisma.jobListing.findMany({
    where: { company: { userId } },
    include: { company: true },
  });

  let updated = 0;
  for (const job of jobs) {
    const newScore = calculateMatchScore(
      {
        title: job.title,
        description: job.description,
        department: job.department,
        location: job.location,
        remote: job.remote,
      },
      profile
    );

    if (newScore !== job.matchScore) {
      await prisma.jobListing.update({
        where: { id: job.id },
        data: { matchScore: newScore },
      });
      updated++;
    }
  }

  return updated;
}
