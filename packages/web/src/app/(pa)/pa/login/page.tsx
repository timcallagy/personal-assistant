'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!username.trim() || !password.trim()) {
      setLocalError('Username and password are required');
      return;
    }

    try {
      await login(username, password);
      router.push('/pa/dashboard');
    } catch {
      // Error is handled by AuthContext
    }
  };

  const displayError = localError || error;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-accent mb-2">PA</h1>
          <p className="text-foreground-secondary">Personal Assistant</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={loading}
                autoComplete="username"
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
              />

              {displayError && (
                <p className="text-sm text-error">{displayError}</p>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-foreground-muted text-sm mt-4">
          Your unified memory and task layer
        </p>
      </div>
    </main>
  );
}
