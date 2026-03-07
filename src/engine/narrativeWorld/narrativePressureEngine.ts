/**
 * System 10 — Narrative Pressure Engine
 *
 * Generates situational narrative pressure that encourages players to reveal
 * aspects of their characters through decisions, reactions, and dialogue.
 * Never forces choices — only presents opportunities for character expression.
 */

import type {
  EmotionalPressureState,
  EnvironmentalClue,
  SignaturePattern,
  BiomeToneTag,
} from './types';

// ── Types ───────────────────────────────────────────────────────

export type NarrativePressureType =
  | 'moral'      // compassion vs pragmatism
  | 'risk'       // boldness vs caution
  | 'curiosity'  // exploration vs restraint
  | 'emotional'  // memory / background exploration
  | 'identity';  // motivation / purpose

export interface NarrativePressureEvent {
  id: string;
  type: NarrativePressureType;
  /** Narrator-ready prompt text */
  prompt: string;
  /** Short environmental detail that triggered the pressure */
  environmentalContext: string;
  /** Current zone when generated */
  zoneId?: string;
  /** Turn number when generated */
  turnGenerated: number;
  /** Was the player observed interacting with this? */
  acknowledged: boolean;
  /** Optional callback hint for Memory integration */
  memoryTag: string;
}

export interface PressureConditions {
  environmentStability: EmotionalPressureState;
  turnNumber: number;
  /** Number of player messages since last pressure event */
  messagesSinceLastPressure: number;
  /** Active hazard count in the current environment */
  activeHazards: number;
  /** Whether the narrator has recently escalated */
  narratorEscalated: boolean;
  /** Recent battlefield mutations count */
  recentMutations: number;
  /** Player's dominant behavioral pattern (from System 7) */
  dominantPattern?: SignaturePattern;
  /** Current biome tone */
  biomeTone?: BiomeToneTag;
}

export interface NarrativePressureState {
  events: NarrativePressureEvent[];
  lastEventTurn: number;
  /** Minimum turns between pressure events */
  cooldown: number;
  totalGenerated: number;
}

// ── Constants ───────────────────────────────────────────────────

const DEFAULT_COOLDOWN = 4;
const MIN_MESSAGES_BETWEEN = 3;

/** Biome-tone → pressure-type affinity map */
const TONE_PRESSURE_AFFINITY: Partial<Record<BiomeToneTag, NarrativePressureType[]>> = {
  mysterious:  ['curiosity', 'emotional'],
  dangerous:   ['risk', 'moral'],
  sacred:      ['emotional', 'identity'],
  desolate:    ['emotional', 'curiosity'],
  corrupted:   ['moral', 'risk'],
  industrial:  ['curiosity', 'risk'],
  peaceful:    ['emotional', 'identity'],
  chaotic:     ['risk', 'moral'],
  ancient:     ['curiosity', 'emotional'],
  desperate:   ['moral', 'risk'],
  hopeful:     ['identity', 'emotional'],
  oppressive:  ['identity', 'moral'],
};

/** Pattern → pressure-type affinity (adapts to player behavior) */
const PATTERN_PRESSURE_AFFINITY: Partial<Record<SignaturePattern, NarrativePressureType[]>> = {
  stealth:       ['risk', 'curiosity'],
  investigation: ['curiosity', 'emotional'],
  aggression:    ['moral', 'identity'],
  protection:    ['moral', 'emotional'],
  diplomacy:     ['identity', 'emotional'],
  exploration:   ['curiosity', 'risk'],
  destruction:   ['moral', 'risk'],
};

// ── Prompt Templates ────────────────────────────────────────────

interface PromptTemplate {
  type: NarrativePressureType;
  prompts: string[];
  contexts: string[];
  memoryTag: string;
}

const PROMPT_TEMPLATES: PromptTemplate[] = [
  // Moral
  {
    type: 'moral',
    prompts: [
      'You hear someone trapped beneath the fallen rubble nearby. Helping them might expose you to danger.',
      'A wounded figure lies slumped against the wall ahead. They reach toward you weakly.',
      'Supplies are scattered across the ground — enough for one person. Someone else is watching from the shadows.',
      'A damaged construct sparks on the ground, still partially functional. Destroying it would be easy. Repairing it would take time.',
    ],
    contexts: [
      'debris and rubble shifting nearby',
      'faint sounds of distress from somewhere close',
      'scattered supplies glinting in dim light',
      'sparking machinery crackling softly',
    ],
    memoryTag: 'moral_choice_presented',
  },
  // Risk
  {
    type: 'risk',
    prompts: [
      'The bridge beneath your feet creaks loudly as cracks spread across the surface. Crossing now might be faster, but the structure looks unstable.',
      'A narrow passage leads deeper into the structure. The walls are shifting slightly.',
      'The ground trembles faintly. Moving forward means trusting the terrain to hold.',
      'A damaged stairwell descends into darkness. The air below feels heavy and still.',
    ],
    contexts: [
      'cracking stone underfoot',
      'walls vibrating with subtle tremors',
      'unstable ground shifting beneath you',
      'darkness pooling at the bottom of a stairwell',
    ],
    memoryTag: 'risk_situation_presented',
  },
  // Curiosity
  {
    type: 'curiosity',
    prompts: [
      'A faint glow pulses from beneath the toxic pool. Something lies beneath the surface.',
      'Strange markings line the wall ahead. They seem to shift when you look at them directly.',
      'A sealed container rests in the corner, partially buried in debris. It hums faintly.',
      'An unusual sound echoes from a side passage — rhythmic, almost deliberate.',
    ],
    contexts: [
      'faint bioluminescent glow from a nearby pool',
      'shifting symbols carved into stone',
      'a humming container half-buried in rubble',
      'rhythmic echoes from an unexplored passage',
    ],
    memoryTag: 'curiosity_moment_presented',
  },
  // Emotional
  {
    type: 'emotional',
    prompts: [
      'The ruins resemble a temple you once visited long ago. Something about this place feels familiar.',
      'A weathered carving on the wall depicts a scene that stirs something distant in your memory.',
      'The wind carries a scent — soil after rain, or perhaps something from another time.',
      'Silence settles over the area. For a moment, everything feels impossibly still.',
    ],
    contexts: [
      'architecture that echoes something half-remembered',
      'a weathered carving catching the light',
      'a familiar scent carried on the wind',
      'sudden stillness in the environment',
    ],
    memoryTag: 'emotional_moment_presented',
  },
  // Identity
  {
    type: 'identity',
    prompts: [
      'The opponent pauses and lowers their weapon slightly. "Why are you really here?" they ask.',
      'A battered sign on the wall reads: "Those who enter choose what they become."',
      'Your reflection catches in a cracked mirror across the room. Something about it feels unfamiliar.',
      'The path ahead splits cleanly in two. Neither direction offers an obvious advantage.',
    ],
    contexts: [
      'a brief pause in combat tension',
      'faded text on a damaged sign',
      'a cracked mirror reflecting distorted light',
      'a diverging path with no clear advantage',
    ],
    memoryTag: 'identity_moment_presented',
  },
];

// ── Engine Functions ────────────────────────────────────────────

let _counter = 0;
function uid(): string {
  return `npe_${Date.now().toString(36)}_${(++_counter).toString(36)}`;
}

/** Create a fresh pressure engine state */
export function createPressureEngineState(cooldown = DEFAULT_COOLDOWN): NarrativePressureState {
  return {
    events: [],
    lastEventTurn: -cooldown, // allow first event immediately
    cooldown,
    totalGenerated: 0,
  };
}

/** Evaluate whether conditions warrant a new pressure event */
export function shouldGeneratePressure(
  state: NarrativePressureState,
  conditions: PressureConditions,
): boolean {
  // Cooldown check
  if (conditions.turnNumber - state.lastEventTurn < state.cooldown) return false;

  // Need enough player messages since last pressure
  if (conditions.messagesSinceLastPressure < MIN_MESSAGES_BETWEEN) return false;

  // Higher chance when environment is stressed
  const stabilityBonus: Record<EmotionalPressureState, number> = {
    stable: 0.08,
    strained: 0.18,
    unstable: 0.30,
    critical: 0.45,
    collapse: 0.55,
  };

  let chance = stabilityBonus[conditions.environmentStability] ?? 0.10;

  // Narrator escalation increases chance
  if (conditions.narratorEscalated) chance += 0.12;

  // Active hazards contribute
  chance += Math.min(conditions.activeHazards * 0.04, 0.16);

  // Recent mutations contribute
  chance += Math.min(conditions.recentMutations * 0.03, 0.12);

  return Math.random() < chance;
}

/** Select the best pressure type given current conditions */
export function selectPressureType(
  conditions: PressureConditions,
): NarrativePressureType {
  // Build weighted candidates from tone + pattern affinity
  const weights: Record<NarrativePressureType, number> = {
    moral: 1,
    risk: 1,
    curiosity: 1,
    emotional: 1,
    identity: 1,
  };

  // Boost types aligned with current biome tone
  if (conditions.biomeTone) {
    const toneTypes = TONE_PRESSURE_AFFINITY[conditions.biomeTone];
    if (toneTypes) {
      toneTypes.forEach((t, i) => { weights[t] += 3 - i; }); // first gets +3, second +2
    }
  }

  // Boost types aligned with player behavior
  if (conditions.dominantPattern) {
    const patternTypes = PATTERN_PRESSURE_AFFINITY[conditions.dominantPattern];
    if (patternTypes) {
      patternTypes.forEach((t, i) => { weights[t] += 2 - i; });
    }
  }

  // Stability-driven: unstable+ favors risk/moral
  if (['unstable', 'critical', 'collapse'].includes(conditions.environmentStability)) {
    weights.risk += 2;
    weights.moral += 1;
  }

  // Weighted random selection
  const entries = Object.entries(weights) as [NarrativePressureType, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [type, w] of entries) {
    roll -= w;
    if (roll <= 0) return type;
  }

  return 'moral'; // fallback
}

/** Generate a narrative pressure event */
export function generatePressureEvent(
  state: NarrativePressureState,
  conditions: PressureConditions,
  zoneId?: string,
): { state: NarrativePressureState; event: NarrativePressureEvent } {
  const type = selectPressureType(conditions);
  const template = PROMPT_TEMPLATES.find(t => t.type === type) ?? PROMPT_TEMPLATES[0];

  const promptIdx = Math.floor(Math.random() * template.prompts.length);
  const contextIdx = Math.floor(Math.random() * template.contexts.length);

  const event: NarrativePressureEvent = {
    id: uid(),
    type,
    prompt: template.prompts[promptIdx],
    environmentalContext: template.contexts[contextIdx],
    zoneId,
    turnGenerated: conditions.turnNumber,
    acknowledged: false,
    memoryTag: template.memoryTag,
  };

  return {
    state: {
      ...state,
      events: [...state.events, event],
      lastEventTurn: conditions.turnNumber,
      totalGenerated: state.totalGenerated + 1,
    },
    event,
  };
}

/** Mark a pressure event as acknowledged (player interacted) */
export function acknowledgePressureEvent(
  state: NarrativePressureState,
  eventId: string,
): NarrativePressureState {
  return {
    ...state,
    events: state.events.map(e =>
      e.id === eventId ? { ...e, acknowledged: true } : e,
    ),
  };
}

/** Build narrator context string for the most recent unacknowledged event */
export function buildPressureNarratorContext(state: NarrativePressureState): string | null {
  const pending = state.events.filter(e => !e.acknowledged);
  if (pending.length === 0) return null;

  const latest = pending[pending.length - 1];
  return `[Narrative Pressure — ${latest.type}] ${latest.environmentalContext}. ${latest.prompt}`;
}

/** Get all acknowledged events for memory integration */
export function getAcknowledgedPressureEvents(
  state: NarrativePressureState,
): NarrativePressureEvent[] {
  return state.events.filter(e => e.acknowledged);
}

/** Build a memory summary of past pressure interactions */
export function buildPressureMemorySummary(state: NarrativePressureState): string {
  const acknowledged = getAcknowledgedPressureEvents(state);
  if (acknowledged.length === 0) return '';

  const lines = acknowledged.map(e =>
    `• [${e.type}] Turn ${e.turnGenerated}: "${e.prompt.slice(0, 60)}…"`,
  );

  return `Past narrative pressure interactions (${acknowledged.length}):\n${lines.join('\n')}`;
}
