import { describe, it, expect } from 'vitest';
import {
  detectNicknameReasons,
  proposeNickname,
  pickNicknameForSpeaker,
  isAiSuggestionAllowed,
  type NicknameInput,
  MIN_CONFIDENCE_TO_INTRODUCE,
  MIN_TURNS_BEFORE_INTRODUCE,
  LEGENDARY_MIN_CONFIDENCE,
} from './NicknameEngine';

const baseInput = (over: Partial<NicknameInput> = {}): NicknameInput => ({
  characterId: 'c-1',
  characterName: 'Vey',
  turnCount: 5,
  recentActions: [],
  memorableMoments: [],
  personalityTraits: [],
  abilities: [],
  existingNicknames: [],
  aiSuggestion: { nickname: 'First Step' },
  ...over,
});

describe('NicknameEngine — earning gates', () => {
  it('returns null when there is no strong reason and the AI offered nothing', () => {
    const out = proposeNickname(baseInput({ aiSuggestion: null, recentActions: ['walks slowly'] }));
    expect(out).toBeNull();
  });

  it('returns null when reasons exist but the AI did not provide nickname text', () => {
    const out = proposeNickname(baseInput({
      recentActions: ['charges in', 'charges first', 'rushes ahead'],
      aiSuggestion: null,
    }));
    expect(out).toBeNull();
  });

  it('does not introduce on turn 1 even with strong reasons', () => {
    const out = proposeNickname(baseInput({
      turnCount: 1,
      recentActions: ['charges in', 'charges first', 'rushes ahead'],
      aiSuggestion: { nickname: 'First Step' },
    }));
    expect(out).not.toBeNull();
    expect(out!.shouldIntroduceNow).toBe(false);
    expect(out!.usageGuidance).toMatch(/Hold the nickname/i);
  });

  it('blocks legendary titles below the legendary threshold', () => {
    const out = proposeNickname(baseInput({
      turnCount: 4,
      recentActions: ['charges in', 'charges first'],
      aiSuggestion: { nickname: 'Shadow King' },
    }));
    expect(out).toBeNull();
  });
});

describe('NicknameEngine — reason detection', () => {
  it('detects repeated behaviour only when a pattern repeats ≥2 times', () => {
    const r1 = detectNicknameReasons(baseInput({ recentActions: ['charges in'] }));
    expect(r1.find(r => r.kind === 'repeated_behavior')).toBeUndefined();
    const r2 = detectNicknameReasons(baseInput({ recentActions: ['charges in', 'charges again', 'rushes'] }));
    expect(r2.find(r => r.kind === 'repeated_behavior')).toBeDefined();
  });

  it('lifts confidence on memorable bravery moments', () => {
    const out = proposeNickname(baseInput({
      memorableMoments: ['shielded the child from the blast [bravery]'],
      aiSuggestion: { nickname: 'Shieldwarden' },
    }));
    expect(out).not.toBeNull();
    expect(out!.reasons.some(r => r.kind === 'memorable_event')).toBe(true);
  });

  it('produces an irony reason only when contrast is supplied', () => {
    const r = detectNicknameReasons(baseInput({ contrastHint: { traitA: 'huge', traitB: 'gentle' } }));
    expect(r.find(x => x.kind === 'irony')).toBeDefined();
  });
});

describe('NicknameEngine — speaker dependence', () => {
  it('forces a hostile tone when the speaker is an enemy', () => {
    const out = proposeNickname(baseInput({
      turnCount: 6,
      speaker: { type: 'enemy', name: 'Captain Ral', affinity: -70 },
      recentActions: ['charges in', 'charges first', 'rushes ahead'],
      aiSuggestion: { nickname: 'Little Friend', tone: 'affectionate' },
    }));
    expect(out).not.toBeNull();
    expect(['feared', 'mocking']).toContain(out!.tone);
    expect(out!.sourceType).toBe('enemy');
  });

  it('lets allies use warm tones when affinity is high', () => {
    const out = proposeNickname(baseInput({
      turnCount: 6,
      speaker: { type: 'ally', name: 'Bren', affinity: 70 },
      recentActions: ['heals the wounded', 'tends the others', 'patches a stranger'],
      aiSuggestion: { nickname: 'Stitch' },
    }));
    expect(out).not.toBeNull();
    expect(out!.sourceType).toBe('ally');
    expect(['affectionate', 'respectful']).toContain(out!.tone);
  });
});

describe('NicknameEngine — player rejection memory', () => {
  it('refuses to reintroduce a nickname the player rejected', () => {
    const out = proposeNickname(baseInput({
      turnCount: 9,
      recentActions: ['charges in', 'charges first', 'rushes ahead'],
      aiSuggestion: { nickname: 'Tank' },
      existingNicknames: [
        { nickname: 'Tank', sourceType: 'party', tone: 'teasing', status: 'rejected', playerReaction: 'rejected' },
      ],
    }));
    expect(out).not.toBeNull();
    expect(out!.shouldIntroduceNow).toBe(false);
  });
});

describe('NicknameEngine — speaker dispatch (pickNicknameForSpeaker)', () => {
  const records = [
    { nickname: 'Q', sourceType: 'party' as const, tone: 'affectionate' as const, status: 'active' as const },
    { nickname: 'The Rift', sourceType: 'enemy' as const, tone: 'feared' as const, status: 'active' as const },
    { nickname: 'Boy of Bad Decisions', sourceType: 'mentor' as const, tone: 'teasing' as const, status: 'active' as const },
  ];
  it('routes party speakers to the party nickname', () => {
    expect(pickNicknameForSpeaker(records, { type: 'party' })?.nickname).toBe('Q');
  });
  it('routes enemy speakers to a non-affectionate nickname', () => {
    const pick = pickNicknameForSpeaker(records, { type: 'enemy', affinity: -80 });
    expect(pick?.nickname).toBe('The Rift');
  });
  it('returns null when no records exist', () => {
    expect(pickNicknameForSpeaker([], { type: 'party' })).toBeNull();
  });
});

describe('NicknameEngine — AI suggestion validation', () => {
  it('blocks duplicates from the same source', () => {
    const allowed = isAiSuggestionAllowed(
      'Tank',
      { reasons: [], confidence: 70, sourceType: 'party', tone: 'teasing' },
      baseInput({
        existingNicknames: [
          { nickname: 'Tank', sourceType: 'party', tone: 'teasing', status: 'active' },
        ],
      }),
    );
    expect(allowed).toBe(false);
  });

  it('blocks reuse of the character name itself', () => {
    const allowed = isAiSuggestionAllowed(
      'vey',
      { reasons: [], confidence: 70, sourceType: 'party', tone: 'neutral' },
      baseInput(),
    );
    expect(allowed).toBe(false);
  });
});

describe('NicknameEngine — thresholds (sanity)', () => {
  it('honours documented thresholds', () => {
    expect(MIN_CONFIDENCE_TO_INTRODUCE).toBeGreaterThanOrEqual(60);
    expect(MIN_TURNS_BEFORE_INTRODUCE).toBeGreaterThanOrEqual(2);
    expect(LEGENDARY_MIN_CONFIDENCE).toBeGreaterThanOrEqual(75);
  });
});
