'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { Kit } from '@prepkit/schema';
import { ApiError, api, type WeakSpotsResponse } from '@/lib/api';
import { AppShell } from '@/components/patterns/shell';
import { AsyncBoundary, PageHeader, StatChip } from '@/components/patterns';
import { Badge, Button, Card, Progress, Skeleton, cx } from '@/components/ui';

/**
 * THE CREATIVE FEATURE. PLAN.md §10.5.
 *
 * The problem it solves: people practise what they already know. You flip through forty
 * cards, feel productive, and never notice you have failed the same must-have requirement
 * four times.
 *
 * Why it ranks REQUIREMENTS, not cards: the interviewer does not ask your flashcard, they
 * ask about the requirement. Card stats tell you which card you flunked; requirement-level
 * tells you what to go and study.
 *
 * The scoring is in packages/core/src/weak-spots.ts (pure, testable) and every score shows
 * its reasons, so the number is never a black box.
 */

export default function WeakSpotsPage() {
  const { id: kitId } = useParams<{ id: string }>();
  const [report, setReport] = useState<WeakSpotsResponse | null>(null);
  const [kit, setKit] = useState<Kit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPlan, setShowPlan] = useState(false);

  const load = useCallback(() => {
    setError(null);
    return Promise.all([api.weakSpots(kitId), api.getKit(kitId)])
      .then(([r, d]) => {
        setReport(r);
        setKit(d.kit);
      })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Could not load the report.'));
  }, [kitId]);

  useEffect(() => {
    void load();
  }, [load]);

  const questionById = new Map((kit?.questions ?? []).map((q) => [q.id, q]));

  return (
    <AppShell
      right={
        <Link href={`/kits/${kitId}`} className="text-sm text-accent underline">
          Back to kit
        </Link>
      }
    >
      <PageHeader
        title="Weak spots"
        subtitle="Ranked by requirement, not by flashcard — because that is what you will actually be asked about."
        actions={
          <Link href={`/kits/${kitId}/practice`}>
            <Button size="sm">Practise</Button>
          </Link>
        }
      />

      <div className="mt-5">
        <AsyncBoundary
          loading={!report && !error}
          error={error}
          onRetry={() => void load()}
          skeleton={<Skeleton className="h-64 w-full" />}
        >
          {report ? (
            <div className="space-y-4">
              <div className="scroll-x flex gap-2">
                <StatChip label="Cards practised" value={`${report.practisedCards} of ${report.totalCards}`} />
                <StatChip
                  label="High risk"
                  value={report.spots.filter((s) => s.risk >= 55).length}
                  tone="danger"
                />
                <StatChip
                  label="Must-haves at risk"
                  value={report.spots.filter((s) => s.priority === 'must' && s.risk >= 40).length}
                  tone="warning"
                />
              </div>

              {report.coldStart ? (
                <Card className="border-accent bg-accent-muted p-4">
                  <h2 className="text-sm font-semibold text-fg">No practice data yet</h2>
                  <p className="mt-1 text-sm text-fg-muted">
                    This ranking is currently based only on the kit itself — priority, question difficulty and
                    coverage. Practise a few cards and it starts using how confident you actually felt, which is
                    the whole point.
                  </p>
                  <Link href={`/kits/${kitId}/practice`}>
                    <Button variant="primary" className="mt-3">
                      Start practising
                    </Button>
                  </Link>
                </Card>
              ) : null}

              {report.plan.length ? (
                <Card className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold text-fg">A focused one-day plan</h2>
                      <p className="mt-0.5 text-xs text-fg-muted">
                        Built from your top weak spots with the same scheduler the main plan uses.
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setShowPlan((s) => !s)} aria-expanded={showPlan}>
                      {showPlan ? 'Hide' : 'Show'} plan
                    </Button>
                  </div>
                  {showPlan ? (
                    <ol className="mt-3 space-y-2">
                      {report.plan.map((day) => (
                        <li key={day.day} className="rounded border border-border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-fg">{day.focus}</span>
                            <Badge>{day.minutes} min</Badge>
                          </div>
                          <ul className="mt-1.5 space-y-1">
                            {day.question_ids.map((id) => (
                              <li key={id} className="text-sm text-fg-muted">
                                {questionById.get(id)?.prompt ?? id}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </Card>
              ) : null}

              <ol className="space-y-3">
                {report.spots.map((spot, i) => (
                  <li key={spot.requirement_id}>
                    <Card className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-semibold text-fg-subtle">#{i + 1}</span>
                            <Badge tone={spot.priority === 'must' ? 'accent' : 'neutral'}>{spot.priority}</Badge>
                            <Badge>{spot.kind}</Badge>
                            <span className="text-xs text-fg-subtle">{spot.requirement_id}</span>
                          </div>
                          <p className="mt-1.5 text-sm font-medium text-fg">{spot.text}</p>
                          <ul className="mt-2 flex flex-wrap gap-1.5">
                            {spot.reasons.map((r) => (
                              <li key={r}>
                                <Badge tone={/never|Low|No question/i.test(r) ? 'warning' : 'neutral'}>{r}</Badge>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="w-32 shrink-0">
                          <div className="flex items-baseline justify-between">
                            <span className="text-[11px] uppercase tracking-wide text-fg-subtle">Risk</span>
                            <span
                              className={cx(
                                'text-lg font-bold',
                                spot.risk >= 55 ? 'text-danger' : spot.risk >= 35 ? 'text-warning' : 'text-success',
                              )}
                            >
                              {spot.risk}
                            </span>
                          </div>
                          <Progress value={spot.risk} max={100} label={`Risk for ${spot.requirement_id}`} />
                          <p className="mt-1.5 text-[11px] text-fg-subtle">
                            {spot.cardsSeen}/{spot.cardsTotal} cards practised
                            {spot.averageConfidence !== null
                              ? ` · avg ${spot.averageConfidence.toFixed(1)}/3`
                              : ''}
                          </p>
                        </div>
                      </div>

                      {spot.question_ids.length ? (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs font-medium text-accent">
                            {spot.question_ids.length} question(s) to drill
                          </summary>
                          <ul className="mt-2 space-y-1.5">
                            {spot.question_ids.map((id) => {
                              const q = questionById.get(id);
                              return (
                                <li key={id} className="flex items-start gap-2 text-sm text-fg-muted">
                                  {q ? <Badge tone={q.difficulty === 3 ? 'warning' : 'neutral'}>d{q.difficulty}</Badge> : null}
                                  <span>{q?.prompt ?? id}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </details>
                      ) : (
                        <p className="mt-2 text-xs text-danger">
                          Nothing covers this requirement yet — regenerate a category on the kit page.
                        </p>
                      )}
                    </Card>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </AsyncBoundary>
      </div>
    </AppShell>
  );
}
