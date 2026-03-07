/**
 * System 13 — Character Reflection Engine
 *
 * Occasionally prompts players to express their character's inner
 * thoughts or memories during meaningful narrative moments.
 * Responses become part of the character's evolving identity.
 */

import type { EmotionalPressureState, BiomeToneTag } from './types';

// ── Types ───────────────────────────────────────────────────────

export type ReflectionTrigger =
  | 'quiet_moment'
  | 'environment_transition'
  | 'aftermath'
  | 'emotional_pressure';

export interface ReflectionPrompt {
  id: string;
  trigger: ReflectionTrigger;
  prompt: string;
  /** Optional narrator-flavour preamble */
  sceneSetting: string;
  /** Turn when generated */
  turnGenerated: number;
  /** Whether the player responded */
  answered: boolean;
  /** Player's response, if any */
  response?: string;
}

export interface ReflectionConditions {
  turnNumber: number;
  environmentStability: EmotionalPressureState;
  inCombat: boolean;
  biomeTone?: BiomeToneTag;
  recentMajorEvent: boolean;
  /** turns since last reflection prompt */
  turnsSinceLastReflection: number;
}

export interface ReflectionState {
  prompts: ReflectionPrompt[];
  lastPromptTurn: number;
}

// ── Constants ───────────────────────────────────────────────────

const MIN_TURNS_BETWEEN = 8;

const PROMPT_TEMPLATES: Record<ReflectionTrigger, string[]> = {
  quiet_moment: [
    'You pause for a moment and look at the battlefield. What does this moment remind your character of?',
    'A brief silence falls. What thought crosses your character\'s mind?',
    'The wind shifts. Your character seems lost in thought for a moment — about what?',
  ],
  environment_transition: [
    'The landscape changes around you. What does your character notice first — and what does it make them feel?',
    'You step into unfamiliar terrain. Does this place remind your character of anything?',
    'The world shifts. What instinct does your character follow in a new place?',
  ],
  aftermath: [
    'The dust settles. How does your character feel about what just happened?',
    'It\'s over — for now. What does your character want to remember about this moment?',
    'You catch your breath. Is there something your character wishes they had done differently?',
  ],
  emotional_pressure: [
    'Something about this place weighs on your character. What is it?',
    'The tension is thick. What is your character afraid might happen next?',
    'Your character\'s hands tighten. What memory does this pressure bring back?',
  ],
};

const SCENE_SETTINGS: Record<ReflectionTrigger, string[]> = {
  quiet_moment: [
    'The area around you grows still.',
    'For a brief moment, nothing demands your attention.',
  ],
  environment_transition: [
    'The terrain gives way to something different ahead.',
    'You cross an invisible boundary between two worlds.',
  ],
  aftermath: [
    'The echoes of what just happened still linger.',
    'Silence slowly reclaims the space.',
  ],
  emotional_pressure: [
    'The atmosphere presses in around you.',
    'Something about this place feels heavy.',
  ],
};

// ── Internals ───────────────────────────────────────────────────

let _reflectionId = 0;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Public API ──────────────────────────────────────────────────

export function createReflectionState(): ReflectionState {
  return { prompts: [], lastPromptTurn: -999 };
}

/** Determine whether a reflection prompt should appear. */
export function shouldGenerateReflection(conditions: ReflectionConditions): boolean {
  // Never during active combat
  if (conditions.inCombat) return false;

  // Respect cooldown
  if (conditions.turnsSinceLastReflection < MIN_TURNS_BETWEEN) return false;

  // Higher chance after major events or during emotional pressure
  let chance = 0.12;
  if (conditions.recentMajorEvent) chance += 0.25;
  if (conditions.environmentStability === 'critical' || conditions.environmentStability === 'collapse') {
    chance += 0.15;
  }
  if (conditions.environmentStability === 'unstable') chance += 0.08;

  return Math.random() < chance;
}

/** Select the appropriate trigger type based on conditions. */
export function selectReflectionTrigger(conditions: ReflectionConditions): ReflectionTrigger {
  if (conditions.recentMajorEvent) return 'aftermath';
  if (conditions.environmentStability === 'critical' || conditions.environmentStability === 'collapse') {
    return 'emotional_pressure';
  }
  if (conditions.biomeTone && conditions.biomeTone !== (conditions as any)._prevTone) {
    return 'environment_transition';
  }
  return 'quiet_moment';
}

/** Generate a reflection prompt. */
export function generateReflection(
  state: ReflectionState,
  conditions: ReflectionConditions,
): { state: ReflectionState; prompt: ReflectionPrompt } {
  const trigger = selectReflectionTrigger(conditions);
  const prompt: ReflectionPrompt = {
    id: `reflection_${++_reflectionId}`,
    trigger,
    prompt: pickRandom(PROMPT_TEMPLATES[trigger]),
    sceneSetting: pickRandom(SCENE_SETTINGS[trigger]),
    turnGenerated: conditions.turnNumber,
    answered: false,
  };

  return {
    state: {
      prompts: [...state.prompts, prompt],
      lastPromptTurn: conditions.turnNumber,
    },
    prompt,
  };
}

/** Record the player's response to a reflection prompt. */
export function answerReflection(
  state: ReflectionState,
  promptId: string,
  response: string,
): ReflectionState {
  const prompts = state.prompts.map((p) =>
    p.id === promptId ? { ...p, answered: true, response } : p,
  );
  return { ...state, prompts };
}

/** Get all answered reflections (useful for echo system integration). */
export function getAnsweredReflections(state: ReflectionState): ReflectionPrompt[] {
  return state.prompts.filter((p) => p.answered && p.response);
}

/** Build narrator context from recent reflections. */
export function buildReflectionNarratorContext(state: ReflectionState): string {
  const answered = getAnsweredReflections(state).slice(-3);
  if (answered.length === 0) return '';
  const refs = answered.map((p) => `"${p.response}"`);
  return `Character reflections: ${refs.join('; ')}`;
}
