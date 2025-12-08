import type { Metadata } from 'next';
import { blogApi } from '@/lib/api';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const config = await blogApi.getConfig();
    return {
      title: {
        default: config.siteTitle,
        template: `%s | ${config.siteTitle}`,
      },
      description: config.siteDescription || 'AI insights for professionals',
    };
  } catch {
    return {
      title: 'Tim Callagy',
      description: 'AI insights for professionals',
    };
  }
}

export default async function RootLayout({
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
    console.error('Failed to fetch config:', e);
  }

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Header
          siteTitle={config?.siteTitle || 'Tim Callagy'}
          categories={categories}
          socialLinkedIn={config?.socialLinkedIn || null}
          socialGitHub={config?.socialGitHub || null}
        />
        <main className="flex-1">{children}</main>
        <Footer siteTitle={config?.siteTitle || 'Tim Callagy'} />
      </body>
    </html>
  );
}
