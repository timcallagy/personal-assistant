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

export { ApiError };
