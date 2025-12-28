// ============================================
// PA (Personal Assistant) - Shared Types
// ============================================

// ============================================
// Enums and Constants
// ============================================

export const SOURCE = {
  CLAUDE_CODE: 'Claude Code',
  CLAUDE_WEB: 'Claude Web',
} as const;

export type Source = (typeof SOURCE)[keyof typeof SOURCE];

export const ACTION_STATUS = {
  OPEN: 'open',
  COMPLETED: 'completed',
} as const;

export type ActionStatus = (typeof ACTION_STATUS)[keyof typeof ACTION_STATUS];

// ============================================
// Core Entity Types
// ============================================

export interface Note {
  id: number;
  summary: string;
  project: string;
  labels: string[];
  important: boolean;
  source: Source;
  createdAt: Date;
  updatedAt: Date;
}

export interface Action {
  id: number;
  title: string;
  project: string;
  labels: string[];
  urgency: number; // 1-5
  importance: number; // 1-5
  priorityScore: number; // urgency * importance (1-25)
  status: ActionStatus;
  source: Source;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface Project {
  id: number;
  name: string;
  noteCount: number;
  actionCount: number;
  createdAt: Date;
}

export interface Label {
  id: number;
  name: string;
  noteCount: number;
  actionCount: number;
  createdAt: Date;
}

// ============================================
// API Request Types
// ============================================

export interface CreateNoteRequest {
  summary: string;
  project: string;
  labels?: string[];
  important?: boolean;
  source: Source;
}

export interface UpdateNoteRequest {
  summary?: string;
  project?: string;
  labels?: string[];
  important?: boolean;
}

export interface CreateActionRequest {
  title: string;
  project: string;
  labels?: string[];
  urgency: number;
  importance: number;
  source: Source;
}

export interface UpdateActionRequest {
  title?: string;
  project?: string;
  labels?: string[];
  urgency?: number;
  importance?: number;
}

export interface CompleteActionsRequest {
  ids: number[];
}

export interface CreateProjectRequest {
  name: string;
}

export interface CreateLabelRequest {
  name: string;
}

// ============================================
// API Filter/Query Types
// ============================================

export interface NotesFilter {
  project?: string;
  labels?: string[];
  important?: boolean;
  fromDate?: string;
  toDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ActionsFilter {
  project?: string;
  labels?: string[];
  status?: ActionStatus;
  sort?: 'priority' | 'created_at' | 'urgency' | 'importance';
  order?: 'asc' | 'desc';
  top?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface SearchParams {
  query: string;
  type?: 'all' | 'notes' | 'actions';
  project?: string;
  labels?: string[];
  limit?: number;
}

// ============================================
// API Response Types
// ============================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// Specific response data types
export interface NotesResponseData {
  notes: Note[];
  total: number;
  limit: number;
  offset: number;
}

export interface ActionsResponseData {
  actions: Action[];
  total: number;
  limit: number;
  offset: number;
}

export interface SearchResponseData {
  notes: Note[];
  actions: Action[];
  totalNotes: number;
  totalActions: number;
}

export interface CompleteActionsResponseData {
  completed: number[];
  notFound: number[];
  alreadyCompleted: number[];
}

export interface ProjectsResponseData {
  projects: Project[];
}

export interface LabelsResponseData {
  labels: Label[];
}

// ============================================
// Utility Types
// ============================================

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

export function getPriorityLevel(score: number): PriorityLevel {
  if (score >= 20) return 'critical';
  if (score >= 12) return 'high';
  if (score >= 6) return 'medium';
  return 'low';
}

export function calculatePriorityScore(urgency: number, importance: number): number {
  return urgency * importance;
}

// ============================================
// Blog Types
// ============================================

export const POST_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  SCHEDULED: 'SCHEDULED',
} as const;

export type PostStatus = (typeof POST_STATUS)[keyof typeof POST_STATUS];

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featuredImage: string | null;
  metaDescription: string | null;
  category: string;
  tags: string[];
  status: PostStatus;
  publishAt: Date | null;
  publishedAt: Date | null;
  viewCount: number;
  authorId: number;
  author: {
    id: number;
    username: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface BlogPostSummary {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  category: string;
  categoryName: string;
  tags: string[];
  publishedAt: Date | null;
  readingTime: number;
  author: {
    name: string;
  };
}

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  postCount?: number;
}

export interface NewsletterSubscriber {
  id: number;
  email: string;
  subscribedAt: Date;
  source: string;
  unsubscribedAt: Date | null;
}

export interface BlogConfig {
  id: number;
  showPromoBanner: boolean;
  promoBannerImage: string | null;
  promoBannerLink: string | null;
  promoBannerAlt: string | null;
  postsPerPage: number;
  featuredPostsCount: number;
  siteTitle: string;
  siteDescription: string | null;
  socialLinkedIn: string | null;
  socialGitHub: string | null;
  updatedAt: Date;
}

// ============================================
// Blog API Request Types
// ============================================

export interface CreateBlogPostRequest {
  title: string;
  content: string;
  category: string;
  excerpt?: string;
  featuredImage?: string;
  metaDescription?: string;
  tags?: string[];
  status?: PostStatus;
  publishAt?: string;
}

export interface UpdateBlogPostRequest {
  title?: string;
  slug?: string;
  content?: string;
  category?: string;
  excerpt?: string;
  featuredImage?: string;
  metaDescription?: string;
  tags?: string[];
  status?: PostStatus;
  publishAt?: string;
}

export interface NewsletterSubscribeRequest {
  email: string;
  consent: boolean;
  source?: string;
}

export interface UpdateBlogConfigRequest {
  showPromoBanner?: boolean;
  promoBannerImage?: string;
  promoBannerLink?: string;
  promoBannerAlt?: string;
  postsPerPage?: number;
  featuredPostsCount?: number;
  siteTitle?: string;
  siteDescription?: string;
  socialLinkedIn?: string;
  socialGitHub?: string;
}

// ============================================
// Blog API Response Types
// ============================================

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface BlogPostsResponse {
  posts: BlogPostSummary[];
  pagination: Pagination;
}

export interface BlogCategoriesResponse {
  categories: BlogCategory[];
}

export interface BlogTagsResponse {
  tags: { name: string; count: number }[];
}

export interface NewsletterSubscribeResponse {
  message: string;
  email: string;
}

export interface SubscribersResponse {
  subscribers: NewsletterSubscriber[];
  pagination: Pagination;
  stats: {
    total: number;
    active: number;
    unsubscribed: number;
  };
}

// ============================================
// Blog Utility Functions
// ============================================

/**
 * Calculate reading time based on word count
 * @param content - The text content
 * @returns Reading time in minutes (rounded up)
 */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Generate URL-friendly slug from title
 * @param title - The title to convert
 * @returns URL-friendly slug
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .substring(0, 100); // Limit length
}

/**
 * Generate excerpt from content if not provided
 * @param content - The full content
 * @param maxLength - Maximum excerpt length (default 200)
 * @returns Truncated excerpt
 */
export function generateExcerpt(content: string, maxLength: number = 200): string {
  // Remove markdown formatting
  const plainText = content
    .replace(/#{1,6}\s/g, '') // Remove headers
    .replace(/\*\*|__/g, '') // Remove bold
    .replace(/\*|_/g, '') // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // Remove code blocks
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  // Truncate at word boundary
  const truncated = plainText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...';
}

// ============================================
// Job Tracker Types
// ============================================

export const JOB_STATUS = {
  NEW: 'new',
  VIEWED: 'viewed',
  APPLIED: 'applied',
  DISMISSED: 'dismissed',
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

export const ATS_TYPES = {
  GREENHOUSE: 'greenhouse',
  LEVER: 'lever',
  ASHBY: 'ashby',
  SMARTRECRUITERS: 'smartrecruiters',
  WORKDAY: 'workday',
  CUSTOM: 'custom',
} as const;

export type AtsType = (typeof ATS_TYPES)[keyof typeof ATS_TYPES];

export const COMPANY_STAGES = {
  PRE_SEED: 'pre-seed',
  SEED: 'seed',
  SERIES_A: 'series-a',
  SERIES_B: 'series-b',
  SERIES_C: 'series-c',
  GROWTH: 'growth',
  PUBLIC: 'public',
  ACQUIRED: 'acquired',
} as const;

export type CompanyStage = (typeof COMPANY_STAGES)[keyof typeof COMPANY_STAGES];

export interface Company {
  id: number;
  name: string;
  careerPageUrl: string;
  atsType: AtsType | null;
  active: boolean;
  // Metadata
  description: string | null;
  headquarters: string | null;
  foundedYear: number | null;
  revenueEstimate: string | null;
  stage: CompanyStage | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobProfile {
  id: number;
  keywords: string[];
  titles: string[];
  locations: string[];
  remoteOnly: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobListing {
  id: number;
  companyId: number;
  companyName?: string;
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
  status: JobStatus;
  matchScore: number | null;
}

export interface CrawlLog {
  id: number;
  companyId: number;
  companyName?: string;
  startedAt: Date;
  completedAt: Date | null;
  status: 'running' | 'success' | 'failed';
  jobsFound: number;
  newJobs: number;
  error: string | null;
}

// ============================================
// Job Tracker API Request Types
// ============================================

export interface CreateCompanyRequest {
  name: string;
  careerPageUrl: string;
}

export interface UpdateCompanyRequest {
  name?: string;
  careerPageUrl?: string;
  active?: boolean;
}

export interface UpdateJobProfileRequest {
  keywords?: string[];
  titles?: string[];
  locations?: string[];
  remoteOnly?: boolean;
}

export interface UpdateJobStatusRequest {
  status: JobStatus;
}

export interface JobListingsFilter {
  companyId?: number;
  status?: JobStatus;
  minScore?: number;
  limit?: number;
  offset?: number;
  /** Filter to jobs matching these location keywords (e.g., "Europe", "Dublin", "EMEA") */
  locationInclude?: string[];
  /** Exclude jobs matching these location keywords (e.g., "North America", "US", "Sydney") */
  locationExclude?: string[];
}

// ============================================
// Job Tracker API Response Types
// ============================================

export interface CompaniesResponseData {
  companies: Company[];
  total: number;
}

export interface JobProfileResponseData {
  profile: JobProfile | null;
}

export interface JobListingsResponseData {
  listings: JobListing[];
  total: number;
  limit: number;
  offset: number;
}

export interface CrawlResponseData {
  crawlId: number;
  companiesCrawled: number;
  totalJobsFound: number;
  newJobsFound: number;
}

export interface CrawlLogsResponseData {
  logs: CrawlLog[];
  total: number;
}
