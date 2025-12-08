'use client';

import { useState } from 'react';
import { Layout } from '@/components/layout';
import { Button, Select } from '@/components/ui';
import { BlogPostList, BlogPostModal } from '@/components/blog';
import { useBlogPosts, useBlogCategories } from '@/hooks';
import { BlogPost, BlogPostSummary, PostStatus } from '@/lib/api';

export default function BlogAdminPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [loadingPost, setLoadingPost] = useState(false);

  const {
    posts,
    pagination,
    loading,
    error,
    filters,
    setFilters,
    createPost,
    updatePost,
    deletePost,
    publishPost,
    unpublishPost,
    getPost,
  } = useBlogPosts();

  const { categories } = useBlogCategories();

  const handleNewPost = () => {
    setSelectedPost(null);
    setIsModalOpen(true);
  };

  const handlePostClick = async (post: BlogPostSummary) => {
    setLoadingPost(true);
    try {
      const fullPost = await getPost(post.id);
      setSelectedPost(fullPost);
      setIsModalOpen(true);
    } catch (err) {
      console.error('Failed to load post:', err);
    } finally {
      setLoadingPost(false);
    }
  };

  const handleSave = async (data: {
    title: string;
    content: string;
    category: string;
    excerpt?: string;
    featuredImage?: string;
    metaDescription?: string;
    tags?: string[];
    status?: PostStatus;
    publishAt?: string;
  }) => {
    if (selectedPost) {
      await updatePost(selectedPost.id, data);
    } else {
      await createPost(data);
    }
  };

  const handlePublish = async (post: BlogPostSummary) => {
    try {
      await publishPost(post.id);
    } catch (err) {
      console.error('Failed to publish:', err);
    }
  };

  const handleUnpublish = async (post: BlogPostSummary) => {
    try {
      await unpublishPost(post.id);
    } catch (err) {
      console.error('Failed to unpublish:', err);
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PUBLISHED', label: 'Published' },
    { value: 'SCHEDULED', label: 'Scheduled' },
  ];

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Blog Posts</h1>
            <p className="text-foreground-muted text-sm mt-1">
              {pagination.total} post{pagination.total !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={handleNewPost} disabled={loadingPost}>
            + New Post
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="w-48">
            <Select
              value={filters.status || 'all'}
              options={statusOptions}
              onChange={(value) =>
                setFilters({ ...filters, status: value as PostStatus | 'all', page: 1 })
              }
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-error/10 border border-error/20 rounded-md mb-6">
            <p className="text-error">{error}</p>
          </div>
        )}

        {/* Post List */}
        <BlogPostList
          posts={posts}
          loading={loading || loadingPost}
          onPostClick={handlePostClick}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
        />

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
              disabled={!filters.page || filters.page <= 1}
            >
              Previous
            </Button>
            <span className="text-foreground-muted text-sm">
              Page {filters.page || 1} of {pagination.totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
              disabled={!pagination.hasMore}
            >
              Next
            </Button>
          </div>
        )}

        {/* Modal */}
        <BlogPostModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedPost(null);
          }}
          post={selectedPost}
          categories={categories}
          onSave={handleSave}
          onDelete={deletePost}
        />
      </div>
    </Layout>
  );
}
