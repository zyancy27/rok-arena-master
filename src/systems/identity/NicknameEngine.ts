/**
 * NicknameEngine
 * ──────────────
 * Detects WHEN a nickname is socially / narratively earned, WHO would give it,
 * WHAT TONE they would use, and a CONFIDENCE that gates whether the narrator
 * is allowed to introduce it this turn.
 *
 * This module is intentionally pure (no Supabase, no React, no Deno globals)
 * so it can be unit-tested and reused from both the client and edge functions.
 *
 * Pipeline per turn:
 *   1. detectNicknameReasons(input)  → list of structured reasons
 *   2. scoreReasons(reasons, input)  → ranked candidates with confidence
 *   3. proposeNickname(candidates, input, existingNicknames) → final proposal
 *      OR null if nothing earned (the narrator MUST then stay silent on names)
 *
 * The narrator prompt asks the AI to suggest a nickname, but the runtime
 * filters that suggestion against this engine's verdict before persisting.
 */

// ── Types ──────────────────────────────────────────────────────────────

export type NicknameSourceType =
  | 'ally'
  | 'enemy'
  | 'mentor'
  | 'public'
  | 'party'
  | 'narrator'
  | 'self'
  | 'rumor';

export type NicknameTone =
  | 'affectionate'
  | 'respectful'
  | 'teasing'
  | 'mocking'
  | 'feared'
  | 'legendary'
  | 'neutral'
  | 'ironic';

export type NicknameStatus =
  | 'active'
  | 'retired'
  | 'contested'
  | 'replaced'
  | 'rejected';

export type PlayerReaction =
  | 'accepted'
  | 'ignored'
  | 'disliked'
  | 'rejected'
  | 'unknown';

export type NicknameReasonKind =
  | 'repeated_behavior'
  | 'memorable_event'
  | 'personality'
  | 'ability'
  | 'reputation'
  | 'relationship'
  | 'group_identity'
  | 'irony'
  | 'nameplay';

export interface NicknameReason {
  kind: NicknameReasonKind;
  detail: string;
  /** 0–100, how strong THIS reason is on its own. */
  weight: number;
  /** Hint for which speaker would naturally produce it. */
  preferredSource?: NicknameSourceType;
  /** Hint for the natural tone of this reason. */
  preferredTone?: NicknameTone;
}

export interface NicknameInput {
  characterId: string;
  characterName: string;
  /** Number of in-world turns / interactions so far (proxy for "earned over time"). */
  turnCount: number;
  /** Days the campaign has been running for this character. */
  dayCount?: number;
  personalityTraits?: string[];
  abilities?: string[];
  combatStyle?: string;
  /** Free-form recent behaviour log: short phrases, most recent last. */
  recentActions?: string[];
  /** Free-form list of memorable moments tagged in narrator sentiment. */
  memorableMoments?: string[];
  /** Reputation / stage label from the relationship engine. */
  reputationStage?: string;
  /** Sentiment dimensions if available (curiosity/respect/etc., 0–100). */
  sentimentDimensions?: Partial<Record<
    'curiosity' | 'respect' | 'trust' | 'amusement' | 'disappointment' | 'intrigue' | 'story_value',
    number
  >>;
  /** Speaker that would be uttering the nickname this turn, if known. */
  speaker?: {
    type: NicknameSourceType;
    name?: string;
    /** −100 hostile … +100 adoring */
    affinity?: number;
  };
  /** "ironic" works when there is contrast — e.g. huge gentle giant. */
  contrastHint?: { traitA: string; traitB: string } | null;
  /** Existing active nicknames for this character (so we can evolve, not duplicate). */
  existingNicknames?: Array<{
    id?: string;
    nickname: string;
    sourceType: NicknameSourceType;
    tone: NicknameTone;
    status: NicknameStatus;
    playerReaction?: PlayerReaction;
  }>;
  /** Optional AI-suggested raw nickname text — engine will validate, not blindly accept. */
  aiSuggestion?: { nickname: string; tone?: NicknameTone; sourceType?: NicknameSourceType } | null;
}

export interface NicknameProposal {
  nickname: string;
  targetCharacterId: string;
  sourceType: NicknameSourceType;
  sourceName?: string;
  tone: NicknameTone;
  reason: string;
  /** 0–100 */
  confidence: number;
  /** Whether the narrator is allowed to use it in this turn's prose. */
  shouldIntroduceNow: boolean;
  /** Plain-English guidance for the narrator on how to weave it in. */
  usageGuidance: string;
  /** If this proposal evolves an existing nickname, the prior id. */
  replacesNicknameId?: string;
  /** Underlying reasons that justified the nickname. */
  reasons: NicknameReason[];
}

// ── Tunables ───────────────────────────────────────────────────────────

/** Minimum aggregate confidence before a nickname is allowed at all. */
export const MIN_CONFIDENCE_TO_PROPOSE = 55;
/** Minimum confidence + minimum turns before the narrator can SPEAK it. */
export const MIN_CONFIDENCE_TO_INTRODUCE = 65;
export const MIN_TURNS_BEFORE_INTRODUCE = 3;
/** Legendary / public nicknames need a much higher bar. */
export const LEGENDARY_MIN_CONFIDENCE = 80;
export const LEGENDARY_MIN_TURNS = 8;

// ── Detection ──────────────────────────────────────────────────────────

const REPEATED_PATTERNS: Array<{ regex: RegExp; detail: string; tone: NicknameTone; source: NicknameSourceType }> = [
  { regex: /\b(charge|charges|charged|rush|rushes|rushed)\b/i, detail: 'keeps charging in first', tone: 'teasing', source: 'party' },
  { regex: /\b(hide|hides|sneak|sneaks|stealth)\b/i, detail: 'always slipping out of sight', tone: 'neutral', source: 'party' },
  { regex: /\b(heal|heals|patch|patches|tend|tends)\b/i, detail: 'always patching the others up', tone: 'affectionate', source: 'party' },
  { regex: /\b(joke|jokes|quip|quips|laugh|laughs)\b/i, detail: 'jokes through everything', tone: 'teasing', source: 'party' },
  { regex: /\b(protect|protects|shield|shields|guard|guards)\b/i, detail: 'puts themselves between danger and the others', tone: 'respectful', source: 'ally' },
  { regex: /\b(study|studies|inspect|inspects|examine|examines)\b/i, detail: 'studies everything before acting', tone: 'respectful', source: 'mentor' },
];

const PERSONALITY_HINTS: Array<{ key: RegExp; detail: string; tone: NicknameTone }> = [
  { key: /quiet|silent|reserved/i, detail: 'quiet under pressure', tone: 'respectful' },
  { key: /reckless|wild|impulsive/i, detail: 'recklessly impulsive', tone: 'teasing' },
  { key: /calm|composed|stoic/i, detail: 'unshaken in chaos', tone: 'respectful' },
  { key: /kind|gentle|warm/i, detail: 'unfailingly gentle', tone: 'affectionate' },
  { key: /sarcastic|sardonic|dry/i, detail: 'dry-witted to a fault', tone: 'teasing' },
  { key: /cruel|ruthless|cold/i, detail: 'cold and unsparing', tone: 'feared' },
  { key: /clever|cunning|sharp/i, detail: 'always two steps ahead', tone: 'respectful' },
];

const REPUTATION_TONE: Record<string, NicknameTone> = {
  beloved_storyteller: 'legendary',
  compelling: 'legendary',
  noteworthy: 'respectful',
  interesting: 'neutral',
  observed: 'neutral',
  unknown: 'neutral',
  dismissive: 'mocking',
  unimpressed: 'mocking',
  irritated: 'mocking',
  disappointed: 'mocking',
};

/** Detect raw, structured reasons — no scoring yet. */
export function detectNicknameReasons(input: NicknameInput): NicknameReason[] {
  const reasons: NicknameReason[] = [];

  // 1. Repeated behaviour — only fires if the SAME pattern shows up >=2 times.
  if (input.recentActions && input.recentActions.length >= 2) {
    const corpus = input.recentActions.join(' • ').toLowerCase();
    for (const p of REPEATED_PATTERNS) {
      const matches = corpus.match(new RegExp(p.regex.source, 'gi'));
      if (matches && matches.length >= 2) {
        reasons.push({
          kind: 'repeated_behavior',
          detail: p.detail,
          weight: Math.min(80, 35 + matches.length * 12),
          preferredSource: p.source,
          preferredTone: p.tone,
        });
      }
    }
  }

  // 2. Memorable events — strong single beats.
  for (const moment of input.memorableMoments ?? []) {
    if (!moment || moment.length < 4) continue;
    const tag = (moment.match(/\[([a-z_]+)\]/i)?.[1] ?? '').toLowerCase();
    let weight = 50;
    let tone: NicknameTone = 'neutral';
    if (/bravery|sacrifice|heroism/i.test(moment) || tag === 'bravery') { weight = 75; tone = 'respectful'; }
    else if (/cruelty|betrayal|cold/i.test(moment) || tag === 'cruelty') { weight = 70; tone = 'feared'; }
    else if (/cleverness|trick|outsmart/i.test(moment) || tag === 'cleverness') { weight = 65; tone = 'respectful'; }
    else if (/kindness|compassion/i.test(moment) || tag === 'kindness') { weight = 60; tone = 'affectionate'; }
    else if (/recklessness|reckless/i.test(moment) || tag === 'recklessness') { weight = 55; tone = 'teasing'; }
    reasons.push({
      kind: 'memorable_event',
      detail: moment.replace(/\[[a-z_]+\]/gi, '').trim(),
      weight,
      preferredTone: tone,
    });
  }

  // 3. Personality traits.
  for (const trait of input.personalityTraits ?? []) {
    for (const hint of PERSONALITY_HINTS) {
      if (hint.key.test(trait)) {
        reasons.push({
          kind: 'personality',
          detail: hint.detail,
          weight: 45,
          preferredTone: hint.tone,
        });
      }
    }
  }

  // 4. Abilities / combat style.
  if (input.abilities && input.abilities.length > 0) {
    const sample = input.abilities.slice(0, 3).join(', ');
    reasons.push({
      kind: 'ability',
      detail: `signature use of ${sample}`,
      weight: 50,
      preferredTone: 'respectful',
    });
  }
  if (input.combatStyle && input.combatStyle.trim().length > 0) {
    reasons.push({
      kind: 'ability',
      detail: `combat style: ${input.combatStyle}`,
      weight: 45,
      preferredTone: 'respectful',
    });
  }

  // 5. Reputation stage.
  const stage = input.reputationStage?.toLowerCase();
  if (stage && REPUTATION_TONE[stage]) {
    const tone = REPUTATION_TONE[stage];
    const weight = tone === 'legendary' ? 75 : tone === 'mocking' || tone === 'feared' ? 60 : 40;
    reasons.push({
      kind: 'reputation',
      detail: `current reputation stage: ${stage}`,
      weight,
      preferredTone: tone,
    });
  }

  // 6. Relationship-driven (speaker affinity).
  if (input.speaker) {
    const aff = input.speaker.affinity ?? 0;
    if (Math.abs(aff) >= 25) {
      reasons.push({
        kind: 'relationship',
        detail: aff > 0 ? `${input.speaker.name ?? input.speaker.type} regards them warmly` : `${input.speaker.name ?? input.speaker.type} resents or fears them`,
        weight: 35 + Math.min(40, Math.abs(aff) / 2),
        preferredSource: input.speaker.type,
        preferredTone: aff > 50 ? 'affectionate' : aff > 20 ? 'respectful' : aff < -50 ? 'feared' : 'mocking',
      });
    }
  }

  // 7. Group identity — only after enough shared turns.
  if ((input.turnCount ?? 0) >= 6) {
    reasons.push({
      kind: 'group_identity',
      detail: 'has been around long enough to be named by the group',
      weight: 35,
      preferredSource: 'party',
      preferredTone: 'affectionate',
    });
  }

  // 8. Irony — only with explicit contrast.
  if (input.contrastHint) {
    reasons.push({
      kind: 'irony',
      detail: `ironic contrast between "${input.contrastHint.traitA}" and "${input.contrastHint.traitB}"`,
      weight: 50,
      preferredTone: 'ironic',
    });
  }

  // 9. Nameplay — only attempted when the name is short enough to twist naturally.
  if (input.characterName && input.characterName.length >= 3 && input.characterName.length <= 10) {
    reasons.push({
      kind: 'nameplay',
      detail: `short, easy-to-shorten name "${input.characterName}"`,
      weight: 25,
      preferredTone: 'affectionate',
    });
  }

  return reasons;
}

// ── Scoring & speaker resolution ───────────────────────────────────────

interface ScoredCandidate {
  reasons: NicknameReason[];
  confidence: number;
  sourceType: NicknameSourceType;
  sourceName?: string;
  tone: NicknameTone;
}

function pickSpeaker(input: NicknameInput, reasons: NicknameReason[]): { sourceType: NicknameSourceType; sourceName?: string } {
  if (input.speaker) return { sourceType: input.speaker.type, sourceName: input.speaker.name };
  // Otherwise: pick the most-weighted reason's preferredSource, fallback to narrator.
  const sorted = [...reasons].sort((a, b) => b.weight - a.weight);
  const preferred = sorted.find(r => r.preferredSource);
  return { sourceType: preferred?.preferredSource ?? 'narrator' };
}

function pickTone(reasons: NicknameReason[], speaker: { sourceType: NicknameSourceType }, affinity?: number): NicknameTone {
  // Speaker overrides everything: enemies don't say "affectionate".
  if (speaker.sourceType === 'enemy') return (affinity ?? 0) < -50 ? 'feared' : 'mocking';
  if (speaker.sourceType === 'mentor') return 'respectful';
  if (speaker.sourceType === 'self') return 'neutral';
  // Otherwise blend: pick the tone of the heaviest reason that fits.
  const sorted = [...reasons].sort((a, b) => b.weight - a.weight);
  return sorted.find(r => r.preferredTone)?.preferredTone ?? 'neutral';
}

function scoreCandidate(reasons: NicknameReason[], input: NicknameInput): ScoredCandidate | null {
  if (reasons.length === 0) return null;
  // Aggregate, but with diminishing returns so 10 weak reasons don't hit legendary.
  const sorted = [...reasons].sort((a, b) => b.weight - a.weight);
  let confidence = 0;
  for (let i = 0; i < sorted.length; i++) {
    confidence += sorted[i].weight * Math.pow(0.55, i);
  }
  confidence = Math.min(100, Math.round(confidence));
  const speaker = pickSpeaker(input, reasons);
  const tone = pickTone(reasons, speaker, input.speaker?.affinity);
  return { reasons, confidence, sourceType: speaker.sourceType, sourceName: speaker.sourceName, tone };
}

// ── Validation of the AI's raw suggestion ──────────────────────────────

const BANNED_TITLE_FRAGMENTS = [
  'shadow king', 'chosen one', 'destroyer of worlds', 'world ender', 'god slayer',
  'true king', 'eternal one', 'the prophesied',
];

/** Reject obviously unearned legendary titles when the bar isn't met. */
export function isAiSuggestionAllowed(
  suggestion: string,
  candidate: ScoredCandidate,
  input: NicknameInput,
): boolean {
  const lower = suggestion.trim().toLowerCase();
  if (lower.length === 0 || lower.length > 40) return false;
  // Block grandiose titles unless we're at legendary tier.
  const isGrand = BANNED_TITLE_FRAGMENTS.some(b => lower.includes(b));
  if (isGrand && (candidate.confidence < LEGENDARY_MIN_CONFIDENCE || (input.turnCount ?? 0) < LEGENDARY_MIN_TURNS)) {
    return false;
  }
  // Block exact reuse of the character's own name.
  if (input.characterName && lower === input.characterName.toLowerCase()) return false;
  // Block duplicate of an existing active nickname FROM THE SAME SOURCE.
  const dup = (input.existingNicknames ?? []).find(
    n => n.status === 'active' && n.sourceType === candidate.sourceType && n.nickname.toLowerCase() === lower,
  );
  if (dup) return false;
  return true;
}

// ── Final proposal ─────────────────────────────────────────────────────

export function proposeNickname(input: NicknameInput): NicknameProposal | null {
  const reasons = detectNicknameReasons(input);
  const scored = scoreCandidate(reasons, input);
  if (!scored) return null;
  if (scored.confidence < MIN_CONFIDENCE_TO_PROPOSE) return null;

  // The AI suggestion is required as the actual TEXT — the engine never invents
  // the nickname itself, only judges the AI's offering. If absent, we report
  // a "candidate exists but no text" by returning null so the narrator stays silent.
  const aiText = input.aiSuggestion?.nickname?.trim();
  if (!aiText) return null;
  if (!isAiSuggestionAllowed(aiText, scored, input)) return null;

  // Tone override if the AI was overconfident: enemy mouths can't speak warm names.
  const tone = scored.sourceType === 'enemy' ? pickTone(reasons, scored, input.speaker?.affinity) : (input.aiSuggestion?.tone ?? scored.tone);

  // Evolution: if there is an active nickname from the SAME source whose status
  // would naturally evolve (e.g. confidence has jumped a tier), mark replacement.
  const existingFromSource = (input.existingNicknames ?? []).find(
    n => n.status === 'active' && n.sourceType === scored.sourceType && n.playerReaction !== 'rejected',
  );
  const replaces = existingFromSource && scored.confidence >= LEGENDARY_MIN_CONFIDENCE
    ? existingFromSource.id
    : undefined;

  // Earning gates.
  const meetsTurnBar = (input.turnCount ?? 0) >= MIN_TURNS_BEFORE_INTRODUCE;
  const meetsConfBar = scored.confidence >= MIN_CONFIDENCE_TO_INTRODUCE;
  const isLegendary = tone === 'legendary' || tone === 'feared';
  const meetsLegendaryBar = !isLegendary
    || (scored.confidence >= LEGENDARY_MIN_CONFIDENCE && (input.turnCount ?? 0) >= LEGENDARY_MIN_TURNS);

  // Player-reaction gate: if the player rejected this nickname before, never reintroduce.
  const rejectedBefore = (input.existingNicknames ?? []).some(
    n => n.status === 'rejected' && n.nickname.trim().toLowerCase() === aiText.toLowerCase(),
  );

  const shouldIntroduceNow = meetsTurnBar && meetsConfBar && meetsLegendaryBar && !rejectedBefore;

  const reasonText = reasons
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(r => r.detail)
    .join('; ');

  const usageGuidance = buildUsageGuidance({
    sourceType: scored.sourceType,
    tone,
    shouldIntroduceNow,
    confidence: scored.confidence,
  });

  return {
    nickname: aiText,
    targetCharacterId: input.characterId,
    sourceType: scored.sourceType,
    sourceName: scored.sourceName,
    tone,
    reason: reasonText || 'no specific reason',
    confidence: scored.confidence,
    shouldIntroduceNow,
    usageGuidance,
    replacesNicknameId: replaces,
    reasons,
  };
}

function buildUsageGuidance(args: {
  sourceType: NicknameSourceType;
  tone: NicknameTone;
  shouldIntroduceNow: boolean;
  confidence: number;
}): string {
  if (!args.shouldIntroduceNow) {
    return 'Hold the nickname — not earned yet. Keep observing in narration only.';
  }
  const speaker =
    args.sourceType === 'party' ? 'someone in the party'
    : args.sourceType === 'ally' ? 'a trusted ally'
    : args.sourceType === 'enemy' ? 'an enemy or rival'
    : args.sourceType === 'mentor' ? 'a mentor figure'
    : args.sourceType === 'public' ? 'a civilian or onlooker'
    : args.sourceType === 'rumor' ? 'whispered talk in the area'
    : args.sourceType === 'self' ? 'the character themselves'
    : 'the narrator (sparingly)';
  return `Introduce by having ${speaker} use it once, with a brief beat showing WHY (${args.tone} tone). Use it sparingly afterwards — at most once per scene.`;
}

// ── Helpers for callers ────────────────────────────────────────────────

/** Choose which nickname an NPC speaker should USE in dialogue, given known records. */
export function pickNicknameForSpeaker(
  records: Array<{ nickname: string; sourceType: NicknameSourceType; tone: NicknameTone; status: NicknameStatus; playerReaction?: PlayerReaction }>,
  speaker: { type: NicknameSourceType; affinity?: number },
): { nickname: string; tone: NicknameTone } | null {
  const usable = records.filter(r => r.status === 'active' && r.playerReaction !== 'rejected');
  if (usable.length === 0) return null;
  // Prefer same-source-type, then matching affinity tone, then anything.
  const sameType = usable.filter(r => r.sourceType === speaker.type);
  if (sameType.length > 0) return { nickname: sameType[0].nickname, tone: sameType[0].tone };
  // Hostile speakers must not use affectionate names.
  if ((speaker.affinity ?? 0) < -25) {
    const hostileOk = usable.find(r => r.tone === 'mocking' || r.tone === 'feared' || r.tone === 'neutral');
    if (hostileOk) return { nickname: hostileOk.nickname, tone: hostileOk.tone };
    return null;
  }
  return { nickname: usable[0].nickname, tone: usable[0].tone };
}
