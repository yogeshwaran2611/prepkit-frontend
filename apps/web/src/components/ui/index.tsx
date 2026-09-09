'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';

/**
 * UI primitives. PLAN.md §10.3.
 *
 * Hand-written rather than pulled from shadcn/ui: the app needs about a dozen primitives,
 * and Radix would add a dependency tree to solve accessibility problems that are a focus
 * trap and an aria-live region here. Every one of these is keyboard-operable.
 */

export const cx = (...parts: (string | false | null | undefined)[]): string =>
  parts.filter(Boolean).join(' ');

// --- Button ---------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg hover:opacity-90 border-transparent',
  secondary: 'bg-surface text-fg border-border hover:bg-surface-muted',
  ghost: 'bg-transparent text-fg-muted border-transparent hover:bg-surface-muted hover:text-fg',
  danger: 'bg-transparent text-danger border-border hover:bg-danger-muted',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded border font-medium transition',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm',
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
});

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cx('inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent', className)}
    />
  );
}

// --- Form fields ----------------------------------------------------------

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

/** Wires label, hint and error to the control so screen readers get all three. */
export function Field({ label, hint, error, required, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="text-xs text-fg-muted">
          {hint}
        </p>
      ) : null}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const CONTROL =
  'w-full rounded border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle transition focus:border-accent';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cx(CONTROL, className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cx(CONTROL, 'resize-y leading-relaxed', className)} {...rest} />;
  },
);

// --- Surfaces -------------------------------------------------------------

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx('rounded-lg border border-border bg-surface', className)}
      style={{ boxShadow: 'var(--shadow-sm)' }}
      {...rest}
    >
      {children}
    </div>
  );
}

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-fg-muted border-border',
  accent: 'bg-accent-muted text-accent border-transparent',
  success: 'bg-success-muted text-success border-transparent',
  warning: 'bg-warning-muted text-warning border-transparent',
  danger: 'bg-danger-muted text-danger border-transparent',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium', TONES[tone], className)}>
      {children}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-sm border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-[11px] text-fg-muted">
      {children}
    </kbd>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('shimmer rounded bg-surface-muted', className)} aria-hidden />;
}

export function Progress({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      {...(label ? { 'aria-label': label } : {})}
      className="h-1.5 w-full overflow-hidden rounded-sm bg-surface-muted"
    >
      <div className="h-full rounded-sm bg-accent transition-slow" style={{ width: `${pct}%` }} />
    </div>
  );
}

// --- Dialog ---------------------------------------------------------------

/**
 * Focus-trapped, Escape-closable, and it restores focus to whatever opened it. On small
 * screens it becomes a bottom sheet — same component, no second implementation.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>('[data-autofocus], button, input, textarea, a[href]')?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>('button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])')].filter(
        (el) => !el.hasAttribute('disabled'),
      );
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <div className="absolute inset-0 bg-fg/25" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-xl border border-border bg-surface p-5 sm:max-w-lg sm:rounded-xl"
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        <h2 id={titleId} className="text-base font-semibold text-fg">
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm text-fg-muted">{description}</p> : null}
        <div className="mt-4">{children}</div>
        {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}

// --- Announcer ------------------------------------------------------------

/**
 * A single aria-live region. Save, reorder and regeneration outcomes are announced here,
 * which is what makes those actions perceivable without sight of a toast.
 */
export function LiveRegion({ message }: { message: string }) {
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}

export function Separator({ className }: { className?: string }) {
  return <hr className={cx('border-0 border-t border-border', className)} />;
}
