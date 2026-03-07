/**
 * System 17 — Character Identity Engine
 *
 * Gradually builds an evolving understanding of a character's identity
 * based on actions, dialogue, decisions, and reflections. Discovers
 * personality traits, moral tendencies, motivations, and behavioral
 * patterns through narrative evidence rather than static assignment.
 */

import type { EmotionalPressureState, SignaturePattern } from './types';
import type { StoryTheme } from './storyGravityEngine';
import type { EchoType } from './characterEchoSystem';
import type { DeviationType } from './characterConscienceSystem';

// ── Types ───────────────────────────────────────────────────────

export type IdentityTrait =
  | 'curious'
  | 'cautious'
  | 'compassionate'
  | 'ruthless'
  | 'protective'
  | 'rebellious'
  | 'disciplined'
  | 'analytical'
  | 'impulsive'
  | 'honorable'
  | 'resourceful'
  | 'stoic'
  | 'empathetic'
  | 'defiant'
  | 'patient';

export type MoralTendency = 'altruistic' | 'pragmatic' | 'self-serving' | 'principled' | 'chaotic' | 'neutral';

export type EmotionalTendency = 'calm' | 'volatile' | 'guarded' | 'expressive' | 'detached' | 'passionate';

export type SpeechStyle = 'terse' | 'eloquent' | 'blunt' | 'poetic' | 'sarcastic' | 'formal' | 'casual' | 'neutral';

export interface TraitEvidence {
  trait: IdentityTrait;
  /** Accumulated weight 0–100 */
  weight: number;
  /** Number of narrative events supporting this trait */
  evidenceCount: number;
  /** Turn when first detected */
  firstSeen: number;
  /** Turn when last reinforced */
  lastReinforced: number;
}

export interface IdentityProfile {
  characterId: string;
  traits: TraitEvidence[];
  moralTendency: MoralTendency;
  emotionalTendency: EmotionalTendency;
  speechStyle: SpeechStyle;
  dominantMotivations: StoryTheme[];
  /** Traits with weight >= threshold */
  confirmedTraits: IdentityTrait[];
  /** Total narrative signals processed */
  signalCount: number;
  lastUpdateTurn: number;
}

export interface IdentitySignal {
  source: 'dialogue' | 'combat' | 'reflection' | 'pressure' | 'echo' | 'conscience' | 'exploration' | 'interaction';
  /** Raw text or action description */
  content: string;
  turnNumber: number;
  /** Optional context tags */
  tags?: string[];
}

export interface IdentityFeedback {
  id: string;
  text: string;
  trait: IdentityTrait;
  turn: number;
}

// ── Constants ───────────────────────────────────────────────────

/** Weight needed before a trait is "confirmed" */
const CONFIRMATION_THRESHOLD = 35;

/** Max weight to prevent runaway dominance */
const MAX_WEIGHT = 100;

/** Per-signal weight increment */
const BASE_INCREMENT = 4;

/** Passive decay per evaluation cycle */
const DECAY_PER_CYCLE = 0.6;

/** Min turns between identity feedback lines */
const FEEDBACK_COOLDOWN = 12;

const TRAIT_KEYWORDS: Record<IdentityTrait, RegExp[]> = {
  curious: [/investigat/i, /examin/i, /inspect/i, /wonder/i, /explor/i, /search/i, /look closer/i],
  cautious: [/careful/i, /wait/i, /observe first/i, /assess/i, /hold back/i, /hesitat/i],
  compassionate: [/help/i, /heal/i, /comfort/i, /care/i, /save them/i, /protect the/i],
  ruthless: [/crush/i, /destroy/i, /no mercy/i, /eliminate/i, /annihilat/i],
  protective: [/shield/i, /defend/i, /guard/i, /stand between/i, /cover them/i, /keep.*safe/i],
  rebellious: [/refuse/i, /defy/i, /resist/i, /won't obey/i, /break free/i, /against.*order/i],
  disciplined: [/focus/i, /maintain/i, /steady/i, /controlled/i, /train/i, /composure/i],
  analytical: [/analyz/i, /calculat/i, /deduc/i, /logic/i, /reason/i, /pattern/i],
  impulsive: [/rush/i, /charge/i, /without think/i, /leap/i, /immediately/i, /reckless/i],
  honorable: [/honor/i, /fair fight/i, /promise/i, /word/i, /oath/i, /duty/i],
  resourceful: [/improvise/i, /adapt/i, /makeshift/i, /clever/i, /workaround/i],
  stoic: [/unflinch/i, /unmov/i, /endure/i, /silently/i, /bear.*pain/i],
  empathetic: [/understand/i, /feel.*pain/i, /relate/i, /connect/i, /sympathi/i],
  defiant: [/stand.*ground/i, /won't back down/i, /never surrender/i, /face.*head on/i],
  patient: [/wait for/i, /bide.*time/i, /patient/i, /slow.*steady/i, /opportun/i],
};

const MORAL_KEYWORDS: Record<MoralTendency, RegExp[]> = {
  altruistic: [/help/i, /sacrifice/i, /save/i, /give/i, /protect/i],
  pragmatic: [/practical/i, /efficient/i, /necessary/i, /optimal/i],
  'self-serving': [/mine/i, /benefit/i, /profit/i, /advantage/i],
  principled: [/right thing/i, /honor/i, /duty/i, /justice/i],
  chaotic: [/chaos/i, /unpredictable/i, /impulse/i, /random/i],
  neutral: [],
};

const FEEDBACK_TEMPLATES: Record<IdentityTrait, string[]> = {
  curious: [
    'Your character\'s eyes search for answers before anything else.',
    'It seems your character can never resist a mystery.',
  ],
  cautious: [
    'Your character weighs every step before taking it.',
    'Caution defines the way your character moves through the world.',
  ],
  compassionate: [
    'As you step forward again without hesitation to help, it becomes clear this is simply the kind of person your character is.',
    'You\'ve never been the type to walk away from someone in need.',
  ],
  ruthless: [
    'Your character doesn\'t hesitate when the outcome demands it.',
    'Mercy is a word your character rarely considers.',
  ],
  protective: [
    'Your character places themselves between danger and others — again.',
    'Protecting those nearby has become second nature for your character.',
  ],
  rebellious: [
    'Your character refuses to bend, even when it would be easier.',
    'Defiance runs deep in everything your character does.',
  ],
  disciplined: [
    'Your character maintains control where others might falter.',
    'Discipline defines your character\'s approach to every challenge.',
  ],
  analytical: [
    'Your character reads the situation before acting — always.',
    'Analysis comes before action. That\'s your character\'s way.',
  ],
  impulsive: [
    'Your character acts before thinking — and somehow, it works.',
    'Hesitation isn\'t something your character understands.',
  ],
  honorable: [
    'Honor shapes every decision your character makes.',
    'Your character keeps their word, even when it costs them.',
  ],
  resourceful: [
    'Your character always finds a way, even with nothing.',
    'Resourcefulness has become your character\'s signature.',
  ],
  stoic: [
    'Your character endures without complaint — as always.',
    'Nothing seems to break your character\'s composure.',
  ],
  empathetic: [
    'Your character feels the weight of others\' struggles.',
    'Understanding others comes naturally to your character.',
  ],
  defiant: [
    'Your character stands firm when the world pushes back.',
    'Your character doesn\'t know how to back down.',
  ],
  patient: [
    'Your character waits for the right moment — always.',
    'Patience is your character\'s greatest weapon.',
  ],
};

// ── Internals ───────────────────────────────────────────────────

let _feedbackId = 0;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ── Public API ──────────────────────────────────────────────────

export function createIdentityProfile(characterId: string): IdentityProfile {
  return {
    characterId,
    traits: [],
    moralTendency: 'neutral',
    emotionalTendency: 'calm',
    speechStyle: 'neutral',
    dominantMotivations: [],
    confirmedTraits: [],
    signalCount: 0,
    lastUpdateTurn: 0,
  };
}

/** Process a narrative signal and update the identity profile. */
export function ingestIdentitySignal(
  profile: IdentityProfile,
  signal: IdentitySignal,
): IdentityProfile {
  const content = signal.content.toLowerCase();
  const updatedTraits = [...profile.traits];
  let changed = false;

  for (const [trait, patterns] of Object.entries(TRAIT_KEYWORDS) as [IdentityTrait, RegExp[]][]) {
    const matched = patterns.some((p) => p.test(content));
    if (!matched) continue;

    changed = true;
    const existing = updatedTraits.find((t) => t.trait === trait);
    if (existing) {
      existing.weight = clamp(existing.weight + BASE_INCREMENT, 0, MAX_WEIGHT);
      existing.evidenceCount += 1;
      existing.lastReinforced = signal.turnNumber;
    } else {
      updatedTraits.push({
        trait,
        weight: BASE_INCREMENT,
        evidenceCount: 1,
        firstSeen: signal.turnNumber,
        lastReinforced: signal.turnNumber,
      });
    }
  }

  // Update moral tendency
  let moralTendency = profile.moralTendency;
  for (const [tendency, patterns] of Object.entries(MORAL_KEYWORDS) as [MoralTendency, RegExp[]][]) {
    if (patterns.length > 0 && patterns.some((p) => p.test(content))) {
      moralTendency = tendency;
      break;
    }
  }

  const confirmed = updatedTraits
    .filter((t) => t.weight >= CONFIRMATION_THRESHOLD)
    .sort((a, b) => b.weight - a.weight)
    .map((t) => t.trait);

  return {
    ...profile,
    traits: updatedTraits,
    moralTendency,
    confirmedTraits: confirmed,
    signalCount: profile.signalCount + (changed ? 1 : 0),
    lastUpdateTurn: signal.turnNumber,
  };
}

/** Apply passive decay to trait weights — call once per evaluation cycle. */
export function decayIdentityTraits(profile: IdentityProfile): IdentityProfile {
  const traits = profile.traits
    .map((t) => ({ ...t, weight: Math.max(0, t.weight - DECAY_PER_CYCLE) }))
    .filter((t) => t.weight > 0 || t.evidenceCount >= 3);

  const confirmed = traits
    .filter((t) => t.weight >= CONFIRMATION_THRESHOLD)
    .sort((a, b) => b.weight - a.weight)
    .map((t) => t.trait);

  return { ...profile, traits, confirmedTraits: confirmed };
}

/** Ingest from conscience deviation — identity may shift. */
export function ingestFromConscience(
  profile: IdentityProfile,
  deviationType: DeviationType,
  confirmed: boolean,
  turnNumber: number,
): IdentityProfile {
  // If the player confirmed an OOC action, slight identity shift
  if (!confirmed) return profile;

  const shiftMap: Partial<Record<DeviationType, IdentityTrait>> = {
    moral_shift: 'impulsive',
    personality_break: 'rebellious',
    value_contradiction: 'defiant',
  };

  const trait = shiftMap[deviationType];
  if (!trait) return profile;

  return ingestIdentitySignal(profile, {
    source: 'conscience',
    content: trait,
    turnNumber,
  });
}

/** Ingest dominant themes from Story Gravity. */
export function syncMotivations(
  profile: IdentityProfile,
  dominantThemes: StoryTheme[],
): IdentityProfile {
  return { ...profile, dominantMotivations: dominantThemes.slice(0, 3) };
}

/** Update speech style based on dialogue analysis. */
export function updateSpeechStyle(
  profile: IdentityProfile,
  dialogueText: string,
): IdentityProfile {
  const lower = dialogueText.toLowerCase();
  const wordCount = lower.split(/\s+/).length;

  let style: SpeechStyle = profile.speechStyle;
  if (wordCount <= 5) style = 'terse';
  else if (wordCount >= 30) style = 'eloquent';
  else if (/\b(sir|madam|indeed|therefore)\b/i.test(lower)) style = 'formal';
  else if (/\b(yeah|nah|dude|gonna|wanna)\b/i.test(lower)) style = 'casual';
  else if (/\b(fool|obviously|sure.*right)\b/i.test(lower)) style = 'sarcastic';

  return { ...profile, speechStyle: style };
}

/** Check if identity feedback should be shown. */
export function shouldShowIdentityFeedback(
  profile: IdentityProfile,
  currentTurn: number,
): boolean {
  if (profile.confirmedTraits.length === 0) return false;
  if (currentTurn - profile.lastUpdateTurn < FEEDBACK_COOLDOWN) return false;
  return Math.random() < 0.15;
}

/** Generate a subtle identity feedback line for narration. */
export function generateIdentityFeedback(
  profile: IdentityProfile,
  currentTurn: number,
): IdentityFeedback | null {
  if (profile.confirmedTraits.length === 0) return null;

  const trait = profile.confirmedTraits[0]; // strongest confirmed trait
  const templates = FEEDBACK_TEMPLATES[trait];
  if (!templates || templates.length === 0) return null;

  return {
    id: `identity_${++_feedbackId}`,
    text: pick(templates),
    trait,
    turn: currentTurn,
  };
}

/** Get top confirmed traits for external system consumption. */
export function getConfirmedTraits(profile: IdentityProfile): IdentityTrait[] {
  return profile.confirmedTraits.slice(0, 5);
}

/** Get the full trait breakdown for debugging / narrator context. */
export function getTraitBreakdown(profile: IdentityProfile): TraitEvidence[] {
  return [...profile.traits].sort((a, b) => b.weight - a.weight);
}

/** Build narrator context string from current identity profile. */
export function buildIdentityNarratorContext(profile: IdentityProfile): string {
  if (profile.confirmedTraits.length === 0 && profile.signalCount < 5) return '';

  const parts: string[] = [];

  if (profile.confirmedTraits.length > 0) {
    parts.push(`Confirmed traits: ${profile.confirmedTraits.join(', ')}.`);
  }

  if (profile.moralTendency !== 'neutral') {
    parts.push(`Moral tendency: ${profile.moralTendency}.`);
  }

  if (profile.speechStyle !== 'neutral') {
    parts.push(`Speech style: ${profile.speechStyle}.`);
  }

  if (profile.dominantMotivations.length > 0) {
    parts.push(`Motivations: ${profile.dominantMotivations.join(', ')}.`);
  }

  return `Character identity: ${parts.join(' ')}`;
}

/** Build a persistence summary of the identity profile. */
export function buildIdentitySummary(profile: IdentityProfile): string {
  if (profile.signalCount === 0) return '';

  const traits = profile.confirmedTraits.join(', ') || 'none confirmed';
  return (
    `Identity profile (${profile.signalCount} signals): ` +
    `traits=[${traits}], moral=${profile.moralTendency}, ` +
    `speech=${profile.speechStyle}, emotional=${profile.emotionalTendency}`
  );
}
