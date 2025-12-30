import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import type {
  Note,
  Action,
  Project,
  Label,
  NotesFilter,
  ActionsFilter,
  SearchParams,
  ApiResponse,
  NotesResponseData,
  ActionsResponseData,
  SearchResponseData,
  CompleteActionsResponseData,
  ProjectsResponseData,
  LabelsResponseData,
  BlogPost,
  BlogCategory,
  PostStatus,
  Company,
  JobProfile,
  JobListing,
  CrawlLog,
  CompaniesResponseData,
  JobProfileResponseData,
} from '@pa/shared';

// Image upload constants
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Image upload response interface
export interface ImageUploadResponse {
  filename: string;
  url: string;
  size: number;
  mimetype: string;
}

// Admin-specific blog post summary (includes status, publishAt)
export interface AdminBlogPostSummary {
  id: number;
  title: string;
  slug: string;
  status: PostStatus;
  category: string;
  publishAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: { username: string };
}

class ApiError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Validate image file before upload
function validateImageFile(filePath: string): { buffer: Buffer; mimetype: string; filename: string } {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new ApiError('FILE_NOT_FOUND', `File not found at ${filePath}. Please verify the file exists.`);
  }

  // Get file extension and validate type
  const ext = path.extname(filePath).toLowerCase();
  const mimetype = ALLOWED_IMAGE_TYPES[ext];
  if (!mimetype) {
    throw new ApiError(
      'INVALID_FILE_TYPE',
      `Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed. Received: ${ext}`
    );
  }

  // Read file and check size
  const buffer = fs.readFileSync(filePath);
  if (buffer.length > MAX_IMAGE_SIZE) {
    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
    throw new ApiError(
      'FILE_TOO_LARGE',
      `File size (${sizeMB}MB) exceeds the 5MB limit. Please use a smaller image.`
    );
  }

  const filename = path.basename(filePath);
  return { buffer, mimetype, filename };
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${config.apiUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
      ...options.headers,
    },
  });

  const data = (await response.json()) as ApiResponse<T>;

  if (!data.success || !response.ok) {
    throw new ApiError(
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.message || 'An unknown error occurred'
    );
  }

  return data.data as T;
}

export const apiClient = {
  // Projects
  async getProjects(): Promise<Project[]> {
    const data = await request<ProjectsResponseData>('/projects');
    return data.projects;
  },

  async createProject(name: string): Promise<Project> {
    const data = await request<{ project: Project }>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return data.project;
  },

  // Labels
  async getLabels(): Promise<Label[]> {
    const data = await request<LabelsResponseData>('/labels');
    return data.labels;
  },

  async createLabel(name: string): Promise<Label> {
    const data = await request<{ label: Label }>('/labels', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return data.label;
  },

  // Notes
  async getNotes(filters?: NotesFilter): Promise<NotesResponseData> {
    const params = new URLSearchParams();
    if (filters?.project) params.set('project', filters.project);
    if (filters?.labels?.length) params.set('labels', filters.labels.join(','));
    if (filters?.important !== undefined) params.set('important', String(filters.important));
    if (filters?.fromDate) params.set('from_date', filters.fromDate);
    if (filters?.toDate) params.set('to_date', filters.toDate);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));

    const query = params.toString();
    return request<NotesResponseData>(`/notes${query ? `?${query}` : ''}`);
  },

  async getNote(id: number): Promise<Note> {
    const data = await request<{ note: Note }>(`/notes/${id}`);
    return data.note;
  },

  async createNote(data: {
    summary: string;
    project: string;
    labels?: string[];
    important?: boolean;
  }): Promise<Note> {
    const result = await request<{ note: Note }>('/notes', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        source: config.source,
      }),
    });
    return result.note;
  },

  async updateNote(
    id: number,
    data: {
      summary?: string;
      project?: string;
      labels?: string[];
      important?: boolean;
    }
  ): Promise<Note> {
    const result = await request<{ note: Note }>(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return result.note;
  },

  async deleteNote(id: number): Promise<void> {
    await request(`/notes/${id}`, { method: 'DELETE' });
  },

  // Actions
  async getActions(filters?: ActionsFilter): Promise<ActionsResponseData> {
    const params = new URLSearchParams();
    if (filters?.project) params.set('project', filters.project);
    if (filters?.labels?.length) params.set('labels', filters.labels.join(','));
    if (filters?.status) params.set('status', filters.status);
    if (filters?.sort) params.set('sort', filters.sort);
    if (filters?.order) params.set('order', filters.order);
    if (filters?.top) params.set('top', String(filters.top));
    if (filters?.search) params.set('search', filters.search);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));

    const query = params.toString();
    return request<ActionsResponseData>(`/actions${query ? `?${query}` : ''}`);
  },

  async getCompletedActions(filters?: {
    project?: string;
    fromDate?: string;
    limit?: number;
  }): Promise<ActionsResponseData> {
    const params = new URLSearchParams();
    if (filters?.project) params.set('project', filters.project);
    if (filters?.fromDate) params.set('from_date', filters.fromDate);
    if (filters?.limit) params.set('limit', String(filters.limit));

    const query = params.toString();
    return request<ActionsResponseData>(`/actions/completed${query ? `?${query}` : ''}`);
  },

  async getAction(id: number): Promise<Action> {
    const data = await request<{ action: Action }>(`/actions/${id}`);
    return data.action;
  },

  async createAction(data: {
    title: string;
    project: string;
    labels?: string[];
    urgency: number;
    importance: number;
  }): Promise<Action> {
    const result = await request<{ action: Action }>('/actions', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        source: config.source,
      }),
    });
    return result.action;
  },

  async updateAction(
    id: number,
    data: {
      title?: string;
      project?: string;
      labels?: string[];
      urgency?: number;
      importance?: number;
    }
  ): Promise<Action> {
    const result = await request<{ action: Action }>(`/actions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return result.action;
  },

  async deleteAction(id: number): Promise<void> {
    await request(`/actions/${id}`, { method: 'DELETE' });
  },

  async completeActions(ids: number[]): Promise<CompleteActionsResponseData> {
    return request<CompleteActionsResponseData>('/actions/complete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },

  // Search
  async search(params: SearchParams): Promise<SearchResponseData> {
    const urlParams = new URLSearchParams();
    urlParams.set('q', params.query);
    if (params.type) urlParams.set('type', params.type);
    if (params.project) urlParams.set('project', params.project);
    if (params.labels?.length) urlParams.set('labels', params.labels.join(','));
    if (params.limit) urlParams.set('limit', String(params.limit));

    return request<SearchResponseData>(`/search?${urlParams.toString()}`);
  },

  // Health check
  async healthCheck(): Promise<{ database: string }> {
    const data = await request<{ database: string }>('/health');
    return data;
  },

  // Blog Posts
  async getBlogPosts(filters?: {
    page?: number;
    limit?: number;
    status?: PostStatus | 'all';
    search?: string;
  }): Promise<{ posts: AdminBlogPostSummary[]; pagination: { total: number; page: number; totalPages: number } }> {
    const params = new URLSearchParams();
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);

    const query = params.toString();
    return request<{ posts: AdminBlogPostSummary[]; pagination: { total: number; page: number; totalPages: number } }>(
      `/blog/admin/posts${query ? `?${query}` : ''}`
    );
  },

  async getBlogPost(id: number): Promise<BlogPost> {
    return request<BlogPost>(`/blog/admin/posts/${id}`);
  },

  async createBlogPost(data: {
    title: string;
    content: string;
    category: string;
    excerpt?: string;
    featuredImage?: string;
    metaDescription?: string;
    tags?: string[];
    status?: PostStatus;
    publishAt?: string;
  }): Promise<BlogPost> {
    return request<BlogPost>('/blog/admin/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateBlogPost(
    id: number,
    data: {
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
  ): Promise<BlogPost> {
    return request<BlogPost>(`/blog/admin/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteBlogPost(id: number): Promise<void> {
    await request(`/blog/admin/posts/${id}`, { method: 'DELETE' });
  },

  async publishBlogPost(id: number): Promise<BlogPost> {
    return request<BlogPost>(`/blog/admin/posts/${id}/publish`, {
      method: 'POST',
    });
  },

  async unpublishBlogPost(id: number): Promise<BlogPost> {
    return request<BlogPost>(`/blog/admin/posts/${id}/unpublish`, {
      method: 'POST',
    });
  },

  // Blog Categories
  async getBlogCategories(): Promise<BlogCategory[]> {
    const data = await request<{ categories: BlogCategory[] }>('/blog/categories');
    return data.categories;
  },

  // Image Upload
  async uploadImage(filePath: string): Promise<ImageUploadResponse> {
    // Validate the file and get its contents
    const { buffer, mimetype, filename } = validateImageFile(filePath);

    // Create form data with the file
    // Node.js 18+ has built-in FormData and Blob support
    const blob = new Blob([buffer], { type: mimetype });
    const formData = new FormData();
    formData.append('image', blob, filename);

    // Make the request without Content-Type header (fetch sets it automatically for FormData)
    const url = `${config.apiUrl}/blog/admin/images`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-Key': config.apiKey,
      },
      body: formData,
    });

    const data = (await response.json()) as ApiResponse<ImageUploadResponse>;

    if (!data.success || !response.ok) {
      throw new ApiError(
        data.error?.code || 'UPLOAD_FAILED',
        data.error?.message || 'Failed to upload image to the server'
      );
    }

    return data.data as ImageUploadResponse;
  },

  // ==========================================
  // Job Tracker
  // ==========================================

  // Companies
  async getCompanies(activeOnly?: boolean): Promise<{ companies: Company[]; total: number }> {
    const params = activeOnly ? '?active=true' : '';
    return request<CompaniesResponseData>(`/jobs/companies${params}`);
  },

  async getCompany(id: number): Promise<Company> {
    const data = await request<{ company: Company }>(`/jobs/companies/${id}`);
    return data.company;
  },

  async createCompany(data: { name: string; careerPageUrl: string }): Promise<Company> {
    const result = await request<{ company: Company }>('/jobs/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.company;
  },

  async updateCompany(
    id: number,
    data: {
      name?: string;
      careerPageUrl?: string;
      active?: boolean;
      description?: string;
      headquarters?: string;
      foundedYear?: number;
      revenueEstimate?: string;
      stage?: string;
    }
  ): Promise<Company> {
    const result = await request<{ company: Company }>(`/jobs/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return result.company;
  },

  async deleteCompany(id: number): Promise<void> {
    await request<{ message: string }>(`/jobs/companies/${id}`, {
      method: 'DELETE',
    });
  },

  // Job Profile
  async getJobProfile(): Promise<JobProfile | null> {
    const data = await request<JobProfileResponseData>('/jobs/profile');
    return data.profile;
  },

  async upsertJobProfile(data: {
    keywords?: string[];
    titles?: string[];
    locations?: string[];
    locationExclusions?: string[];
    titleExclusions?: string[];
    remoteOnly?: boolean;
  }): Promise<JobProfile> {
    const result = await request<{ profile: JobProfile }>('/jobs/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return result.profile;
  },

  async deleteJobProfile(): Promise<void> {
    await request<{ message: string }>('/jobs/profile', {
      method: 'DELETE',
    });
  },

  // Job Crawling
  async crawlCompany(companyId: number): Promise<{
    companyId: number;
    companyName: string;
    status: 'success' | 'failed';
    jobsFound: number;
    newJobs: number;
    error?: string;
  }> {
    const data = await request<{ result: {
      companyId: number;
      companyName: string;
      status: 'success' | 'failed';
      jobsFound: number;
      newJobs: number;
      error?: string;
    } }>(`/jobs/crawl/${companyId}`, {
      method: 'POST',
    });
    return data.result;
  },

  async crawlAllCompanies(): Promise<{
    companiesCrawled: number;
    totalJobsFound: number;
    newJobsFound: number;
    results: Array<{
      companyId: number;
      companyName: string;
      status: 'success' | 'failed';
      jobsFound: number;
      newJobs: number;
      error?: string;
    }>;
  }> {
    return request<{
      companiesCrawled: number;
      totalJobsFound: number;
      newJobsFound: number;
      results: Array<{
        companyId: number;
        companyName: string;
        status: 'success' | 'failed';
        jobsFound: number;
        newJobs: number;
        error?: string;
      }>;
    }>('/jobs/crawl/all', {
      method: 'POST',
    });
  },

  async getCrawlLogs(companyId?: number, limit?: number): Promise<CrawlLog[]> {
    const params = new URLSearchParams();
    if (companyId) params.set('companyId', String(companyId));
    if (limit) params.set('limit', String(limit));
    const queryString = params.toString();
    const data = await request<{ logs: CrawlLog[] }>(`/jobs/crawl/logs${queryString ? `?${queryString}` : ''}`);
    return data.logs;
  },

  // Job Listings
  async getJobListings(filter?: {
    companyId?: number;
    status?: string;
    minScore?: number;
    limit?: number;
    offset?: number;
    locationInclude?: string;
    locationExclude?: string;
  }): Promise<{ listings: JobListing[]; total: number }> {
    const params = new URLSearchParams();
    if (filter?.companyId) params.set('companyId', String(filter.companyId));
    if (filter?.status) params.set('status', filter.status);
    if (filter?.minScore) params.set('minScore', String(filter.minScore));
    if (filter?.limit) params.set('limit', String(filter.limit));
    if (filter?.offset) params.set('offset', String(filter.offset));
    if (filter?.locationInclude) params.set('locationInclude', filter.locationInclude);
    if (filter?.locationExclude) params.set('locationExclude', filter.locationExclude);
    const queryString = params.toString();
    return request<{ listings: JobListing[]; total: number }>(`/jobs/listings${queryString ? `?${queryString}` : ''}`);
  },

  async getJobListing(id: number): Promise<JobListing> {
    const data = await request<{ listing: JobListing }>(`/jobs/listings/${id}`);
    return data.listing;
  },

  async updateJobStatus(id: number, status: string): Promise<JobListing> {
    const data = await request<{ listing: JobListing }>(`/jobs/listings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return data.listing;
  },

  async getJobStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    newSinceLastWeek: number;
  }> {
    const data = await request<{ stats: {
      total: number;
      byStatus: Record<string, number>;
      newSinceLastWeek: number;
    } }>('/jobs/listings/stats');
    return data.stats;
  },
};
