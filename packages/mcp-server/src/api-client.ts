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
} from '@pa/shared';

class ApiError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
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
};
