'use client';

import { BlogPostSummary } from '@/lib/api';
import { Badge } from '@/components/ui';

interface BlogPostCardProps {
  post: BlogPostSummary;
  onClick: (post: BlogPostSummary) => void;
  onPublish?: (post: BlogPostSummary) => void;
  onUnpublish?: (post: BlogPostSummary) => void;
}

const statusColors: Record<string, 'success' | 'warning' | 'default'> = {
  PUBLISHED: 'success',
  SCHEDULED: 'warning',
  DRAFT: 'default',
};

const statusLabels: Record<string, string> = {
  PUBLISHED: 'Published',
  SCHEDULED: 'Scheduled',
  DRAFT: 'Draft',
};

export function BlogPostCard({ post, onClick, onPublish, onUnpublish }: BlogPostCardProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleQuickAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (post.status === 'PUBLISHED' && onUnpublish) {
      onUnpublish(post);
    } else if (post.status !== 'PUBLISHED' && onPublish) {
      onPublish(post);
    }
  };

  return (
    <div
      onClick={() => onClick(post)}
      className="p-4 bg-background-secondary border border-background-tertiary rounded-md hover:border-accent/50 cursor-pointer transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">{post.title}</h3>
          <p className="text-sm text-foreground-muted mt-1">
            {post.category} &bull; {formatDate(post.publishedAt || post.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={statusColors[post.status] || 'default'}>
            {statusLabels[post.status] || post.status}
          </Badge>
          {post.status !== 'SCHEDULED' && (
            <button
              onClick={handleQuickAction}
              className="text-xs px-2 py-1 rounded bg-background-tertiary hover:bg-accent/20 text-foreground-secondary hover:text-accent transition-colors"
            >
              {post.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
