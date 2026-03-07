/**
 * System 14 — Character Conscience System
 *
 * Detects when a character acts out-of-character based on their
 * established personality, mentality, and behavioral signature.
 * When an OOC action is detected, the system generates an internal
 * "conscience" prompt — an inner voice questioning whether this is
 * really what the character wants to do.
 *
 * If the player confirms or explains the action, the result is
 * recorded to the character's mentality notes via Discovery Sync,
 * capturing character growth or deliberate change.
 *
 * Integrates with:
 * • Character Signature Interactions (behavioral baseline)
 * • Character Discovery Sync (persist to mentality)
 * • Character Echo System (store conscience moments as echoes)
 * • Narrative Pressure Engine (context awareness)
 * • Narrator AI (delivery)
 * • Battlefield Memory (event tracking)
 */

import type { SignaturePattern, CharacterSignatureProfile, BiomeToneTag } from './types';

// ── Types ───────────────────────────────────────────────────────

/** Categories of out-of-character deviation the conscience can detect */
export type DeviationType =
  | 'moral_shift'        // Acting against established moral compass
  | 'tactic_shift'       // Fighting style contradicts mentality
  | 'personality_break'  // Behaviour contradicts personality traits
  | 'value_contradiction'// Directly opposes a stated value or belief
  | 'emotional_reversal';// Sudden emotional tone opposite to norm

/** The conscience challenge presented to the player */
export interface ConsciencePrompt {
  id: string;
  characterId: string;
  /** What kind of deviation was detected */
  deviationType: DeviationType;
  /** The action text that triggered the conscience */
  triggeringAction: string;
  /** The inner-voice question shown to the player */
  innerVoice: string;
  /** What established trait this contradicts */
  contradicts: string;
  /** Turn number when generated */
  turnGenerated: number;
  /** Whether the player has responded */
  resolved: boolean;
  /** Player's response (if any) */
  playerResponse?: string;
  /** Whether the player confirmed the action */
  confirmed?: boolean;
}

/** Conditions evaluated to detect out-of-character behaviour */
export interface ConscienceContext {
  /** The raw action text the player just wrote */
  actionText: string;
  /** The character's signature profile (behavioural baseline) */
  signatureProfile: CharacterSignatureProfile;
  /** Known personality keywords/tags from the character sheet */
  personalityTraits: string[];
  /** Known mentality keywords/tags from the character sheet */
  mentalityTraits: string[];
  /** Current turn number */
  turnNumber: number;
  /** Optional current biome tone for flavour */
  biomeTone?: BiomeToneTag;
}

/** Persistent state for the conscience system in a session */
export interface ConscienceState {
  prompts: ConsciencePrompt[];
  /** Character ID → number of conscience events this session */
  eventCounts: Record<string, number>;
  /** Cooldown: last turn a conscience prompt was shown per character */
  lastPromptTurn: Record<string, number>;
}

// ── Constants ───────────────────────────────────────────────────

/** Minimum turns between conscience prompts for the same character */
const CONSCIENCE_COOLDOWN = 6;

/** Maximum conscience prompts per character per session */
const MAX_PROMPTS_PER_SESSION = 5;

// ── Action-to-pattern mapping for deviation detection ───────────

const ACTION_PATTERN_MAP: Record<string, SignaturePattern> = {
  // Aggression signals
  'attack': 'aggression', 'strike': 'aggression', 'punch': 'aggression',
  'slash': 'aggression', 'crush': 'aggression', 'smash': 'aggression',
  'charge': 'aggression', 'assault': 'aggression',
  // Protection signals
  'shield': 'protection', 'protect': 'protection', 'defend': 'protection',
  'guard': 'protection', 'cover': 'protection', 'shelter': 'protection',
  // Stealth signals
  'sneak': 'stealth', 'hide': 'stealth', 'shadow': 'stealth',
  'silent': 'stealth', 'creep': 'stealth', 'evade': 'stealth',
  // Diplomacy signals
  'talk': 'diplomacy', 'negotiate': 'diplomacy', 'persuade': 'diplomacy',
  'convince': 'diplomacy', 'reason': 'diplomacy', 'plead': 'diplomacy',
  // Investigation signals
  'examine': 'investigation', 'inspect': 'investigation', 'search': 'investigation',
  'investigate': 'investigation', 'study': 'investigation', 'analyze': 'investigation',
  // Destruction signals
  'destroy': 'destruction', 'demolish': 'destruction', 'break': 'destruction',
  'shatter': 'destruction', 'obliterate': 'destruction', 'raze': 'destruction',
  // Exploration signals
  'explore': 'exploration', 'wander': 'exploration', 'venture': 'exploration',
  'discover': 'exploration', 'scout': 'exploration',
};

/** Trait keywords that define moral/personality baselines */
const MORAL_POSITIVE: RegExp = /kind|gentle|compassionate|merciful|peaceful|caring|protective|loyal|honest|noble|selfless|empathetic/i;
const MORAL_NEGATIVE: RegExp = /ruthless|cold|cruel|merciless|violent|aggressive|selfish|deceptive|manipulative|heartless|savage/i;

const CAUTIOUS_TRAITS: RegExp = /careful|cautious|patient|methodical|calculating|defensive|reserved|analytical|measured|thoughtful/i;
const BOLD_TRAITS: RegExp = /reckless|bold|impulsive|aggressive|fearless|brash|daring|wild|chaotic|unstoppable/i;

// ── State Management ────────────────────────────────────────────

let _conscienceId = 0;
function uid(): string {
  return `con_${Date.now().toString(36)}_${(++_conscienceId).toString(36)}`;
}

export function createConscienceState(): ConscienceState {
  return {
    prompts: [],
    eventCounts: {},
    lastPromptTurn: {},
  };
}

// ── Deviation Detection ─────────────────────────────────────────

/**
 * Detect the dominant pattern implied by the player's action text.
 */
function detectActionPattern(actionText: string): SignaturePattern | null {
  const lower = actionText.toLowerCase();
  const counts: Partial<Record<SignaturePattern, number>> = {};

  for (const [keyword, pattern] of Object.entries(ACTION_PATTERN_MAP)) {
    if (lower.includes(keyword)) {
      counts[pattern] = (counts[pattern] ?? 0) + 1;
    }
  }

  let best: SignaturePattern | null = null;
  let bestCount = 0;
  for (const [pattern, count] of Object.entries(counts) as [SignaturePattern, number][]) {
    if (count > bestCount) {
      bestCount = count;
      best = pattern;
    }
  }

  return best;
}

/**
 * Check if the action's implied pattern deviates from the character's
 * established dominant pattern significantly enough to trigger conscience.
 */
function detectTacticDeviation(
  actionPattern: SignaturePattern,
  profile: CharacterSignatureProfile,
): { isDeviation: boolean; contradicts: string } {
  const dominant = profile.dominantPattern;
  if (actionPattern === dominant) return { isDeviation: false, contradicts: '' };

  // Only flag if the character has a strong enough baseline
  const dominantCount = profile.patterns[dominant];
  const actionCount = profile.patterns[actionPattern];
  if (dominantCount < 4) return { isDeviation: false, contradicts: '' };

  // Significant deviation: dominant is well-established and action pattern is rarely used
  const ratio = actionCount / dominantCount;
  if (ratio < 0.25) {
    return {
      isDeviation: true,
      contradicts: `Established ${dominant} pattern (${dominantCount} actions) vs sudden ${actionPattern}`,
    };
  }

  return { isDeviation: false, contradicts: '' };
}

/**
 * Check if the action text contradicts personality/mentality trait keywords.
 */
function detectTraitContradiction(
  actionText: string,
  personalityTraits: string[],
  mentalityTraits: string[],
): { type: DeviationType; contradicts: string } | null {
  const lower = actionText.toLowerCase();
  const allTraits = [...personalityTraits, ...mentalityTraits].join(' ').toLowerCase();

  // Moral contradiction: kind character doing something cruel, or vice versa
  const isKindCharacter = MORAL_POSITIVE.test(allTraits);
  const isCruelAction = MORAL_NEGATIVE.test(lower);
  if (isKindCharacter && isCruelAction) {
    return {
      type: 'moral_shift',
      contradicts: 'Established compassionate/kind personality',
    };
  }

  const isCruelCharacter = MORAL_NEGATIVE.test(allTraits);
  const isKindAction = MORAL_POSITIVE.test(lower);
  if (isCruelCharacter && isKindAction) {
    return {
      type: 'moral_shift',
      contradicts: 'Established ruthless/cold personality',
    };
  }

  // Tactical contradiction: cautious character acting recklessly
  const isCautious = CAUTIOUS_TRAITS.test(allTraits);
  const isBoldAction = BOLD_TRAITS.test(lower);
  if (isCautious && isBoldAction) {
    return {
      type: 'tactic_shift',
      contradicts: 'Established cautious/methodical mentality',
    };
  }

  const isBold = BOLD_TRAITS.test(allTraits);
  const isCautiousAction = CAUTIOUS_TRAITS.test(lower);
  if (isBold && isCautiousAction) {
    return {
      type: 'tactic_shift',
      contradicts: 'Established bold/impulsive mentality',
    };
  }

  return null;
}

// ── Core API ────────────────────────────────────────────────────

/**
 * Evaluate whether a player's action warrants a conscience prompt.
 * Returns null if no deviation is detected or cooldown is active.
 */
export function evaluateConscience(
  state: ConscienceState,
  context: ConscienceContext,
): { state: ConscienceState; prompt: ConsciencePrompt } | null {
  const charId = context.signatureProfile.characterId;

  // Cooldown check
  const lastTurn = state.lastPromptTurn[charId] ?? -Infinity;
  if (context.turnNumber - lastTurn < CONSCIENCE_COOLDOWN) return null;

  // Session limit check
  const count = state.eventCounts[charId] ?? 0;
  if (count >= MAX_PROMPTS_PER_SESSION) return null;

  // 1. Check trait contradiction (personality/mentality keywords)
  const traitResult = detectTraitContradiction(
    context.actionText,
    context.personalityTraits,
    context.mentalityTraits,
  );

  // 2. Check tactic deviation (signature pattern)
  const actionPattern = detectActionPattern(context.actionText);
  const tacticResult = actionPattern
    ? detectTacticDeviation(actionPattern, context.signatureProfile)
    : null;

  // Determine if there's a deviation worth flagging
  let deviationType: DeviationType;
  let contradicts: string;

  if (traitResult) {
    deviationType = traitResult.type;
    contradicts = traitResult.contradicts;
  } else if (tacticResult?.isDeviation) {
    deviationType = 'tactic_shift';
    contradicts = tacticResult.contradicts;
  } else {
    return null; // No deviation detected
  }

  // Generate the inner-voice prompt
  const innerVoice = generateInnerVoice(deviationType, contradicts, context.biomeTone);

  const prompt: ConsciencePrompt = {
    id: uid(),
    characterId: charId,
    deviationType,
    triggeringAction: context.actionText,
    innerVoice,
    contradicts,
    turnGenerated: context.turnNumber,
    resolved: false,
  };

  const newState: ConscienceState = {
    prompts: [...state.prompts, prompt],
    eventCounts: { ...state.eventCounts, [charId]: count + 1 },
    lastPromptTurn: { ...state.lastPromptTurn, [charId]: context.turnNumber },
  };

  return { state: newState, prompt };
}

/**
 * Record the player's response to a conscience prompt.
 * If confirmed, the action stands and the shift is noted.
 * If denied, the player reconsidered.
 */
export function resolveConsciencePrompt(
  state: ConscienceState,
  promptId: string,
  playerResponse: string,
  confirmed: boolean,
): ConscienceState {
  return {
    ...state,
    prompts: state.prompts.map(p =>
      p.id === promptId
        ? { ...p, resolved: true, playerResponse, confirmed }
        : p,
    ),
  };
}

/**
 * Get all resolved conscience prompts for a character.
 */
export function getResolvedPrompts(
  state: ConscienceState,
  characterId: string,
): ConsciencePrompt[] {
  return state.prompts.filter(p => p.characterId === characterId && p.resolved);
}

/**
 * Get unresolved (pending) conscience prompts.
 */
export function getPendingConsciencePrompts(
  state: ConscienceState,
  characterId: string,
): ConsciencePrompt[] {
  return state.prompts.filter(p => p.characterId === characterId && !p.resolved);
}

// ── Narrator Integration ────────────────────────────────────────

/**
 * Build narrator context for a conscience prompt.
 * This appears as an internal thought, not a system message.
 */
export function buildConscienceNarratorContext(prompt: ConsciencePrompt): string {
  return [
    `[CONSCIENCE — Internal thought for ${prompt.characterId}]`,
    `A moment of hesitation. ${prompt.innerVoice}`,
    `(This contradicts: ${prompt.contradicts})`,
  ].join('\n');
}

/**
 * Build a mentality note entry from a resolved conscience event.
 * This gets synced to the character's mentality field via Discovery Sync.
 */
export function buildConscienceMentalityNote(prompt: ConsciencePrompt): string | null {
  if (!prompt.resolved) return null;

  const date = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (prompt.confirmed) {
    return `[Conscience ${date}] Deliberately chose to act against established nature — ${prompt.deviationType.replace('_', ' ')}. ${prompt.playerResponse ?? 'Confirmed without explanation.'}`;
  }

  return `[Conscience ${date}] Reconsidered an out-of-character impulse — ${prompt.deviationType.replace('_', ' ')}. Inner voice prevailed.`;
}

/**
 * Build a summary of all conscience events for Battlefield Memory.
 */
export function buildConscienceMemorySummary(
  state: ConscienceState,
  characterId: string,
): string {
  const resolved = getResolvedPrompts(state, characterId);
  if (resolved.length === 0) return '';

  const confirmed = resolved.filter(p => p.confirmed);
  const reconsidered = resolved.filter(p => !p.confirmed);

  const lines: string[] = ['[Character Conscience Events]'];

  if (confirmed.length > 0) {
    lines.push(`Deliberately broke pattern ${confirmed.length} time(s):`);
    for (const p of confirmed) {
      lines.push(`  • ${p.deviationType.replace('_', ' ')}: "${p.triggeringAction.slice(0, 60)}"`);
    }
  }

  if (reconsidered.length > 0) {
    lines.push(`Reconsidered ${reconsidered.length} out-of-character impulse(s).`);
  }

  return lines.join('\n');
}

// ── Inner Voice Generator ───────────────────────────────────────

function generateInnerVoice(
  type: DeviationType,
  contradicts: string,
  biomeTone?: BiomeToneTag,
): string {
  const templates: Record<DeviationType, string[]> = {
    moral_shift: [
      'Something stirs inside you. Is this really who you are?',
      'A quiet voice within asks — does this feel right?',
      'You hesitate. This isn\'t how you usually act. Do you mean it?',
      'For a moment, you feel the weight of this choice. Is this what you want?',
    ],
    tactic_shift: [
      'This isn\'t your usual approach. Are you sure about this?',
      'You feel a pull toward your instincts. Is this the right call?',
      'Something feels off about this tactic. Do you trust this choice?',
      'Your body wants to move differently. Is this deliberate?',
    ],
    personality_break: [
      'You catch yourself. This doesn\'t feel like you.',
      'A thought surfaces — when did you start acting like this?',
      'You pause. Is this who you\'re becoming, or just a moment?',
      'Something in the back of your mind whispers: this isn\'t you.',
    ],
    value_contradiction: [
      'You remember what you believe in. Does this action align with that?',
      'The choice before you contradicts something you hold dear. Do you proceed?',
      'A principle you\'ve carried feels tested. What do you choose?',
    ],
    emotional_reversal: [
      'Your emotions shift suddenly. Is this how you truly feel?',
      'The change in your demeanor surprises even you. Is this real?',
      'You feel something unfamiliar rising. Do you let it take hold?',
    ],
  };

  const pool = templates[type];
  // Use biomeTone to subtly influence selection for variety
  const toneOffset = biomeTone ? biomeTone.length : 0;
  const index = (Date.now() + toneOffset) % pool.length;

  return pool[index];
}
