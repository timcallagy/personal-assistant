import type { Metadata } from 'next';
import { blogApi } from '@/lib/blog-api';
import { PostCard } from '@/components/public-blog/PostCard';
import { Sidebar } from '@/components/public-blog/Sidebar';
import { Pagination } from '@/components/public-blog/Pagination';

interface TagPageProps {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);

  return {
    title: `Posts tagged "${decodedTag}"`,
    description: `Browse all posts tagged with ${decodedTag}`,
  };
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { tag } = await params;
  const sp = await searchParams;
  const page = parseInt(sp.page || '1', 10);
  const decodedTag = decodeURIComponent(tag);

  const [postsData, categoriesData, tagsData, popularData, config] = await Promise.all([
    blogApi.getPosts({ page, limit: 12, tag: decodedTag }),
    blogApi.getCategories(),
    blogApi.getTags(),
    blogApi.getPopularPosts(5),
    blogApi.getConfig(),
  ]);

  const { posts, pagination } = postsData;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Tag Header */}
      <div className="mb-12 text-center">
        <p className="text-blog-muted text-sm uppercase tracking-wider mb-2">Posts tagged</p>
        <h1 className="font-serif text-3xl md:text-4xl font-bold">{decodedTag}</h1>
        <p className="text-blog-muted mt-2">{pagination.total} post{pagination.total !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Main Content */}
        <div className="flex-1">
          <div className="masonry">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {posts.length === 0 && (
            <div className="text-center py-12 text-blog-muted">
              <p className="text-xl">No posts with this tag yet</p>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              basePath={`/tag/${encodeURIComponent(decodedTag)}`}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:w-80 flex-shrink-0">
          <Sidebar
            categories={categoriesData.categories}
            tags={tagsData.tags}
            popularPosts={popularData.posts}
            config={config}
          />
        </div>
      </div>
    </div>
  );
}
