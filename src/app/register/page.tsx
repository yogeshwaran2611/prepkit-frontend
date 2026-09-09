'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { Button, Card, Field, Input } from '@/components/ui';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 10) {
      setError('Use at least 10 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.register(email, password);
      router.replace('/kits');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Is the API running?');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div id="main">
        <h1 className="text-xl font-semibold tracking-tight text-fg">Create your account</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Ten characters or more for the password. There is no email verification — it is explicitly out of
          scope for this assessment.
        </p>
        <Card className="mt-6 p-5">
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
            <Field label="Password" hint="At least 10 characters." required>
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
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
              Create account
            </Button>
            <p className="text-center text-sm text-fg-muted">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-accent underline">
                Sign in
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
