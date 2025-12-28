const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

class ApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Include cookies for session auth
    headers: {
      'Content-Type': 'application/json',
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

// Auth
export interface User {
  id: number;
  username: string;
}

export interface AuthResponse {
  user: User;
}

export const auth = {
  login: (username: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () =>
    request<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),

  getSession: () => request<AuthResponse>('/auth/session'),
};

// Projects
export interface Project {
  id: number;
  name: string;
  noteCount: number;
  actionCount: number;
}

export interface ProjectsResponse {
  projects: Project[];
}

export const projects = {
  list: () => request<ProjectsResponse>('/projects'),
  create: (name: string) =>
    request<{ project: Project }>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/projects/${id}`, {
      method: 'DELETE',
    }),
};

// Labels
export interface Label {
  id: number;
  name: string;
  noteCount: number;
  actionCount: number;
}

export interface LabelsResponse {
  labels: Label[];
}

export const labels = {
  list: () => request<LabelsResponse>('/labels'),
  create: (name: string) =>
    request<{ label: Label }>('/labels', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/labels/${id}`, {
      method: 'DELETE',
    }),
};

// Notes
export interface Note {
  id: number;
  summary: string;
  project: string;
  labels: string[];
  important: boolean;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotesResponse {
  notes: Note[];
  total: number;
}

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

export const notes = {
  list: (filters?: NotesFilter) => {
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
    return request<NotesResponse>(`/notes${query ? `?${query}` : ''}`);
  },

  get: (id: number) => request<{ note: Note }>(`/notes/${id}`),

  create: (data: {
    summary: string;
    project: string;
    labels?: string[];
    important?: boolean;
  }) =>
    request<{ note: Note }>('/notes', {
      method: 'POST',
      body: JSON.stringify({ ...data, source: 'Claude Web' }),
    }),

  update: (
    id: number,
    data: {
      summary?: string;
      project?: string;
      labels?: string[];
      important?: boolean;
    }
  ) =>
    request<{ note: Note }>(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<{ message: string }>(`/notes/${id}`, {
      method: 'DELETE',
    }),
};

// Actions
export interface Action {
  id: number;
  title: string;
  project: string;
  labels: string[];
  urgency: number;
  importance: number;
  priorityScore: number;
  status: 'open' | 'completed';
  source: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ActionsResponse {
  actions: Action[];
  total: number;
}

export interface ActionsFilter {
  project?: string;
  labels?: string[];
  status?: 'open' | 'completed';
  sort?: string;
  order?: 'asc' | 'desc';
  top?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export const actions = {
  list: (filters?: ActionsFilter) => {
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
    return request<ActionsResponse>(`/actions${query ? `?${query}` : ''}`);
  },

  completed: (filters?: { project?: string; fromDate?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.project) params.set('project', filters.project);
    if (filters?.fromDate) params.set('from_date', filters.fromDate);
    if (filters?.limit) params.set('limit', String(filters.limit));
    const query = params.toString();
    return request<ActionsResponse>(`/actions/completed${query ? `?${query}` : ''}`);
  },

  get: (id: number) => request<{ action: Action }>(`/actions/${id}`),

  create: (data: {
    title: string;
    project: string;
    labels?: string[];
    urgency: number;
    importance: number;
  }) =>
    request<{ action: Action }>('/actions', {
      method: 'POST',
      body: JSON.stringify({ ...data, source: 'Claude Web' }),
    }),

  update: (
    id: number,
    data: {
      title?: string;
      project?: string;
      labels?: string[];
      urgency?: number;
      importance?: number;
    }
  ) =>
    request<{ action: Action }>(`/actions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<{ message: string }>(`/actions/${id}`, {
      method: 'DELETE',
    }),

  complete: (ids: number[]) =>
    request<{
      completed: number[];
      notFound: number[];
      alreadyCompleted: number[];
    }>('/actions/complete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
};

// Search
export interface SearchResult {
  notes: Note[];
  actions: Action[];
  totalNotes: number;
  totalActions: number;
}

export const search = {
  query: (params: {
    query: string;
    type?: 'all' | 'notes' | 'actions';
    project?: string;
    labels?: string[];
    limit?: number;
  }) => {
    const urlParams = new URLSearchParams();
    urlParams.set('q', params.query);
    if (params.type) urlParams.set('type', params.type);
    if (params.project) urlParams.set('project', params.project);
    if (params.labels?.length) urlParams.set('labels', params.labels.join(','));
    if (params.limit) urlParams.set('limit', String(params.limit));
    return request<SearchResult>(`/search?${urlParams.toString()}`);
  },
};

// Blog Posts
export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'SCHEDULED';

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
  publishAt: string | null;
  publishedAt: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    username: string;
  };
}

export interface BlogPostSummary {
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

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  postCount?: number;
}

export interface BlogPostsResponse {
  posts: BlogPostSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface BlogCategoriesResponse {
  categories: BlogCategory[];
}

export interface BlogPostsFilter {
  page?: number;
  limit?: number;
  status?: PostStatus | 'all';
  search?: string;
}

export const blogPosts = {
  list: (filters?: BlogPostsFilter) => {
    const params = new URLSearchParams();
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);
    const query = params.toString();
    return request<BlogPostsResponse>(`/blog/admin/posts${query ? `?${query}` : ''}`);
  },

  get: (id: number) => request<BlogPost>(`/blog/admin/posts/${id}`),

  create: (data: {
    title: string;
    content: string;
    category: string;
    excerpt?: string;
    featuredImage?: string;
    metaDescription?: string;
    tags?: string[];
    status?: PostStatus;
    publishAt?: string;
  }) =>
    request<BlogPost>('/blog/admin/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (
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
  ) =>
    request<BlogPost>(`/blog/admin/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<{ message: string }>(`/blog/admin/posts/${id}`, {
      method: 'DELETE',
    }),

  publish: (id: number) =>
    request<BlogPost>(`/blog/admin/posts/${id}/publish`, {
      method: 'POST',
    }),

  unpublish: (id: number) =>
    request<BlogPost>(`/blog/admin/posts/${id}/unpublish`, {
      method: 'POST',
    }),
};

export const blogCategories = {
  list: () => request<BlogCategoriesResponse>('/blog/categories'),
};

// Blog Images
export interface BlogImage {
  filename: string;
  url: string;
  size: number;
  mimetype?: string;
  uploadedAt?: string;
}

export interface BlogImagesResponse {
  images: BlogImage[];
}

export const blogImages = {
  list: () => request<BlogImagesResponse>('/blog/admin/images'),

  upload: async (file: File): Promise<BlogImage> => {
    const url = `${API_BASE_URL}/blog/admin/images`;
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
    });

    const data = (await response.json()) as ApiResponse<BlogImage>;

    if (!data.success || !response.ok) {
      throw new ApiError(
        data.error?.code || 'UPLOAD_ERROR',
        data.error?.message || 'Failed to upload image'
      );
    }

    return data.data as BlogImage;
  },

  delete: (filename: string) =>
    request<{ message: string }>(`/blog/admin/images/${filename}`, {
      method: 'DELETE',
    }),
};

// ============================================
// Job Tracker Types
// ============================================

export type JobStatus = 'new' | 'viewed' | 'applied' | 'dismissed';

export type AtsType = 'greenhouse' | 'lever' | 'ashby' | 'smartrecruiters' | 'workday' | 'custom';

export type CompanyStage = 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c' | 'growth' | 'public' | 'acquired';

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
  createdAt: string;
  updatedAt: string;
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
  salaryRange?: string | null;
  postedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  status: JobStatus;
  matchScore: number | null;
}

export interface JobProfile {
  id: number;
  keywords: string[];
  titles: string[];
  locations: string[];
  remoteOnly: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CrawlLog {
  id: number;
  companyId: number;
  companyName?: string;
  startedAt: string;
  completedAt: string | null;
  status: 'running' | 'success' | 'failed';
  jobsFound: number;
  newJobs: number;
  error: string | null;
}

export interface JobStats {
  totalJobs: number;
  totalCompanies: number;
  newSinceLastRefresh: number;
  applicationsSubmitted: number;
  lastRefreshAt: string | null;
}

// Job Tracker Filter Types
export interface JobListingsFilter {
  companyId?: number;
  status?: JobStatus;
  minScore?: number;
  limit?: number;
  offset?: number;
  locationInclude?: string[];
  locationExclude?: string[];
}

export interface CompaniesFilter {
  activeOnly?: boolean;
}

// Job Tracker Response Types
export interface CompaniesResponse {
  companies: Company[];
  total: number;
}

export interface JobListingsResponse {
  listings: JobListing[];
  total: number;
  limit: number;
  offset: number;
}

export interface JobProfileResponse {
  profile: JobProfile | null;
}

export interface CrawlResponse {
  crawlId: number;
  companiesCrawled: number;
  totalJobsFound: number;
  newJobsFound: number;
}

export interface CrawlLogsResponse {
  logs: CrawlLog[];
  total: number;
}

// Job Tracker API
export const jobs = {
  // Companies
  listCompanies: (filters?: CompaniesFilter) => {
    const params = new URLSearchParams();
    if (filters?.activeOnly !== undefined) {
      params.set('activeOnly', String(filters.activeOnly));
    }
    const query = params.toString();
    return request<CompaniesResponse>(`/jobs/companies${query ? `?${query}` : ''}`);
  },

  getCompany: (id: number) => request<Company>(`/jobs/companies/${id}`),

  // Listings
  listJobs: (filters?: JobListingsFilter) => {
    const params = new URLSearchParams();
    if (filters?.companyId) params.set('companyId', String(filters.companyId));
    if (filters?.status) params.set('status', filters.status);
    if (filters?.minScore) params.set('minScore', String(filters.minScore));
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    if (filters?.locationInclude?.length) {
      params.set('locationInclude', filters.locationInclude.join(','));
    }
    if (filters?.locationExclude?.length) {
      params.set('locationExclude', filters.locationExclude.join(','));
    }
    const query = params.toString();
    return request<JobListingsResponse>(`/jobs/listings${query ? `?${query}` : ''}`);
  },

  getJob: (id: number) => request<JobListing>(`/jobs/listings/${id}`),

  updateJobStatus: (id: number, status: JobStatus) =>
    request<JobListing>(`/jobs/listings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  batchUpdateStatus: (ids: number[], status: JobStatus) =>
    request<{ updated: number }>('/jobs/listings/batch-status', {
      method: 'PUT',
      body: JSON.stringify({ ids, status }),
    }),

  getStats: () => request<JobStats>('/jobs/listings/stats'),

  // Profile
  getProfile: () => request<JobProfileResponse>('/jobs/profile'),

  updateProfile: (data: Partial<Omit<JobProfile, 'id' | 'createdAt' | 'updatedAt'>>) =>
    request<JobProfile>('/jobs/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Crawling
  crawlAll: () =>
    request<CrawlResponse>('/jobs/crawl/all', {
      method: 'POST',
    }),

  crawlCompany: (companyId: number) =>
    request<CrawlResponse>(`/jobs/crawl/${companyId}`, {
      method: 'POST',
    }),

  getCrawlLogs: (limit?: number) => {
    const params = limit ? `?limit=${limit}` : '';
    return request<CrawlLogsResponse>(`/jobs/crawl/logs${params}`);
  },
};

export { ApiError };
