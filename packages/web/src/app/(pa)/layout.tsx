import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: {
    default: 'PA',
    template: '%s | PA',
  },
};

export default function PALayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <Providers>{children}</Providers>
    </div>
  );
}
