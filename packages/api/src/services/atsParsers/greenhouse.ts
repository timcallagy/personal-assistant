/**
 * Greenhouse ATS Parser
 * API Docs: https://developers.greenhouse.io/job-board.html
 */

import type { AtsParser, ParsedJob, GreenhouseResponse } from './types.js';

const GREENHOUSE_API_BASE = 'https://boards-api.greenhouse.io/v1/boards';

/**
 * Detects if a job is remote based on location string
 */
function isRemoteJob(location: string): boolean {
  const remotePhrases = ['remote', 'work from home', 'wfh', 'anywhere', 'distributed'];
  const locationLower = location.toLowerCase();
  return remotePhrases.some((phrase) => locationLower.includes(phrase));
}

/**
 * Strips HTML tags from content
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export const greenhouseParser: AtsParser = {
  extractToken(careerUrl: string): string | null {
    // Patterns:
    // https://boards.greenhouse.io/companyname
    // https://boards.greenhouse.io/companyname/jobs/123
    // https://job-boards.greenhouse.io/companyname
    // https://www.greenhouse.io/company/companyname
    const patterns = [
      /boards\.greenhouse\.io\/([^\/\?]+)/i,
      /job-boards\.greenhouse\.io\/([^\/\?]+)/i,
      /greenhouse\.io\/company\/([^\/\?]+)/i,
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
      throw new Error(`Could not extract Greenhouse board token from URL: ${careerUrl}`);
    }

    const apiUrl = `${GREENHOUSE_API_BASE}/${token}/jobs?content=true`;

    const response = await fetch(apiUrl, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Greenhouse board not found: ${token}`);
      }
      throw new Error(`Greenhouse API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as GreenhouseResponse;

    return data.jobs.map((job) => ({
      externalId: String(job.id),
      title: job.title,
      url: job.absolute_url,
      location: job.location?.name ?? null,
      remote: job.location?.name ? isRemoteJob(job.location.name) : false,
      department: job.departments?.[0]?.name ?? null,
      description: job.content ? stripHtml(job.content) : null,
      postedAt: job.updated_at ? new Date(job.updated_at) : null,
    }));
  },
};
