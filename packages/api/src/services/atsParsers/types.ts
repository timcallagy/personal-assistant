/**
 * Types for ATS (Applicant Tracking System) job parsers
 */

/**
 * Represents a job parsed from an ATS or career page
 */
export interface ParsedJob {
  externalId: string;
  title: string;
  url: string;
  location: string | null;
  remote: boolean;
  department: string | null;
  description: string | null;
  postedAt: Date | null;
}

/**
 * Interface that all ATS parsers must implement
 */
export interface AtsParser {
  /**
   * Parse jobs from a career page URL
   * @param careerUrl The career page URL to parse
   * @returns Array of parsed jobs
   */
  parse(careerUrl: string): Promise<ParsedJob[]>;

  /**
   * Extract the board/company token from the career URL
   * @param careerUrl The career page URL
   * @returns The extracted token or null if not found
   */
  extractToken(careerUrl: string): string | null;
}

/**
 * Result of a crawl operation
 */
export interface CrawlResult {
  companyId: number;
  companyName: string;
  status: 'success' | 'failed';
  jobsFound: number;
  newJobs: number;
  error?: string;
  duration?: number;
}

/**
 * Greenhouse API response types
 */
export interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at: string;
  location: {
    name: string;
  };
  departments: Array<{
    id: number;
    name: string;
  }>;
  content?: string;
}

export interface GreenhouseResponse {
  jobs: GreenhouseJob[];
}

/**
 * Lever API response types
 */
export interface LeverJob {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt: number;
  categories: {
    location?: string;
    team?: string;
    department?: string;
    commitment?: string;
  };
  description?: string;
  descriptionPlain?: string;
  workplaceType?: 'remote' | 'on-site' | 'hybrid' | 'unspecified';
}

/**
 * Ashby API response types
 */
export interface AshbyJob {
  id: string;
  title: string;
  jobUrl: string;
  location: string;
  department?: string;
  team?: string;
  employmentType?: string;
  description?: string;
  descriptionPlain?: string;
  publishedDate?: string;
  isRemote?: boolean;
}

export interface AshbyResponse {
  jobs: AshbyJob[];
}
