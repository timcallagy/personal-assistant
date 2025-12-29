import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Job Preferences',
};

export default function JobPreferencesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
