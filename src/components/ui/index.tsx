'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { Eye, EyeOff, Sparkles, AlertTriangle, Layers, Award } from 'lucide-react';

export const cx = (...parts: (string | false | null | undefined)[]): string =>
  parts.filter(Boolean).join(' ');

// --- Button ---------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent-subtle';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-fg border-transparent shadow-sm hover:bg-accent/90 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
  secondary:
    'bg-surface text-fg border-border hover:bg-surface-muted hover:border-fg-subtle/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
  ghost:
    'bg-transparent text-fg-muted border-transparent hover:bg-surface-muted hover:text-fg active:scale-[0.98]',
  danger:
    'bg-transparent text-danger border-border hover:bg-danger-muted hover:border-danger/50 active:scale-[0.98]',
  'accent-subtle':
    'bg-accent-muted text-accent border-accent/20 hover:bg-accent-muted/80 active:scale-[0.98]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-md border font-medium transition duration-fast select-none cursor-pointer',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:active:scale-100',
        size === 'sm' && 'px-2.5 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2 text-sm',
        size === 'lg' && 'px-5 py-2.5 text-[15px]',
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : icon ? <span className="shrink-0">{icon}</span> : null}
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

export function Field({ label, hint, error, required, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5 text-left">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
          {label}
          {required ? <span className="ml-1 text-danger font-bold">*</span> : null}
        </label>
      </div>
      {hint ? (
        <p id={hintId} className="text-xs text-fg-subtle">
          {hint}
        </p>
      ) : null}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={errorId} role="alert" className="flex items-center gap-1.5 text-xs text-danger font-medium animate-fade-in">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

const CONTROL =
  'w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-subtle transition duration-fast ' +
  'focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-muted)] focus:outline-none';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cx(CONTROL, className)} {...rest} />;
});

/**
 * Modern password input with toggleable show/hide eye icon.
 */
export const PasswordInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { onVisibilityChange?: (visible: boolean) => void }
>(function PasswordInput({ className, ...rest }, ref) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative flex items-center">
      <input
        ref={ref}
        type={show ? 'text' : 'password'}
        className={cx(CONTROL, 'pr-10', className)}
        {...rest}
      />
      <button
        type="button"
        aria-label={show ? 'Hide password' : 'Show password'}
        onClick={() => setShow((v) => !v)}
        className="absolute right-2.5 p-1 text-fg-subtle hover:text-fg transition rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        tabIndex={0}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cx(CONTROL, 'resize-y leading-relaxed min-h-[100px]', className)} {...rest} />;
  },
);

// --- Surfaces -------------------------------------------------------------

export function Card({
  className,
  children,
  style,
  hover,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={cx(
        'rounded-xl border border-border bg-surface transition duration-fast',
        hover && 'hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md cursor-pointer',
        className,
      )}
      style={{ boxShadow: 'var(--shadow-sm)', ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * Ambient glow accents — subtle modern glow orbs.
 */
export function Orbs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
      <div
        className="absolute -left-20 -top-20 h-80 w-80 rounded-full blur-[100px]"
        style={{ background: 'radial-gradient(circle, var(--accent), transparent 70%)', opacity: 0.2 }}
      />
      <div
        className="absolute -right-20 top-1/3 h-96 w-96 rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(circle, var(--accent-2), transparent 70%)', opacity: 0.15 }}
      />
    </div>
  );
}

/** The modern PrepKit brand mark with vector icon */
export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims =
    size === 'sm'
      ? 'h-8 w-8 text-xs rounded-lg'
      : size === 'lg'
        ? 'h-12 w-12 text-lg rounded-2xl'
        : 'h-9 w-9 text-sm rounded-xl';
  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

  return (
    <span
      aria-hidden
      className={cx(
        'grid shrink-0 place-items-center font-bold text-accent-fg shadow-sm transition',
        'bg-accent',
        dims,
      )}
    >
      <Sparkles className={iconSize} />
    </span>
  );
}

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-fg-muted border-border',
  accent: 'bg-accent-muted text-accent border-accent/20',
  success: 'bg-success-muted text-success border-success/20',
  warning: 'bg-warning-muted text-warning border-warning/20',
  danger: 'bg-danger-muted text-danger border-danger/20',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide', TONES[tone], className)}>
      {children}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-[11px] text-fg-muted shadow-sm">
      {children}
    </kbd>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('shimmer rounded-lg bg-surface-muted', className)} aria-hidden />;
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
      className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
    >
      <div
        className="h-full rounded-full transition-all duration-300 ease-out bg-accent"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// --- Dialog ---------------------------------------------------------------

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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4" role="presentation">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-border bg-surface p-6 sm:max-w-lg shadow-xl animate-scale-in"
      >
        <h2 id={titleId} className="text-lg font-bold text-fg tracking-tight">
          {title}
        </h2>
        {description ? <p className="mt-1.5 text-sm text-fg-muted">{description}</p> : null}
        <div className="mt-5">{children}</div>
        {footer ? <div className="mt-6 flex justify-end gap-2.5">{footer}</div> : null}
      </div>
    </div>
  );
}

// --- Announcer ------------------------------------------------------------

export function LiveRegion({ message }: { message: string }) {
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}

export function Separator({ className }: { className?: string }) {
  return <hr className={cx('border-0 border-t border-border my-4', className)} />;
}

// --- Vector Illustrations -------------------------------------------------

export function VectorEmptyKits({ className = 'h-40 w-40' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="120" cy="120" r="100" fill="var(--surface-muted)" fillOpacity="0.4" />
      <circle cx="120" cy="120" r="75" stroke="var(--border)" strokeWidth="2" strokeDasharray="4 4" />
      
      {/* Document Stack */}
      <rect x="75" y="65" width="90" height="115" rx="8" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
      <rect x="65" y="75" width="90" height="115" rx="8" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
      <rect x="85" y="55" width="90" height="115" rx="8" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
      
      {/* Document Lines */}
      <line x1="102" y1="75" x2="155" y2="75" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      <line x1="102" y1="90" x2="145" y2="90" stroke="var(--fg-subtle)" strokeWidth="2" strokeLinecap="round" />
      <line x1="102" y1="102" x2="160" y2="102" stroke="var(--fg-subtle)" strokeWidth="2" strokeLinecap="round" />
      <line x1="102" y1="114" x2="135" y2="114" stroke="var(--fg-subtle)" strokeWidth="2" strokeLinecap="round" />
      
      {/* Sparkling Star */}
      <path
        d="M175 60L178 72L190 75L178 78L175 90L172 78L160 75L172 72L175 60Z"
        fill="var(--accent)"
      />
      <circle cx="80" cy="170" r="18" fill="var(--accent-muted)" />
      <path d="M74 170L78 174L86 166" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function VectorCompletedSession({ className = 'h-36 w-36' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="80" fill="var(--success-muted)" fillOpacity="0.4" />
      <circle cx="100" cy="100" r="60" fill="var(--surface)" stroke="var(--success)" strokeWidth="2" />
      <path
        d="M85 102L95 112L118 88"
        stroke="var(--success)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Decorative fireworks */}
      <circle cx="50" cy="60" r="4" fill="var(--accent)" />
      <circle cx="150" cy="55" r="5" fill="var(--warning)" />
      <circle cx="160" cy="140" r="3.5" fill="var(--success)" />
      <circle cx="45" cy="135" r="4.5" fill="var(--accent-2)" />
    </svg>
  );
}

