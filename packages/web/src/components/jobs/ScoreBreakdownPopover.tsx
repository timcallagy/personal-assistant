'use client';

import { useState, useRef, useEffect } from 'react';
import { jobs as jobsApi, ScoreBreakdown } from '@/lib/api';
import { MatchScoreBadge } from './MatchScoreBadge';

interface ScoreBreakdownPopoverProps {
  jobId: number;
  score: number | null;
  size?: 'sm' | 'md';
}

export function ScoreBreakdownPopover({ jobId, score, size = 'md' }: ScoreBreakdownPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleToggle = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);

    // Fetch breakdown if not already loaded
    if (!breakdown && !loading) {
      setLoading(true);
      setError(null);
      try {
        const response = await jobsApi.getScoreBreakdown(jobId);
        setBreakdown(response.breakdown);
      } catch (err) {
        setError('Failed to load breakdown');
        console.error('Failed to load score breakdown:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="relative inline-flex items-center gap-1">
      <MatchScoreBadge score={score} size={size} />
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={`inline-flex items-center justify-center rounded-full text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors ${
          size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
        }`}
        title="View score breakdown"
        aria-label="View score breakdown"
      >
        <svg className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute left-0 top-full mt-2 z-50 w-80 bg-background border border-background-tertiary rounded-lg shadow-lg"
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Score Breakdown</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-foreground-muted hover:text-foreground"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loading && (
              <div className="py-4 text-center text-foreground-muted text-sm">
                Loading...
              </div>
            )}

            {error && (
              <div className="py-4 text-center text-error text-sm">
                {error}
              </div>
            )}

            {breakdown && !loading && (
              <div className="space-y-3">
                {breakdown.categories.map((category, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{category.name}</span>
                      <span className={`font-medium ${
                        category.percentage >= 70 ? 'text-success' :
                        category.percentage >= 40 ? 'text-warning' : 'text-error'
                      }`}>
                        {category.percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-background-tertiary rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          category.percentage >= 70 ? 'bg-success' :
                          category.percentage >= 40 ? 'bg-warning' : 'bg-error'
                        }`}
                        style={{ width: `${category.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-foreground-muted">
                      {category.details}
                    </p>
                  </div>
                ))}

                <div className="pt-2 mt-2 border-t border-background-tertiary">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="text-foreground">Total Score</span>
                    <span className={`${
                      breakdown.totalScore >= 70 ? 'text-success' :
                      breakdown.totalScore >= 40 ? 'text-warning' : 'text-error'
                    }`}>
                      {breakdown.totalScore}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
