'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { Button, Card, Field, Input, PasswordInput, Logo, Orbs } from '@/components/ui';
import { LogIn, ArrowRight, ShieldCheck } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
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
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Email address" required>
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
            placeholder="you@company.com"
          />
        )}
      </Field>
      <Field label="Password" required>
        {({ id, describedBy }) => (
          <PasswordInput
            id={id}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={describedBy}
            placeholder="••••••••••••"
          />
        )}
      </Field>
      {error ? (
        <div role="alert" className="animate-fade-in rounded-lg border border-danger/30 bg-danger-muted p-3 text-sm text-danger flex items-start gap-2">
          <span>{error}</span>
        </div>
      ) : null}
      <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full font-semibold" icon={<LogIn className="h-4 w-4" />}>
        Sign in to PrepKit
      </Button>
      <div className="pt-2 text-center text-sm text-fg-muted">
        Don&apos;t have an account yet?{' '}
        <Link href="/register" className="inline-flex items-center gap-1 font-semibold text-accent hover:text-accent-2 transition underline underline-offset-4">
          Create one free <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <Orbs />
      <div id="main" className="animate-fade-up relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" />
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-fg">Welcome back</h1>
          <p className="mt-2 text-sm text-fg-muted flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <span>Sign in to access your interview preparation kits</span>
          </p>
        </div>
        <Card className="p-7 sm:p-8 backdrop-blur-sm border-border bg-surface/90 shadow-lg">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}

