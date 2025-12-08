'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  blogPosts as blogPostsApi,
  BlogPost,
  BlogPostSummary,
  BlogPostsFilter,
  PostStatus,
  ApiError,
} from '@/lib/api';

interface UseBlogPostsOptions {
  initialFilters?: BlogPostsFilter;
  autoFetch?: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface UseBlogPostsReturn {
  posts: BlogPostSummary[];
  pagination: Pagination;
  loading: boolean;
  error: string | null;
  filters: BlogPostsFilter;
  setFilters: (filters: BlogPostsFilter) => void;
  refresh: () => Promise<void>;
  createPost: (data: {
    title: string;
    content: string;
    category: string;
    excerpt?: string;
    featuredImage?: string;
    metaDescription?: string;
    tags?: string[];
    status?: PostStatus;
    publishAt?: string;
  }) => Promise<BlogPost>;
  updatePost: (
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
  ) => Promise<BlogPost>;
  deletePost: (id: number) => Promise<void>;
  publishPost: (id: number) => Promise<BlogPost>;
  unpublishPost: (id: number) => Promise<BlogPost>;
  getPost: (id: number) => Promise<BlogPost>;
}

export function useBlogPosts(options: UseBlogPostsOptions = {}): UseBlogPostsReturn {
  const { initialFilters = {}, autoFetch = true } = options;

  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BlogPostsFilter>(initialFilters);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await blogPostsApi.list(filters);
      setPosts(response.posts);
      setPagination(response.pagination);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch posts';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (autoFetch) {
      fetchPosts();
    }
  }, [fetchPosts, autoFetch]);

  const createPost = async (data: {
    title: string;
    content: string;
    category: string;
    excerpt?: string;
    featuredImage?: string;
    metaDescription?: string;
    tags?: string[];
    status?: PostStatus;
    publishAt?: string;
  }): Promise<BlogPost> => {
    const post = await blogPostsApi.create(data);
    await fetchPosts();
    return post;
  };

  const updatePost = async (
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
  ): Promise<BlogPost> => {
    const post = await blogPostsApi.update(id, data);
    await fetchPosts();
    return post;
  };

  const deletePost = async (id: number): Promise<void> => {
    await blogPostsApi.delete(id);
    await fetchPosts();
  };

  const publishPost = async (id: number): Promise<BlogPost> => {
    const post = await blogPostsApi.publish(id);
    await fetchPosts();
    return post;
  };

  const unpublishPost = async (id: number): Promise<BlogPost> => {
    const post = await blogPostsApi.unpublish(id);
    await fetchPosts();
    return post;
  };

  const getPost = async (id: number): Promise<BlogPost> => {
    return await blogPostsApi.get(id);
  };

  return {
    posts,
    pagination,
    loading,
    error,
    filters,
    setFilters,
    refresh: fetchPosts,
    createPost,
    updatePost,
    deletePost,
    publishPost,
    unpublishPost,
    getPost,
  };
}
