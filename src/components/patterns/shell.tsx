'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '../ui';

/** App chrome. One header, so navigation looks the same on every page. */
export function AppShell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    void api
      .me()
      .then((u) => setEmail(u.email))
      .catch(() => router.replace('/login'));
  }, [router]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/kits" className="flex items-center gap-2 text-sm font-semibold text-fg">
            <span aria-hidden className="grid h-6 w-6 place-items-center rounded bg-accent text-[11px] font-bold text-accent-fg">
              PK
            </span>
            Prep Kit
          </Link>
          <div className="flex items-center gap-2">
            {right}
            {email ? <span className="hidden text-xs text-fg-muted sm:inline">{email}</span> : null}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                void api.logout().finally(() => router.replace('/login'));
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
