import { HTMLAttributes, forwardRef } from 'react';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'accent'
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-background-tertiary text-foreground-secondary',
  success: 'bg-success/20 text-success',
  warning: 'bg-warning/20 text-warning',
  error: 'bg-error/20 text-error',
  accent: 'bg-accent/20 text-accent',
  critical: 'bg-priority-critical/20 text-priority-critical',
  high: 'bg-priority-high/20 text-priority-high',
  medium: 'bg-priority-medium/20 text-priority-medium',
  low: 'bg-priority-low/20 text-priority-low',
};

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-sm',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', size = 'sm', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center rounded-md font-medium
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// Priority badge helper
export function getPriorityBadgeVariant(score: number): BadgeVariant {
  if (score >= 20) return 'critical';
  if (score >= 15) return 'high';
  if (score >= 10) return 'medium';
  return 'low';
}

interface PriorityBadgeProps extends Omit<BadgeProps, 'variant'> {
  score: number;
}

export const PriorityBadge = forwardRef<HTMLSpanElement, PriorityBadgeProps>(
  ({ score, children, ...props }, ref) => {
    const variant = getPriorityBadgeVariant(score);
    const label = score >= 20 ? 'Critical' : score >= 15 ? 'High' : score >= 10 ? 'Medium' : 'Low';

    return (
      <Badge ref={ref} variant={variant} {...props}>
        {children || `${label} (${score})`}
      </Badge>
    );
  }
);

PriorityBadge.displayName = 'PriorityBadge';
