import { z } from 'zod';
import { apiClient } from '../api-client.js';
import { getPriorityLevel } from '@pa/shared';

// Tool definitions with schemas
export const tools = {
  // ==========================================
  // READ TOOLS
  // ==========================================

  get_projects: {
    description: 'Get all projects. Use when user asks about their projects or needs to see the project list.',
    schema: z.object({}),
    handler: async () => {
      const projects = await apiClient.getProjects();
      if (projects.length === 0) {
        return 'No projects found. Create one when saving a note or action.';
      }
      return projects
        .map((p) => `- ${p.name} (${p.noteCount} notes, ${p.actionCount} actions)`)
        .join('\n');
    },
  },

  get_labels: {
    description: 'Get all labels. Use when user asks about their labels or needs to see available tags.',
    schema: z.object({}),
    handler: async () => {
      const labels = await apiClient.getLabels();
      if (labels.length === 0) {
        return 'No labels found. Create them when saving notes or actions.';
      }
      return labels
        .map((l) => `- ${l.name} (${l.noteCount} notes, ${l.actionCount} actions)`)
        .join('\n');
    },
  },

  get_notes: {
    description: 'Retrieve saved notes. Use when user wants to recall stored information, check their notes, or look up saved context.',
    schema: z.object({
      project: z.string().optional().describe('Filter by project name'),
      labels: z.array(z.string()).optional().describe('Filter by labels'),
      important: z.boolean().optional().describe('Filter by important flag'),
      from_date: z.string().optional().describe('Filter notes created after this date (ISO8601)'),
      to_date: z.string().optional().describe('Filter notes created before this date (ISO8601)'),
      limit: z.number().optional().default(20).describe('Maximum notes to return'),
    }),
    handler: async (args: {
      project?: string;
      labels?: string[];
      important?: boolean;
      from_date?: string;
      to_date?: string;
      limit?: number;
    }) => {
      const { notes, total } = await apiClient.getNotes({
        project: args.project,
        labels: args.labels,
        important: args.important,
        fromDate: args.from_date,
        toDate: args.to_date,
        limit: args.limit,
      });

      if (notes.length === 0) {
        return 'No notes found matching the criteria.';
      }

      const header = `Found ${total} note${total !== 1 ? 's' : ''}${total > notes.length ? ` (showing ${notes.length})` : ''}:\n\n`;
      const notesList = notes
        .map((n) => {
          const summary = n.summary.length > 200 ? n.summary.slice(0, 200) + '...' : n.summary;
          const labels = n.labels.length > 0 ? ` [${n.labels.join(', ')}]` : '';
          const important = n.important ? ' ⭐' : '';
          return `[${n.id}] ${n.project}${labels}${important}\n${summary}`;
        })
        .join('\n\n');

      return header + notesList;
    },
  },

  get_actions: {
    description: 'Retrieve action items/tasks. Use when user wants to see their todo list, open tasks, or check what needs to be done.',
    schema: z.object({
      project: z.string().optional().describe('Filter by project name'),
      labels: z.array(z.string()).optional().describe('Filter by labels'),
      status: z.enum(['open', 'completed']).optional().default('open').describe('Filter by status'),
      top: z.number().optional().describe('Return only top N by priority'),
      limit: z.number().optional().default(20).describe('Maximum actions to return'),
    }),
    handler: async (args: {
      project?: string;
      labels?: string[];
      status?: 'open' | 'completed';
      top?: number;
      limit?: number;
    }) => {
      const { actions, total } = await apiClient.getActions({
        project: args.project,
        labels: args.labels,
        status: args.status,
        top: args.top,
        limit: args.limit,
      });

      if (actions.length === 0) {
        return args.status === 'completed'
          ? 'No completed actions found.'
          : 'No open actions found. Great job!';
      }

      const header = `Found ${total} ${args.status || 'open'} action${total !== 1 ? 's' : ''}${total > actions.length ? ` (showing ${actions.length})` : ''}:\n\n`;
      const actionsList = actions
        .map((a) => {
          const priority = getPriorityLevel(a.priorityScore);
          const labels = a.labels.length > 0 ? ` [${a.labels.join(', ')}]` : '';
          return `[${a.id}] (${priority.toUpperCase()}, score: ${a.priorityScore}) ${a.project}${labels}\n${a.title}`;
        })
        .join('\n\n');

      return header + actionsList;
    },
  },

  get_completed_actions: {
    description: 'Retrieve completed/archived actions. Use when user wants to see what they have accomplished.',
    schema: z.object({
      project: z.string().optional().describe('Filter by project name'),
      from_date: z.string().optional().describe('Filter by completion date'),
      limit: z.number().optional().default(20).describe('Maximum actions to return'),
    }),
    handler: async (args: {
      project?: string;
      from_date?: string;
      limit?: number;
    }) => {
      const { actions, total } = await apiClient.getCompletedActions({
        project: args.project,
        fromDate: args.from_date,
        limit: args.limit,
      });

      if (actions.length === 0) {
        return 'No completed actions found.';
      }

      const header = `Found ${total} completed action${total !== 1 ? 's' : ''}${total > actions.length ? ` (showing ${actions.length})` : ''}:\n\n`;
      const actionsList = actions
        .map((a) => {
          const labels = a.labels.length > 0 ? ` [${a.labels.join(', ')}]` : '';
          const completed = a.completedAt ? new Date(a.completedAt).toLocaleDateString() : 'unknown';
          return `[${a.id}] ${a.project}${labels} - Completed: ${completed}\n${a.title}`;
        })
        .join('\n\n');

      return header + actionsList;
    },
  },

  search: {
    description: 'Search across notes and actions. Use when user wants to find something specific in their stored data.',
    schema: z.object({
      query: z.string().describe('Search query'),
      type: z.enum(['all', 'notes', 'actions']).optional().default('all').describe('Limit search to specific type'),
      project: z.string().optional().describe('Filter results by project'),
      limit: z.number().optional().default(10).describe('Maximum results per type'),
    }),
    handler: async (args: {
      query: string;
      type?: 'all' | 'notes' | 'actions';
      project?: string;
      limit?: number;
    }) => {
      const result = await apiClient.search({
        query: args.query,
        type: args.type,
        project: args.project,
        limit: args.limit,
      });

      const parts: string[] = [];

      if (result.notes.length > 0) {
        parts.push(`**Notes (${result.totalNotes} total):**`);
        result.notes.forEach((n) => {
          const summary = n.summary.length > 100 ? n.summary.slice(0, 100) + '...' : n.summary;
          parts.push(`[${n.id}] ${n.project}: ${summary}`);
        });
      }

      if (result.actions.length > 0) {
        if (parts.length > 0) parts.push('');
        parts.push(`**Actions (${result.totalActions} total):**`);
        result.actions.forEach((a) => {
          const priority = getPriorityLevel(a.priorityScore);
          parts.push(`[${a.id}] (${priority}) ${a.project}: ${a.title}`);
        });
      }

      if (parts.length === 0) {
        return `No results found for "${args.query}".`;
      }

      return parts.join('\n');
    },
  },

  // ==========================================
  // WRITE TOOLS
  // ==========================================

  save_note: {
    description: 'Save information as a note for future reference. Use when user wants to store context, summaries, or reference material.',
    schema: z.object({
      summary: z.string().describe('The note content/summary'),
      project: z.string().describe('Project name this note belongs to'),
      labels: z.array(z.string()).optional().describe('Optional labels for categorization'),
      important: z.boolean().optional().default(false).describe('Mark as important'),
    }),
    handler: async (args: {
      summary: string;
      project: string;
      labels?: string[];
      important?: boolean;
    }) => {
      const note = await apiClient.createNote({
        summary: args.summary,
        project: args.project,
        labels: args.labels,
        important: args.important,
      });

      const labels = note.labels.length > 0 ? ` with labels: ${note.labels.join(', ')}` : '';
      const important = note.important ? ' (marked as important)' : '';
      return `Note saved successfully!\n- ID: ${note.id}\n- Project: ${note.project}${labels}${important}`;
    },
  },

  save_action: {
    description: 'Create a task/action item. Use when user wants to track something they need to do.',
    schema: z.object({
      title: z.string().describe('Action title/description'),
      project: z.string().describe('Project name this action belongs to'),
      labels: z.array(z.string()).optional().describe('Optional labels for categorization'),
      urgency: z.number().min(1).max(5).describe('Urgency rating (1=low, 5=high)'),
      importance: z.number().min(1).max(5).describe('Importance rating (1=low, 5=high)'),
    }),
    handler: async (args: {
      title: string;
      project: string;
      labels?: string[];
      urgency: number;
      importance: number;
    }) => {
      const action = await apiClient.createAction({
        title: args.title,
        project: args.project,
        labels: args.labels,
        urgency: args.urgency,
        importance: args.importance,
      });

      const priority = getPriorityLevel(action.priorityScore);
      const labels = action.labels.length > 0 ? `\n- Labels: ${action.labels.join(', ')}` : '';
      return `Action created successfully!\n- ID: ${action.id}\n- Project: ${action.project}${labels}\n- Priority: ${priority.toUpperCase()} (score: ${action.priorityScore})`;
    },
  },

  edit_note: {
    description: 'Update an existing note.',
    schema: z.object({
      id: z.number().describe('Note ID to edit'),
      summary: z.string().optional().describe('New summary'),
      project: z.string().optional().describe('New project'),
      labels: z.array(z.string()).optional().describe('New labels (replaces existing)'),
      important: z.boolean().optional().describe('New important flag'),
    }),
    handler: async (args: {
      id: number;
      summary?: string;
      project?: string;
      labels?: string[];
      important?: boolean;
    }) => {
      const note = await apiClient.updateNote(args.id, {
        summary: args.summary,
        project: args.project,
        labels: args.labels,
        important: args.important,
      });

      return `Note ${note.id} updated successfully!\n- Project: ${note.project}\n- Labels: ${note.labels.join(', ') || 'none'}`;
    },
  },

  edit_action: {
    description: 'Update an existing action.',
    schema: z.object({
      id: z.number().describe('Action ID to edit'),
      title: z.string().optional().describe('New title'),
      project: z.string().optional().describe('New project'),
      labels: z.array(z.string()).optional().describe('New labels (replaces existing)'),
      urgency: z.number().min(1).max(5).optional().describe('New urgency (1-5)'),
      importance: z.number().min(1).max(5).optional().describe('New importance (1-5)'),
    }),
    handler: async (args: {
      id: number;
      title?: string;
      project?: string;
      labels?: string[];
      urgency?: number;
      importance?: number;
    }) => {
      const action = await apiClient.updateAction(args.id, {
        title: args.title,
        project: args.project,
        labels: args.labels,
        urgency: args.urgency,
        importance: args.importance,
      });

      const priority = getPriorityLevel(action.priorityScore);
      return `Action ${action.id} updated successfully!\n- Project: ${action.project}\n- Priority: ${priority.toUpperCase()} (score: ${action.priorityScore})`;
    },
  },

  delete_note: {
    description: 'Permanently delete a note.',
    schema: z.object({
      id: z.number().describe('Note ID to delete'),
    }),
    handler: async (args: { id: number }) => {
      await apiClient.deleteNote(args.id);
      return `Note ${args.id} deleted successfully.`;
    },
  },

  delete_action: {
    description: 'Permanently delete an action.',
    schema: z.object({
      id: z.number().describe('Action ID to delete'),
    }),
    handler: async (args: { id: number }) => {
      await apiClient.deleteAction(args.id);
      return `Action ${args.id} deleted successfully.`;
    },
  },

  complete_actions: {
    description: 'Mark actions as completed.',
    schema: z.object({
      ids: z.array(z.number()).describe('Array of action IDs to mark as completed'),
    }),
    handler: async (args: { ids: number[] }) => {
      const result = await apiClient.completeActions(args.ids);

      const parts: string[] = [];
      if (result.completed.length > 0) {
        parts.push(`Completed: ${result.completed.join(', ')}`);
      }
      if (result.notFound.length > 0) {
        parts.push(`Not found: ${result.notFound.join(', ')}`);
      }
      if (result.alreadyCompleted.length > 0) {
        parts.push(`Already completed: ${result.alreadyCompleted.join(', ')}`);
      }

      return parts.join('\n');
    },
  },
};

export type ToolName = keyof typeof tools;
