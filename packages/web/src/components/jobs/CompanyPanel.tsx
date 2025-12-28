'use client';

import { RefObject } from 'react';
import { Company, CrawlLog } from '@/lib/api';
import { CompanyCard } from './CompanyCard';

interface CompanyPanelProps {
  companies: Company[];
  jobCounts: Map<number, number>;
  crawlLogs: Map<number, CrawlLog | null>;
  activeCompanyId: number | null;
  onCompanyClick: (companyId: number) => void;
  onRefresh: (companyId: number) => void;
  refreshingCompanyId: number | null;
  loading: boolean;
  panelRef?: RefObject<HTMLDivElement>;
}

export function CompanyPanel({
  companies,
  jobCounts,
  crawlLogs,
  activeCompanyId,
  onCompanyClick,
  onRefresh,
  refreshingCompanyId,
  loading,
  panelRef,
}: CompanyPanelProps) {
  return (
    <div className="h-full flex flex-col" data-testid="company-panel">
      {/* Header */}
      <div className="p-3 border-b border-background-tertiary">
        <h3 className="font-medium text-foreground">
          Companies ({companies.length})
        </h3>
      </div>

      {/* List */}
      <div ref={panelRef} className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-5 bg-background-tertiary rounded w-3/4 mb-2" />
                <div className="h-4 bg-background-tertiary rounded w-1/2 mb-1" />
                <div className="h-4 bg-background-tertiary rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="p-4 text-center text-foreground-muted">
            No companies tracked
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {companies.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                jobCount={jobCounts.get(company.id) || 0}
                lastCrawl={crawlLogs.get(company.id) || null}
                isActive={company.id === activeCompanyId}
                onClick={() => onCompanyClick(company.id)}
                onRefresh={() => onRefresh(company.id)}
                isRefreshing={company.id === refreshingCompanyId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
