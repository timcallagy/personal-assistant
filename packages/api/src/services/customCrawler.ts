/**
 * Custom Career Page Crawler
 * Uses Playwright to crawl non-ATS career pages
 */

import { chromium, Browser, Page } from 'playwright';
import * as cheerio from 'cheerio';
import type { ParsedJob } from './atsParsers/types.js';

// Use a flexible cheerio selection type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CheerioSelection = cheerio.Cheerio<any>;

// Singleton browser instance with auto-close timeout
let browser: Browser | null = null;
let browserCloseTimeout: ReturnType<typeof setTimeout> | null = null;

// Auto-close browser after 30 seconds of inactivity to free memory
const BROWSER_IDLE_TIMEOUT = 30000;

/**
 * Schedule browser auto-close after idle period
 */
function scheduleBrowserClose(): void {
  if (browserCloseTimeout) {
    clearTimeout(browserCloseTimeout);
  }
  browserCloseTimeout = setTimeout(async () => {
    await closeBrowser();
  }, BROWSER_IDLE_TIMEOUT);
}

/**
 * Cancel scheduled browser close (when starting a new crawl)
 */
function cancelBrowserClose(): void {
  if (browserCloseTimeout) {
    clearTimeout(browserCloseTimeout);
    browserCloseTimeout = null;
  }
}

/**
 * Get or create browser instance with memory-efficient settings
 */
async function getBrowser(): Promise<Browser> {
  cancelBrowserClose();
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        // Memory optimizations
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
        // Limit memory usage
        '--js-flags=--max-old-space-size=256',
        '--single-process',
      ],
    });
  }
  return browser;
}

/**
 * Close the browser instance
 */
export async function closeBrowser(): Promise<void> {
  cancelBrowserClose();
  if (browser) {
    try {
      await browser.close();
    } catch {
      // Browser may already be closed
    }
    browser = null;
  }
}

/**
 * Common selectors for job listings on career pages
 */
const JOB_SELECTORS = [
  // Common job listing containers
  '[data-job]',
  '[data-job-id]',
  '.job-listing',
  '.job-item',
  '.job-card',
  '.job-post',
  '.career-item',
  '.career-listing',
  '.opening',
  '.position',
  '.vacancy',
  // List items that might contain jobs
  '.jobs-list li',
  '.careers-list li',
  '.openings-list li',
  // Links that look like jobs
  'a[href*="/job/"]',
  'a[href*="/jobs/"]',
  'a[href*="/career"]',
  'a[href*="/position"]',
  'a[href*="/opening"]',
  'a[href*="/apply"]',
];

/**
 * Selectors for job title within a job container
 */
const TITLE_SELECTORS = [
  'h1',
  'h2',
  'h3',
  'h4',
  '.job-title',
  '.position-title',
  '.title',
  '[data-title]',
  'a',
];

/**
 * Selectors for job location
 */
const LOCATION_SELECTORS = [
  '.location',
  '.job-location',
  '[data-location]',
  '.city',
  '.office',
];

/**
 * Extract job URL from an element
 */
function extractJobUrl(element: CheerioSelection, $: cheerio.CheerioAPI, baseUrl: string): string | null {
  // Check if element itself is a link
  let href = element.attr('href');

  // Check for nested link
  if (!href) {
    const link = element.find('a').first();
    href = link.attr('href');
  }

  if (!href) return null;

  // Make absolute URL
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

/**
 * Generate a unique external ID from URL or content
 */
function generateExternalId(url: string | null, title: string, index: number): string {
  if (url) {
    // Try to extract ID from URL
    const patterns = [
      /\/jobs?\/(\d+)/i,
      /\/positions?\/(\d+)/i,
      /\/openings?\/(\d+)/i,
      /[?&]id=(\d+)/i,
      /[?&]job[_-]?id=(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }

    // Use URL hash as ID
    const urlHash = Buffer.from(url).toString('base64').substring(0, 16);
    return `url_${urlHash}`;
  }

  // Fallback to title-based ID
  const titleHash = Buffer.from(title).toString('base64').substring(0, 12);
  return `title_${titleHash}_${index}`;
}

/**
 * Check if location indicates remote work
 */
function isRemoteLocation(location: string | null): boolean {
  if (!location) return false;
  const remotePhrases = ['remote', 'work from home', 'wfh', 'anywhere', 'distributed'];
  const locationLower = location.toLowerCase();
  return remotePhrases.some((phrase) => locationLower.includes(phrase));
}

/**
 * Try to extract structured job data (JSON-LD)
 */
function extractStructuredData($: cheerio.CheerioAPI, baseUrl: string): ParsedJob[] {
  const jobs: ParsedJob[] = [];

  $('script[type="application/ld+json"]').each((_, script) => {
    try {
      const data = JSON.parse($(script).html() || '');

      // Handle single job posting
      if (data['@type'] === 'JobPosting') {
        jobs.push(parseJobPosting(data, baseUrl));
      }

      // Handle array of job postings
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item['@type'] === 'JobPosting') {
            jobs.push(parseJobPosting(item, baseUrl));
          }
        }
      }

      // Handle @graph format
      if (data['@graph'] && Array.isArray(data['@graph'])) {
        for (const item of data['@graph']) {
          if (item['@type'] === 'JobPosting') {
            jobs.push(parseJobPosting(item, baseUrl));
          }
        }
      }
    } catch {
      // Invalid JSON, skip
    }
  });

  return jobs;
}

/**
 * Parse a JSON-LD JobPosting object
 */
function parseJobPosting(data: Record<string, unknown>, baseUrl: string): ParsedJob {
  const location = data['jobLocation'] as Record<string, unknown> | undefined;
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

  const url = (data['url'] as string) || baseUrl;
  const title = (data['title'] as string) || 'Untitled Position';

  return {
    externalId: (data['identifier'] as string) || generateExternalId(url, title, 0),
    title,
    url,
    location: locationStr,
    remote: (data['jobLocationType'] as string) === 'TELECOMMUTE' || isRemoteLocation(locationStr),
    department: (data['occupationalCategory'] as string) || null,
    description: (data['description'] as string) || null,
    postedAt: data['datePosted'] ? new Date(data['datePosted'] as string) : null,
  };
}

/**
 * Extract jobs by finding common job listing patterns in HTML
 */
function extractJobsFromHtml($: cheerio.CheerioAPI, baseUrl: string): ParsedJob[] {
  const jobs: ParsedJob[] = [];
  const seenUrls = new Set<string>();

  for (const selector of JOB_SELECTORS) {
    const elements = $(selector);

    elements.each((index, element) => {
      const $el = $(element);

      // Extract title
      let title: string | null = null;
      for (const titleSelector of TITLE_SELECTORS) {
        const titleEl = $el.find(titleSelector).first();
        if (titleEl.length) {
          title = titleEl.text().trim();
          if (title && title.length > 3 && title.length < 200) break;
          title = null;
        }
      }

      // If element is a link, use link text as title
      if (!title && $el.is('a')) {
        title = $el.text().trim();
      }

      if (!title || title.length < 3) return;

      // Skip common non-job links
      const skipPhrases = [
        'about us',
        'contact',
        'home',
        'blog',
        'news',
        'login',
        'sign up',
        'privacy',
        'terms',
        'cookie',
      ];
      if (skipPhrases.some((phrase) => title!.toLowerCase().includes(phrase))) return;

      // Extract URL
      const url = extractJobUrl($el, $, baseUrl);
      if (url && seenUrls.has(url)) return;
      if (url) seenUrls.add(url);

      // Extract location
      let location: string | null = null;
      for (const locSelector of LOCATION_SELECTORS) {
        const locEl = $el.find(locSelector).first();
        if (locEl.length) {
          location = locEl.text().trim();
          if (location) break;
        }
      }

      const job: ParsedJob = {
        externalId: generateExternalId(url, title, index),
        title,
        url: url || baseUrl,
        location,
        remote: isRemoteLocation(location),
        department: null,
        description: null,
        postedAt: null,
      };

      jobs.push(job);
    });

    // If we found jobs with this selector, don't try others (avoid duplicates)
    if (jobs.length > 0) break;
  }

  return jobs;
}

/**
 * Crawl a custom career page using Playwright
 */
export async function crawlCustomPage(careerUrl: string): Promise<ParsedJob[]> {
  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();

  try {
    // Navigate to the page
    await page.goto(careerUrl, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait a bit for any lazy-loaded content
    await page.waitForTimeout(2000);

    // Try to expand any "Load More" or infinite scroll
    await tryExpandContent(page);

    // Get page content
    const content = await page.content();
    const $ = cheerio.load(content);

    // First try structured data (most reliable)
    let jobs = extractStructuredData($, careerUrl);

    // Fall back to HTML scraping
    if (jobs.length === 0) {
      jobs = extractJobsFromHtml($, careerUrl);
    }

    return jobs;
  } finally {
    await page.close();
    // Schedule browser close after idle period to free memory
    scheduleBrowserClose();
  }
}

/**
 * Try to expand content by clicking "Load More" buttons or scrolling
 */
async function tryExpandContent(page: Page): Promise<void> {
  const loadMoreSelectors = [
    'button:has-text("Load More")',
    'button:has-text("Show More")',
    'button:has-text("View All")',
    'a:has-text("Load More")',
    'a:has-text("Show More")',
    '.load-more',
    '.show-more',
  ];

  for (const selector of loadMoreSelectors) {
    try {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 1000 })) {
        await button.click();
        await page.waitForTimeout(2000);
      }
    } catch {
      // Button not found or not clickable, continue
    }
  }

  // Try scrolling to load more content
  try {
    // Get viewport height first, then pass it to the evaluate function
    // Using string-based evaluation to avoid TypeScript browser global issues
    const viewportHeight = await page.evaluate('document.documentElement.clientHeight');
    await page.evaluate(
      `(async () => {
        const scrollStep = ${viewportHeight};
        const maxScrolls = 5;
        for (let i = 0; i < maxScrolls; i++) {
          window.scrollBy(0, scrollStep);
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      })()`
    );
    await page.waitForTimeout(1000);
  } catch {
    // Scrolling failed, continue anyway
  }
}
