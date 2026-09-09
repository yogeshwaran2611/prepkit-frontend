'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, api, type KitSummary } from '@/lib/api';
import { AppShell } from '@/components/patterns/shell';
import { AsyncBoundary, PageHeader } from '@/components/patterns';
import { Badge, Button, Card, Dialog, Skeleton } from '@/components/ui';

export default function KitsPage() {
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
        title="Your kits"
        subtitle="Each kit turns one job description into a plan you can work through."
        actions={
          <Link href="/kits/new">
            <Button variant="primary">New kit</Button>
          </Link>
        }
      />

      <div className="mt-6">
        <AsyncBoundary
          loading={kits === null && !error}
          error={error}
          onRetry={load}
          empty={kits?.length === 0}
          emptyTitle="No kits yet"
          emptyBody="Paste a job description and the company's website address, and say how many days you have before the interview."
          emptyAction={
            <Link href="/kits/new">
              <Button variant="primary">Create your first kit</Button>
            </Link>
          }
          skeleton={
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          }
        >
          <ul className="space-y-3">
            {(kits ?? []).map((kit) => (
              <li key={kit.id}>
                <Card className="p-4 transition hover:border-accent">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/kits/${kit.id}`} className="block">
                        <h3 className="truncate text-sm font-semibold text-fg">
                          {kit.role || 'Untitled role'}
                          <span className="font-normal text-fg-muted"> at {kit.company}</span>
                        </h3>
                      </Link>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                        <StatusBadge status={kit.status} />
                        <span>{kit.days} day plan</span>
                        {kit.status === 'ready' ? <span>{kit.questionCount} questions</span> : null}
                        {kit.uncoveredMusts > 0 ? (
                          <Badge tone="warning">{kit.uncoveredMusts} must-have uncovered</Badge>
                        ) : null}
                        <span className="text-fg-subtle">{new Date(kit.updatedAt).toLocaleString()}</span>
                      </div>
                      {kit.error ? (
                        <p className="mt-2 text-xs text-danger">{kit.error.message}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Link href={`/kits/${kit.id}`}>
                        <Button size="sm">Open</Button>
                      </Link>
                      <Button size="sm" variant="danger" onClick={() => setConfirmDelete(kit)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </AsyncBoundary>
      </div>

      <Dialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Delete this kit?"
        description={`"${confirmDelete?.role || 'Untitled'}" at ${confirmDelete?.company ?? ''}. This cannot be undone, including any edits you made.`}
        footer={
          <>
            <Button onClick={() => setConfirmDelete(null)} data-autofocus>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const id = confirmDelete!.id;
                setConfirmDelete(null);
                void api.deleteKit(id).then(load);
              }}
            >
              Delete
            </Button>
          </>
        }
      />
    </AppShell>
  );
}

function StatusBadge({ status }: { status: KitSummary['status'] }) {
  if (status === 'ready') return <Badge tone="success">ready</Badge>;
  if (status === 'failed') return <Badge tone="danger">failed</Badge>;
  if (status === 'running') return <Badge tone="accent">generating…</Badge>;
  return <Badge>queued</Badge>;
}
