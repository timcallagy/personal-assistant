'use client';

interface MatchScoreLevel {
  level: 'high' | 'medium' | 'low';
  color: string;
  bgColor: string;
  label: string;
}

export function getMatchScoreLevel(score: number): MatchScoreLevel {
  if (score >= 70) {
    return { level: 'high', color: 'text-success', bgColor: 'bg-success/20', label: 'High Match' };
  }
  if (score >= 40) {
    return { level: 'medium', color: 'text-warning', bgColor: 'bg-warning/20', label: 'Medium Match' };
  }
  return { level: 'low', color: 'text-error', bgColor: 'bg-error/20', label: 'Low Match' };
}

interface MatchScoreBadgeProps {
  score: number | null;
  size?: 'sm' | 'md';
}

export function MatchScoreBadge({ score, size = 'md' }: MatchScoreBadgeProps) {
  if (score === null) {
    return (
      <span
        className={`inline-flex items-center rounded-full font-medium text-foreground-muted bg-background-tertiary ${
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
        }`}
      >
        N/A
      </span>
    );
  }

  const { color, bgColor, label } = getMatchScoreLevel(score);

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${color} ${bgColor} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
      title={label}
      data-testid="match-score"
    >
      {score}%
    </span>
  );
}
