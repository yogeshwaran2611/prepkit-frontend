import type { Kit } from '@/lib/kit-types';

/**
 * The single place the browser talks to the API.
 *
 * `credentials: 'include'` is set HERE and nowhere else — a per-call flag is a flag someone
 * forgets, and in cross-site mode a missing one silently means "logged out" (PLAN.md §8).
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly payload: ApiErrorShape,
  ) {
    super(payload.message);
    this.name = 'ApiError';
  }
  get code(): string {
    return this.payload.code;
  }
  /** A stale section write: the client should reload and reapply (§5). */
  get isConflict(): boolean {
    return this.status === 409;
  }
  get isAuth(): boolean {
    return this.status === 401;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 204) return undefined as T;

  const json = (await res.json().catch(() => null)) as { data?: T; error?: ApiErrorShape } | null;
  if (!res.ok || !json || json.error) {
    throw new ApiError(res.status, json?.error ?? { code: 'NETWORK', message: 'Could not reach the server.' });
  }
  return json.data as T;
}

// --- types shared with the pages ------------------------------------------

export interface KitSummary {
  id: string;
  status: 'queued' | 'running' | 'ready' | 'failed';
  company: string;
  role: string;
  days: number;
  questionCount: number;
  uncoveredMusts: number;
  createdAt: string;
  updatedAt: string;
  error: { code: string; message: string } | null;
}

export interface StepEventView {
  step: string;
  status: 'start' | 'ok' | 'skipped' | 'failed';
  detail?: string;
  elapsedMs?: number;
  at: string;
}

export interface KitDetail {
  id: string;
  status: KitSummary['status'];
  version: number;
  kit: Kit | null;
  input: { jd: string; companyUrl: string; days: number };
  error: { code: string; message: string } | null;
  promptVersion: string;
  stepLog: StepEventView[];
  job: { id: string; status: string; steps: StepEventView[]; error: { code: string; message: string } | null } | null;
  updatedAt: string;
}

export interface PracticeEventView {
  cardId: string;
  confidence: 1 | 2 | 3;
  at: string;
}

export interface WeakSpotView {
  requirement_id: string;
  text: string;
  priority: 'must' | 'nice';
  kind: string;
  risk: number;
  reasons: string[];
  question_ids: string[];
  flashcard_ids: string[];
  cardsSeen: number;
  cardsTotal: number;
  averageConfidence: number | null;
  hardestDifficulty: number;
}

export interface WeakSpotsResponse {
  spots: WeakSpotView[];
  practisedCards: number;
  totalCards: number;
  coldStart: boolean;
  plan: { day: number; focus: string; question_ids: string[]; minutes: number }[];
}

// --- endpoints ------------------------------------------------------------

export const api = {
  register: (email: string, password: string) =>
    request<{ id: string; email: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),

  login: (email: string, password: string) =>
    request<{ id: string; email: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  me: () => request<{ id: string; email: string }>('/api/auth/me'),

  listKits: () => request<KitSummary[]>('/api/kits'),

  getKit: (id: string) => request<KitDetail>(`/api/kits/${id}`),

  createKit: (body: { jd: string; company_url: string; days: number }) =>
    request<{ kitId: string; jobId: string | null; deduped: boolean; status: string }>('/api/kits', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  createBatch: (cases: { id?: string; jd: string; company_url: string; days: number }[]) =>
    request<{ kits: { kitId: string; jobId: string; label: string }[] }>('/api/kits/batch', {
      method: 'POST',
      body: JSON.stringify({ cases }),
    }),

  deleteKit: (id: string) => request<{ deleted: boolean }>(`/api/kits/${id}`, { method: 'DELETE' }),

  patchItem: (kitId: string, itemId: string, section: string, patch: Record<string, unknown>) =>
    request<{ kit: Kit; version: number }>(`/api/kits/${kitId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ section, patch }),
    }),

  reorder: (kitId: string, section: 'questions' | 'flashcards', ids: string[]) =>
    request<{ kit: Kit; version: number }>(`/api/kits/${kitId}/order`, {
      method: 'PATCH',
      body: JSON.stringify({ section, ids }),
    }),

  addItem: (kitId: string, body: Record<string, unknown>) =>
    request<{ kit: Kit; version: number }>(`/api/kits/${kitId}/items`, { method: 'POST', body: JSON.stringify(body) }),

  deleteItem: (kitId: string, itemId: string) =>
    request<{ kit: Kit; version: number }>(`/api/kits/${kitId}/items/${itemId}`, { method: 'DELETE' }),

  regenerate: (kitId: string, scope: string) =>
    request<{ jobId: string; scope: string }>(`/api/kits/${kitId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify({ scope }),
    }),

  recordPractice: (kitId: string, cardId: string, confidence: 1 | 2 | 3) =>
    request<{ events: PracticeEventView[] }>(`/api/kits/${kitId}/practice`, {
      method: 'POST',
      body: JSON.stringify({ cardId, confidence }),
    }),

  listPractice: (kitId: string) => request<{ events: PracticeEventView[] }>(`/api/kits/${kitId}/practice`),

  weakSpots: (kitId: string) => request<WeakSpotsResponse>(`/api/kits/${kitId}/weak-spots`),

  health: () => request<{ ok: boolean; store: string; model: string; hasLlmKey: boolean }>('/api/health'),
};

export const streamUrl = (jobId: string): string => `${API_URL}/api/jobs/${jobId}/stream`;
