'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Flashcard, Kit } from '@/lib/kit-types';
import { ApiError, api, type PracticeEventView } from '@/lib/api';
import { AppShell } from '@/components/patterns/shell';
import { AsyncBoundary, PageHeader, StatChip } from '@/components/patterns';
import { Badge, Button, Card, Dialog, Kbd, LiveRegion, Progress, Skeleton, VectorCompletedSession, cx } from '@/components/ui';
import { 
  RotateCw, 
  ArrowLeft, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  HelpCircle, 
  ChevronRight, 
  ChevronLeft,
  Flame,
  Award,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

const CONFIDENCE = [
  { 
    value: 1 as const, 
    label: 'Struggled', 
    hint: 'Review soon',
    icon: <AlertCircle className="h-4 w-4 text-warning" />,
    color: 'hover:border-warning/50 hover:bg-warning-muted/40' 
  },
  { 
    value: 2 as const, 
    label: 'Getting There', 
    hint: 'In a few days',
    icon: <HelpCircle className="h-4 w-4 text-accent" />,
    color: 'hover:border-accent/50 hover:bg-accent-muted/40' 
  },
  { 
    value: 3 as const, 
    label: 'Mastered', 
    hint: 'Longer interval',
    icon: <CheckCircle className="h-4 w-4 text-success" />,
    color: 'hover:border-success/50 hover:bg-success-muted/40' 
  },
];

export default function PracticePage() {
  const { id: kitId } = useParams<{ id: string }>();
  const [kit, setKit] = useState<Kit | null>(null);
  const [events, setEvents] = useState<PracticeEventView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [sessionDone, setSessionDone] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

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
  /**
   * BUG: re-rating a card you have already covered (go back, rate it again) appends a
   * SECOND event for the same card — `events` is the full history, used for spaced-
   * repetition ordering, not "current state per card". Counting confidence straight off
   * that array double-counts a re-rated card in every bucket it was ever placed in: mark
   * card 1 "Mastered", revisit it, mark it "Struggled" instead, and the old code showed BOTH
   * a Mastered and a Need-Review credit for the one card.
   * `lastSeen` already reduces the event log to one (the most recent) rating per card id —
   * that is the correct source for any per-card count, so the stat chips use it instead of
   * the raw log.
   */
  const latestByCard = [...lastSeen.values()];
  const masteredCount = latestByCard.filter((e) => e.confidence === 3).length;
  const needReviewCount = latestByCard.filter((e) => e.confidence === 1).length;
  const finished = index >= cards.length && cards.length > 0;

  // Trigger celebration confetti when session completes
  useEffect(() => {
    if (finished) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#4f46e5', '#16a34a', '#ea580c', '#9333ea'],
        });
      } catch {
        // ignore if confetti unavailable in environment
      }
    }
  }, [finished]);

  const answer = useCallback(
    async (confidence: 1 | 2 | 3) => {
      if (!card) return;
      setShowRatingPopup(false);
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

  const handleNextClick = () => {
    // Show the rating popup so the user rates their confidence and proceeds
    setShowRatingPopup(true);
  };

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setRevealed((r) => !r);
      }
      if (e.key === 'j' || e.key === 'ArrowRight') {
        setShowRatingPopup(true);
      }
      if (e.key === 'k' || e.key === 'ArrowLeft') {
        setShowRatingPopup(false);
        setRevealed(false);
        setIndex((i) => Math.max(i - 1, 0));
      }
      if (showRatingPopup && ['1', '2', '3'].includes(e.key)) {
        void answer(Number(e.key) as 1 | 2 | 3);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer, cards.length, showRatingPopup]);

  return (
    <AppShell
      right={
        <Link href={`/kits/${kitId}`} className="text-sm font-semibold text-accent hover:text-accent-2 transition flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to kit
        </Link>
      }
    >
      <LiveRegion message={announcement} />
      <PageHeader
        title="Interactive Practice"
        subtitle="Least confident and unvisited cards appear first. Click the card or press Space to flip."
        actions={
          <>
            <Button
              size="sm"
              variant="ghost"
              className="text-fg-subtle hover:text-danger"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={() => setConfirmReset(true)}
            >
              Reset progress
            </Button>
            <Link href={`/kits/${kitId}/weak-spots`}>
              <Button size="sm" variant="accent-subtle" icon={<Flame className="h-3.5 w-3.5 text-warning" />}>
                Weak Spots Report
              </Button>
            </Link>
          </>
        }
      />

      <div className="mt-6">
        <AsyncBoundary
          loading={!kit && !error}
          error={error}
          onRetry={() => void load()}
          empty={kit !== null && cards.length === 0}
          emptyTitle="No flashcards available"
          emptyBody="This kit has no flashcards yet. Add one in the kit builder or regenerate."
          emptyAction={
            <Link href={`/kits/${kitId}`}>
              <Button variant="primary">Back to Kit Builder</Button>
            </Link>
          }
          skeleton={<Skeleton className="h-80 w-full rounded-2xl" />}
        >
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Practice Progress Bar and Chips with Solid Vibrant Colors */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatChip label="Cards Covered" value={`${covered} / ${cards.length}`} tone="blue" />
              <StatChip label="This Session" value={sessionDone} tone="purple" />
              <StatChip label="Mastered" value={masteredCount} tone="green" />
              <StatChip label="Need Review" value={needReviewCount} tone="orange" />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-fg-subtle">
                <span>Progress</span>
                <span>{Math.round((covered / Math.max(1, cards.length)) * 100)}%</span>
              </div>
              <Progress value={covered} max={Math.max(1, cards.length)} label="Cards covered" />
            </div>

            {/* Session Finished Card */}
            {finished ? (
              <Card className="p-8 text-center animate-scale-in border-success/30 bg-surface">
                <VectorCompletedSession className="mx-auto h-32 w-32" />
                <h2 className="mt-4 text-2xl font-extrabold text-fg tracking-tight">Session Complete!</h2>
                <p className="mt-2 text-sm text-fg-muted max-w-md mx-auto leading-relaxed">
                  Great work! You reviewed {sessionDone} flashcard{sessionDone === 1 ? '' : 's'}. Our spaced repetition scheduler will lead next time with cards where you struggled.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button
                    variant="primary"
                    size="lg"
                    icon={<RotateCw className="h-4 w-4" />}
                    onClick={() => {
                      setOrder(orderSessionClient(cards.map((c) => c.id), events));
                      setIndex(0);
                      setSessionDone(0);
                      setRevealed(false);
                    }}
                  >
                    Practice Again
                  </Button>
                  <Link href={`/kits/${kitId}/weak-spots`}>
                    <Button size="lg" variant="secondary" icon={<Award className="h-4 w-4 text-accent" />}>
                      View Weak Spots Analysis
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : card ? (
              /* --- 3D Flip Flashcard Container with Prominent Left & Right Arrow Buttons --- */
              <div className="space-y-5">
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Left Arrow Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setRevealed(false);
                      setIndex((i) => Math.max(i - 1, 0));
                    }}
                    disabled={index === 0}
                    aria-label="Previous card"
                    title="Previous card (press k or Left Arrow)"
                    className="shrink-0 h-12 w-12 sm:h-14 sm:w-14 rounded-full border border-border bg-surface text-fg shadow-sm flex items-center justify-center hover:bg-surface-muted hover:border-accent/40 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <ChevronLeft className="h-6 w-6 text-accent" />
                  </button>

                  <div className="perspective-1000 flex-1 min-w-0">
                    <div
                      onClick={() => setRevealed((r) => !r)}
                      className={cx(
                        'preserve-3d relative w-full min-h-[380px] sm:min-h-[320px] max-h-[70vh] cursor-pointer transition-transform duration-500 rounded-2xl shadow-md select-none',
                        revealed && 'rotate-y-180'
                      )}
                    >
                      {/* Front of Card */}
                      <div className="backface-hidden absolute inset-0 flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 sm:p-8 hover:border-accent/50 transition">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-fg-subtle">
                            Card {index + 1} of {cards.length}
                          </span>
                          <div className="flex items-center gap-2">
                            {card.requirement_ids.map((id) => (
                              <Badge key={id} tone="accent">
                                {id}
                              </Badge>
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

                        <div className="my-auto min-h-0 overflow-y-auto py-6">
                          <p className="text-xl sm:text-2xl font-bold leading-relaxed text-fg text-center">
                            {card.front}
                          </p>
                        </div>

                        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-accent pt-2">
                          <RotateCw className="h-3.5 w-3.5" /> Click or press Space to reveal answer
                        </div>
                      </div>

                      {/* Back of Card (Rotated 180deg) */}
                      <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col justify-between rounded-2xl border-2 border-accent bg-surface p-6 sm:p-8 shadow-lg">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-accent">
                            Answer / Key Insights
                          </span>
                          <span className="text-xs font-semibold text-fg-subtle">Card {index + 1} of {cards.length}</span>
                        </div>

                        <div className="my-auto py-6 overflow-y-auto max-h-[200px]">
                          <p className="whitespace-pre-wrap text-base font-normal leading-relaxed text-fg text-left">
                            {card.back || 'No explicit answer outline provided.'}
                          </p>
                        </div>

                        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-fg-subtle pt-2">
                          <span>Rate your confidence below to continue</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Arrow Button - triggers rating popup */}
                  <button
                    type="button"
                    onClick={handleNextClick}
                    disabled={index >= cards.length - 1}
                    aria-label="Next card"
                    title="Next card (press j or Right Arrow to rate & advance)"
                    className="shrink-0 h-12 w-12 sm:h-14 sm:w-14 rounded-full border border-border bg-surface text-fg shadow-sm flex items-center justify-center hover:bg-surface-muted hover:border-accent/40 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <ChevronRight className="h-6 w-6 text-accent" />
                  </button>
                </div>

                {/* Centered Flip/Reveal Action */}
                <div className="flex justify-center pt-2">
                  <Button
                    variant={revealed ? 'secondary' : 'primary'}
                    size="lg"
                    onClick={() => setRevealed((r) => !r)}
                    icon={<RotateCw className="h-4 w-4" />}
                    className="px-8 font-semibold shadow-sm"
                  >
                    {revealed ? 'Flip to Question' : 'Reveal Answer'}
                  </Button>
                </div>

                {/* Keyboard shortcuts footer guide */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-xs text-fg-subtle">
                  <span><Kbd>Space</Kbd> flip</span>
                  <span>·</span>
                  <span><Kbd>→</Kbd> next & rate</span>
                  <span>·</span>
                  <span><Kbd>←</Kbd> previous</span>
                </div>

                {/* --- Confidence Rating Popup Modal --- */}
                {showRatingPopup && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl animate-scale-in text-center">
                      <h3 className="text-lg font-bold text-fg tracking-tight">
                        How confident were you with this card?
                      </h3>
                      <p className="mt-1 text-xs text-fg-muted">
                        Select a rating to record your progress and advance to the next card.
                      </p>

                      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {CONFIDENCE.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => void answer(c.value)}
                            className={cx(
                              'flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-surface transition text-center hover:scale-[1.03] active:scale-[0.98] shadow-sm',
                              c.color
                            )}
                          >
                            <div className="flex items-center gap-1.5 font-bold text-sm text-fg">
                              {c.icon}
                              <span>{c.label}</span>
                            </div>
                            <span className="text-xs text-fg-subtle mt-1.5">{c.hint}</span>
                            <span className="text-[10px] mt-2 text-fg-subtle font-mono opacity-80">
                              Press <Kbd>{c.value}</Kbd>
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            // Skip without rating
                            setShowRatingPopup(false);
                            setRevealed(false);
                            setIndex((i) => Math.min(i + 1, cards.length - 1));
                          }}
                          className="text-xs text-fg-subtle hover:text-fg font-medium transition"
                        >
                          Skip without rating →
                        </button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowRatingPopup(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </AsyncBoundary>
      </div>

      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset practice progress?"
        description="This permanently clears every confidence rating you've recorded for this kit's flashcards — Mastered, Need Review and Covered all go back to zero. It does not touch the kit itself."
        footer={
          <>
            <Button onClick={() => setConfirmReset(false)} data-autofocus>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={resetting}
              onClick={async () => {
                setResetting(true);
                try {
                  const res = await api.clearPractice(kitId);
                  setEvents(res.events);
                  setOrder(null);
                  setIndex(0);
                  setSessionDone(0);
                  setRevealed(false);
                  setAnnouncement('Practice progress reset.');
                } catch {
                  setAnnouncement('Could not reset progress.');
                } finally {
                  setResetting(false);
                  setConfirmReset(false);
                }
              }}
            >
              Reset to zero
            </Button>
          </>
        }
      />
    </AppShell>
  );
}

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

