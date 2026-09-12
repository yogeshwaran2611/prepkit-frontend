'use client';

import { useEffect, useRef, useState } from 'react';
import { API_URL } from '@/lib/api';
import { Logo, Spinner } from '../ui';

/**
 * Render's free tier sleeps the API after ~15 minutes idle; the first request afterwards
 * pays a real 30–60s cold start. A SINGLE fetch on page load does not fix this — it will
 * simply time out before the instance finishes booting. This polls /api/health with retries
 * until it actually succeeds (or a genuine outage timeout is reached), and gates the whole
 * app behind a visible, honest "waking up" state instead of a silent hang or a confusing
 * failed login.
 *
 * Deliberately NOT an always-on external pinger to prevent the sleep entirely: Render's free
 * tier is capped at a monthly instance-hour budget, and keeping one service alive 24/7 sits
 * right at that cap — this makes the real trade-off visible instead of quietly evading it.
 */

const POLL_INTERVAL_MS = 3_000;
const MAX_WAIT_MS = 90_000; // generous: a real cold start is usually under 60s
const PER_ATTEMPT_TIMEOUT_MS = 6_000;

type Status = 'checking' | 'ready' | 'timed-out';

export function ServerWarmup({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('checking');
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const attempt = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(PER_ATTEMPT_TIMEOUT_MS) });
        if (res.ok) {
          if (!cancelled) setStatus('ready');
          return;
        }
      } catch {
        // Expected mid-cold-start: connection refused, timeout, or a 502 while it boots.
      }
      if (cancelled) return;
      const elapsed = Date.now() - startedAt.current;
      setElapsedMs(elapsed);
      if (elapsed >= MAX_WAIT_MS) {
        setStatus('timed-out');
        return;
      }
      timer = setTimeout(attempt, POLL_INTERVAL_MS);
    };

    void attempt();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (status === 'ready') return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo size="lg" />
      {status === 'checking' ? (
        <>
          <div className="flex items-center gap-2 text-fg">
            <Spinner className="h-5 w-5" />
            <span className="text-lg font-semibold">Waking up the server…</span>
          </div>
          <p className="max-w-sm text-sm text-fg-muted">
            The backend runs on a free tier that sleeps after 15 minutes idle. The first
            request after that takes up to a minute to start — this only happens once per
            idle period, not on every visit.
          </p>
        </>
      ) : (
        <>
          <p className="text-lg font-semibold text-fg">Still waiting on the server</p>
          <p className="max-w-sm text-sm text-fg-muted">
            This is taking longer than a normal cold start ({Math.round(elapsedMs / 1000)}s so
            far) — the API may genuinely be down rather than just asleep.
          </p>
          <button
            type="button"
            onClick={() => {
              startedAt.current = Date.now();
              setElapsedMs(0);
              setStatus('checking');
            }}
            className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-fg transition hover:bg-surface-muted"
          >
            Try again
          </button>
        </>
      )}
    </div>
  );
}
