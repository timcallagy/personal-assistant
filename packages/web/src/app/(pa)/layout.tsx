import { Providers } from '@/components/Providers';

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
