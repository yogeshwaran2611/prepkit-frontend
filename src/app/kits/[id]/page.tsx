'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Kit } from '@/lib/kit-types';
import { ApiError, api, type KitDetail } from '@/lib/api';
import { STEP_LABELS, STEP_ORDER, useJobProgress, type MergeSummary } from '@/hooks/useJobProgress';
import { AppShell } from '@/components/patterns/shell';
import { AsyncBoundary, PageHeader, StatChip } from '@/components/patterns';
import { Badge, Button, Card, LiveRegion, Skeleton, cx } from '@/components/ui';
import {
  CompanyBriefSection,
  FlashcardsSection,
  NotesPanel,
  QuestionBank,
  RoleSection,
  ScheduleSection,
  type KitActions,
} from '@/components/kit/sections';

export default function KitPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const kitId = params.id;

  const [detail, setDetail] = useState<KitDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [busyScope, setBusyScope] = useState<string | null>(null);
  const [regenJobId, setRegenJobId] = useState<string | null>(null);
  const [mergeSummary, setMergeSummary] = useState<MergeSummary | null>(null);

  const load = useCallback(() => {
    setError(null);
    return api
      .getKit(kitId)
      .then(setDetail)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.isAuth) {
          router.replace(`/login?next=/kits/${kitId}`);
          return;
        }
        setError(e instanceof ApiError ? e.message : 'Could not load this kit.');
      });
  }, [kitId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const generating = detail?.status === 'queued' || detail?.status === 'running';
  const activeJobId = generating ? (detail?.job?.id ?? null) : regenJobId;

  const progress = useJobProgress(activeJobId, kitId, () => {
    void load();
    setBusyScope(null);
    setRegenJobId(null);
  });

  useEffect(() => {
    if (progress.summary) {
      setMergeSummary(progress.summary);
      setAnnouncement(
        `Regenerated: ${progress.summary.replaced} replaced, ${progress.summary.added} new, ${progress.summary.keptProtected} of your items kept.`,
      );
    }
  }, [progress.summary]);

  /**
   * Optimistic actions: the returned kit replaces local state immediately, so editing and
   * reordering feel instant instead of round-tripping per keystroke.
   */
  const actions: KitActions = useMemo(
    () => ({
      async patch(itemId, section, patch) {
        const res = await api.patchItem(kitId, itemId, section, patch);
        setDetail((d) => (d ? { ...d, kit: res.kit, version: res.version } : d));
        setAnnouncement('Saved');
      },
      async reorder(section, ids) {
        // Reorder locally first, then persist — a drag must not wait on the network.
        setDetail((d) => (d?.kit ? { ...d, kit: reorderLocal(d.kit, section, ids) } : d));
        const res = await api.reorder(kitId, section, ids);
        setDetail((d) => (d ? { ...d, kit: res.kit, version: res.version } : d));
      },
      async add(body) {
        const res = await api.addItem(kitId, body);
        setDetail((d) => (d ? { ...d, kit: res.kit, version: res.version } : d));
        setAnnouncement('Added');
      },
      async remove(itemId) {
        try {
          const res = await api.deleteItem(kitId, itemId);
          setDetail((d) => (d ? { ...d, kit: res.kit, version: res.version } : d));
          setAnnouncement('Deleted');
        } catch (e) {
          setAnnouncement(e instanceof ApiError ? e.message : 'Could not delete that.');
          setError(e instanceof ApiError ? e.message : 'Could not delete that.');
        }
      },
      async regenerate(scope) {
        setBusyScope(scope);
        setMergeSummary(null);
        try {
          const res = await api.regenerate(kitId, scope);
          setRegenJobId(res.jobId);
          setAnnouncement('Regenerating — your edits and pinned items will be kept.');
        } catch (e) {
          setBusyScope(null);
          setError(e instanceof ApiError ? e.message : 'Could not start that regeneration.');
        }
      },
      announce: setAnnouncement,
      busyScope,
    }),
    [kitId, busyScope],
  );

  const kit = detail?.kit ?? null;

  return (
    <AppShell
      right={
        kit ? (
          <div className="hidden items-center gap-2.5 sm:flex">
            <Link href={`/kits/${kitId}/practice`}>
              <Button size="sm" variant="secondary">
                Practise Cards
              </Button>
            </Link>
            <Link href={`/kits/${kitId}/weak-spots`}>
              <Button size="sm" variant="primary">
                Weak Spots Report
              </Button>
            </Link>
          </div>
        ) : null
      }
    >
      <LiveRegion message={announcement} />

      <PageHeader
        title={kit?.role.title || detail?.input.companyUrl || 'Kit'}
        back={{ href: '/kits', label: 'All kits' }}
        subtitle={
          kit ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-fg">{kit.source.company}</span>
              <span className="text-fg-subtle">·</span>
              <span>{kit.schedule.days_available} day plan</span>
              {kit.source.pages_used.length ? (
                <>
                  <span className="text-fg-subtle">·</span>
                  <span>{kit.source.pages_used.length} sources crawled</span>
                </>
              ) : null}
            </span>
          ) : (
            detail?.input.companyUrl
          )
        }
      />

      {/* Generating: the eight steps, live. A soft-failed step is amber, not red. */}
      {generating || progress.phase === 'running' || progress.phase === 'polling' ? (
        <div className="mt-5">
          <StepTimeline progress={progress} />
        </div>
      ) : null}

      {detail?.status === 'failed' ? (
        <Card className="mt-5 border-danger p-4">
          <h2 className="text-sm font-semibold text-danger">This kit could not be generated</h2>
          <p className="mt-1 text-sm text-fg-muted">{detail.error?.message ?? 'Unknown error.'}</p>
          <p className="mt-2 text-xs text-fg-subtle">Error code: {detail.error?.code ?? 'UNKNOWN'}</p>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => void load()}>Reload</Button>
            <Link href="/kits/new">
              <Button variant="primary">Start a new kit</Button>
            </Link>
          </div>
        </Card>
      ) : null}

      {mergeSummary ? (
        <Card className="mt-5 border-accent bg-accent-muted p-3">
          <p className="text-sm text-fg">
            <strong>{mergeSummary.replaced}</strong> question(s) replaced, <strong>{mergeSummary.added}</strong> new,{' '}
            <strong>{mergeSummary.keptProtected}</strong> of your edited or pinned items kept, and{' '}
            <strong>{mergeSummary.untouchedOtherCategories}</strong> questions in other categories untouched.
          </p>
          <Button size="sm" variant="ghost" className="mt-1" onClick={() => setMergeSummary(null)}>
            Dismiss
          </Button>
        </Card>
      ) : null}

      <div className="mt-5">
        <AsyncBoundary
          loading={!detail && !error}
          error={error}
          onRetry={() => void load()}
          empty={!kit && detail?.status !== 'failed' && !generating}
          emptyTitle="This kit has no content yet"
          emptyBody="Generation may still be starting. Reload in a moment."
          skeleton={
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          }
        >
          {kit ? (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[200px_1fr]">
              <SectionNav kit={kit} />
              <div className="min-w-0 space-y-5">
                <KitStats kit={kit} />
                <NotesPanel kit={kit} />
                <CompanyBriefSection kit={kit} actions={actions} />
                <RoleSection kit={kit} />
                <QuestionBank kit={kit} actions={actions} />
                <FlashcardsSection kit={kit} actions={actions} />
                <ScheduleSection kit={kit} actions={actions} />
              </div>
            </div>
          ) : null}
        </AsyncBoundary>
      </div>
    </AppShell>
  );
}

function KitStats({ kit }: { kit: Kit }) {
  const musts = kit.role.requirements.filter((r) => r.priority === 'must');
  const uncoveredMusts = kit.coverage.uncovered_requirement_ids.filter((id) =>
    musts.some((r) => r.id === id),
  ).length;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatChip label="Requirements" value={`${kit.role.requirements.length} (${musts.length} must)`} tone="blue" />
      <StatChip label="Questions" value={kit.questions.length} tone="purple" />
      <StatChip label="Flashcards" value={kit.flashcards.length} tone="orange" />
      <StatChip label="Coverage Passes" value={kit.coverage.passes} tone="indigo" />
      <StatChip
        label="Uncovered Musts"
        value={uncoveredMusts}
        tone={uncoveredMusts === 0 ? 'green' : 'red'}
      />
      <StatChip label="Plan Days" value={`${kit.schedule.days.length}d`} tone="neutral" />
    </div>
  );
}

function SectionNav({ kit }: { kit: Kit }) {
  const items = useMemo(
    () => [
      ...(kit.notes?.length ? [{ id: 'notes', label: 'Gaps and notes' }] : []),
      { id: 'brief', label: 'Company brief' },
      { id: 'role', label: 'The role' },
      { id: 'questions', label: 'Questions' },
      { id: 'flashcards', label: 'Flashcards' },
      { id: 'schedule', label: 'Schedule' },
    ],
    [kit.notes?.length],
  );
  const [active, setActive] = useState(items[0]?.id ?? '');

  // Scroll-spy: the section actually in view drives the highlight, not just the last click —
  // scrolling with the mouse wheel or a screen reader's "next heading" must update it too.
  useEffect(() => {
    const sections = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // A band near the top of the viewport, below the sticky header — the section crossing
      // THAT line is "current", which matches what a reader's eye is actually on.
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      aria-label="Kit sections"
      // min-w-0 matters here: this is a grid item whose own child scrolls horizontally
      // (scroll-x below). Without it, a grid/flex item's default min-width:auto refuses to
      // shrink below its content's intrinsic width, so the GRID TRACK grows to fit the pill
      // strip instead of the pill strip scrolling inside a fixed-width track — which is what
      // caused the whole page to scroll sideways on a phone.
      className="min-w-0 lg:sticky lg:top-24 lg:self-start rounded-xl border border-border bg-surface p-2 shadow-sm"
    >
      <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-fg-subtle border-b border-border mb-1 hidden lg:block">
        Navigation
      </div>
      <ul className="scroll-x flex gap-1 pb-1 lg:flex-col lg:gap-1 lg:pb-0">
        {items.map((i) => {
          const isActive = active === i.id;
          return (
            <li key={i.id} className="shrink-0">
              <a
                href={`#${i.id}`}
                aria-current={isActive ? 'true' : undefined}
                // Click sets the highlight immediately, so there is no lag waiting on the
                // (smooth, therefore slow) scroll to finish before the nav agrees with you.
                onClick={() => setActive(i.id)}
                className={cx(
                  'block rounded-lg px-3 py-2 text-xs font-semibold transition',
                  isActive
                    ? 'bg-accent-muted text-accent shadow-sm'
                    : 'text-fg-muted hover:bg-surface-muted hover:text-accent',
                )}
              >
                {i.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function StepTimeline({ progress }: { progress: ReturnType<typeof useJobProgress> }) {
  const byStep = new Map(progress.steps.map((s) => [s.step, s]));
  return (
    <Card className="p-5 border-accent/30 bg-surface shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
          </span>
          <h2 className="text-base font-bold text-fg">
            {progress.phase === 'failed' ? 'Generation failed' : 'Pipeline Generation in Progress'}
          </h2>
        </div>
        {progress.degraded ? (
          <Badge tone="warning">live updates fallback — polling</Badge>
        ) : (
          <Badge tone="accent">live websocket</Badge>
        )}
      </div>
      <p className="mt-1 text-xs text-fg-muted">
        Crawls the company website, searches public discussion, extracts must-have requirements, and builds questions with 2-pass coverage.
      </p>
      <ol className="mt-4 space-y-2">
        {STEP_ORDER.map((step) => {
          const event = byStep.get(step);
          const status = event?.status ?? 'pending';
          return (
            <li key={step} className="flex items-start gap-2.5 text-sm p-1.5 rounded-lg transition hover:bg-surface-muted/50">
              <span
                aria-hidden
                className={cx(
                  'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold',
                  status === 'ok' && 'bg-success-muted text-success',
                  status === 'skipped' && 'bg-warning-muted text-warning',
                  status === 'failed' && 'bg-danger-muted text-danger',
                  status === 'start' && 'bg-accent-muted text-accent animate-pulse',
                  status === 'pending' && 'bg-surface-muted text-fg-subtle opacity-60',
                )}
              >
                {status === 'ok' ? '✓' : status === 'skipped' ? '–' : status === 'failed' ? '✕' : '•'}
              </span>
              <span className={cx('min-w-0 flex-1 text-xs font-medium', status === 'pending' ? 'text-fg-subtle' : 'text-fg')}>
                {STEP_LABELS[step] ?? step}
                {event?.detail ? <span className="text-fg-muted font-normal"> — {event.detail}</span> : null}
              </span>
              {event?.elapsedMs ? (
                <span className="shrink-0 text-[11px] text-fg-subtle font-mono">{(event.elapsedMs / 1000).toFixed(1)}s</span>
              ) : null}
            </li>
          );
        })}
      </ol>
      {progress.error ? (
        <div role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger-muted p-3 text-xs text-danger font-medium">
          {progress.error.message}
        </div>
      ) : null}
    </Card>
  );
}

function reorderLocal(kit: Kit, section: 'questions' | 'flashcards', ids: string[]): Kit {
  const items = section === 'questions' ? kit.questions : kit.flashcards;
  const byId = new Map(items.map((i) => [i.id, i]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
  const rest = items.filter((i) => !ids.includes(i.id));
  const next = [...ordered, ...rest] as typeof items;
  return section === 'questions'
    ? { ...kit, questions: next as Kit['questions'] }
    : { ...kit, flashcards: next as Kit['flashcards'] };
}
