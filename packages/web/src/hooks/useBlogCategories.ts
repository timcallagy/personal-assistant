'use client';

import { useState, useEffect, useCallback } from 'react';
import { blogCategories as blogCategoriesApi, BlogCategory, ApiError } from '@/lib/api';

interface UseBlogCategoriesReturn {
  categories: BlogCategory[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useBlogCategories(): UseBlogCategoriesReturn {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await blogCategoriesApi.list();
      setCategories(response.categories);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch categories';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    refresh: fetchCategories,
  };
}
