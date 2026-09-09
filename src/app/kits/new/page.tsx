'use client';

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
        title="New kit"
        subtitle="The job description is pasted as text — most job boards block automated access, so this is deliberate."
      />

      <div className="mt-5" role="tablist" aria-label="How many roles">
        <div className="inline-flex rounded border border-border bg-surface-muted p-0.5">
          {(['single', 'batch'] as Mode[]).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cx(
                'rounded px-3 py-1.5 text-sm font-medium transition',
                mode === m ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
              )}
            >
              {m === 'single' ? 'One role' : 'Several roles'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">{mode === 'single' ? <SingleForm /> : <BatchForm />}</div>
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
    setBusy(true);
    setError(null);
    try {
      const res = await api.createKit({ jd, company_url: url.trim(), days });
      router.push(`/kits/${res.kitId}${res.deduped ? '' : '?fresh=1'}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field
          label="Job description"
          hint="Paste the whole posting. A thin description will produce a thin kit that says so, rather than invented requirements."
          required
        >
          {({ id, describedBy }) => (
            <Textarea
              id={id}
              rows={12}
              required
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              aria-describedby={describedBy}
              placeholder={'Senior Backend Engineer\n\nRequirements\n- 5+ years…'}
            />
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
          <Field label="Company website" hint="The homepage is enough — the crawler finds the careers and hiring pages itself." required>
            {({ id, describedBy }) => (
              <Input
                id={id}
                type="text"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                aria-describedby={describedBy}
                placeholder="https://example.com"
              />
            )}
          </Field>

          <Field label="Days before the interview" hint="1 to 60.">
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

        <p className="text-xs text-fg-muted">
          {jd.trim().length.toLocaleString()} characters pasted.{' '}
          {jd.trim().length > 0 && jd.trim().length < 200 ? (
            <span className="text-warning">That is very short — expect a deliberately thin kit.</span>
          ) : null}
        </p>

        {error ? (
          <p role="alert" className="rounded border border-border bg-danger-muted px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" loading={busy}>
            Generate kit
          </Button>
          <span className="text-xs text-fg-muted">Takes about 60–120 seconds. You can watch each step.</span>
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
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
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

        <Button type="submit" variant="primary" loading={busy}>
          Generate {rows.filter((r) => r.jd.trim()).length || 0} kit(s)
        </Button>
      </form>
    </Card>
  );
}
