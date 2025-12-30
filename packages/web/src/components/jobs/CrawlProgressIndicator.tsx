'use client';

interface CrawlProgressIndicatorProps {
  isRunning: boolean;
  message?: string;
  phase?: 'idle' | 'api' | 'browser';
  current?: number;
  total?: number;
  currentCompany?: string;
}

export function CrawlProgressIndicator({
  isRunning,
  message,
  phase,
  current,
  total,
  currentCompany,
}: CrawlProgressIndicatorProps) {
  if (!isRunning) {
    return null;
  }

  // Generate progress message based on phase
  let progressMessage = message || 'Crawling jobs...';
  if (phase === 'api') {
    progressMessage = 'Phase 1: Crawling API-based companies (Greenhouse, Lever, Ashby)...';
  } else if (phase === 'browser' && current && total) {
    progressMessage = `Phase 2: Crawling browser-based companies (${current}/${total})`;
    if (currentCompany) {
      progressMessage += ` - ${currentCompany}`;
    }
  }

  const showProgressBar = phase === 'browser' && total && total > 0;
  const progressPercent = showProgressBar ? Math.round(((current || 0) / total) * 100) : 0;

  return (
    <div
      className="p-3 bg-background-secondary rounded-md space-y-2"
      data-testid="crawl-progress"
    >
      <div className="flex items-center gap-2">
        <svg
          className="h-5 w-5 animate-spin text-accent flex-shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm text-foreground-secondary">
          {progressMessage}
        </span>
      </div>

      {showProgressBar && (
        <div className="w-full bg-background-tertiary rounded-full h-2">
          <div
            className="bg-accent h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}
