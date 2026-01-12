import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KPI Driver Tree | Professional Services Margin Analysis',
  description: 'Interactive visualization of gross margin drivers for professional services firms. Explore how operational metrics cascade to affect overall profitability.',
};

export default function KpiDriverTreeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      {children}
    </div>
  );
}
