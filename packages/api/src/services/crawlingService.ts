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

// Simple mutex to prevent concurrent crawl operations (memory protection)
let isCrawling = false;

async function acquireCrawlLock(): Promise<boolean> {
  if (isCrawling) {
    return false;
  }
  isCrawling = true;
  return true;
}

function releaseCrawlLock(): void {
  isCrawling = false;
}

/**
 * Clean up stuck crawl logs (running for more than 5 minutes)
 * These are likely from crashed crawl operations
 */
async function cleanupStuckCrawlLogs(): Promise<number> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const result = await prisma.crawlLog.updateMany({
    where: {
      status: 'running',
      startedAt: { lt: fiveMinutesAgo },
    },
    data: {
      status: 'failed',
      completedAt: new Date(),
      error: 'Crawl timed out or server restarted',
    },
  });

  return result.count;
}

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
 * Internal crawl function (used by both single and batch crawls)
 */
async function crawlCompanyInternal(
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
 * Crawl a single company's career page (public API with lock)
 */
export async function crawlCompany(
  userId: number,
  companyId: number
): Promise<CrawlResult> {
  // Clean up any stuck crawl logs before starting
  await cleanupStuckCrawlLogs();

  // Acquire lock to prevent concurrent crawl operations
  if (!await acquireCrawlLock()) {
    throw new Error('A crawl operation is already in progress. Please wait and try again.');
  }

  try {
    return await crawlCompanyInternal(userId, companyId);
  } finally {
    releaseCrawlLock();
  }
}

/**
 * Crawl all active companies for a user
 * @param userId The user ID
 * @param apiOnly If true, only crawl companies with API-based ATS (greenhouse, lever, ashby)
 *                Returns skipped company IDs that need browser-based crawling
 */
export async function crawlAllCompanies(userId: number, apiOnly: boolean = false): Promise<{
  results: CrawlResult[];
  totalJobsFound: number;
  newJobsFound: number;
  skippedCompanyIds?: number[];
}> {
  // Clean up any stuck crawl logs before starting
  await cleanupStuckCrawlLogs();

  // Acquire lock to prevent concurrent crawl operations
  if (!await acquireCrawlLock()) {
    throw new Error('A crawl operation is already in progress. Please wait and try again.');
  }

  try {
    const allCompanies = await prisma.company.findMany({
      where: { userId, active: true },
      orderBy: { name: 'asc' },
    });

    // If apiOnly, filter to only companies with supported ATS parsers
    const apiAtsTypes = ['greenhouse', 'lever', 'ashby'];
    const companies = apiOnly
      ? allCompanies.filter(c => c.atsType && apiAtsTypes.includes(c.atsType.toLowerCase()))
      : allCompanies;

    const skippedCompanyIds = apiOnly
      ? allCompanies.filter(c => !c.atsType || !apiAtsTypes.includes(c.atsType.toLowerCase())).map(c => c.id)
      : undefined;

    const results: CrawlResult[] = [];
    let totalJobsFound = 0;
    let newJobsFound = 0;

    // Restart browser every N companies to prevent memory accumulation
    // Lower value = less memory usage but slower crawl
    const BROWSER_RESTART_INTERVAL = 5;

    // Crawl sequentially to avoid overwhelming servers
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i]!;
      const result = await crawlCompanyInternal(userId, company.id);
      results.push(result);

      if (result.status === 'success') {
        totalJobsFound += result.jobsFound;
        newJobsFound += result.newJobs;
      }

      // Restart browser periodically to free memory (only needed for non-API crawls)
      if (!apiOnly && (i + 1) % BROWSER_RESTART_INTERVAL === 0 && i < companies.length - 1) {
        await closeBrowser();
        // Hint to garbage collector to free memory
        if (global.gc) {
          global.gc();
        }
      }

      // Delay between companies - longer for browser crawls to avoid rate limiting
      const delayMs = apiOnly ? 500 : 2000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    // Close browser after batch crawl (in case any non-API crawls happened)
    await closeBrowser();

    return {
      results,
      totalJobsFound,
      newJobsFound,
      skippedCompanyIds,
    };
  } finally {
    releaseCrawlLock();
  }
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
 * Save externally crawled jobs (from local crawler)
 * Calculates match scores server-side and saves to database
 */
export async function saveExternalCrawlResults(
  userId: number,
  companyId: number,
  jobs: ParsedJob[],
  duration?: number
): Promise<CrawlResult> {
  // Get company
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId },
  });

  if (!company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  const logId = await startCrawlLog(companyId);

  try {
    // Get user's job profile for match scoring
    const profile = await getJobProfile(userId);

    // Save jobs to database (scores calculated here)
    const { found, new: newJobs } = await saveJobs(companyId, jobs, profile);

    // Complete log
    await completeCrawlLog(logId, 'success', found, newJobs);

    return {
      companyId,
      companyName: company.name,
      status: 'success',
      jobsFound: found,
      newJobs,
      duration,
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
      duration,
    };
  }
}

/**
 * Recalculate match scores for all jobs when profile changes
 * Processes in batches to avoid memory issues with large job counts
 */
export async function recalculateMatchScores(userId: number): Promise<number> {
  const profile = await getJobProfile(userId);
  const BATCH_SIZE = 100;

  let updated = 0;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    // Fetch jobs in batches
    const jobs = await prisma.jobListing.findMany({
      where: { company: { userId } },
      select: {
        id: true,
        title: true,
        description: true,
        department: true,
        location: true,
        remote: true,
        matchScore: true,
      },
      skip: offset,
      take: BATCH_SIZE,
    });

    if (jobs.length < BATCH_SIZE) {
      hasMore = false;
    }

    // Process batch
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

    offset += BATCH_SIZE;
  }

  return updated;
}
