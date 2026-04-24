// Guest character draft state management
// Persists in sessionStorage so progress survives page reloads but not new sessions.

export const DRAFT_STORAGE_KEY = 'ocrp-guest-character-draft';

export type CharacterCountBucket =
  | 'one'
  | 'few' // 2-5
  | 'some' // 6-10
  | 'many' // 10+
  | 'unsure';

export interface GuestBasicInfo {
  name: string;
  nickname: string;
  universe: string;
  shortDescription: string;
}

export interface ParsedCharacterDraft {
  name?: string;
  race?: string;
  sub_race?: string;
  age?: string;
  home_planet?: string;
  home_moon?: string;
  powers?: string;
  abilities?: string;
  weapons_items?: string;
  personality?: string;
  mentality?: string;
  lore?: string;
  level?: number;
  // Catch-all for anything the parser couldn't confidently bucket.
  unsorted_notes?: string;
}

export interface GuestDraftState {
  step: 1 | 2 | 3 | 4 | 5;
  characterCount: CharacterCountBucket | null;
  basicInfo: GuestBasicInfo;
  rawNotes: string;
  parsed: ParsedCharacterDraft | null;
  parseError: string | null;
  saved: boolean; // duplicate-save guard
  updatedAt: number;
}

export const EMPTY_DRAFT: GuestDraftState = {
  step: 1,
  characterCount: null,
  basicInfo: { name: '', nickname: '', universe: '', shortDescription: '' },
  rawNotes: '',
  parsed: null,
  parseError: null,
  saved: false,
  updatedAt: 0,
};

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function loadDraft(): GuestDraftState {
  const storage = safeStorage();
  if (!storage) return { ...EMPTY_DRAFT };
  try {
    const raw = storage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return { ...EMPTY_DRAFT };
    const parsed = JSON.parse(raw) as Partial<GuestDraftState>;
    return { ...EMPTY_DRAFT, ...parsed, updatedAt: parsed.updatedAt ?? 0 };
  } catch {
    return { ...EMPTY_DRAFT };
  }
}

export function saveDraft(state: GuestDraftState): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    const next = { ...state, updatedAt: Date.now() };
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota or serialization issues — ignore, draft is best-effort
  }
}

export function clearDraft(): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function hasMeaningfulDraft(state: GuestDraftState): boolean {
  return Boolean(
    state.rawNotes.trim() ||
      state.basicInfo.name.trim() ||
      state.parsed?.name ||
      state.parsed?.lore ||
      state.parsed?.powers,
  );
}

/**
 * Merge basic info (entered in step 2) with parsed AI output (step 4).
 * Basic info acts as a low-confidence baseline; parsed values win when present.
 * Anything from `notes` not represented in the parsed sheet is appended to
 * `unsorted_notes` as a "Needs Review" bucket.
 */
export function mergeIntoCharacterInsert(
  draft: GuestDraftState,
  userId: string,
): Record<string, unknown> {
  const parsed = draft.parsed ?? {};
  const basic = draft.basicInfo;

  const name =
    (parsed.name && parsed.name.trim()) ||
    basic.name.trim() ||
    'Unnamed Character';

  // Build a lore field that preserves user-entered short description + any
  // unsorted notes the parser couldn't bucket. Never silently drop info.
  const loreParts: string[] = [];
  if (parsed.lore?.trim()) loreParts.push(parsed.lore.trim());
  if (basic.shortDescription.trim() && !parsed.lore?.includes(basic.shortDescription.trim())) {
    loreParts.push(basic.shortDescription.trim());
  }
  if (basic.universe.trim()) {
    loreParts.push(`From the ${basic.universe.trim()} universe.`);
  }
  if (basic.nickname.trim()) {
    loreParts.push(`Also known as: ${basic.nickname.trim()}.`);
  }
  if (parsed.unsorted_notes?.trim()) {
    loreParts.push(`\n--- Needs Review (auto-parsed, uncategorized) ---\n${parsed.unsorted_notes.trim()}`);
  }

  // Convert age string to integer when possible, otherwise null.
  let ageInt: number | null = null;
  if (parsed.age) {
    const match = parsed.age.match(/\d+/);
    if (match) ageInt = parseInt(match[0], 10);
  }

  return {
    user_id: userId,
    name,
    level: parsed.level ?? 1,
    race: parsed.race ?? null,
    sub_race: parsed.sub_race ?? null,
    age: ageInt,
    home_planet: parsed.home_planet ?? null,
    home_moon: parsed.home_moon ?? null,
    powers: parsed.powers ?? null,
    abilities: parsed.abilities ?? null,
    weapons_items: parsed.weapons_items ?? null,
    personality: parsed.personality ?? null,
    mentality: parsed.mentality ?? null,
    lore: loreParts.length ? loreParts.join('\n\n') : null,
  };
}
