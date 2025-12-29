'use client';

import { useState, useEffect, useCallback } from 'react';
import { jobs as jobsApi, Company, CrawlResponse, ApiError } from '@/lib/api';

interface UseCompaniesReturn {
  companies: Company[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  crawlCompany: (id: number) => Promise<CrawlResponse>;
  crawlAll: () => Promise<CrawlResponse>;
  crawlingCompanyId: number | null;
  crawlingAll: boolean;
}

export function useCompanies(): UseCompaniesReturn {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crawlingCompanyId, setCrawlingCompanyId] = useState<number | null>(null);
  const [crawlingAll, setCrawlingAll] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await jobsApi.listCompanies({ activeOnly: true });
      setCompanies(response.companies);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch companies';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const crawlCompany = useCallback(async (id: number): Promise<CrawlResponse> => {
    setCrawlingCompanyId(id);
    try {
      const response = await jobsApi.crawlCompany(id);
      // Refresh companies list after crawl
      await fetchCompanies();
      return response;
    } finally {
      setCrawlingCompanyId(null);
    }
  }, [fetchCompanies]);

  const crawlAll = useCallback(async (): Promise<CrawlResponse> => {
    setCrawlingAll(true);
    try {
      const response = await jobsApi.crawlAll();
      // Refresh companies list after crawl
      await fetchCompanies();
      return response;
    } finally {
      setCrawlingAll(false);
    }
  }, [fetchCompanies]);

  return {
    companies,
    loading,
    error,
    refresh: fetchCompanies,
    crawlCompany,
    crawlAll,
    crawlingCompanyId,
    crawlingAll,
  };
}
