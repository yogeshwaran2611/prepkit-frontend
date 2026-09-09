'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Flashcard, Kit, Question, QuestionCategory, Requirement } from '@/lib/kit-types';
import {
  AsyncBoundary,
  CoverageMeter,
  EditableText,
  OriginBadge,
  PinToggle,
  SectionCard,
  SortableList,
  StatChip,
} from '@/components/patterns';
import { Badge, Button, Card, Dialog, Field, Input, Separator, Textarea, cx } from '@/components/ui';

/** Kit sections. Each one is a SectionCard, which is what makes the page read as one product. */

export const CATEGORIES: QuestionCategory[] = ['technical', 'behavioural', 'system-design', 'company-fit'];

export const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  technical: 'Technical',
  behavioural: 'Behavioural',
  'system-design': 'System design',
  'company-fit': 'Company fit',
};

export interface KitActions {
  patch: (itemId: string, section: string, patch: Record<string, unknown>) => Promise<void>;
  reorder: (section: 'questions' | 'flashcards', ids: string[]) => Promise<void>;
  add: (body: Record<string, unknown>) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  regenerate: (scope: string) => Promise<void>;
  announce: (message: string) => void;
  busyScope: string | null;
}

// --- Notes: honest reporting, rendered as plain sentences -------------------

export function NotesPanel({ kit }: { kit: Kit }) {
  if (!kit.notes?.length) return null;
  return (
    <SectionCard
      title="What we could and could not find"
      subtitle="Reported honestly rather than filled in with guesses."
      id="notes"
    >
      <ul className="space-y-2">
        {kit.notes.map((note) => (
          <li key={note.code} className="flex items-start gap-2 text-sm">
            <Badge tone={note.code === 'FALLBACK_QUESTION_USED' ? 'warning' : 'neutral'}>{note.code}</Badge>
            <span className="text-fg-muted">{note.message}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

// --- Company brief ---------------------------------------------------------

export function CompanyBriefSection({ kit, actions }: { kit: Kit; actions: KitActions }) {
  const confidence = kit.company_brief.confidence ?? 'low';
  const empty = !kit.company_brief.what_they_do.trim();

  return (
    <SectionCard
      id="brief"
      title="Company brief"
      busy={actions.busyScope === 'company_brief'}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <Badge tone={confidence === 'none' ? 'warning' : confidence === 'high' ? 'success' : 'neutral'}>
            confidence: {confidence}
          </Badge>
          <span>{kit.company_brief.sources.length} source(s) actually fetched</span>
        </span>
      }
    >
      <AsyncBoundary
        empty={empty}
        emptyTitle="No grounded brief"
        emptyBody="We could not find enough public information to write an honest brief. Nothing here is guessed."
      >
        <div className="space-y-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">What they do</h3>
            <EditableText
              label="what they do"
              value={kit.company_brief.what_they_do}
              onSave={(v) => actions.patch('company_brief', 'company_brief', { what_they_do: v })}
            />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Summary</h3>
            <EditableText
              label="company summary"
              multiline
              value={kit.company_brief.summary}
              onSave={(v) => actions.patch('company_brief', 'company_brief', { summary: v })}
            />
          </div>
          {kit.company_brief.hiring_process ? (
            <div className="rounded border border-border bg-accent-muted p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-accent">Their published hiring process</h3>
              <p className="mt-1 text-sm text-fg">{kit.company_brief.hiring_process}</p>
              <p className="mt-2 text-xs text-fg-muted">
                This is what shaped the question mix — a published take-home and design round produce a different
                kit from a company that says nothing.
              </p>
            </div>
          ) : null}
          {kit.company_brief.sources.length ? (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Sources</h3>
              <ul className="mt-1 space-y-1">
                {kit.company_brief.sources.map((s) => (
                  <li key={s}>
                    <a
                      href={s}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="break-all text-xs text-accent underline"
                    >
                      {s}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </AsyncBoundary>
    </SectionCard>
  );
}

// --- Role and requirements -------------------------------------------------

export function RoleSection({ kit }: { kit: Kit }) {
  const musts = kit.role.requirements.filter((r) => r.priority === 'must');
  const covered = useMemo(() => {
    const set = new Set(kit.questions.flatMap((q) => q.requirement_ids));
    return musts.filter((r) => set.has(r.id)).length;
  }, [kit.questions, musts]);

  return (
    <SectionCard
      id="role"
      title="The role"
      subtitle={
        <span className="flex flex-wrap items-center gap-3">
          <span>
            {kit.role.requirements.length} requirements · {musts.length} must-have
          </span>
          <CoverageMeter covered={covered} total={musts.length} />
        </span>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <StatChip label="Title" value={kit.role.title || '—'} />
          <StatChip label="Seniority" value={kit.role.seniority || 'not stated'} />
          <StatChip label="Location" value={kit.source.location || 'not stated'} />
        </div>

        {kit.role.responsibilities.length ? (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Responsibilities</h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-fg-muted">
              {kit.role.responsibilities.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Requirements</h3>
          <ul className="mt-2 space-y-1.5">
            {kit.role.requirements.map((r) => (
              <RequirementRow key={r.id} requirement={r} kit={kit} />
            ))}
          </ul>
        </div>
      </div>
    </SectionCard>
  );
}

function RequirementRow({ requirement, kit }: { requirement: Requirement; kit: Kit }) {
  const questionCount = kit.questions.filter((q) => q.requirement_ids.includes(requirement.id)).length;
  return (
    <li className="flex flex-wrap items-start gap-2 rounded border border-border px-2.5 py-2">
      <Badge tone={requirement.priority === 'must' ? 'accent' : 'neutral'}>{requirement.priority}</Badge>
      <Badge>{requirement.kind}</Badge>
      <span className="min-w-0 flex-1 text-sm text-fg">{requirement.text}</span>
      <span
        className={cx('text-xs', questionCount === 0 && requirement.priority === 'must' ? 'text-danger' : 'text-fg-subtle')}
      >
        {questionCount} question{questionCount === 1 ? '' : 's'}
      </span>
      {requirement.provenance ? (
        <span
          className="text-[11px] text-fg-subtle"
          title={`Quoted verbatim from the job description: "${requirement.provenance.source_span}"`}
        >
          verified
        </span>
      ) : null}
    </li>
  );
}

// --- Question bank ---------------------------------------------------------

export function QuestionBank({ kit, actions }: { kit: Kit; actions: KitActions }) {
  const [active, setActive] = useState<QuestionCategory>('technical');
  const [adding, setAdding] = useState(false);

  const byCategory = useMemo(() => {
    const map = new Map<QuestionCategory, Question[]>();
    for (const c of CATEGORIES) map.set(c, []);
    for (const q of kit.questions) map.get(q.category)?.push(q);
    return map;
  }, [kit.questions]);

  const questions = byCategory.get(active) ?? [];
  const scope = `questions:${active}`;
  const busy = actions.busyScope === scope;

  return (
    <SectionCard
      id="questions"
      title="Question bank"
      busy={busy}
      subtitle={`${kit.questions.length} questions. Regenerating one category never touches the others, your edits, or anything you pinned.`}
      actions={
        <>
          <Button size="sm" onClick={() => setAdding(true)}>
            Add question
          </Button>
          <Button size="sm" variant="primary" loading={busy} onClick={() => void actions.regenerate(scope)}>
            Regenerate {CATEGORY_LABELS[active].toLowerCase()}
          </Button>
        </>
      }
    >
      <div role="tablist" aria-label="Question categories" className="scroll-x -mx-1 flex gap-1 px-1 pb-3">
        {CATEGORIES.map((c) => {
          const count = byCategory.get(c)?.length ?? 0;
          return (
            <button
              key={c}
              role="tab"
              aria-selected={active === c}
              onClick={() => setActive(c)}
              className={cx(
                'shrink-0 rounded border px-2.5 py-1.5 text-xs font-medium transition',
                active === c
                  ? 'border-accent bg-accent-muted text-accent'
                  : 'border-border text-fg-muted hover:bg-surface-muted',
              )}
            >
              {CATEGORY_LABELS[c]} <span className="text-fg-subtle">({count})</span>
            </button>
          );
        })}
      </div>

      <AsyncBoundary
        empty={questions.length === 0}
        emptyTitle={`No ${CATEGORY_LABELS[active].toLowerCase()} questions`}
        emptyBody={
          active === 'system-design'
            ? 'System design questions are only generated for roles where they make sense — a junior role at a company that publishes no design round does not get them.'
            : 'Regenerate this category, or add a question by hand.'
        }
        emptyAction={
          <Button variant="primary" loading={busy} onClick={() => void actions.regenerate(scope)}>
            Regenerate this category
          </Button>
        }
      >
        <div className={cx(busy && 'shimmer')}>
          <SortableList
            items={questions}
            announce={actions.announce}
            onReorder={(ids) => {
              // Persist the WHOLE bank order: the section only shows one category, but the
              // stored order covers every question.
              const others = kit.questions.filter((q) => q.category !== active).map((q) => q.id);
              void actions.reorder('questions', [...ids, ...others]);
            }}
            renderItem={(question, controls) => (
              <QuestionCard question={question} kit={kit} actions={actions} controls={controls} />
            )}
          />
        </div>
      </AsyncBoundary>

      <AddQuestionDialog
        open={adding}
        onClose={() => setAdding(false)}
        requirements={kit.role.requirements}
        defaultCategory={active}
        onAdd={async (question) => {
          await actions.add({ section: 'questions', question });
          setAdding(false);
        }}
      />
    </SectionCard>
  );
}

function QuestionCard({
  question,
  kit,
  actions,
  controls,
}: {
  question: Question;
  kit: Kit;
  actions: KitActions;
  controls: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const reqs = kit.role.requirements.filter((r) => question.requirement_ids.includes(r.id));

  return (
    <Card className="p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <EditableText
            label={`question ${question.id}`}
            value={question.prompt}
            multiline
            className="font-medium"
            onSave={(v) => actions.patch(question.id, 'questions', { prompt: v })}
          />
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-2">
            <Badge tone={question.difficulty === 3 ? 'warning' : 'neutral'}>difficulty {question.difficulty}</Badge>
            {reqs.map((r) => (
              <Badge key={r.id} tone={r.priority === 'must' ? 'accent' : 'neutral'}>
                {r.id} {r.priority}
              </Badge>
            ))}
            <OriginBadge meta={question.meta} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {controls}
          <PinToggle
            pinned={question.meta?.pinned ?? false}
            label={question.id}
            onToggle={() => {
              const next = !(question.meta?.pinned ?? false);
              void actions.patch(question.id, 'questions', { pinned: next });
              actions.announce(next ? 'Pinned — regeneration will keep this question' : 'Unpinned');
            }}
          />
          <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? 'Hide' : 'Answer'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void actions.remove(question.id)}
            aria-label={`Delete question ${question.id}`}
          >
            ✕
          </Button>
        </div>
      </div>

      {open ? (
        <>
          <Separator className="my-3" />
          <div>
            <h4 className="px-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Answer outline</h4>
            <EditableText
              label={`answer outline for ${question.id}`}
              value={question.answer_outline}
              multiline
              onSave={(v) => actions.patch(question.id, 'questions', { answer_outline: v })}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 px-2">
              <span className="text-xs text-fg-subtle">Move to category:</span>
              {CATEGORIES.filter((c) => c !== question.category).map((c) => (
                <Button
                  key={c}
                  size="sm"
                  onClick={() => {
                    void actions.patch(question.id, 'questions', { category: c });
                    actions.announce(`Moved to ${CATEGORY_LABELS[c]}`);
                  }}
                >
                  {CATEGORY_LABELS[c]}
                </Button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </Card>
  );
}

function AddQuestionDialog({
  open,
  onClose,
  requirements,
  defaultCategory,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  requirements: Requirement[];
  defaultCategory: QuestionCategory;
  onAdd: (q: Record<string, unknown>) => Promise<void>;
}) {
  const [prompt, setPrompt] = useState('');
  const [outline, setOutline] = useState('');
  const [reqIds, setReqIds] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState(2);
  const [busy, setBusy] = useState(false);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a question"
      description="Questions you write are marked as yours and survive every regeneration."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={!prompt.trim() || reqIds.length === 0}
            onClick={() => {
              setBusy(true);
              void onAdd({
                prompt: prompt.trim(),
                answer_outline: outline.trim(),
                category: defaultCategory,
                requirement_ids: reqIds,
                difficulty,
              })
                .then(() => {
                  setPrompt('');
                  setOutline('');
                  setReqIds([]);
                })
                .finally(() => setBusy(false));
            }}
          >
            Add question
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Question" required>
          {({ id }) => (
            <Textarea id={id} rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} data-autofocus />
          )}
        </Field>
        <Field label="Answer outline">
          {({ id }) => <Textarea id={id} rows={3} value={outline} onChange={(e) => setOutline(e.target.value)} />}
        </Field>
        <Field label="Difficulty" hint="1 easy, 3 hard.">
          {({ id }) => (
            <Input
              id={id}
              type="number"
              min={1}
              max={3}
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
            />
          )}
        </Field>
        <fieldset>
          <legend className="text-sm font-medium text-fg">Requirements it covers</legend>
          <p className="mt-1 text-xs text-fg-muted">At least one — this is what makes coverage checkable.</p>
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {requirements.map((r) => (
              <label key={r.id} className="flex items-start gap-2 rounded px-1.5 py-1 text-sm hover:bg-surface-muted">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={reqIds.includes(r.id)}
                  onChange={(e) =>
                    setReqIds((ids) => (e.target.checked ? [...ids, r.id] : ids.filter((x) => x !== r.id)))
                  }
                />
                <span>
                  <Badge tone={r.priority === 'must' ? 'accent' : 'neutral'}>{r.priority}</Badge>{' '}
                  <span className="text-fg-muted">{r.text}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </Dialog>
  );
}

// --- Flashcards ------------------------------------------------------------

export function FlashcardsSection({ kit, actions }: { kit: Kit; actions: KitActions }) {
  return (
    <SectionCard
      id="flashcards"
      title="Flashcards"
      subtitle={`${kit.flashcards.length} cards`}
      actions={
        <Link href={`/kits/${kit.source.company ? '' : ''}`} className="hidden" aria-hidden>
          practice
        </Link>
      }
    >
      <AsyncBoundary
        empty={kit.flashcards.length === 0}
        emptyTitle="No flashcards"
        emptyBody="Flashcards are generated from the requirements. Add one by hand if you want to start now."
      >
        <SortableList
          items={kit.flashcards}
          announce={actions.announce}
          onReorder={(ids) => void actions.reorder('flashcards', ids)}
          renderItem={(card: Flashcard, controls) => (
            <Card className="p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <EditableText
                    label={`front of card ${card.id}`}
                    value={card.front}
                    className="font-medium"
                    onSave={(v) => actions.patch(card.id, 'flashcards', { front: v })}
                  />
                  <EditableText
                    label={`back of card ${card.id}`}
                    value={card.back}
                    multiline
                    className="text-fg-muted"
                    onSave={(v) => actions.patch(card.id, 'flashcards', { back: v })}
                  />
                  <div className="mt-1 flex flex-wrap gap-1.5 pl-2">
                    {card.requirement_ids.map((id) => (
                      <Badge key={id}>{id}</Badge>
                    ))}
                    <OriginBadge meta={card.meta} />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  {controls}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void actions.remove(card.id)}
                    aria-label={`Delete card ${card.id}`}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            </Card>
          )}
        />
      </AsyncBoundary>
    </SectionCard>
  );
}

// --- Schedule --------------------------------------------------------------

export function ScheduleSection({ kit, actions }: { kit: Kit; actions: KitActions }) {
  const byId = new Map(kit.questions.map((q) => [q.id, q]));

  return (
    <SectionCard
      id="schedule"
      title="Study schedule"
      subtitle={`${kit.schedule.days.length} days, exactly as requested. Allocation is arithmetic in code — the model never sees it.`}
    >
      <ol className="space-y-3">
        {kit.schedule.days.map((day) => (
          <li key={day.day}>
            <Card className="p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-accent-muted text-xs font-bold text-accent">
                    {day.day}
                  </span>
                  <div className="min-w-0">
                    <EditableText
                      label={`focus for day ${day.day}`}
                      value={day.focus}
                      className="font-medium"
                      onSave={(v) => actions.patch(`day-${day.day}`, 'schedule', { focus: v })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {day.kind === 'review' ? <Badge tone="neutral">review</Badge> : null}
                  <OriginBadge meta={day.meta} />
                  <Badge>{day.minutes} min</Badge>
                </div>
              </div>
              {day.question_ids.length ? (
                <ul className="mt-2 space-y-1 pl-9">
                  {day.question_ids.map((id) => {
                    const q = byId.get(id);
                    return (
                      <li key={id} className="flex items-start gap-2 text-sm text-fg-muted">
                        <span className="text-fg-subtle">{id}</span>
                        <span className="min-w-0 flex-1 truncate" title={q?.prompt}>
                          {q?.prompt ?? 'missing question'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 pl-9 text-sm text-fg-subtle">Nothing scheduled.</p>
              )}
              {day.meta?.origin === 'edited' ? (
                <p className="mt-2 pl-9 text-[11px] text-fg-subtle">
                  You edited this day, so regeneration will not rewrite it.
                </p>
              ) : null}
            </Card>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}
