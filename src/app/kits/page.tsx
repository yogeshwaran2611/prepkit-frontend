'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, api, type KitSummary } from '@/lib/api';
import { AppShell } from '@/components/patterns/shell';
import { AsyncBoundary, PageHeader, Reveal } from '@/components/patterns';
import { Badge, Button, Card, Dialog, Skeleton, VectorEmptyKits } from '@/components/ui';
import { 
  Plus, 
  Briefcase, 
  Calendar, 
  HelpCircle, 
  AlertTriangle, 
  ArrowUpRight, 
  Trash2, 
  Loader2,
  CheckCircle,
  Clock
} from 'lucide-react';

export default function KitsPage() {
  const router = useRouter();
  const [kits, setKits] = useState<KitSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<KitSummary | null>(null);

  const load = useCallback(() => {
    setError(null);
    void api
      .listKits()
      .then(setKits)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Could not load your kits.'));
  }, []);

  useEffect(load, [load]);

  // A queued or running kit needs no manual refresh to become readable.
  useEffect(() => {
    if (!kits?.some((k) => k.status === 'queued' || k.status === 'running')) return;
    const timer = setInterval(load, 4_000);
    return () => clearInterval(timer);
  }, [kits, load]);

  return (
    <AppShell>
      <PageHeader
        title="Your Interview Kits"
        subtitle="Each kit crawls company intelligence and maps requirements to interview questions, flashcards, and a day-by-day plan."
        actions={
          <Link href="/kits/new">
            <Button variant="primary" size="md" icon={<Plus className="h-4 w-4" />}>
              Create New Kit
            </Button>
          </Link>
        }
      />

      <div className="mt-7">
        <AsyncBoundary
          loading={kits === null && !error}
          error={error}
          onRetry={load}
          empty={kits?.length === 0}
          emptyIllustration={<VectorEmptyKits className="h-36 w-36" />}
          emptyTitle="No interview kits created yet"
          emptyBody="Paste a job description and company website. Our pipeline will research the company, extract must-haves, generate flashcards, and build an adaptive preparation schedule."
          emptyAction={
            <Link href="/kits/new">
              <Button variant="primary" size="lg" icon={<Plus className="h-4 w-4" />}>
                Build your first kit
              </Button>
            </Link>
          }
          skeleton={
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          }
        >
          <div className="grid gap-4 sm:grid-cols-1">
            {(kits ?? []).map((kit, index) => (
              <Reveal key={kit.id} index={index}>
                <Card
                  hover
                  className="group relative overflow-hidden p-0 border-border bg-surface transition-all"
                  // Mouse convenience only — "Open Kit" below remains the keyboard-reachable
                  // path (Tab + Enter), since nesting a click target around other real
                  // buttons/links is not something a screen reader should announce as one
                  // more button.
                  onClick={() => router.push(`/kits/${kit.id}`)}
                >
                  <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${accentBar(kit.status)}`} />
                  <div className="flex flex-wrap items-center justify-between gap-4 p-5 pl-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <StatusBadge status={kit.status} />
                        <span className="text-xs text-fg-subtle flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(kit.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      
                      <Link href={`/kits/${kit.id}`} className="block group" onClick={(e) => e.stopPropagation()}>
                        <h3 className="truncate text-lg font-bold text-fg group-hover:text-accent transition">
                          {kit.role || 'Untitled role'}
                          <span className="font-normal text-fg-muted"> · {kit.company}</span>
                        </h3>
                      </Link>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-fg-muted">
                        <span className="inline-flex items-center gap-1.5 bg-surface-muted px-2.5 py-1 rounded-md">
                          <Calendar className="h-3.5 w-3.5 text-accent" />
                          <span className="font-semibold text-fg">{kit.days}</span> days
                        </span>

                        {kit.status === 'ready' ? (
                          <span className="inline-flex items-center gap-1.5 bg-surface-muted px-2.5 py-1 rounded-md">
                            <HelpCircle className="h-3.5 w-3.5 text-accent-2" />
                            <span className="font-semibold text-fg">{kit.questionCount}</span> questions
                          </span>
                        ) : null}

                        {kit.uncoveredMusts > 0 ? (
                          <Badge tone="warning" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            <span>{kit.uncoveredMusts} uncovered must-have</span>
                          </Badge>
                        ) : null}
                      </div>

                      {kit.error ? (
                        <p className="mt-2 text-xs font-medium text-danger flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" /> {kit.error.message}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/kits/${kit.id}`}>
                        <Button size="sm" variant="secondary" icon={<ArrowUpRight className="h-3.5 w-3.5" />}>
                          Open Kit
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmDelete(kit)}
                        className="text-fg-subtle hover:text-danger"
                        aria-label={`Delete kit for ${kit.role}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        </AsyncBoundary>
      </div>

      <Dialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Delete this kit?"
        description={`"${confirmDelete?.role || 'Untitled'}" at ${confirmDelete?.company ?? ''}. This will permanently remove the generated brief, questions, flashcards, and study schedule.`}
        footer={
          <>
            <Button onClick={() => setConfirmDelete(null)} data-autofocus>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const id = confirmDelete!.id;
                setConfirmDelete(null);
                void api.deleteKit(id).then(load);
              }}
            >
              Delete Kit
            </Button>
          </>
        }
      />
    </AppShell>
  );
}

function accentBar(status: KitSummary['status']): string {
  if (status === 'ready') return 'bg-success';
  if (status === 'failed') return 'bg-danger';
  if (status === 'running') return 'bg-accent animate-pulse';
  return 'bg-border';
}

function StatusBadge({ status }: { status: KitSummary['status'] }) {
  if (status === 'ready')
    return (
      <Badge tone="success">
        <CheckCircle className="h-3 w-3" /> Ready
      </Badge>
    );
  if (status === 'failed')
    return (
      <Badge tone="danger">
        <AlertTriangle className="h-3 w-3" /> Failed
      </Badge>
    );
  if (status === 'running')
    return (
      <Badge tone="accent">
        <Loader2 className="h-3 w-3 animate-spin" /> Generating…
      </Badge>
    );
  return <Badge>Queued</Badge>;
}

