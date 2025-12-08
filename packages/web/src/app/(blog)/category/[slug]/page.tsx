import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { blogApi } from '@/lib/blog-api';
import { PostCard } from '@/components/public-blog/PostCard';
import { Sidebar } from '@/components/public-blog/Sidebar';
import { Pagination } from '@/components/public-blog/Pagination';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { categories } = await blogApi.getCategories();
  const category = categories.find((c) => c.slug === slug);

  if (!category) {
    return { title: 'Category Not Found' };
  }

  return {
    title: category.name,
    description: category.description || `Browse posts in ${category.name}`,
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = parseInt(sp.page || '1', 10);

  const { categories } = await blogApi.getCategories();
  const category = categories.find((c) => c.slug === slug);

  if (!category) {
    notFound();
  }

  const [postsData, tagsData, popularData, config] = await Promise.all([
    blogApi.getPosts({ page, limit: 12, category: slug }),
    blogApi.getTags(),
    blogApi.getPopularPosts(5),
    blogApi.getConfig(),
  ]);

  const { posts, pagination } = postsData;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Category Header */}
      <div className="mb-12 text-center">
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4">{category.name}</h1>
        {category.description && (
          <p className="text-blog-secondary max-w-2xl mx-auto">{category.description}</p>
        )}
        <p className="text-blog-muted mt-2">{category.postCount} post{category.postCount !== 1 ? 's' : ''}</p>
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
              <p className="text-xl">No posts in this category yet</p>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              basePath={`/category/${slug}`}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:w-80 flex-shrink-0">
          <Sidebar
            categories={categories}
            tags={tagsData.tags}
            popularPosts={popularData.posts}
            config={config}
          />
        </div>
      </div>
    </div>
  );
}
