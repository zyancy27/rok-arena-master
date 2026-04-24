import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadDraft,
  saveDraft,
  clearDraft,
  hasMeaningfulDraft,
  mergeIntoCharacterInsert,
  EMPTY_DRAFT,
  DRAFT_STORAGE_KEY,
  type GuestDraftState,
} from '@/lib/guest-onboarding/draft-store';

describe('guest onboarding draft store', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('returns empty draft when nothing is stored', () => {
    expect(loadDraft()).toEqual(EMPTY_DRAFT);
  });

  it('persists draft to sessionStorage and reloads it', () => {
    const state: GuestDraftState = {
      ...EMPTY_DRAFT,
      step: 3,
      characterCount: 'few',
      basicInfo: { name: 'Kael', nickname: 'Star', universe: 'Nyx', shortDescription: 'A wanderer' },
      rawNotes: 'lorem ipsum',
    };
    saveDraft(state);
    const loaded = loadDraft();
    expect(loaded.step).toBe(3);
    expect(loaded.characterCount).toBe('few');
    expect(loaded.basicInfo.name).toBe('Kael');
    expect(loaded.rawNotes).toBe('lorem ipsum');
    expect(loaded.updatedAt).toBeGreaterThan(0);
  });

  it('clearDraft removes stored draft', () => {
    saveDraft({ ...EMPTY_DRAFT, rawNotes: 'x' });
    clearDraft();
    expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    expect(loadDraft()).toEqual(EMPTY_DRAFT);
  });

  it('detects meaningful draft state', () => {
    expect(hasMeaningfulDraft(EMPTY_DRAFT)).toBe(false);
    expect(hasMeaningfulDraft({ ...EMPTY_DRAFT, rawNotes: 'hi' })).toBe(true);
    expect(
      hasMeaningfulDraft({
        ...EMPTY_DRAFT,
        basicInfo: { ...EMPTY_DRAFT.basicInfo, name: 'Kael' },
      }),
    ).toBe(true);
    expect(
      hasMeaningfulDraft({
        ...EMPTY_DRAFT,
        parsed: { name: 'Kael' },
      }),
    ).toBe(true);
  });

  it('survives corrupt JSON in storage by returning empty draft', () => {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, '{ not json');
    expect(loadDraft()).toEqual(EMPTY_DRAFT);
  });
});

describe('mergeIntoCharacterInsert', () => {
  it('uses parsed name when present, falls back to basic info', () => {
    const insert = mergeIntoCharacterInsert(
      { ...EMPTY_DRAFT, parsed: { name: 'Parsed Name' } },
      'user-1',
    );
    expect(insert.name).toBe('Parsed Name');
    expect(insert.user_id).toBe('user-1');
  });

  it('falls back to basicInfo.name when parsed has none', () => {
    const insert = mergeIntoCharacterInsert(
      {
        ...EMPTY_DRAFT,
        basicInfo: { ...EMPTY_DRAFT.basicInfo, name: 'Basic Name' },
        parsed: { lore: 'some lore' },
      },
      'u',
    );
    expect(insert.name).toBe('Basic Name');
  });

  it('appends unsorted notes into lore as Needs Review section', () => {
    const insert = mergeIntoCharacterInsert(
      {
        ...EMPTY_DRAFT,
        parsed: {
          name: 'X',
          lore: 'Born in fire',
          unsorted_notes: 'orphan facts about siblings',
        },
      },
      'u',
    );
    expect(insert.lore).toContain('Born in fire');
    expect(insert.lore).toContain('Needs Review');
    expect(insert.lore).toContain('orphan facts about siblings');
  });

  it('parses age string to integer when possible', () => {
    expect(
      mergeIntoCharacterInsert(
        { ...EMPTY_DRAFT, parsed: { name: 'X', age: '247 years old' } },
        'u',
      ).age,
    ).toBe(247);
  });

  it('returns null age when not parseable', () => {
    expect(
      mergeIntoCharacterInsert(
        { ...EMPTY_DRAFT, parsed: { name: 'X', age: 'ageless' } },
        'u',
      ).age,
    ).toBeNull();
  });

  it('uses Unnamed Character when nothing provided', () => {
    expect(mergeIntoCharacterInsert(EMPTY_DRAFT, 'u').name).toBe('Unnamed Character');
  });

  it('defaults level to 1 when parsed level missing', () => {
    expect(mergeIntoCharacterInsert(EMPTY_DRAFT, 'u').level).toBe(1);
  });

  it('preserves universe and nickname in lore', () => {
    const insert = mergeIntoCharacterInsert(
      {
        ...EMPTY_DRAFT,
        basicInfo: {
          name: 'Kael',
          nickname: 'Star',
          universe: 'Nyx',
          shortDescription: 'A wanderer',
        },
        parsed: { name: 'Kael' },
      },
      'u',
    );
    expect(insert.lore).toContain('Nyx');
    expect(insert.lore).toContain('Star');
    expect(insert.lore).toContain('A wanderer');
  });
});
