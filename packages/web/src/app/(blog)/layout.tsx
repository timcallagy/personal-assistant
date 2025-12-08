import { blogApi } from '@/lib/blog-api';
import { Header } from '@/components/public-blog/Header';
import { Footer } from '@/components/public-blog/Footer';

export default async function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let config = null;
  let categories: { name: string; slug: string }[] = [];

  try {
    config = await blogApi.getConfig();
    const catResponse = await blogApi.getCategories();
    categories = catResponse.categories.map((c) => ({ name: c.name, slug: c.slug }));
  } catch (e) {
    console.error('Failed to fetch blog config:', e);
  }

  return (
    <div className="min-h-screen flex flex-col bg-blog-background text-blog-primary font-sans">
      <Header
        siteTitle="Better Faster"
        categories={categories}
        socialLinkedIn={config?.socialLinkedIn || null}
        socialGitHub={config?.socialGitHub || null}
      />
      <main className="flex-1">{children}</main>
      <Footer siteTitle={config?.siteTitle || 'Tim Callagy'} />
    </div>
  );
}
