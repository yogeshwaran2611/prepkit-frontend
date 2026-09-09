'use client';

import { useEffect, useRef, useState } from 'react';
import { api, streamUrl, type StepEventView } from '@/lib/api';

/**
 * PLAN.md §10.4 — SSE is treated as UNRELIABLE, not as the state.
 *
 * The job document is the truth; this stream is an optimisation. After two failed
 * reconnects it falls back to polling, so a buffering proxy, a cold start mid-run, or a
 * flaky network degrades to "slower progress bar" — never to a spinner that lies forever.
 */

export type JobPhase = 'connecting' | 'running' | 'done' | 'failed' | 'polling';

export interface JobProgress {
  phase: JobPhase;
  steps: StepEventView[];
  error: { code: string; message: string } | null;
  summary: MergeSummary | null;
  /** True while the fallback poller is driving updates rather than the live stream. */
  degraded: boolean;
}

export interface MergeSummary {
  replaced: number;
  added: number;
  keptProtected: number;
  untouchedOtherCategories: number;
}

const MAX_SSE_FAILURES = 2;

export function useJobProgress(jobId: string | null, kitId: string, onComplete: () => void): JobProgress {
  const [state, setState] = useState<JobProgress>({
    phase: 'connecting',
    steps: [],
    error: null,
    summary: null,
    degraded: false,
  });
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;
    let source: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let failures = 0;

    const finish = (phase: 'done' | 'failed', error: JobProgress['error'], summary: MergeSummary | null) => {
      if (cancelled) return;
      setState((s) => ({ ...s, phase, error, summary: summary ?? s.summary }));
      source?.close();
      if (pollTimer) clearInterval(pollTimer);
      completeRef.current();
    };

    /** Fallback: read the job document the API already persists step by step. */
    const startPolling = () => {
      if (cancelled || pollTimer) return;
      setState((s) => ({ ...s, phase: 'polling', degraded: true }));
      pollTimer = setInterval(() => {
        void api
          .getKit(kitId)
          .then((detail) => {
            if (cancelled) return;
            const job = detail.job;
            if (job) setState((s) => ({ ...s, steps: job.steps, degraded: true }));
            if (detail.status === 'ready' || job?.status === 'ok') finish('done', null, null);
            else if (detail.status === 'failed' || job?.status === 'failed') {
              finish('failed', detail.error ?? job?.error ?? null, null);
            }
          })
          .catch(() => {
            // Keep polling: a transient failure here must not end the run in the UI.
          });
      }, 3_000);
    };

    const connect = () => {
      if (cancelled) return;
      source = new EventSource(streamUrl(jobId), { withCredentials: true });

      source.onmessage = (event) => {
        if (cancelled) return;
        failures = 0;
        const payload = JSON.parse(event.data) as
          | { type: 'status'; status: string }
          | { type: 'step'; step: StepEventView }
          | { type: 'done'; kitId: string; summary?: MergeSummary }
          | { type: 'failed'; error: { code: string; message: string } };

        if (payload.type === 'status') setState((s) => ({ ...s, phase: 'running' }));
        if (payload.type === 'step') {
          setState((s) => ({ ...s, phase: 'running', steps: mergeStep(s.steps, payload.step) }));
        }
        if (payload.type === 'done') finish('done', null, payload.summary ?? null);
        if (payload.type === 'failed') finish('failed', payload.error, null);
      };

      source.onerror = () => {
        source?.close();
        if (cancelled) return;
        failures += 1;
        if (failures > MAX_SSE_FAILURES) {
          startPolling();
          return;
        }
        // Capped backoff before another attempt.
        setTimeout(connect, Math.min(1_000 * 2 ** failures, 8_000));
      };
    };

    connect();

    return () => {
      cancelled = true;
      source?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [jobId, kitId]);

  return state;
}

/** A step arrives twice (start then ok); the later status replaces the earlier one. */
function mergeStep(steps: StepEventView[], next: StepEventView): StepEventView[] {
  const existing = steps.findIndex((s) => s.step === next.step);
  if (existing === -1) return [...steps, next];
  const copy = [...steps];
  copy[existing] = next;
  return copy;
}

export const STEP_LABELS: Record<string, string> = {
  extract: 'Reading the job description',
  crawl: 'Crawling the company site',
  hiring: 'Looking for their hiring process',
  search: 'Searching public discussion',
  brief: 'Writing the company brief',
  questions: 'Generating questions',
  coverage: 'Checking coverage',
  schedule: 'Building the schedule',
};

export const STEP_ORDER = ['extract', 'crawl', 'hiring', 'search', 'brief', 'questions', 'coverage', 'schedule'];
