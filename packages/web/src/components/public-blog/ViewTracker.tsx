'use client';

import { useEffect } from 'react';
import { blogApi } from '@/lib/blog-api';

interface ViewTrackerProps {
  slug: string;
}

export function ViewTracker({ slug }: ViewTrackerProps) {
  useEffect(() => {
    // Record view after a short delay to avoid counting bounces
    const timer = setTimeout(() => {
      blogApi.recordView(slug).catch(console.error);
    }, 3000);

    return () => clearTimeout(timer);
  }, [slug]);

  return null;
}
