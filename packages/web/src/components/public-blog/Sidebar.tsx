import Link from 'next/link';
import { NewsletterForm } from './NewsletterForm';
import type { BlogCategory, TagWithCount, BlogConfig } from '@/lib/blog-api';

interface SidebarProps {
  categories: BlogCategory[];
  tags: TagWithCount[];
  popularPosts: { id: number; title: string; slug: string; featuredImage: string | null }[];
  config: BlogConfig | null;
}

export function Sidebar({ categories, tags, popularPosts, config }: SidebarProps) {
  return (
    <aside className="space-y-0">
      {/* About Widget */}
      <div className="widget">
        <h3 className="widget-title">About</h3>
        <p className="text-blog-secondary text-sm leading-relaxed">
          {config?.siteDescription || 'Exploring the intersection of AI and practical business applications. Sharing insights on leveraging artificial intelligence for learning, coding, marketing, and innovation.'}
        </p>
      </div>

      {/* Promo Banner */}
      {config?.showPromoBanner && config.promoBannerImage && (
        <div className="widget">
          {config.promoBannerLink ? (
            <a href={config.promoBannerLink} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={config.promoBannerImage}
                alt={config.promoBannerAlt || 'Promotion'}
                className="w-full"
              />
            </a>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={config.promoBannerImage}
              alt={config.promoBannerAlt || 'Promotion'}
              className="w-full"
            />
          )}
        </div>
      )}

      {/* Newsletter Widget */}
      <div className="widget">
        <h3 className="widget-title">Newsletter</h3>
        <p className="text-blog-secondary text-sm mb-4">
          Get the latest AI insights delivered to your inbox.
        </p>
        <NewsletterForm />
      </div>

      {/* Categories Widget */}
      <div className="widget">
        <h3 className="widget-title">Categories</h3>
        <ul className="space-y-2">
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link
                href={`/category/${cat.slug}`}
                className="flex justify-between items-center text-blog-secondary hover:text-blog-accent transition-colors"
              >
                <span>{cat.name}</span>
                <span className="text-blog-muted text-sm">({cat.postCount})</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Popular Posts Widget */}
      {popularPosts.length > 0 && (
        <div className="widget">
          <h3 className="widget-title">Popular Posts</h3>
          <ul className="space-y-3">
            {popularPosts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/post/${post.slug}`}
                  className="text-blog-secondary hover:text-blog-accent transition-colors text-sm"
                >
                  {post.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tags Widget */}
      {tags.length > 0 && (
        <div className="widget">
          <h3 className="widget-title">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 15).map((tag) => (
              <Link
                key={tag.name}
                href={`/tag/${encodeURIComponent(tag.name)}`}
                className="px-3 py-1 bg-blog-surface text-blog-secondary text-sm hover:bg-blog-accent hover:text-white transition-colors"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
