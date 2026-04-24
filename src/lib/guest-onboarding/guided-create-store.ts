/**
 * Guided Create-Character draft store (logged-in users).
 *
 * Mirrors the guest onboarding draft pattern but:
 *  - Uses localStorage so the draft survives a full browser restart.
 *  - Captures the richer 6-step field set the user wants for guided creation.
 *  - Saves into the SAME `characters` table schema as the existing form.
 */

export const GUIDED_DRAFT_KEY = 'ocrp-guided-create-draft';

export interface GuidedCharacterDraft {
  step: 1 | 2 | 3 | 4 | 5 | 6;

  // Step 1 — Basics
  name: string;
  nickname: string;
  universe: string;
  shortDescription: string;

  // Step 2 — Identity & appearance
  age: string;
  race: string;
  sub_race: string;
  sex: string;
  appearance_description: string;
  appearance_clothing_style: string;

  // Step 3 — Personality & role
  personality: string;
  goals: string;
  fears: string;
  archetype: string;
  relationships: string;

  // Step 4 — Powers, skills, limits
  powers: string;
  abilities: string;
  weapons_items: string;
  weaknesses: string;
  battle_style: string;

  // Step 5 — Backstory & lore
  lore: string;
  important_events: string;
  factions: string;
  worldbuilding_notes: string;
  extra_notes: string;

  // Optional paste-import shortcut (parses into the fields above before review)
  rawNotes: string;

  updatedAt: number;
}

export const EMPTY_GUIDED_DRAFT: GuidedCharacterDraft = {
  step: 1,
  name: '',
  nickname: '',
  universe: '',
  shortDescription: '',
  age: '',
  race: '',
  sub_race: '',
  sex: '',
  appearance_description: '',
  appearance_clothing_style: '',
  personality: '',
  goals: '',
  fears: '',
  archetype: '',
  relationships: '',
  powers: '',
  abilities: '',
  weapons_items: '',
  weaknesses: '',
  battle_style: '',
  lore: '',
  important_events: '',
  factions: '',
  worldbuilding_notes: '',
  extra_notes: '',
  rawNotes: '',
  updatedAt: 0,
};

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadGuidedDraft(): GuidedCharacterDraft {
  const storage = safeStorage();
  if (!storage) return { ...EMPTY_GUIDED_DRAFT };
  try {
    const raw = storage.getItem(GUIDED_DRAFT_KEY);
    if (!raw) return { ...EMPTY_GUIDED_DRAFT };
    const parsed = JSON.parse(raw) as Partial<GuidedCharacterDraft>;
    return { ...EMPTY_GUIDED_DRAFT, ...parsed, updatedAt: parsed.updatedAt ?? 0 };
  } catch {
    return { ...EMPTY_GUIDED_DRAFT };
  }
}

export function saveGuidedDraft(state: GuidedCharacterDraft): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(
      GUIDED_DRAFT_KEY,
      JSON.stringify({ ...state, updatedAt: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

export function clearGuidedDraft(): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(GUIDED_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function hasGuidedContent(d: GuidedCharacterDraft): boolean {
  return Boolean(
    d.name.trim() ||
      d.lore.trim() ||
      d.powers.trim() ||
      d.personality.trim() ||
      d.rawNotes.trim(),
  );
}

/**
 * Translate a guided draft into a row that matches the real `characters` schema.
 * Optional / extended fields are folded into `lore` so no information is lost.
 */
export function guidedDraftToCharacterInsert(
  draft: GuidedCharacterDraft,
  userId: string,
): Record<string, unknown> {
  const name = draft.name.trim() || 'Unnamed Character';

  // Compose a structured lore section that preserves anything the schema can't
  // store as a top-level column.
  const loreParts: string[] = [];
  if (draft.lore.trim()) loreParts.push(draft.lore.trim());
  if (draft.shortDescription.trim()) loreParts.push(draft.shortDescription.trim());
  if (draft.universe.trim()) loreParts.push(`Universe: ${draft.universe.trim()}`);
  if (draft.nickname.trim()) loreParts.push(`Also known as: ${draft.nickname.trim()}`);
  if (draft.archetype.trim()) loreParts.push(`Archetype / role: ${draft.archetype.trim()}`);
  if (draft.goals.trim()) loreParts.push(`Goals & motives:\n${draft.goals.trim()}`);
  if (draft.fears.trim()) loreParts.push(`Fears & flaws:\n${draft.fears.trim()}`);
  if (draft.relationships.trim()) loreParts.push(`Relationships:\n${draft.relationships.trim()}`);
  if (draft.weaknesses.trim()) loreParts.push(`Weaknesses & limits:\n${draft.weaknesses.trim()}`);
  if (draft.battle_style.trim()) loreParts.push(`Battle style:\n${draft.battle_style.trim()}`);
  if (draft.important_events.trim()) loreParts.push(`Important events:\n${draft.important_events.trim()}`);
  if (draft.factions.trim()) loreParts.push(`Factions / groups:\n${draft.factions.trim()}`);
  if (draft.worldbuilding_notes.trim()) loreParts.push(`Worldbuilding notes:\n${draft.worldbuilding_notes.trim()}`);
  if (draft.extra_notes.trim()) loreParts.push(`Extra notes:\n${draft.extra_notes.trim()}`);

  const ageMatch = draft.age.match(/\d+/);
  const ageInt = ageMatch ? parseInt(ageMatch[0], 10) : null;

  return {
    user_id: userId,
    name,
    level: 1,
    race: draft.race.trim() || null,
    sub_race: draft.sub_race.trim() || null,
    age: ageInt,
    sex: draft.sex.trim() || null,
    powers: draft.powers.trim() || null,
    abilities: draft.abilities.trim() || null,
    weapons_items: draft.weapons_items.trim() || null,
    personality: draft.personality.trim() || null,
    appearance_description: draft.appearance_description.trim() || null,
    appearance_clothing_style: draft.appearance_clothing_style.trim() || null,
    lore: loreParts.length ? loreParts.join('\n\n') : null,
  };
}
