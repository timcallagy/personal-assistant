/**
 * Lever ATS Parser
 * API Docs: https://github.com/lever/postings-api
 */

import type { AtsParser, ParsedJob, LeverJob } from './types.js';

const LEVER_API_BASE = 'https://api.lever.co/v0/postings';

/**
 * Strips HTML tags from content
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export const leverParser: AtsParser = {
  extractToken(careerUrl: string): string | null {
    // Patterns:
    // https://jobs.lever.co/companyname
    // https://jobs.lever.co/companyname/job-id
    // https://lever.co/companyname
    // https://api.lever.co/v0/postings/companyname
    const patterns = [
      /jobs\.lever\.co\/([^\/\?]+)/i,
      /lever\.co\/([^\/\?]+)/i,
      /api\.lever\.co\/v0\/postings\/([^\/\?]+)/i,
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
      throw new Error(`Could not extract Lever company token from URL: ${careerUrl}`);
    }

    const apiUrl = `${LEVER_API_BASE}/${token}?mode=json`;

    const response = await fetch(apiUrl, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Lever company not found: ${token}`);
      }
      throw new Error(`Lever API error: ${response.status} ${response.statusText}`);
    }

    const jobs = (await response.json()) as LeverJob[];

    return jobs.map((job) => {
      const isRemote =
        job.workplaceType === 'remote' ||
        (job.categories.location?.toLowerCase().includes('remote') ?? false);

      return {
        externalId: job.id,
        title: job.text,
        url: job.hostedUrl,
        location: job.categories.location ?? null,
        remote: isRemote,
        department: job.categories.department ?? job.categories.team ?? null,
        description: job.descriptionPlain ?? (job.description ? stripHtml(job.description) : null),
        postedAt: job.createdAt ? new Date(job.createdAt) : null,
      };
    });
  },
};
