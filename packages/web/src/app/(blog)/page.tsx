import type { Metadata } from 'next';
import { blogApi } from '@/lib/blog-api';
import { PostCard } from '@/components/public-blog/PostCard';
import { Sidebar } from '@/components/public-blog/Sidebar';
import { Pagination } from '@/components/public-blog/Pagination';
import { FeaturedCarousel } from '@/components/public-blog/FeaturedCarousel';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const config = await blogApi.getConfig();
    return {
      title: 'Home',
      description: config.siteDescription || 'AI insights for professionals',
    };
  } catch {
    return {
      title: 'Home',
      description: 'AI insights for professionals',
    };
  }
}

interface HomePageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);

  // Fetch all data with error handling
  let posts: import('@/lib/blog-api').BlogPostSummary[] = [];
  let pagination = { page: 1, limit: 12, total: 0, totalPages: 0, hasMore: false };
  let categories: import('@/lib/blog-api').BlogCategory[] = [];
  let tags: import('@/lib/blog-api').TagWithCount[] = [];
  let popularPosts: { id: number; title: string; slug: string; featuredImage: string | null; publishedAt: string | null }[] = [];
  let config: import('@/lib/blog-api').BlogConfig | null = null;
  let featuredPosts: import('@/lib/blog-api').BlogPostSummary[] = [];

  try {
    const [postsData, categoriesData, tagsData, popularData, configData, featuredData] = await Promise.all([
      blogApi.getPosts({ page, limit: 12 }),
      blogApi.getCategories(),
      blogApi.getTags(),
      blogApi.getPopularPosts(5),
      blogApi.getConfig(),
      blogApi.getPosts({ limit: 10 }), // Get latest posts for carousel (fetch extra to filter out book reviews)
    ]);

    posts = postsData.posts;
    pagination = postsData.pagination;
    categories = categoriesData.categories;
    tags = tagsData.tags;
    popularPosts = popularData.posts;
    config = configData;
    // Exclude book reviews from carousel (their varied image sizes don't work well)
    featuredPosts = featuredData.posts
      .filter((p) => p.category !== 'book-reviews')
      .slice(0, 5);
  } catch (e) {
    console.error('Failed to fetch blog data:', e);
  }

  return (
    <>
      {/* Featured Carousel - Full Width */}
      {page === 1 && featuredPosts.length > 0 && (
        <FeaturedCarousel posts={featuredPosts} />
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Main Content */}
          <div className="flex-1">
            {/* Masonry Grid */}
            <div className="masonry">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>

            {posts.length === 0 && (
              <div className="text-center py-12 text-blog-muted">
                <p className="text-xl">No posts yet</p>
                <p className="mt-2">Check back soon for new content!</p>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                basePath="/"
              />
            )}
          </div>

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
    </>
  );
}
