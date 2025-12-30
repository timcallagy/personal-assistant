import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiClient } from '../api-client.js';
import { getPriorityLevel } from '@pa/shared';

// ES module path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// From dist/tools/ go up to dist/, then up to package root, then into config/
const CONFIG_DIR = path.join(__dirname, '..', '..', 'config');

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
      labels: z.string().optional().describe('Filter by labels (comma-separated for multiple)'),
      important: z.boolean().optional().describe('Filter by important flag'),
      from_date: z.string().optional().describe('Filter notes created after this date (ISO8601)'),
      to_date: z.string().optional().describe('Filter notes created before this date (ISO8601)'),
      limit: z.coerce.number().optional().default(20).describe('Maximum notes to return'),
    }),
    handler: async (args: {
      project?: string;
      labels?: string;
      important?: boolean;
      from_date?: string;
      to_date?: string;
      limit?: number;
    }) => {
      const labelsArray = args.labels
        ? args.labels.split(',').map((l) => l.trim()).filter(Boolean)
        : undefined;
      const { notes, total } = await apiClient.getNotes({
        project: args.project,
        labels: labelsArray,
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

  get_note: {
    description: 'Get a single note by ID with full content. Use when user wants to see the complete text of a specific note.',
    schema: z.object({
      id: z.coerce.number().describe('Note ID'),
    }),
    handler: async (args: { id: number }) => {
      const note = await apiClient.getNote(args.id);

      const labels = note.labels.length > 0 ? `Labels: ${note.labels.join(', ')}\n` : '';
      const important = note.important ? 'Important: Yes\n' : '';
      const created = new Date(note.createdAt).toLocaleDateString();

      return `**Note #${note.id}**
Project: ${note.project}
${labels}${important}Created: ${created}

${note.summary}`;
    },
  },

  get_actions: {
    description: 'Retrieve action items/tasks. Use when user wants to see their todo list, open tasks, or check what needs to be done.',
    schema: z.object({
      project: z.string().optional().describe('Filter by project name'),
      labels: z.string().optional().describe('Filter by labels (comma-separated for multiple)'),
      status: z.enum(['open', 'completed']).optional().default('open').describe('Filter by status'),
      top: z.coerce.number().optional().describe('Return only top N by priority'),
      limit: z.coerce.number().optional().default(20).describe('Maximum actions to return'),
    }),
    handler: async (args: {
      project?: string;
      labels?: string;
      status?: 'open' | 'completed';
      top?: number;
      limit?: number;
    }) => {
      const labelsArray = args.labels
        ? args.labels.split(',').map((l) => l.trim()).filter(Boolean)
        : undefined;
      const { actions, total } = await apiClient.getActions({
        project: args.project,
        labels: labelsArray,
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
      limit: z.coerce.number().optional().default(20).describe('Maximum actions to return'),
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
      limit: z.coerce.number().optional().default(10).describe('Maximum results per type'),
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
      labels: z.string().optional().describe('Optional labels for categorization (comma-separated for multiple)'),
      important: z.boolean().optional().default(false).describe('Mark as important'),
    }),
    handler: async (args: {
      summary: string;
      project: string;
      labels?: string;
      important?: boolean;
    }) => {
      const labelsArray = args.labels
        ? args.labels.split(',').map((l) => l.trim()).filter(Boolean)
        : undefined;
      const note = await apiClient.createNote({
        summary: args.summary,
        project: args.project,
        labels: labelsArray,
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
      labels: z.string().optional().describe('Optional labels for categorization (comma-separated for multiple)'),
      urgency: z.coerce.number().min(1).max(5).describe('Urgency rating (1=low, 5=high)'),
      importance: z.coerce.number().min(1).max(5).describe('Importance rating (1=low, 5=high)'),
    }),
    handler: async (args: {
      title: string;
      project: string;
      labels?: string;
      urgency: number;
      importance: number;
    }) => {
      const labelsArray = args.labels
        ? args.labels.split(',').map((l) => l.trim()).filter(Boolean)
        : undefined;
      const action = await apiClient.createAction({
        title: args.title,
        project: args.project,
        labels: labelsArray,
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
      id: z.coerce.number().describe('Note ID to edit'),
      summary: z.string().optional().describe('New summary'),
      project: z.string().optional().describe('New project'),
      labels: z.string().optional().describe('New labels (replaces existing, comma-separated for multiple)'),
      important: z.boolean().optional().describe('New important flag'),
    }),
    handler: async (args: {
      id: number;
      summary?: string;
      project?: string;
      labels?: string;
      important?: boolean;
    }) => {
      const labelsArray = args.labels
        ? args.labels.split(',').map((l) => l.trim()).filter(Boolean)
        : undefined;
      const note = await apiClient.updateNote(args.id, {
        summary: args.summary,
        project: args.project,
        labels: labelsArray,
        important: args.important,
      });

      return `Note ${note.id} updated successfully!\n- Project: ${note.project}\n- Labels: ${note.labels.join(', ') || 'none'}`;
    },
  },

  edit_action: {
    description: 'Update an existing action.',
    schema: z.object({
      id: z.coerce.number().describe('Action ID to edit'),
      title: z.string().optional().describe('New title'),
      project: z.string().optional().describe('New project'),
      labels: z.string().optional().describe('New labels (replaces existing, comma-separated for multiple)'),
      urgency: z.coerce.number().min(1).max(5).optional().describe('New urgency (1-5)'),
      importance: z.coerce.number().min(1).max(5).optional().describe('New importance (1-5)'),
    }),
    handler: async (args: {
      id: number;
      title?: string;
      project?: string;
      labels?: string;
      urgency?: number;
      importance?: number;
    }) => {
      const labelsArray = args.labels
        ? args.labels.split(',').map((l) => l.trim()).filter(Boolean)
        : undefined;
      const action = await apiClient.updateAction(args.id, {
        title: args.title,
        project: args.project,
        labels: labelsArray,
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
      id: z.coerce.number().describe('Note ID to delete'),
    }),
    handler: async (args: { id: number }) => {
      await apiClient.deleteNote(args.id);
      return `Note ${args.id} deleted successfully.`;
    },
  },

  delete_action: {
    description: 'Permanently delete an action.',
    schema: z.object({
      id: z.coerce.number().describe('Action ID to delete'),
    }),
    handler: async (args: { id: number }) => {
      await apiClient.deleteAction(args.id);
      return `Action ${args.id} deleted successfully.`;
    },
  },

  complete_actions: {
    description: 'Mark actions as completed.',
    schema: z.object({
      ids: z
        .string()
        .describe('Array of action IDs to mark as completed')
        .transform((val) => {
          // Handle comma-separated string: "16,17,18" or single value "16"
          return val.split(',').map((id) => parseInt(id.trim(), 10));
        }),
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

  // ==========================================
  // BLOG TOOLS
  // ==========================================

  get_blog_posts: {
    description: 'List blog posts. Use when user wants to see their blog posts or manage blog content.',
    schema: z.object({
      status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'all']).optional().default('all').describe('Filter by post status'),
      limit: z.coerce.number().optional().default(20).describe('Maximum posts to return'),
      search: z.string().optional().describe('Search in title/content'),
    }),
    handler: async (args: {
      status?: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'all';
      limit?: number;
      search?: string;
    }) => {
      const { posts, pagination } = await apiClient.getBlogPosts({
        status: args.status,
        limit: args.limit,
        search: args.search,
      });

      if (posts.length === 0) {
        return 'No blog posts found matching the criteria.';
      }

      const header = `Found ${pagination.total} post${pagination.total !== 1 ? 's' : ''}${pagination.total > posts.length ? ` (showing ${posts.length})` : ''}:\n\n`;
      const postsList = posts
        .map((p) => {
          const status = p.status === 'PUBLISHED' ? '✓' : p.status === 'SCHEDULED' ? '⏰' : '📝';
          const date = p.publishedAt
            ? new Date(p.publishedAt).toLocaleDateString()
            : p.publishAt
              ? `Scheduled: ${new Date(p.publishAt).toLocaleDateString()}`
              : 'Draft';
          return `[${p.id}] ${status} ${p.title}\n   Category: ${p.category} | ${date}`;
        })
        .join('\n\n');

      return header + postsList;
    },
  },

  get_blog_post: {
    description: 'Get a single blog post by ID. Use when user wants to view or edit a specific post.',
    schema: z.object({
      id: z.coerce.number().describe('Blog post ID'),
    }),
    handler: async (args: { id: number }) => {
      const post = await apiClient.getBlogPost(args.id);

      const status = post.status === 'PUBLISHED' ? 'Published' : post.status === 'SCHEDULED' ? 'Scheduled' : 'Draft';
      const tags = post.tags.length > 0 ? post.tags.join(', ') : 'none';

      return `**${post.title}**
ID: ${post.id}
Slug: ${post.slug}
Status: ${status}
Category: ${post.category}
Tags: ${tags}
Views: ${post.viewCount}
Created: ${new Date(post.createdAt).toLocaleDateString()}
${post.publishedAt ? `Published: ${new Date(post.publishedAt).toLocaleDateString()}` : ''}

**Excerpt:**
${post.excerpt || '(no excerpt)'}

**Content:**
${post.content}`;
    },
  },

  get_blog_categories: {
    description: 'Get all blog categories. Use when user needs to see available categories for posts.',
    schema: z.object({}),
    handler: async () => {
      const categories = await apiClient.getBlogCategories();

      if (categories.length === 0) {
        return 'No blog categories found.';
      }

      return 'Available blog categories:\n' + categories
        .map((c) => `- ${c.name} (${c.slug})${c.description ? `: ${c.description}` : ''}`)
        .join('\n');
    },
  },

  create_blog_post: {
    description: 'Create a new blog post. Use when user wants to write a new blog article.',
    schema: z.object({
      title: z.string().describe('Post title'),
      content: z.string().describe('Post content in Markdown'),
      category: z.string().describe('Category slug (e.g., ai-fundamentals, prompt-engineering)'),
      excerpt: z.string().optional().describe('Brief summary (max 300 chars)'),
      tags: z.array(z.string()).optional().describe('Tags for the post'),
      status: z.enum(['DRAFT', 'PUBLISHED']).optional().default('DRAFT').describe('Post status'),
      meta_description: z.string().optional().describe('SEO meta description (max 160 chars)'),
      featured_image: z.string().optional().describe('Featured image URL'),
    }),
    handler: async (args: {
      title: string;
      content: string;
      category: string;
      excerpt?: string;
      tags?: string[];
      status?: 'DRAFT' | 'PUBLISHED';
      meta_description?: string;
      featured_image?: string;
    }) => {
      const post = await apiClient.createBlogPost({
        title: args.title,
        content: args.content,
        category: args.category,
        excerpt: args.excerpt,
        tags: args.tags,
        status: args.status,
        metaDescription: args.meta_description,
        featuredImage: args.featured_image,
      });

      const status = post.status === 'PUBLISHED' ? 'Published' : 'Draft';
      return `Blog post created successfully!
- ID: ${post.id}
- Title: ${post.title}
- Slug: ${post.slug}
- Status: ${status}
- Category: ${post.category}`;
    },
  },

  update_blog_post: {
    description: 'Update an existing blog post.',
    schema: z.object({
      id: z.coerce.number().describe('Blog post ID to update'),
      title: z.string().optional().describe('New title'),
      content: z.string().optional().describe('New content in Markdown'),
      category: z.string().optional().describe('New category slug'),
      excerpt: z.string().optional().describe('New excerpt'),
      tags: z.array(z.string()).optional().describe('New tags (replaces existing)'),
      meta_description: z.string().optional().describe('New SEO meta description'),
      featured_image: z.string().optional().describe('New featured image URL'),
    }),
    handler: async (args: {
      id: number;
      title?: string;
      content?: string;
      category?: string;
      excerpt?: string;
      tags?: string[];
      meta_description?: string;
      featured_image?: string;
    }) => {
      const post = await apiClient.updateBlogPost(args.id, {
        title: args.title,
        content: args.content,
        category: args.category,
        excerpt: args.excerpt,
        tags: args.tags,
        metaDescription: args.meta_description,
        featuredImage: args.featured_image,
      });

      return `Blog post ${post.id} updated successfully!
- Title: ${post.title}
- Slug: ${post.slug}
- Category: ${post.category}`;
    },
  },

  publish_blog_post: {
    description: 'Publish a draft blog post immediately.',
    schema: z.object({
      id: z.coerce.number().describe('Blog post ID to publish'),
    }),
    handler: async (args: { id: number }) => {
      const post = await apiClient.publishBlogPost(args.id);
      return `Blog post "${post.title}" published successfully!\nSlug: ${post.slug}\nPublished at: ${new Date(post.publishedAt!).toLocaleString()}`;
    },
  },

  unpublish_blog_post: {
    description: 'Unpublish a published blog post (revert to draft).',
    schema: z.object({
      id: z.coerce.number().describe('Blog post ID to unpublish'),
    }),
    handler: async (args: { id: number }) => {
      const post = await apiClient.unpublishBlogPost(args.id);
      return `Blog post "${post.title}" unpublished and reverted to draft.`;
    },
  },

  delete_blog_post: {
    description: 'Permanently delete a blog post.',
    schema: z.object({
      id: z.coerce.number().describe('Blog post ID to delete'),
    }),
    handler: async (args: { id: number }) => {
      await apiClient.deleteBlogPost(args.id);
      return `Blog post ${args.id} deleted successfully.`;
    },
  },

  get_blog_instructions: {
    description: 'Get the global blog post formatting instructions. Returns the content of the blog instructions configuration file.',
    schema: z.object({}),
    handler: async () => {
      const instructionsPath = path.join(CONFIG_DIR, 'blog-instructions.md');

      if (!fs.existsSync(instructionsPath)) {
        throw new Error(
          'Blog instructions file not found at config/blog-instructions.md. Please create this file with your formatting instructions.'
        );
      }

      const content = fs.readFileSync(instructionsPath, 'utf-8');
      return content;
    },
  },

  upload_blog_image: {
    description: 'Upload a local image file to the blog. Returns the public URL for use in blog posts as featured image or embedded content.',
    schema: z.object({
      file_path: z.string().describe('Absolute path to the local image file (JPEG, PNG, GIF, or WebP)'),
    }),
    handler: async (args: { file_path: string }) => {
      // Validate that the path is absolute
      if (!path.isAbsolute(args.file_path)) {
        throw new Error(`Please provide an absolute file path. Received: ${args.file_path}`);
      }

      try {
        const result = await apiClient.uploadImage(args.file_path);

        return `Image uploaded successfully!
- Filename: ${result.filename}
- URL: ${result.url}
- Size: ${result.size} bytes
- Type: ${result.mimetype}`;
      } catch (error) {
        // Re-throw with cleaner message if it's our ApiError
        if (error instanceof Error) {
          throw new Error(error.message);
        }
        throw new Error('Failed to upload image. Please try again.');
      }
    },
  },

  // ==========================================
  // JOB TRACKER TOOLS
  // ==========================================

  list_job_companies: {
    description: 'List all companies being tracked for job opportunities.',
    schema: z.object({
      active_only: z.boolean().optional().default(false).describe('Only show active companies'),
    }),
    handler: async (args: { active_only?: boolean }) => {
      const { companies, total } = await apiClient.getCompanies(args.active_only);

      if (companies.length === 0) {
        return 'No companies being tracked. Use add_job_company to add companies.';
      }

      const header = `Tracking ${total} compan${total !== 1 ? 'ies' : 'y'}:\n\n`;
      const list = companies
        .map((c) => {
          const status = c.active ? '✓' : '○';
          const ats = c.atsType ? ` [${c.atsType}]` : '';
          return `[${c.id}] ${status} ${c.name}${ats}\n    ${c.careerPageUrl}`;
        })
        .join('\n\n');

      return header + list;
    },
  },

  add_job_company: {
    description: 'Add a company to track for job opportunities. Automatically detects the ATS type from the career page URL.',
    schema: z.object({
      name: z.string().describe('Company name'),
      career_url: z.string().describe('URL of the company career page'),
    }),
    handler: async (args: { name: string; career_url: string }) => {
      const company = await apiClient.createCompany({
        name: args.name,
        careerPageUrl: args.career_url,
      });

      const atsInfo = company.atsType ? ` (detected: ${company.atsType})` : '';
      return `Company added successfully!
- ID: ${company.id}
- Name: ${company.name}
- Career URL: ${company.careerPageUrl}${atsInfo}`;
    },
  },

  update_job_company: {
    description: 'Update a tracked company including metadata (description, headquarters, foundedYear, revenueEstimate, stage).',
    schema: z.object({
      id: z.coerce.number().describe('Company ID'),
      name: z.string().optional().describe('New company name'),
      career_url: z.string().optional().describe('New career page URL'),
      active: z.string().optional().describe('Set active status (true/false)'),
      description: z.string().optional().describe('What the company does (1 sentence)'),
      headquarters: z.string().optional().describe('Company HQ location'),
      founded_year: z.coerce.number().optional().describe('Year company was founded'),
      revenue_estimate: z.string().optional().describe('Revenue estimate (e.g. "$10M-$50M", "$1B+")'),
      stage: z.string().optional().describe('Funding stage: pre-seed, seed, series-a, series-b, series-c, growth, public, acquired'),
    }),
    handler: async (args: {
      id: number;
      name?: string;
      career_url?: string;
      active?: string;
      description?: string;
      headquarters?: string;
      founded_year?: number;
      revenue_estimate?: string;
      stage?: string;
    }) => {
      const company = await apiClient.updateCompany(args.id, {
        name: args.name,
        careerPageUrl: args.career_url,
        active: args.active !== undefined ? args.active === 'true' : undefined,
        description: args.description,
        headquarters: args.headquarters,
        foundedYear: args.founded_year,
        revenueEstimate: args.revenue_estimate,
        stage: args.stage,
      });

      const status = company.active ? 'active' : 'inactive';
      const parts = [
        `Company ${company.id} updated!`,
        `- Name: ${company.name}`,
        `- Career URL: ${company.careerPageUrl}`,
        `- Status: ${status}`,
      ];
      if (company.description) parts.push(`- Description: ${company.description}`);
      if (company.headquarters) parts.push(`- HQ: ${company.headquarters}`);
      if (company.foundedYear) parts.push(`- Founded: ${company.foundedYear}`);
      if (company.revenueEstimate) parts.push(`- Revenue: ${company.revenueEstimate}`);
      if (company.stage) parts.push(`- Stage: ${company.stage}`);
      return parts.join('\n');
    },
  },

  remove_job_company: {
    description: 'Remove a company from tracking. This also removes all associated job listings.',
    schema: z.object({
      id: z.coerce.number().describe('Company ID to remove'),
    }),
    handler: async (args: { id: number }) => {
      await apiClient.deleteCompany(args.id);
      return `Company ${args.id} removed from tracking.`;
    },
  },

  get_job_profile: {
    description: 'Get your job search profile (keywords, titles, locations, exclusions, remote preference).',
    schema: z.object({}),
    handler: async () => {
      const profile = await apiClient.getJobProfile();

      if (!profile) {
        return 'No job profile set. Use set_job_profile to define your job preferences.';
      }

      const keywords = profile.keywords.length > 0 ? profile.keywords.join(', ') : 'none';
      const titles = profile.titles.length > 0 ? profile.titles.join(', ') : 'none';
      const locations = profile.locations.length > 0 ? profile.locations.join(', ') : 'any';
      const locationExclusions = profile.locationExclusions.length > 0 ? profile.locationExclusions.join(', ') : 'none';
      const titleExclusions = profile.titleExclusions?.length > 0 ? profile.titleExclusions.join(', ') : 'none';
      const remote = profile.remoteOnly ? 'Yes (remote only)' : 'No (open to on-site)';

      return `**Job Profile**
- Keywords: ${keywords}
- Titles: ${titles}
- Locations: ${locations}
- Location exclusions: ${locationExclusions}
- Title exclusions: ${titleExclusions}
- Remote only: ${remote}

Last updated: ${new Date(profile.updatedAt).toLocaleDateString()}`;
    },
  },

  set_job_profile: {
    description: 'Set or update your job search profile. All parameters are optional - only provided values will be updated.',
    schema: z.object({
      keywords: z.string().optional().describe('Comma-separated keywords (e.g., "operations, strategy, product")'),
      titles: z.string().optional().describe('Comma-separated job title patterns (e.g., "Head of, VP, Director")'),
      locations: z.string().optional().describe('Comma-separated locations (e.g., "London, Remote, UK")'),
      location_exclusions: z.string().optional().describe('Comma-separated locations to exclude (e.g., "US, North America, Australia")'),
      title_exclusions: z.string().optional().describe('Comma-separated job titles to exclude (exact match, e.g., "Customer Success Manager, Sales Representative")'),
      remote_only: z.boolean().optional().describe('Only show remote jobs'),
    }),
    handler: async (args: {
      keywords?: string;
      titles?: string;
      locations?: string;
      location_exclusions?: string;
      title_exclusions?: string;
      remote_only?: boolean;
    }) => {
      const profile = await apiClient.upsertJobProfile({
        keywords: args.keywords?.split(',').map((k) => k.trim()).filter(Boolean),
        titles: args.titles?.split(',').map((t) => t.trim()).filter(Boolean),
        locations: args.locations?.split(',').map((l) => l.trim()).filter(Boolean),
        locationExclusions: args.location_exclusions?.split(',').map((l) => l.trim()).filter(Boolean),
        titleExclusions: args.title_exclusions?.split(',').map((t) => t.trim()).filter(Boolean),
        remoteOnly: args.remote_only,
      });

      const keywords = profile.keywords.length > 0 ? profile.keywords.join(', ') : 'none';
      const titles = profile.titles.length > 0 ? profile.titles.join(', ') : 'none';
      const locations = profile.locations.length > 0 ? profile.locations.join(', ') : 'any';
      const locationExclusions = profile.locationExclusions.length > 0 ? profile.locationExclusions.join(', ') : 'none';
      const titleExclusions = profile.titleExclusions?.length > 0 ? profile.titleExclusions.join(', ') : 'none';

      return `Job profile updated!
- Keywords: ${keywords}
- Titles: ${titles}
- Locations: ${locations}
- Location exclusions: ${locationExclusions}
- Title exclusions: ${titleExclusions}
- Remote only: ${profile.remoteOnly ? 'Yes' : 'No'}`;
    },
  },

  // ==========================================
  // Job Crawling
  // ==========================================

  crawl_company_jobs: {
    description: 'Crawl a specific company\'s career page to fetch job listings. Use list_job_companies to get company IDs.',
    schema: z.object({
      company_id: z.string().describe('The company ID to crawl'),
    }),
    handler: async (args: { company_id: string }) => {
      const companyId = parseInt(args.company_id, 10);
      if (isNaN(companyId)) {
        return 'Invalid company ID. Please provide a valid numeric ID.';
      }

      const result = await apiClient.crawlCompany(companyId);

      if (result.status === 'failed') {
        return `Failed to crawl ${result.companyName}: ${result.error}`;
      }

      return `Crawled ${result.companyName}:
- Jobs found: ${result.jobsFound}
- New jobs: ${result.newJobs}`;
    },
  },

  crawl_all_jobs: {
    description: 'Crawl all active companies\' career pages to fetch job listings. This may take a few minutes.',
    schema: z.object({}),
    handler: async () => {
      const result = await apiClient.crawlAllCompanies();

      const successCount = result.results.filter((r) => r.status === 'success').length;
      const failedCount = result.results.filter((r) => r.status === 'failed').length;

      let output = `Crawl Complete!
- Companies crawled: ${result.companiesCrawled}
- Total jobs found: ${result.totalJobsFound}
- New jobs found: ${result.newJobsFound}
- Successful: ${successCount}
- Failed: ${failedCount}`;

      if (failedCount > 0) {
        const failed = result.results.filter((r) => r.status === 'failed');
        output += '\n\nFailed companies:';
        for (const f of failed) {
          output += `\n- ${f.companyName}: ${f.error}`;
        }
      }

      return output;
    },
  },

  get_job_listings: {
    description: 'Get discovered job listings from crawled career pages. Jobs are sorted by match score.',
    schema: z.object({
      company_id: z.string().optional().describe('Filter by company ID'),
      status: z.string().optional().describe('Filter by status: new, viewed, applied, dismissed'),
      min_score: z.string().optional().describe('Minimum match score (0-100)'),
      limit: z.string().optional().describe('Maximum number of results (default 20)'),
      location_include: z.string().optional().describe('Only show jobs matching these locations (comma-separated, e.g., "Europe,Dublin,EMEA,Remote")'),
      location_exclude: z.string().optional().describe('Exclude jobs matching these locations (comma-separated, e.g., "North America,US,Sydney,Boston")'),
    }),
    handler: async (args: {
      company_id?: string;
      status?: string;
      min_score?: string;
      limit?: string;
      location_include?: string;
      location_exclude?: string;
    }) => {
      const filter: {
        companyId?: number;
        status?: string;
        minScore?: number;
        limit?: number;
        locationInclude?: string;
        locationExclude?: string;
      } = {};

      if (args.company_id) {
        filter.companyId = parseInt(args.company_id, 10);
      }
      if (args.status) {
        filter.status = args.status;
      }
      if (args.min_score) {
        filter.minScore = parseFloat(args.min_score);
      }
      if (args.location_include) {
        filter.locationInclude = args.location_include;
      }
      if (args.location_exclude) {
        filter.locationExclude = args.location_exclude;
      }
      filter.limit = args.limit ? parseInt(args.limit, 10) : 20;

      const { listings, total } = await apiClient.getJobListings(filter);

      if (listings.length === 0) {
        return 'No job listings found. Try crawling some companies first with crawl_all_jobs.';
      }

      let output = `Found ${total} jobs (showing ${listings.length}):\n`;

      for (const job of listings) {
        const score = job.matchScore !== null ? `[${job.matchScore}%]` : '[--]';
        const status = job.status !== 'new' ? ` (${job.status})` : '';
        const remote = job.remote ? ' [Remote]' : '';
        output += `\n${score} ${job.title}${status}${remote}`;
        output += `\n    Company: ${job.companyName || 'Unknown'}`;
        if (job.location) output += ` | Location: ${job.location}`;
        output += `\n    URL: ${job.url}`;
        output += `\n    ID: ${job.id}\n`;
      }

      return output;
    },
  },

  update_job_status: {
    description: 'Update the status of a job listing (e.g., mark as viewed, applied, or dismissed).',
    schema: z.object({
      job_id: z.string().describe('The job listing ID'),
      status: z.string().describe('New status: new, viewed, applied, dismissed'),
    }),
    handler: async (args: { job_id: string; status: string }) => {
      const jobId = parseInt(args.job_id, 10);
      if (isNaN(jobId)) {
        return 'Invalid job ID. Please provide a valid numeric ID.';
      }

      const validStatuses = ['new', 'viewed', 'applied', 'dismissed'];
      if (!validStatuses.includes(args.status)) {
        return `Invalid status. Must be one of: ${validStatuses.join(', ')}`;
      }

      const listing = await apiClient.updateJobStatus(jobId, args.status);
      return `Updated job "${listing.title}" status to: ${listing.status}`;
    },
  },

  get_job_stats: {
    description: 'Get statistics about your job listings.',
    schema: z.object({}),
    handler: async () => {
      const stats = await apiClient.getJobStats();

      let output = `**Job Statistics**
- Total jobs tracked: ${stats.total}
- New this week: ${stats.newSinceLastWeek}

**By Status:**`;

      for (const [status, count] of Object.entries(stats.byStatus)) {
        output += `\n- ${status}: ${count}`;
      }

      return output;
    },
  },

  get_crawl_history: {
    description: 'View recent crawl history for job tracker.',
    schema: z.object({
      company_id: z.string().optional().describe('Filter by company ID'),
      limit: z.string().optional().describe('Maximum number of results (default 10)'),
    }),
    handler: async (args: { company_id?: string; limit?: string }) => {
      const companyId = args.company_id ? parseInt(args.company_id, 10) : undefined;
      const limit = args.limit ? parseInt(args.limit, 10) : 10;

      const logs = await apiClient.getCrawlLogs(companyId, limit);

      if (logs.length === 0) {
        return 'No crawl history found. Use crawl_all_jobs to start crawling.';
      }

      let output = `**Recent Crawls** (${logs.length})\n`;

      for (const log of logs) {
        const status = log.status === 'success' ? '✓' : log.status === 'failed' ? '✗' : '⋯';
        const date = new Date(log.startedAt).toLocaleString();
        output += `\n${status} ${log.companyName || `Company #${log.companyId}`}`;
        output += `\n  ${date} | Found: ${log.jobsFound} | New: ${log.newJobs}`;
        if (log.error) output += `\n  Error: ${log.error}`;
      }

      return output;
    },
  },
};

export type ToolName = keyof typeof tools;
