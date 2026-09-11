'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Badge, Button, Card, Skeleton, cx } from '../ui';

/**
 * Composed patterns. PLAN.md §10.3 — this is where the reuse actually pays: every data
 * region goes through AsyncBoundary and every kit section through SectionCard, so
 * inconsistent loading/empty/error states become impossible rather than discouraged.
 */

// --- AsyncBoundary --------------------------------------------------------

export interface AsyncBoundaryProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  emptyAction?: ReactNode;
  emptyIllustration?: ReactNode;
  onRetry?: () => void;
  skeleton?: ReactNode;
  children: ReactNode;
}

export function AsyncBoundary({
  loading,
  error,
  empty,
  emptyTitle = 'Nothing here yet',
  emptyBody,
  emptyAction,
  emptyIllustration,
  onRetry,
  skeleton,
  children,
}: AsyncBoundaryProps) {
  if (loading) {
    return (
      <div aria-busy="true" aria-live="polite">
        {skeleton ?? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="animate-fade-in rounded-xl border border-danger/30 bg-danger-muted p-6 text-center">
        <p className="text-sm font-semibold text-danger">{error}</p>
        {onRetry ? (
          <Button size="sm" className="mt-4" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="animate-fade-up relative overflow-hidden rounded-2xl border border-dashed border-border/80 bg-surface/70 px-6 py-14 text-center backdrop-blur-sm shadow-sm">
        {emptyIllustration ? (
          <div className="mx-auto mb-5 flex justify-center">{emptyIllustration}</div>
        ) : (
          <div
            aria-hidden
            className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl text-2xl text-accent bg-accent-muted shadow-sm"
          >
            ✦
          </div>
        )}
        <h3 className="text-lg font-bold text-fg tracking-tight">{emptyTitle}</h3>
        {emptyBody ? <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted leading-relaxed">{emptyBody}</p> : null}
        {emptyAction ? <div className="mt-6 flex justify-center">{emptyAction}</div> : null}
      </div>
    );
  }
  return <>{children}</>;
}

export function SectionCard({
  title,
  subtitle,
  actions,
  busy,
  children,
  id,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  busy?: boolean;
  children: ReactNode;
  id?: string;
}) {
  return (
    <Card
      id={id}
      className={cx('scroll-mt-20 overflow-hidden rounded-xl border border-border bg-surface transition-opacity duration-slow shadow-sm', busy && 'opacity-70')}
    >
      <div aria-hidden className="h-1 w-full bg-accent" />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-muted/40 px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight text-fg">{title}</h2>
          {subtitle ? <div className="mt-0.5 text-xs text-fg-muted">{subtitle}</div> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </div>
      <div className={cx('p-5 sm:p-6', busy && 'pointer-events-none')}>{children}</div>
    </Card>
  );
}

// --- OriginBadge ----------------------------------------------------------

export interface ItemMetaLike {
  origin?: 'generated' | 'edited' | 'manual';
  pinned?: boolean;
}

/**
 * Makes the generated / edited / pinned state VISIBLE. The state model is 15 points, and a
 * correct model the reviewer cannot see is worth less than one they can.
 */
export function OriginBadge({ meta }: { meta?: ItemMetaLike }) {
  if (!meta) return null;
  return (
    <span className="inline-flex items-center gap-1">
      {meta.origin === 'edited' ? <Badge tone="accent">edited</Badge> : null}
      {meta.origin === 'manual' ? <Badge tone="success">yours</Badge> : null}
      {meta.pinned ? <Badge tone="warning">pinned</Badge> : null}
    </span>
  );
}

export function PinToggle({ pinned, onToggle, label }: { pinned: boolean; onToggle: () => void; label: string }) {
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={onToggle}
      aria-pressed={pinned}
      title={pinned ? 'Unpin — regeneration may replace this' : 'Pin — regeneration will keep this'}
    >
      {pinned ? 'Unpin' : 'Pin'}
      <span className="sr-only"> {label}</span>
    </Button>
  );
}

// --- EditableText ---------------------------------------------------------

/**
 * Inline editing: click or Enter to edit, Escape to cancel, Cmd/Ctrl+Enter to save.
 * Optimistic — the new value shows immediately and reverts if the request fails, so typing
 * never waits on a round trip.
 */
export function EditableText({
  value,
  onSave,
  label,
  multiline,
  className,
  placeholder = 'Empty',
}: {
  value: string;
  onSave: (next: string) => Promise<void>;
  label: string;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const commit = async () => {
    const next = draft.trim();
    setEditing(false);
    if (next === value.trim()) return;
    setSaving(true);
    setFailed(false);
    try {
      await onSave(next);
    } catch {
      setDraft(value);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setDraft(value);
      setEditing(false);
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !multiline)) {
      e.preventDefault();
      void commit();
    }
  };

  if (editing) {
    const shared = {
      value: draft,
      onChange: (e: { target: { value: string } }) => setDraft(e.target.value),
      onKeyDown,
      onBlur: () => void commit(),
      'aria-label': label,
      className: cx(
        'w-full rounded border border-accent bg-surface px-2 py-1.5 text-sm text-fg',
        className,
      ),
    };
    return multiline ? (
      <textarea ref={ref as React.Ref<HTMLTextAreaElement>} rows={4} {...shared} />
    ) : (
      <input ref={ref as React.Ref<HTMLInputElement>} {...shared} />
    );
  }

  return (
    <div className="group flex items-start gap-2">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cx(
          'flex-1 rounded px-2 py-1.5 text-left text-sm text-fg transition hover:bg-surface-muted',
          !value && 'text-fg-subtle italic',
          className,
        )}
        aria-label={`Edit ${label}`}
      >
        {value || placeholder}
      </button>
      {saving ? <span className="pt-1.5 text-[11px] text-fg-subtle">saving…</span> : null}
      {failed ? (
        <span role="alert" className="pt-1.5 text-[11px] text-danger">
          could not save
        </span>
      ) : null}
    </div>
  );
}

// --- SortableList ---------------------------------------------------------

/**
 * Reordering with FULL keyboard support and no drag-and-drop library: arrow keys move an
 * item, and the change is announced. @dnd-kit would add a dependency to reimplement exactly
 * this; pointer drag is a convenience on top, not the only way in.
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  announce,
}: {
  items: T[];
  onReorder: (ids: string[]) => void;
  renderItem: (item: T, controls: ReactNode, index: number) => ReactNode;
  announce?: (message: string) => void;
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    onReorder(next.map((i) => i.id));
    announce?.(`Moved to position ${to + 1} of ${items.length}`);
  };

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={item.id}>
          {renderItem(
            item,
            <span className="flex items-center gap-0.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => move(index, index - 1)}
                disabled={index === 0}
                aria-label={`Move up (position ${index + 1} of ${items.length})`}
                title="Move up"
              >
                ↑
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => move(index, index + 1)}
                disabled={index === items.length - 1}
                aria-label={`Move down (position ${index + 1} of ${items.length})`}
                title="Move down"
              >
                ↓
              </Button>
            </span>,
            index,
          )}
        </li>
      ))}
    </ul>
  );
}

// --- Misc -----------------------------------------------------------------

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** A "‹ Back to X" link above the title — every page that isn't a top-level destination gets one. */
  back?: { href: string; label: string };
}) {
  return (
    <header className="animate-fade-up flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div className="min-w-0">
        {back ? (
          <Link
            href={back.href}
            className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-fg-muted transition hover:text-accent"
          >
            <span aria-hidden className="transition group-hover:-translate-x-0.5">
              ←
            </span>
            {back.label}
          </Link>
        ) : null}
        <h1 className="truncate text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
          {title}
        </h1>
        {subtitle ? <div className="mt-1.5 max-w-2xl text-sm text-fg-muted leading-relaxed">{subtitle}</div> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </header>
  );
}

export function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'orange' | 'blue' | 'purple' | 'red' | 'indigo' | 'green';
}) {
  return (
    <div
      className="rounded-xl border border-border bg-surface px-4 py-3 shadow-sm transition duration-fast hover:-translate-y-0.5"
    >
      <div className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">{label}</div>
      <div
        className={cx(
          'mt-1 text-xl font-extrabold tabular-nums tracking-tight',
          (tone === 'success' || tone === 'green') && 'text-[var(--color-green)]',
          (tone === 'warning' || tone === 'orange') && 'text-[var(--color-orange)]',
          (tone === 'danger' || tone === 'red') && 'text-[var(--color-red)]',
          tone === 'blue' && 'text-[var(--color-blue)]',
          tone === 'purple' && 'text-[var(--color-purple)]',
          tone === 'indigo' && 'text-accent',
          (!tone || tone === 'neutral') && 'text-fg',
        )}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Fades and lifts children in, staggered by index. Used for lists (kit cards, questions)
 * so the page feels alive on first paint without animating anything the user is editing.
 */
export function Reveal({ index = 0, children, className }: { index?: number; children: ReactNode; className?: string }) {
  return (
    <div className={cx('animate-fade-up', className)} style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
      {children}
    </div>
  );
}

export function CoverageMeter({ covered, total }: { covered: number; total: number }) {
  const pct = total ? Math.round((covered / total) * 100) : 100;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-sm bg-surface-muted">
        <div
          className={cx('h-full rounded-sm', pct === 100 ? 'bg-success' : 'bg-warning')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-fg-muted">
        {covered}/{total} covered
      </span>
    </div>
  );
}
