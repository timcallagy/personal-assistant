import Link from 'next/link';
import Image from 'next/image';
import type { BlogPostSummary } from '@/lib/blog-api';

interface PostCardProps {
  post: BlogPostSummary;
}

export function PostCard({ post }: PostCardProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <article className="post-card masonry-item">
      {/* Featured Image */}
      {post.featuredImage && (
        <Link
          href={`/post/${post.slug}`}
          className={`block relative overflow-hidden ${
            post.category === 'book-reviews'
              ? 'aspect-[3/4] bg-gray-100'
              : 'aspect-video'
          }`}
        >
          <Image
            src={post.featuredImage}
            alt={post.title}
            fill
            className={`transition-transform duration-300 ${
              post.category === 'book-reviews'
                ? 'object-contain hover:scale-105'
                : 'object-cover hover:scale-105'
            }`}
          />
        </Link>
      )}

      <div className="p-6">
        {/* Category */}
        <Link href={`/category/${post.category}`} className="cat-link">
          {post.categoryName}
        </Link>

        {/* Title */}
        <h2 className="font-serif text-xl md:text-2xl font-bold mt-2 mb-3">
          <Link href={`/post/${post.slug}`} className="text-blog-primary hover:text-blog-accent transition-colors">
            {post.title}
          </Link>
        </h2>

        {/* Meta */}
        <div className="entry-meta mb-4">
          <span>{formatDate(post.publishedAt)}</span>
          <span>{post.readingTime} min read</span>
        </div>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-blog-secondary mb-4 line-clamp-3">{post.excerpt}</p>
        )}

        {/* Read More */}
        <Link href={`/post/${post.slug}`} className="read-more">
          Continue reading
        </Link>
      </div>
    </article>
  );
}
