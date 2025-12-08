import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { blogApi } from '@/lib/blog-api';
import { Sidebar } from '@/components/public-blog/Sidebar';
import { MarkdownContent } from '@/components/public-blog/MarkdownContent';
import { ViewTracker } from '@/components/public-blog/ViewTracker';

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await blogApi.getPost(slug);
    return {
      title: post.title,
      description: post.metaDescription || post.excerpt || undefined,
      openGraph: {
        title: post.title,
        description: post.metaDescription || post.excerpt || undefined,
        images: post.featuredImage ? [post.featuredImage] : undefined,
      },
    };
  } catch {
    return { title: 'Post Not Found' };
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;

  let post;
  try {
    post = await blogApi.getPost(slug);
  } catch {
    notFound();
  }

  let categories: import('@/lib/blog-api').BlogCategory[] = [];
  let tags: import('@/lib/blog-api').TagWithCount[] = [];
  let popularPosts: { id: number; title: string; slug: string; featuredImage: string | null }[] = [];
  let config: import('@/lib/blog-api').BlogConfig | null = null;

  try {
    const [categoriesData, tagsData, popularData, configData] = await Promise.all([
      blogApi.getCategories(),
      blogApi.getTags(),
      blogApi.getPopularPosts(5),
      blogApi.getConfig(),
    ]);

    categories = categoriesData.categories;
    tags = tagsData.tags;
    popularPosts = popularData.posts;
    config = configData;
  } catch (e) {
    console.error('Failed to fetch sidebar data:', e);
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <ViewTracker slug={slug} />

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Main Content */}
        <article className="flex-1 max-w-none">
          {/* Featured Image */}
          {post.featuredImage && (
            <div className="relative aspect-video mb-8 overflow-hidden">
              <Image
                src={post.featuredImage}
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* Category */}
          <Link href={`/category/${post.category}`} className="cat-link">
            {post.categoryName}
          </Link>

          {/* Title */}
          <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold mt-4 mb-6">
            {post.title}
          </h1>

          {/* Meta */}
          <div className="entry-meta mb-8 pb-8 border-b border-blog-border">
            <span>By {post.author.name}</span>
            <span>{formatDate(post.publishedAt)}</span>
            <span>{post.readingTime} min read</span>
          </div>

          {/* Content */}
          <div className="blog-prose max-w-none">
            <MarkdownContent content={post.content} />
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-8 pt-8 border-t border-blog-border">
              <span className="text-blog-muted text-sm mr-2">Tags:</span>
              <div className="inline-flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/tag/${encodeURIComponent(tag)}`}
                    className="px-3 py-1 bg-blog-surface text-blog-secondary text-sm hover:bg-blog-accent hover:text-white transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Discuss on LinkedIn */}
          {config?.socialLinkedIn && (
            <div className="mt-8 p-6 bg-blog-surface border border-blog-border">
              <p className="text-blog-secondary mb-4">
                Have thoughts on this article? I&apos;d love to hear from you!
              </p>
              <a
                href={config.socialLinkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0077b5] text-white hover:bg-[#006097] transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
                Discuss on LinkedIn
              </a>
            </div>
          )}

          {/* Post Navigation */}
          <nav className="mt-12 pt-8 border-t border-blog-border">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              {post.previousPost ? (
                <Link
                  href={`/post/${post.previousPost.slug}`}
                  className="group flex-1"
                >
                  <span className="text-blog-muted text-sm">Previous</span>
                  <p className="text-blog-secondary group-hover:text-blog-accent transition-colors line-clamp-1">
                    {post.previousPost.title}
                  </p>
                </Link>
              ) : (
                <div className="flex-1" />
              )}
              {post.nextPost && (
                <Link
                  href={`/post/${post.nextPost.slug}`}
                  className="group flex-1 text-right"
                >
                  <span className="text-blog-muted text-sm">Next</span>
                  <p className="text-blog-secondary group-hover:text-blog-accent transition-colors line-clamp-1">
                    {post.nextPost.title}
                  </p>
                </Link>
              )}
            </div>
          </nav>

          {/* Related Posts */}
          {post.relatedPosts.length > 0 && (
            <div className="mt-12 pt-8 border-t border-blog-border">
              <h3 className="font-serif text-2xl font-bold mb-6">Related Posts</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {post.relatedPosts.map((related) => (
                  <Link
                    key={related.id}
                    href={`/post/${related.slug}`}
                    className="group"
                  >
                    {related.featuredImage && (
                      <div className="relative aspect-video mb-3 overflow-hidden">
                        <Image
                          src={related.featuredImage}
                          alt={related.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <p className="text-blog-secondary group-hover:text-blog-accent transition-colors line-clamp-2">
                      {related.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Sidebar */}
        <div className="lg:w-80 flex-shrink-0">
          <Sidebar
            categories={categories}
            tags={tags}
            popularPosts={popularPosts}
            config={config}
          />
        </div>
      </div>
    </div>
  );
}
