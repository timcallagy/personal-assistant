/**
 * Ashby ATS Parser
 * API Docs: https://developers.ashbyhq.com/docs/public-job-posting-api
 */

import type { AtsParser, ParsedJob, AshbyResponse } from './types.js';

const ASHBY_API_BASE = 'https://api.ashbyhq.com/posting-api/job-board';

/**
 * Strips HTML tags from content
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Detects if a job is remote based on location string or isRemote flag
 */
function isRemoteJob(location: string | null, isRemoteFlag?: boolean): boolean {
  if (isRemoteFlag) return true;
  if (!location) return false;

  const remotePhrases = ['remote', 'work from home', 'wfh', 'anywhere', 'distributed'];
  const locationLower = location.toLowerCase();
  return remotePhrases.some((phrase) => locationLower.includes(phrase));
}

export const ashbyParser: AtsParser = {
  extractToken(careerUrl: string): string | null {
    // Patterns:
    // https://jobs.ashbyhq.com/companyname
    // https://jobs.ashby.com/companyname
    // https://api.ashbyhq.com/posting-api/job-board/companyname
    const patterns = [
      /jobs\.ashbyhq\.com\/([^\/\?]+)/i,
      /jobs\.ashby\.com\/([^\/\?]+)/i,
      /api\.ashbyhq\.com\/posting-api\/job-board\/([^\/\?]+)/i,
    ];

    for (const pattern of patterns) {
      const match = careerUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  },

  async parse(careerUrl: string): Promise<ParsedJob[]> {
    const token = this.extractToken(careerUrl);
    if (!token) {
      throw new Error(`Could not extract Ashby company token from URL: ${careerUrl}`);
    }

    const apiUrl = `${ASHBY_API_BASE}/${token}`;

    const response = await fetch(apiUrl, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Ashby company not found: ${token}`);
      }
      throw new Error(`Ashby API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as AshbyResponse;

    return data.jobs.map((job) => ({
      externalId: job.id,
      title: job.title,
      url: job.jobUrl,
      location: job.location ?? null,
      remote: isRemoteJob(job.location ?? null, job.isRemote),
      department: job.department ?? job.team ?? null,
      description: job.descriptionPlain ?? (job.description ? stripHtml(job.description) : null),
      postedAt: job.publishedDate ? new Date(job.publishedDate) : null,
    }));
  },
};
