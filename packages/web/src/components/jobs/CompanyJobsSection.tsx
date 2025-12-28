'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Company, JobListing, CrawlLog } from '@/lib/api';
import { CompanyPanel } from './CompanyPanel';
import { JobsPanel } from './JobsPanel';

interface JobsByCompany {
  company: Company;
  jobs: JobListing[];
}

interface CompanyJobsSectionProps {
  companies: Company[];
  jobsByCompany: JobsByCompany[];
  crawlLogs: CrawlLog[];
  loading: boolean;
  onCompanyClick: (companyId: number) => void;
  onCompanyRefresh: (companyId: number) => void;
  refreshingCompanyId: number | null;
  onMarkApplied: (id: number) => void;
  onMarkNotInterested: (job: JobListing) => void;
  newJobIds?: Set<number>;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
}

export function CompanyJobsSection({
  companies,
  jobsByCompany,
  crawlLogs,
  loading,
  onCompanyClick,
  onCompanyRefresh,
  refreshingCompanyId,
  onMarkApplied,
  onMarkNotInterested,
  newJobIds,
  hasMore,
  onLoadMore,
  loadingMore,
}: CompanyJobsSectionProps) {
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(null);
  const companiesPanelRef = useRef<HTMLDivElement>(null);
  const jobsPanelRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  // Create job counts map
  const jobCounts = new Map<number, number>();
  jobsByCompany.forEach(({ company, jobs }) => {
    jobCounts.set(company.id, jobs.length);
  });

  // Create crawl logs map
  const crawlLogsMap = new Map<number, CrawlLog | null>();
  companies.forEach((company) => {
    const log = crawlLogs.find((l) => l.companyId === company.id) || null;
    crawlLogsMap.set(company.id, log);
  });

  // Handle click on company - scroll to its jobs
  const handleCompanyClick = useCallback((companyId: number) => {
    setActiveCompanyId(companyId);
    onCompanyClick(companyId);

    // Scroll jobs panel to company section
    const element = document.getElementById(`company-jobs-${companyId}`);
    if (element && jobsPanelRef.current) {
      isScrollingRef.current = true;
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Reset scrolling flag after animation
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 500);
    }
  }, [onCompanyClick]);

  // Synchronized scrolling - detect which company is visible in jobs panel
  const handleJobsPanelScroll = useCallback(() => {
    if (isScrollingRef.current || !jobsPanelRef.current) return;

    const panelRect = jobsPanelRef.current.getBoundingClientRect();
    const panelTop = panelRect.top;

    // Find the company header that is closest to the top of the panel
    let closestCompanyId: number | null = null;
    let closestDistance = Infinity;

    companies.forEach((company) => {
      const header = document.getElementById(`company-jobs-${company.id}`);
      if (header) {
        const headerRect = header.getBoundingClientRect();
        const distance = Math.abs(headerRect.top - panelTop);
        if (distance < closestDistance && headerRect.top <= panelTop + 100) {
          closestDistance = distance;
          closestCompanyId = company.id;
        }
      }
    });

    if (closestCompanyId && closestCompanyId !== activeCompanyId) {
      setActiveCompanyId(closestCompanyId);

      // Scroll company into view in left panel
      const companyCard = document.getElementById(`company-${closestCompanyId}`);
      if (companyCard && companiesPanelRef.current) {
        const panelRect = companiesPanelRef.current.getBoundingClientRect();
        const cardRect = companyCard.getBoundingClientRect();

        // Only scroll if card is outside visible area
        if (cardRect.top < panelRect.top || cardRect.bottom > panelRect.bottom) {
          companyCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  }, [companies, activeCompanyId]);

  // Set initial active company
  useEffect(() => {
    const firstCompany = companies[0];
    if (companies.length > 0 && !activeCompanyId && firstCompany) {
      setActiveCompanyId(firstCompany.id);
    }
  }, [companies, activeCompanyId]);

  return (
    <section data-testid="company-jobs-section">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          Companies & Jobs
        </h2>
      </div>

      <div className="flex h-[600px] border border-background-tertiary rounded-lg overflow-hidden">
        {/* Left Panel - Companies */}
        <div className="w-80 border-r border-background-tertiary flex-shrink-0 hidden md:block">
          <CompanyPanel
            companies={companies}
            jobCounts={jobCounts}
            crawlLogs={crawlLogsMap}
            activeCompanyId={activeCompanyId}
            onCompanyClick={handleCompanyClick}
            onRefresh={onCompanyRefresh}
            refreshingCompanyId={refreshingCompanyId}
            loading={loading}
            panelRef={companiesPanelRef}
          />
        </div>

        {/* Right Panel - Jobs */}
        <div className="flex-1 bg-background">
          <JobsPanel
            jobsByCompany={jobsByCompany}
            onMarkApplied={onMarkApplied}
            onMarkNotInterested={onMarkNotInterested}
            newJobIds={newJobIds}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={onLoadMore}
            loadingMore={loadingMore}
            panelRef={jobsPanelRef}
            onScroll={handleJobsPanelScroll}
          />
        </div>
      </div>

      {/* Mobile: Company selector */}
      <div className="md:hidden mt-4">
        <select
          value={activeCompanyId || ''}
          onChange={(e) => handleCompanyClick(Number(e.target.value))}
          className="w-full px-3 py-2 bg-background border border-background-tertiary rounded-md text-foreground"
        >
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name} ({jobCounts.get(company.id) || 0} jobs)
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
