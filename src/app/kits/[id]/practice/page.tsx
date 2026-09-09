'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Flashcard, Kit } from '@/lib/kit-types';
import { ApiError, api, type PracticeEventView } from '@/lib/api';
import { AppShell } from '@/components/patterns/shell';
import { AsyncBoundary, PageHeader, StatChip } from '@/components/patterns';
import { Badge, Button, Card, Kbd, LiveRegion, Progress, Skeleton } from '@/components/ui';

/**
 * Practice mode. PLAN.md §10.5.
 *
 * "A kit the user only reads is a document. Make it something they can work through."
 *
 * Ordering is the interesting decision and it lives in packages/core/src/srs.ts (pure and
 * tested): never-seen cards first, then overdue, then least confident. Defended in the
 * README — full SM-2 without a long-term history is theatre.
 */

const CONFIDENCE = [
  { value: 1 as const, label: 'Struggled', hint: 'Bring this back tomorrow' },
  { value: 2 as const, label: 'Shaky', hint: 'A few days' },
  { value: 3 as const, label: 'Confident', hint: 'Longer interval' },
];

export default function PracticePage() {
  const { id: kitId } = useParams<{ id: string }>();
  const [kit, setKit] = useState<Kit | null>(null);
  const [events, setEvents] = useState<PracticeEventView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [sessionDone, setSessionDone] = useState(0);

  const load = useCallback(() => {
    setError(null);
    return Promise.all([api.getKit(kitId), api.listPractice(kitId)])
      .then(([detail, practice]) => {
        setKit(detail.kit);
        setEvents(practice.events);
      })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Could not load this kit.'));
  }, [kitId]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Session order is computed ONCE per mount from the events as they were, so answering a
   * card does not reshuffle the deck under the user mid-session.
   */
  const [order, setOrder] = useState<string[] | null>(null);
  useEffect(() => {
    if (!kit || order) return;
    setOrder(orderSessionClient(kit.flashcards.map((f) => f.id), events));
  }, [kit, events, order]);

  const cards = useMemo(() => {
    if (!kit) return [];
    const byId = new Map(kit.flashcards.map((f) => [f.id, f]));
    return (order ?? kit.flashcards.map((f) => f.id)).map((id) => byId.get(id)).filter(Boolean) as Flashcard[];
  }, [kit, order]);

  const card = cards[index];
  const lastSeen = useMemo(() => {
    const byCard = new Map<string, PracticeEventView>();
    for (const e of events) byCard.set(e.cardId, e);
    return byCard;
  }, [events]);

  const covered = new Set(events.map((e) => e.cardId)).size;

  const answer = useCallback(
    async (confidence: 1 | 2 | 3) => {
      if (!card) return;
      setRevealed(false);
      setSessionDone((n) => n + 1);
      setIndex((i) => Math.min(i + 1, cards.length));
      setAnnouncement(`Marked ${CONFIDENCE.find((c) => c.value === confidence)!.label.toLowerCase()}.`);
      try {
        const res = await api.recordPractice(kitId, card.id, confidence);
        setEvents(res.events);
      } catch {
        setAnnouncement('That answer could not be saved.');
      }
    },
    [card, cards.length, kitId],
  );

  // j/k to move, space to reveal, 1-3 to rate — the deck is fully keyboard-driven.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setRevealed((r) => !r);
      }
      if (e.key === 'j') setIndex((i) => Math.min(i + 1, cards.length - 1));
      if (e.key === 'k') setIndex((i) => Math.max(i - 1, 0));
      if (revealed && ['1', '2', '3'].includes(e.key)) void answer(Number(e.key) as 1 | 2 | 3);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer, cards.length, revealed]);

  const finished = index >= cards.length && cards.length > 0;

  return (
    <AppShell
      right={
        <Link href={`/kits/${kitId}`} className="text-sm text-accent underline">
          Back to kit
        </Link>
      }
    >
      <LiveRegion message={announcement} />
      <PageHeader
        title="Practice"
        subtitle="Least confident and never-seen cards come first. Confidence is recorded per card."
        actions={
          <Link href={`/kits/${kitId}/weak-spots`}>
            <Button size="sm" variant="primary">
              Weak spots
            </Button>
          </Link>
        }
      />

      <div className="mt-5">
        <AsyncBoundary
          loading={!kit && !error}
          error={error}
          onRetry={() => void load()}
          empty={kit !== null && cards.length === 0}
          emptyTitle="No flashcards to practise"
          emptyBody="This kit has no flashcards yet. Add one on the kit page, or regenerate the kit."
          emptyAction={
            <Link href={`/kits/${kitId}`}>
              <Button variant="primary">Back to the kit</Button>
            </Link>
          }
          skeleton={<Skeleton className="h-64 w-full" />}
        >
          <div className="space-y-4">
            <div className="scroll-x flex gap-2">
              <StatChip label="Covered" value={`${covered} of ${cards.length}`} />
              <StatChip label="This session" value={sessionDone} />
              <StatChip
                label="Confident"
                value={events.filter((e) => e.confidence === 3).length}
                tone="success"
              />
              <StatChip
                label="Struggled"
                value={events.filter((e) => e.confidence === 1).length}
                tone="warning"
              />
            </div>

            <Progress value={covered} max={Math.max(1, cards.length)} label="Cards covered" />

            {finished ? (
              <Card className="p-6 text-center">
                <h2 className="text-base font-semibold text-fg">Session complete</h2>
                <p className="mt-1 text-sm text-fg-muted">
                  You worked through {sessionDone} card{sessionDone === 1 ? '' : 's'}. The next session will lead
                  with whatever you were least confident about.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button
                    variant="primary"
                    onClick={() => {
                      setOrder(orderSessionClient(cards.map((c) => c.id), events));
                      setIndex(0);
                      setSessionDone(0);
                    }}
                  >
                    Practise again
                  </Button>
                  <Link href={`/kits/${kitId}/weak-spots`}>
                    <Button>See weak spots</Button>
                  </Link>
                </div>
              </Card>
            ) : card ? (
              <Card className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-fg-subtle">
                    Card {index + 1} of {cards.length}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {card.requirement_ids.map((id) => (
                      <Badge key={id}>{id}</Badge>
                    ))}
                    {lastSeen.get(card.id) ? (
                      <Badge tone={lastSeen.get(card.id)!.confidence === 1 ? 'warning' : 'neutral'}>
                        last: {CONFIDENCE.find((c) => c.value === lastSeen.get(card.id)!.confidence)?.label}
                      </Badge>
                    ) : (
                      <Badge tone="accent">new</Badge>
                    )}
                  </div>
                </div>

                <p className="mt-5 text-lg font-medium leading-snug text-fg">{card.front}</p>

                {revealed ? (
                  <div className="mt-4 rounded border border-border bg-surface-muted p-4">
                    <p className="whitespace-pre-wrap text-sm text-fg">{card.back || 'No answer recorded.'}</p>
                  </div>
                ) : (
                  <Button variant="primary" className="mt-5" onClick={() => setRevealed(true)}>
                    Reveal answer
                  </Button>
                )}

                {revealed ? (
                  <div className="mt-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
                      How confident were you?
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      {CONFIDENCE.map((c) => (
                        <Button key={c.value} onClick={() => void answer(c.value)} className="flex-col items-start py-2">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Kbd>{c.value}</Kbd> {c.label}
                          </span>
                          <span className="text-[11px] text-fg-subtle">{c.hint}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <p className="mt-5 flex flex-wrap items-center gap-2 text-[11px] text-fg-subtle">
                  <Kbd>space</Kbd> reveal · <Kbd>1</Kbd>–<Kbd>3</Kbd> rate · <Kbd>j</Kbd>/<Kbd>k</Kbd> move
                </p>
              </Card>
            ) : null}
          </div>
        </AsyncBoundary>
      </div>
    </AppShell>
  );
}

/**
 * Mirror of core/srs.ts orderSession for the client. Kept small and identical in intent:
 * never-seen first, then overdue, then least confident, then oldest.
 */
function orderSessionClient(cardIds: string[], events: PracticeEventView[]): string[] {
  const latest = new Map<string, PracticeEventView>();
  for (const e of [...events].sort((a, b) => a.at.localeCompare(b.at))) latest.set(e.cardId, e);
  return [...cardIds].sort((a, b) => {
    const ea = latest.get(a);
    const eb = latest.get(b);
    if (!ea && !eb) return a.localeCompare(b);
    if (!ea) return -1;
    if (!eb) return 1;
    if (ea.confidence !== eb.confidence) return ea.confidence - eb.confidence;
    return ea.at.localeCompare(eb.at);
  });
}
