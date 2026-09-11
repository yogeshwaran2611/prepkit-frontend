'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { AppShell } from '@/components/patterns/shell';
import { PageHeader } from '@/components/patterns';
import { Badge, Button, Card, Field, Input, Textarea, cx } from '@/components/ui';

type Mode = 'single' | 'batch';

export default function NewKitPage() {
  const [mode, setMode] = useState<Mode>('single');

  return (
    <AppShell>
      <PageHeader
        title="Create New Kit"
        subtitle="Paste a job description and company website. Research and questions are generated autonomously."
        back={{ href: '/kits', label: 'Back to your kits' }}
      />

      <div className="animate-fade-up mt-5" role="tablist" aria-label="How many roles" style={{ animationDelay: '60ms' }}>
        <div className="relative inline-flex rounded-md border border-border bg-surface-muted p-1">
          {(['single', 'batch'] as Mode[]).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cx(
                'relative z-10 rounded px-4 py-1.5 text-sm font-medium transition duration-fast',
                mode === m ? 'text-fg' : 'text-fg-muted hover:text-fg',
              )}
            >
              {mode === m ? (
                <span
                  aria-hidden
                  className="absolute inset-0 -z-10 rounded bg-surface"
                  style={{ boxShadow: 'var(--shadow-sm)' }}
                />
              ) : null}
              {m === 'single' ? 'One role' : 'Several roles'}
            </button>
          ))}
        </div>
      </div>

      <div className="animate-fade-up mt-4" style={{ animationDelay: '110ms' }}>
        {mode === 'single' ? <SingleForm /> : <BatchForm />}
      </div>
    </AppShell>
  );
}

function SingleForm() {
  const router = useRouter();
  const [jd, setJd] = useState('');
  const [url, setUrl] = useState('');
  const [days, setDays] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jd.trim()) {
      setError('Please paste the job description text.');
      return;
    }
    if (!url.trim()) {
      setError('Please enter the target company website URL.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.createKit({ jd, company_url: url.trim(), days });
      router.push(`/kits/${res.kitId}${res.deduped ? '' : '?fresh=1'}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
      setBusy(false);
    }
  };

  const charCount = jd.trim().length;

  return (
    <Card className="p-6 sm:p-7 shadow-md border-border bg-surface">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field
          label="Job Description"
          hint="Paste the complete posting. Requirements will be extracted verbatim with strict provenance."
          required
        >
          {({ id, describedBy }) => (
            <Textarea
              id={id}
              rows={10}
              required
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              aria-describedby={describedBy}
              placeholder={'Senior Full-Stack Engineer\n\nAbout the Role:\nWe are looking for an experienced engineer to lead our product team...\n\nRequirements:\n- 5+ years with React & TypeScript\n- Experience designing scalable distributed systems\n- Mentoring junior engineers'}
            />
          )}
        </Field>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-fg-muted font-mono">{charCount.toLocaleString()} chars</span>
            {charCount > 0 && charCount < 200 ? (
              <Badge tone="warning">Short posting — will produce honest minimal kit</Badge>
            ) : charCount >= 200 ? (
              <Badge tone="success">Detailed posting</Badge>
            ) : null}
          </div>
          <span className="text-fg-subtle">Respects robots.txt & SSR crawler</span>
        </div>

        <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
          <Field label="Target Company Website" hint="Homepage or careers page (e.g. https://posthog.com)" required>
            {({ id, describedBy }) => (
              <Input
                id={id}
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                aria-describedby={describedBy}
                placeholder="https://company.com"
              />
            )}
          </Field>

          <Field label="Days Available" hint="1 to 60 calendar days" required>
            {({ id, describedBy }) => (
              <Input
                id={id}
                type="number"
                min={1}
                max={60}
                required
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                aria-describedby={describedBy}
              />
            )}
          </Field>
        </div>

        {error ? (
          <div role="alert" className="animate-fade-in rounded-lg border border-danger/30 bg-danger-muted p-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button type="submit" variant="primary" size="lg" loading={busy} className="font-semibold">
            Generate Interview Kit
          </Button>
          <Link href="/kits">
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </Link>
          <span className="text-xs text-fg-subtle">Researches hiring pages, extracts must-haves & runs 2-pass coverage.</span>
        </div>
      </form>
    </Card>
  );
}

interface BatchRow {
  jd: string;
  company_url: string;
  days: number;
}

function BatchForm() {
  const router = useRouter();
  const [rows, setRows] = useState<BatchRow[]>([{ jd: '', company_url: '', days: 5 }]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (i: number, patch: Partial<BatchRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  /** Accepts the same shape as the evaluate CLI, so one file works in both places. */
  const onFile = async (file: File) => {
    setError(null);
    try {
      const parsed = JSON.parse(await file.text()) as BatchRow[];
      if (!Array.isArray(parsed)) throw new Error('The file must contain a JSON array.');
      setRows(
        parsed.slice(0, 10).map((r) => ({
          jd: String(r.jd ?? ''),
          company_url: String(r.company_url ?? ''),
          days: Number(r.days ?? 5),
        })),
      );
    } catch (e) {
      setError(`Could not read that file: ${(e as Error).message}`);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const valid = rows.filter((r) => r.jd.trim() && r.company_url.trim());
      if (!valid.length) throw new ApiError(400, { code: 'INVALID_INPUT', message: 'Add at least one role.' });
      await api.createBatch(valid);
      router.push('/kits');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6" style={{ boxShadow: 'var(--shadow-md)' }}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div className="rounded border border-border bg-surface-muted p-3">
          <label className="text-sm font-medium text-fg" htmlFor="cases-file">
            Upload a file of description-and-company pairs
          </label>
          <p className="mt-1 text-xs text-fg-muted">
            JSON array of <code className="font-mono">{'{ jd, company_url, days }'}</code> — the same shape the{' '}
            <code className="font-mono">npm run evaluate</code> command reads.
          </p>
          <input
            id="cases-file"
            type="file"
            accept="application/json,.json"
            className="mt-2 text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
        </div>

        {rows.map((row, i) => (
          <div key={i} className="space-y-3 rounded border border-border p-3">
            <div className="flex items-center justify-between">
              <Badge>Role {i + 1}</Badge>
              {rows.length > 1 ? (
                <Button size="sm" variant="ghost" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>
                  Remove
                </Button>
              ) : null}
            </div>
            <Textarea
              rows={4}
              value={row.jd}
              onChange={(e) => update(i, { jd: e.target.value })}
              placeholder="Paste the job description"
              aria-label={`Job description for role ${i + 1}`}
            />
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
              <Input
                value={row.company_url}
                onChange={(e) => update(i, { company_url: e.target.value })}
                placeholder="https://example.com"
                aria-label={`Company website for role ${i + 1}`}
              />
              <Input
                type="number"
                min={1}
                max={60}
                value={row.days}
                onChange={(e) => update(i, { days: Number(e.target.value) })}
                aria-label={`Days for role ${i + 1}`}
              />
            </div>
          </div>
        ))}

        {rows.length < 10 ? (
          <Button onClick={() => setRows((rs) => [...rs, { jd: '', company_url: '', days: 5 }])}>Add another role</Button>
        ) : null}

        {error ? (
          <p role="alert" className="rounded border border-border bg-danger-muted px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" size="lg" loading={busy}>
            Generate {rows.filter((r) => r.jd.trim()).length || 0} kit(s)
          </Button>
          <Link href="/kits">
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </Card>
  );
}
