'use client';

import { BlogPostSummary } from '@/lib/api';
import { BlogPostCard } from './BlogPostCard';

interface BlogPostListProps {
  posts: BlogPostSummary[];
  loading: boolean;
  onPostClick: (post: BlogPostSummary) => void;
  onPublish?: (post: BlogPostSummary) => void;
  onUnpublish?: (post: BlogPostSummary) => void;
}

export function BlogPostList({
  posts,
  loading,
  onPostClick,
  onPublish,
  onUnpublish,
}: BlogPostListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 bg-background-secondary border border-background-tertiary rounded-md animate-pulse"
          >
            <div className="h-5 bg-background-tertiary rounded w-3/4 mb-2" />
            <div className="h-4 bg-background-tertiary rounded w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-foreground-muted">
        <p>No posts found</p>
        <p className="text-sm mt-1">Create your first blog post to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <BlogPostCard
          key={post.id}
          post={post}
          onClick={onPostClick}
          onPublish={onPublish}
          onUnpublish={onUnpublish}
        />
      ))}
    </div>
  );
}
