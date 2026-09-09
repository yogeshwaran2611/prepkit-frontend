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
          <div className="hidden items-center gap-2 sm:flex">
            <Link href={`/kits/${kitId}/practice`}>
              <Button size="sm">Practise</Button>
            </Link>
            <Link href={`/kits/${kitId}/weak-spots`}>
              <Button size="sm" variant="primary">
                Weak spots
              </Button>
            </Link>
          </div>
        ) : null
      }
    >
      <LiveRegion message={announcement} />

      <PageHeader
        title={kit?.role.title || detail?.input.companyUrl || 'Kit'}
        subtitle={
          kit ? (
            <span className="flex flex-wrap items-center gap-2">
              <span>{kit.source.company}</span>
              <span className="text-fg-subtle">·</span>
              <span>{kit.schedule.days_available} day plan</span>
              {kit.source.pages_used.length ? (
                <>
                  <span className="text-fg-subtle">·</span>
                  <span>{kit.source.pages_used.length} pages read</span>
                </>
              ) : null}
            </span>
          ) : (
            detail?.input.companyUrl
          )
        }
        actions={
          <Link href="/kits" className="text-sm text-accent underline">
            All kits
          </Link>
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
            <div className="grid gap-5 lg:grid-cols-[200px_1fr]">
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
    <div className="scroll-x flex gap-2 pb-1">
      <StatChip label="Requirements" value={`${kit.role.requirements.length} (${musts.length} must)`} />
      <StatChip label="Questions" value={kit.questions.length} />
      <StatChip label="Flashcards" value={kit.flashcards.length} />
      <StatChip label="Coverage passes" value={kit.coverage.passes} />
      <StatChip
        label="Uncovered musts"
        value={uncoveredMusts}
        tone={uncoveredMusts === 0 ? 'success' : 'danger'}
      />
      <StatChip label="Days" value={kit.schedule.days.length} />
    </div>
  );
}

/** Sticky section nav — the page is long, and a phone needs a way to jump. */
function SectionNav({ kit }: { kit: Kit }) {
  const items = [
    ...(kit.notes?.length ? [{ id: 'notes', label: 'Gaps and notes' }] : []),
    { id: 'brief', label: 'Company brief' },
    { id: 'role', label: 'The role' },
    { id: 'questions', label: 'Questions' },
    { id: 'flashcards', label: 'Flashcards' },
    { id: 'schedule', label: 'Schedule' },
  ];
  return (
    <nav aria-label="Kit sections" className="lg:sticky lg:top-20 lg:self-start">
      <ul className="scroll-x flex gap-1.5 pb-2 lg:flex-col lg:gap-0.5 lg:pb-0">
        {items.map((i) => (
          <li key={i.id} className="shrink-0">
            <a
              href={`#${i.id}`}
              className="block rounded px-2.5 py-1.5 text-xs font-medium text-fg-muted transition hover:bg-surface-muted hover:text-fg"
            >
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function StepTimeline({ progress }: { progress: ReturnType<typeof useJobProgress> }) {
  const byStep = new Map(progress.steps.map((s) => [s.step, s]));
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-fg">
          {progress.phase === 'failed' ? 'Generation failed' : 'Building your kit'}
        </h2>
        {progress.degraded ? (
          <Badge tone="warning">live updates unavailable — polling instead</Badge>
        ) : (
          <Badge tone="accent">live</Badge>
        )}
      </div>
      <p className="mt-1 text-xs text-fg-muted">
        Each step responds to what the previous one actually found. A step that could not find anything is
        skipped and reported, not treated as a failure.
      </p>
      <ol className="mt-3 space-y-1.5">
        {STEP_ORDER.map((step) => {
          const event = byStep.get(step);
          const status = event?.status ?? 'pending';
          return (
            <li key={step} className="flex items-start gap-2 text-sm">
              <span
                aria-hidden
                className={cx(
                  'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold',
                  status === 'ok' && 'bg-success-muted text-success',
                  status === 'skipped' && 'bg-warning-muted text-warning',
                  status === 'failed' && 'bg-danger-muted text-danger',
                  status === 'start' && 'bg-accent-muted text-accent',
                  status === 'pending' && 'bg-surface-muted text-fg-subtle',
                )}
              >
                {status === 'ok' ? '✓' : status === 'skipped' ? '–' : status === 'failed' ? '✕' : ''}
              </span>
              <span className={cx('min-w-0 flex-1', status === 'pending' ? 'text-fg-subtle' : 'text-fg')}>
                {STEP_LABELS[step] ?? step}
                {event?.detail ? <span className="text-fg-muted"> — {event.detail}</span> : null}
              </span>
              {event?.elapsedMs ? (
                <span className="shrink-0 text-xs text-fg-subtle">{(event.elapsedMs / 1000).toFixed(1)}s</span>
              ) : null}
            </li>
          );
        })}
      </ol>
      {progress.error ? (
        <p role="alert" className="mt-3 rounded border border-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {progress.error.message}
        </p>
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
