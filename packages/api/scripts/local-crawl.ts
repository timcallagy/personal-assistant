#!/usr/bin/env tsx
/**
 * Local Job Crawler
 *
 * Runs Playwright-based job crawling locally to avoid memory issues on Render.
 * Fetches companies from the API, crawls their career pages, and posts results back.
 *
 * Usage:
 *   npm run crawl:local
 *   npm run crawl:local -- --company 123
 *   npm run crawl:local -- --limit 10
 *
 * Environment variables:
 *   PA_API_URL - API base URL (default: https://pa-api-6uyh.onrender.com)
 *   PA_API_KEY - Your API key (required)
 */

import { chromium, Browser } from 'playwright';
import * as cheerio from 'cheerio';

// ============================================================================
// Configuration
// ============================================================================

const API_URL = process.env['PA_API_URL'] || 'https://pa-api-6uyh.onrender.com';
const API_KEY = process.env['PA_API_KEY'];

if (!API_KEY) {
  console.error('Error: PA_API_KEY environment variable is required');
  console.error('Set it in your shell: export PA_API_KEY=your-api-key');
  process.exit(1);
}

// ATS types that require browser-based crawling
const BROWSER_ATS_TYPES = new Set(['custom', 'workday', 'smartrecruiters']);

// ============================================================================
// Types
// ============================================================================

interface Company {
  id: number;
  name: string;
  careerUrl: string;
  atsType: string;
  active: boolean;
}

interface ParsedJob {
  externalId: string;
  title: string;
  url: string;
  location: string | null;
  remote: boolean;
  department: string | null;
  description: string | null;
  postedAt: Date | null;
}

interface CrawlResult {
  companyId: number;
  companyName: string;
  status: 'success' | 'failed';
  jobsFound: number;
  newJobs: number;
  error?: string;
  duration?: number;
}

// ============================================================================
// API Client
// ============================================================================

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}/api/v1${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY!,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API request failed: ${response.status} ${text}`);
  }

  const json = await response.json();
  return json.data as T;
}

async function getCompanies(): Promise<Company[]> {
  const data = await apiRequest<{ companies: Company[] }>('/jobs/companies');
  return data.companies;
}

async function submitCrawlResults(
  companyId: number,
  jobs: ParsedJob[],
  duration: number
): Promise<CrawlResult> {
  const data = await apiRequest<{ result: CrawlResult }>(
    `/jobs/crawl/${companyId}/results`,
    {
      method: 'POST',
      body: JSON.stringify({ jobs, duration }),
    }
  );
  return data.result;
}

// ============================================================================
// Crawler (adapted from customCrawler.ts)
// ============================================================================

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    console.log('  Launching browser...');
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--mute-audio',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
      ],
    });
  }
  return browser;
}

async function closeBrowser(): Promise<void> {
  if (browser) {
    try {
      await browser.close();
    } catch {
      // Browser may already be closed
    }
    browser = null;
  }
}

// Job selectors
const JOB_SELECTORS = [
  '[data-job]', '[data-job-id]', '.job-listing', '.job-item', '.job-card',
  '.job-post', '.career-item', '.career-listing', '.opening', '.position',
  '.vacancy', '.jobs-list li', '.careers-list li', '.openings-list li',
  'a[href*="/job/"]', 'a[href*="/jobs/"]', 'a[href*="/career"]',
  'a[href*="/position"]', 'a[href*="/opening"]', 'a[href*="/apply"]',
];

const TITLE_SELECTORS = ['h1', 'h2', 'h3', 'h4', '.job-title', '.position-title', '.title', '[data-title]', 'a'];
const LOCATION_SELECTORS = ['.location', '.job-location', '[data-location]', '.city', '.office'];

function extractJobUrl(
  element: cheerio.Cheerio<cheerio.Element>,
  $: cheerio.CheerioAPI,
  baseUrl: string
): string | null {
  let href = element.attr('href');
  if (!href) {
    const link = element.find('a').first();
    href = link.attr('href');
  }
  if (!href) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function generateExternalId(url: string | null, title: string, index: number): string {
  if (url) {
    const patterns = [
      /\/jobs?\/(\d+)/i, /\/positions?\/(\d+)/i, /\/openings?\/(\d+)/i,
      /[?&]id=(\d+)/i, /[?&]job[_-]?id=(\d+)/i,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    const urlHash = Buffer.from(url).toString('base64').substring(0, 16);
    return `url_${urlHash}`;
  }
  const titleHash = Buffer.from(title).toString('base64').substring(0, 12);
  return `title_${titleHash}_${index}`;
}

function isRemoteLocation(location: string | null): boolean {
  if (!location) return false;
  const remotePhrases = ['remote', 'work from home', 'wfh', 'anywhere', 'distributed'];
  return remotePhrases.some((phrase) => location.toLowerCase().includes(phrase));
}

function extractStructuredData($: cheerio.CheerioAPI, baseUrl: string): ParsedJob[] {
  const jobs: ParsedJob[] = [];
  $('script[type="application/ld+json"]').each((_, script) => {
    try {
      const data = JSON.parse($(script).html() || '');
      const parsePosting = (item: Record<string, unknown>) => {
        if (item['@type'] !== 'JobPosting') return;
        const location = item['jobLocation'] as Record<string, unknown> | undefined;
        const locationAddress = location?.['address'] as Record<string, unknown> | undefined;
        let locationStr: string | null = null;
        if (locationAddress) {
          const parts = [
            locationAddress['addressLocality'],
            locationAddress['addressRegion'],
            locationAddress['addressCountry'],
          ].filter(Boolean);
          locationStr = parts.join(', ') || null;
        }
        const url = (item['url'] as string) || baseUrl;
        const title = (item['title'] as string) || 'Untitled Position';
        jobs.push({
          externalId: (item['identifier'] as string) || generateExternalId(url, title, 0),
          title,
          url,
          location: locationStr,
          remote: (item['jobLocationType'] as string) === 'TELECOMMUTE' || isRemoteLocation(locationStr),
          department: (item['occupationalCategory'] as string) || null,
          description: (item['description'] as string) || null,
          postedAt: item['datePosted'] ? new Date(item['datePosted'] as string) : null,
        });
      };

      if (data['@type'] === 'JobPosting') parsePosting(data);
      if (Array.isArray(data)) data.forEach(parsePosting);
      if (data['@graph'] && Array.isArray(data['@graph'])) data['@graph'].forEach(parsePosting);
    } catch {
      // Invalid JSON, skip
    }
  });
  return jobs;
}

function extractJobsFromHtml($: cheerio.CheerioAPI, baseUrl: string): ParsedJob[] {
  const jobs: ParsedJob[] = [];
  const seenUrls = new Set<string>();
  const skipPhrases = ['about us', 'contact', 'home', 'blog', 'news', 'login', 'sign up', 'privacy', 'terms', 'cookie'];

  for (const selector of JOB_SELECTORS) {
    $(selector).each((index, element) => {
      const $el = $(element);
      let title: string | null = null;

      for (const titleSelector of TITLE_SELECTORS) {
        const titleEl = $el.find(titleSelector).first();
        if (titleEl.length) {
          title = titleEl.text().trim();
          if (title && title.length > 3 && title.length < 200) break;
          title = null;
        }
      }

      if (!title && $el.is('a')) title = $el.text().trim();
      if (!title || title.length < 3) return;
      if (skipPhrases.some((phrase) => title!.toLowerCase().includes(phrase))) return;

      const url = extractJobUrl($el, $, baseUrl);
      if (url && seenUrls.has(url)) return;
      if (url) seenUrls.add(url);

      let location: string | null = null;
      for (const locSelector of LOCATION_SELECTORS) {
        const locEl = $el.find(locSelector).first();
        if (locEl.length) {
          location = locEl.text().trim();
          if (location) break;
        }
      }

      jobs.push({
        externalId: generateExternalId(url, title, index),
        title,
        url: url || baseUrl,
        location,
        remote: isRemoteLocation(location),
        department: null,
        description: null,
        postedAt: null,
      });
    });

    if (jobs.length > 0) break;
  }
  return jobs;
}

async function crawlCareerPage(careerUrl: string): Promise<ParsedJob[]> {
  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();

  try {
    await page.goto(careerUrl, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(2000);

    // Try to expand content
    const loadMoreSelectors = [
      'button:has-text("Load More")', 'button:has-text("Show More")',
      'button:has-text("View All")', 'a:has-text("Load More")',
      'a:has-text("Show More")', '.load-more', '.show-more',
    ];
    for (const selector of loadMoreSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 1000 })) {
          await button.click();
          await page.waitForTimeout(2000);
        }
      } catch {
        // Button not found
      }
    }

    const content = await page.content();
    const $ = cheerio.load(content);

    let jobs = extractStructuredData($, careerUrl);
    if (jobs.length === 0) {
      jobs = extractJobsFromHtml($, careerUrl);
    }

    return jobs;
  } finally {
    await page.close();
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const companyIdArg = args.indexOf('--company');
  const limitArg = args.indexOf('--limit');

  const specificCompanyId = companyIdArg !== -1 ? parseInt(args[companyIdArg + 1], 10) : null;
  const limit = limitArg !== -1 ? parseInt(args[limitArg + 1], 10) : Infinity;

  console.log('Local Job Crawler');
  console.log('=================');
  console.log(`API: ${API_URL}`);
  console.log('');

  try {
    // Fetch companies
    console.log('Fetching companies...');
    const allCompanies = await getCompanies();

    // Filter to browser-based ATS types
    let companies = allCompanies.filter(
      (c) => c.active && BROWSER_ATS_TYPES.has(c.atsType)
    );

    if (specificCompanyId) {
      companies = companies.filter((c) => c.id === specificCompanyId);
      if (companies.length === 0) {
        console.error(`Company ${specificCompanyId} not found or not a browser-based ATS`);
        process.exit(1);
      }
    }

    companies = companies.slice(0, limit);

    console.log(`Found ${companies.length} companies requiring browser crawl`);
    console.log('');

    const results: CrawlResult[] = [];
    let totalJobs = 0;
    let totalNew = 0;

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      console.log(`[${i + 1}/${companies.length}] ${company.name} (${company.atsType})`);
      console.log(`  URL: ${company.careerUrl}`);

      const startTime = Date.now();

      try {
        const jobs = await crawlCareerPage(company.careerUrl);
        const duration = Date.now() - startTime;

        console.log(`  Found ${jobs.length} jobs in ${(duration / 1000).toFixed(1)}s`);

        // Submit to API
        const result = await submitCrawlResults(company.id, jobs, duration);
        results.push(result);
        totalJobs += result.jobsFound;
        totalNew += result.newJobs;

        console.log(`  Saved: ${result.jobsFound} jobs (${result.newJobs} new)`);
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`  Error: ${errorMessage}`);

        results.push({
          companyId: company.id,
          companyName: company.name,
          status: 'failed',
          jobsFound: 0,
          newJobs: 0,
          error: errorMessage,
          duration,
        });
      }

      // Restart browser every 5 companies to free memory
      if ((i + 1) % 5 === 0 && i + 1 < companies.length) {
        console.log('  Restarting browser to free memory...');
        await closeBrowser();
      }

      console.log('');
    }

    // Summary
    console.log('=================');
    console.log('Summary');
    console.log('=================');
    console.log(`Companies crawled: ${results.length}`);
    console.log(`Successful: ${results.filter((r) => r.status === 'success').length}`);
    console.log(`Failed: ${results.filter((r) => r.status === 'failed').length}`);
    console.log(`Total jobs found: ${totalJobs}`);
    console.log(`New jobs: ${totalNew}`);

  } finally {
    await closeBrowser();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
