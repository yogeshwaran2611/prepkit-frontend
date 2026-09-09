/**
 * Wire types for the kit, matching the backend's Appendix A contract exactly.
 *
 * Vendored here rather than imported from a shared package: the frontend and backend are
 * separate repositories with separate deploys now, and these are the only types the UI
 * actually needs (no runtime validation happens on this side — the API is the one source of
 * truth for whether a kit is well-formed). Keep this in sync with the backend's
 * packages/schema/src/kit.ts if that contract ever changes.
 */

export type RequirementKind = 'technical' | 'behavioural' | 'domain';
export type RequirementPriority = 'must' | 'nice';
export type QuestionCategory = 'technical' | 'behavioural' | 'system-design' | 'company-fit';

export interface ItemMeta {
  origin: 'generated' | 'edited' | 'manual';
  pinned: boolean;
  updated_at: string;
}

export interface Provenance {
  source_span: string;
  start: number;
  end: number;
  heading?: string;
}

export type NoteCode =
  | 'THIN_JD'
  | 'NO_HIRING_PAGE'
  | 'NO_PUBLIC_DISCUSSION'
  | 'COMPANY_UNREACHABLE'
  | 'ROBOTS_BLOCKED'
  | 'THIN_PAGE'
  | 'BUDGET_EXHAUSTED'
  | 'FALLBACK_QUESTION_USED'
  | 'LINKS_REJECTED'
  | 'SCHEDULE_OVERLOADED'
  | 'SCHEDULE_RECONCILED'
  | 'PROVIDER_FAILOVER';

export interface KitNote {
  code: NoteCode;
  message: string;
  detail?: Record<string, unknown>;
}

export interface Requirement {
  id: string;
  text: string;
  kind: RequirementKind;
  priority: RequirementPriority;
  provenance?: Provenance;
}

export interface Question {
  id: string;
  requirement_ids: string[];
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: number;
  meta?: ItemMeta;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
  meta?: ItemMeta;
}

export interface ScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number;
  kind: 'new' | 'review';
  meta?: ItemMeta;
}

export interface Kit {
  source: {
    company: string;
    company_url: string;
    role: string;
    location: string;
    jd_chars: number;
    researched_at: string;
    pages_used: string[];
  };
  company_brief: {
    summary: string;
    what_they_do: string;
    sources: string[];
    hiring_process?: string;
    confidence?: 'none' | 'low' | 'medium' | 'high';
  };
  role: {
    title: string;
    seniority: string;
    responsibilities: string[];
    requirements: Requirement[];
  };
  questions: Question[];
  flashcards: Flashcard[];
  schedule: {
    days_available: number;
    days: ScheduleDay[];
  };
  coverage: {
    uncovered_requirement_ids: string[];
    passes: number;
  };
  notes?: KitNote[];
  order?: {
    questions?: string[];
    flashcards?: string[];
    responsibilities?: string[];
  };
}
