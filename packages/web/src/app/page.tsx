'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="text-foreground-secondary">Loading...</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-accent mb-4">
          PA - Personal Assistant
        </h1>
        <p className="text-foreground-secondary text-lg mb-8">
          Your unified memory and task layer
        </p>
        <Button
          variant="primary"
          size="lg"
          onClick={() => router.push('/login')}
        >
          Login
        </Button>
      </div>
    </main>
  );
}
