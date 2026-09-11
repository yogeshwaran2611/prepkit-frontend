'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { Button, Card, Field, Input, PasswordInput, Logo, Orbs } from '@/components/ui';
import { UserPlus, ArrowRight, CheckCircle2, Shield, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Real-time strength and match checks
  const isLengthValid = password.length >= 10;
  const isMatch = password.length > 0 && password === confirmPassword;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 10) {
      setError('Password must be at least 10 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your confirm password.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await api.register(email, password);
      router.replace('/kits');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <Orbs />
      <div id="main" className="animate-fade-up relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" />
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-fg">Create your account</h1>
          <p className="mt-2 text-sm text-fg-muted flex items-center justify-center gap-1.5">
            <Shield className="h-4 w-4 text-accent" />
            <span>Private interview prep kits tailored to your target companies</span>
          </p>
        </div>
        <Card className="p-7 sm:p-8 backdrop-blur-sm border-border bg-surface/90 shadow-lg">
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

            <Field label="Create password" hint="Minimum 10 characters." required>
              {({ id, describedBy }) => (
                <PasswordInput
                  id={id}
                  autoComplete="new-password"
                  required
                  minLength={10}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby={describedBy}
                  placeholder="At least 10 characters"
                />
              )}
            </Field>

            <Field label="Confirm password" required>
              {({ id, describedBy }) => (
                <PasswordInput
                  id={id}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  aria-describedby={describedBy}
                  placeholder="Re-enter your password"
                />
              )}
            </Field>

            {/* Visual Password validation checks */}
            {password.length > 0 && (
              <div className="rounded-lg border border-border bg-surface-muted/60 p-3 text-xs space-y-1.5 animate-fade-in">
                <div className="flex items-center gap-2">
                  {isLengthValid ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-fg-subtle shrink-0" />
                  )}
                  <span className={isLengthValid ? 'text-success font-medium' : 'text-fg-subtle'}>
                    At least 10 characters ({password.length}/10)
                  </span>
                </div>
                {confirmPassword.length > 0 && (
                  <div className="flex items-center gap-2">
                    {isMatch ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-danger shrink-0" />
                    )}
                    <span className={isMatch ? 'text-success font-medium' : 'text-danger font-medium'}>
                      {isMatch ? 'Passwords match' : 'Passwords do not match'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {error ? (
              <div role="alert" className="animate-fade-in rounded-lg border border-danger/30 bg-danger-muted p-3 text-sm text-danger flex items-start gap-2">
                <span>{error}</span>
              </div>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={busy}
              className="w-full font-semibold"
              icon={<UserPlus className="h-4 w-4" />}
            >
              Create free account
            </Button>

            <div className="pt-2 text-center text-sm text-fg-muted">
              Already have an account?{' '}
              <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-accent hover:text-accent-2 transition underline underline-offset-4">
                Sign in <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

