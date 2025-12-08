'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Input, Select, MultiSelect, Textarea } from '@/components/ui';
import { BlogPost, BlogCategory, PostStatus } from '@/lib/api';

interface BlogPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post?: BlogPost | null;
  categories: BlogCategory[];
  onSave: (data: {
    title: string;
    content: string;
    category: string;
    excerpt?: string;
    featuredImage?: string;
    metaDescription?: string;
    tags?: string[];
    status?: PostStatus;
    publishAt?: string;
  }) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

const statusOptions = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'SCHEDULED', label: 'Scheduled' },
];

export function BlogPostModal({
  isOpen,
  onClose,
  post,
  categories,
  onSave,
  onDelete,
}: BlogPostModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState<PostStatus>('DRAFT');
  const [publishAt, setPublishAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!post;

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setContent(post.content);
      setCategory(post.category);
      setExcerpt(post.excerpt || '');
      setFeaturedImage(post.featuredImage || '');
      setMetaDescription(post.metaDescription || '');
      setTags(post.tags || []);
      setStatus(post.status);
      setPublishAt(post.publishAt ? new Date(post.publishAt).toISOString().slice(0, 16) : '');
    } else {
      setTitle('');
      setContent('');
      setCategory('');
      setExcerpt('');
      setFeaturedImage('');
      setMetaDescription('');
      setTags([]);
      setStatus('DRAFT');
      setPublishAt('');
    }
    setError('');
  }, [post, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!content.trim()) {
      setError('Content is required');
      return;
    }
    if (!category.trim()) {
      setError('Category is required');
      return;
    }
    if (status === 'SCHEDULED' && !publishAt) {
      setError('Publish date is required for scheduled posts');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        title: title.trim(),
        content: content.trim(),
        category: category.trim(),
        excerpt: excerpt.trim() || undefined,
        featuredImage: featuredImage.trim() || undefined,
        metaDescription: metaDescription.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        status,
        publishAt: status === 'SCHEDULED' && publishAt ? new Date(publishAt).toISOString() : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save post');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!post || !onDelete) return;

    if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return;

    setLoading(true);
    try {
      await onDelete(post.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete post');
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = categories.map((c) => ({ value: c.slug, label: c.name }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Post' : 'New Post'}
      size="lg"
      footer={
        <>
          {isEditing && onDelete && (
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={loading}
              className="mr-auto"
            >
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            {isEditing ? 'Save Changes' : 'Create Post'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter post title..."
          error={!title.trim() && error.includes('Title') ? 'Required' : undefined}
        />

        <Select
          label="Category"
          value={category}
          options={categoryOptions}
          onChange={setCategory}
          placeholder="Select category..."
          error={!category.trim() && error.includes('Category') ? 'Required' : undefined}
        />

        <Textarea
          label="Content (Markdown)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your post content in Markdown..."
          rows={12}
          error={!content.trim() && error.includes('Content') ? 'Required' : undefined}
        />

        <Textarea
          label="Excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Brief summary (max 300 characters)..."
          rows={2}
          helperText={`${excerpt.length}/300 characters`}
        />

        <Input
          label="Featured Image URL"
          value={featuredImage}
          onChange={(e) => setFeaturedImage(e.target.value)}
          placeholder="https://..."
        />

        <Input
          label="Meta Description (SEO)"
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          placeholder="SEO description (max 160 characters)..."
          helperText={`${metaDescription.length}/160 characters`}
        />

        <MultiSelect
          label="Tags"
          values={tags}
          options={[]}
          onChange={setTags}
          placeholder="Add tags..."
          allowCreate
          onCreateOption={(tag) => setTags([...tags, tag])}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Status"
            value={status}
            options={statusOptions}
            onChange={(val) => setStatus(val as PostStatus)}
          />
          {status === 'SCHEDULED' && (
            <Input
              label="Publish At"
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
              error={status === 'SCHEDULED' && !publishAt && error.includes('Publish') ? 'Required' : undefined}
            />
          )}
        </div>

        {isEditing && post && (
          <div className="p-3 bg-background rounded-md border border-background-tertiary text-sm">
            <div className="grid grid-cols-2 gap-2 text-foreground-muted">
              <span>Slug: <span className="text-foreground">{post.slug}</span></span>
              <span>Views: <span className="text-foreground">{post.viewCount}</span></span>
              <span>Created: <span className="text-foreground">{new Date(post.createdAt).toLocaleDateString()}</span></span>
              <span>Updated: <span className="text-foreground">{new Date(post.updatedAt).toLocaleDateString()}</span></span>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-error">{error}</p>}
      </form>
    </Modal>
  );
}
