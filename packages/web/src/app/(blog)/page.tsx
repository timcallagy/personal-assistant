import type { Metadata } from 'next';
import { blogApi } from '@/lib/blog-api';
import { PostCard } from '@/components/public-blog/PostCard';
import { Sidebar } from '@/components/public-blog/Sidebar';
import { Pagination } from '@/components/public-blog/Pagination';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const config = await blogApi.getConfig();
    return {
      title: config.siteTitle,
      description: config.siteDescription || 'AI insights for professionals',
    };
  } catch {
    return {
      title: 'Tim Callagy',
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

  const [postsData, categoriesData, tagsData, popularData, config] = await Promise.all([
    blogApi.getPosts({ page, limit: 12 }),
    blogApi.getCategories(),
    blogApi.getTags(),
    blogApi.getPopularPosts(5),
    blogApi.getConfig(),
  ]);

  const { posts, pagination } = postsData;
  const { categories } = categoriesData;
  const { tags } = tagsData;
  const { posts: popularPosts } = popularData;

  return (
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
  );
}
