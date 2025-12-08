const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001/api/v1';

export interface BlogPostSummary {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  category: string;
  categoryName: string;
  tags: string[];
  publishedAt: string | null;
  readingTime: number;
  author: {
    name: string;
  };
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featuredImage: string | null;
  metaDescription: string | null;
  category: string;
  categoryName: string;
  tags: string[];
  publishedAt: string | null;
  readingTime: number;
  viewCount: number;
  author: {
    id: number;
    name: string;
    username: string;
  };
  relatedPosts: {
    id: number;
    title: string;
    slug: string;
    featuredImage: string | null;
  }[];
  previousPost: { title: string; slug: string } | null;
  nextPost: { title: string; slug: string } | null;
}

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  postCount: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface BlogConfig {
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
}

export interface TagWithCount {
  name: string;
  count: number;
}

async function fetchApi<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    next: { revalidate: 60 }, // Cache for 60 seconds
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  const data = await res.json();
  return data.data || data;
}

export const blogApi = {
  // Get posts with pagination and filtering
  async getPosts(options?: {
    page?: number;
    limit?: number;
    category?: string;
    tag?: string;
    featured?: boolean;
  }): Promise<{ posts: BlogPostSummary[]; pagination: Pagination }> {
    const params = new URLSearchParams();
    if (options?.page) params.set('page', String(options.page));
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.category) params.set('category', options.category);
    if (options?.tag) params.set('tag', options.tag);
    if (options?.featured) params.set('featured', 'true');

    const query = params.toString();
    return fetchApi(`/blog/posts${query ? `?${query}` : ''}`);
  },

  // Get single post by slug
  async getPost(slug: string): Promise<BlogPost> {
    return fetchApi(`/blog/posts/${slug}`);
  },

  // Get all categories
  async getCategories(): Promise<{ categories: BlogCategory[] }> {
    return fetchApi('/blog/categories');
  },

  // Get blog config
  async getConfig(): Promise<BlogConfig> {
    return fetchApi('/blog/config');
  },

  // Get all tags
  async getTags(): Promise<{ tags: TagWithCount[] }> {
    return fetchApi('/blog/posts/meta/tags');
  },

  // Get popular posts
  async getPopularPosts(limit = 5): Promise<{
    posts: { id: number; title: string; slug: string; featuredImage: string | null; publishedAt: string | null }[];
  }> {
    return fetchApi(`/blog/posts/meta/popular?limit=${limit}`);
  },

  // Record view
  async recordView(slug: string): Promise<void> {
    await fetch(`${API_BASE_URL}/blog/posts/${slug}/view`, {
      method: 'POST',
    });
  },

  // Subscribe to newsletter
  async subscribeNewsletter(email: string, consent: boolean): Promise<{ message: string; email: string }> {
    const res = await fetch(`${API_BASE_URL}/blog/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, consent }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || 'Subscription failed');
    }

    return data.data || data;
  },
};
