/**
 * Campaign Concept History
 *
 * Persists the last N generated campaign concepts (titles + structured seed)
 * so the edge function can avoid repeating recent patterns. Stored locally
 * per-browser; no server round-trip needed for repetition checks.
 */

const STORAGE_KEY = 'rok.campaign.concept.history.v1';
const MAX_HISTORY = 12;

export interface RecentConcept {
  title?: string;
  skeleton?: string;
  conflict?: string;
  setting?: string;
  at?: number;
}

function safeParse(raw: string | null): RecentConcept[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

export function getRecentConcepts(): RecentConcept[] {
  if (typeof window === 'undefined') return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

export function recordConcept(entry: RecentConcept): void {
  if (typeof window === 'undefined') return;
  const next: RecentConcept[] = [
    { ...entry, at: Date.now() },
    ...getRecentConcepts(),
  ].slice(0, MAX_HISTORY);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota — ignore */
  }
}

export function clearRecentConcepts(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
