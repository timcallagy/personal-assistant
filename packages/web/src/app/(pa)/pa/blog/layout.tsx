import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog Admin',
};

export default function BlogAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
