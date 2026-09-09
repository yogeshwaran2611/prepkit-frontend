'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { Button, Card, Field, Input } from '@/components/ui';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // An expired session sends the user here with ?next=, so they land back where they were.
  const next = params.get('next') ?? '/kits';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(email, password);
      router.replace(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Is the API running?');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Email" required>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby={describedBy}
            aria-invalid={invalid}
          />
        )}
      </Field>
      <Field label="Password" required>
        {({ id, describedBy }) => (
          <Input
            id={id}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={describedBy}
          />
        )}
      </Field>
      {error ? (
        <p role="alert" className="rounded border border-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="primary" loading={busy} className="w-full">
        Sign in
      </Button>
      <p className="text-center text-sm text-fg-muted">
        No account yet?{' '}
        <Link href="/register" className="font-medium text-accent underline">
          Create one
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div id="main">
        <h1 className="text-xl font-semibold tracking-tight text-fg">Sign in to Prep Kit</h1>
        <p className="mt-1 text-sm text-fg-muted">Your kits are private to your account.</p>
        <Card className="mt-6 p-5">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}
