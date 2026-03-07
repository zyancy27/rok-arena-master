/**
 * System 4 — Character Discovery Prompts
 *
 * Generates optional prompts that help players explore who their
 * characters are through situational decisions.
 * These never force choices — they offer narrative opportunities.
 */

import type { CharacterDiscoveryPrompt, DiscoveryPromptType, EmotionalPressureState } from './types';

// ── Prompt Templates ────────────────────────────────────────────

interface PromptTemplate {
  type: DiscoveryPromptType;
  trigger: string;
  prompts: string[];
}

const PROMPT_TEMPLATES: PromptTemplate[] = [
  // Moral
  {
    type: 'moral',
    trigger: 'someone_in_danger',
    prompts: [
      'You hear someone trapped under debris. Helping them may slow you down.',
      'A wounded figure reaches toward you from the rubble. They are not part of your mission.',
      'Screams echo from a building about to collapse. You could reach them, but barely.',
    ],
  },
  {
    type: 'moral',
    trigger: 'resource_scarcity',
    prompts: [
      'You find a supply cache. Taking it all would leave nothing for anyone else who passes through.',
      'A smaller group is struggling nearby. Sharing your resources would weaken your position.',
    ],
  },
  // Curiosity
  {
    type: 'curiosity',
    trigger: 'mysterious_object',
    prompts: [
      'You notice strange carvings on the wall. Do you inspect them?',
      'A faint glow pulses from beneath a stone slab. It might be nothing.',
      'An unusual symbol is scratched into the doorframe. It was not there before.',
    ],
  },
  {
    type: 'curiosity',
    trigger: 'unusual_sound',
    prompts: [
      'A low hum resonates from deeper within the structure. It might be mechanical, or something else.',
      'You hear a rhythm — deliberate tapping from somewhere below.',
    ],
  },
  // Risk
  {
    type: 'risk',
    trigger: 'structural_danger',
    prompts: [
      'The collapsing bridge might not hold much longer. Do you run across or search for another route?',
      'The ceiling groans above you. Moving fast increases your chance of making it through.',
      'A narrow ledge runs along the gap. It looks fragile but reachable.',
    ],
  },
  {
    type: 'risk',
    trigger: 'hazard_proximity',
    prompts: [
      'The fire has not reached this corridor yet, but it is close. Pushing through could save time.',
      'Toxic fumes drift from the east passage. The west path is longer but clearer.',
    ],
  },
  // Empathy
  {
    type: 'empathy',
    trigger: 'npc_interaction',
    prompts: [
      'A figure huddles in the corner, clutching something tightly. They flinch when you approach.',
      'An injured animal blocks your path. It watches you warily.',
    ],
  },
  // Resourcefulness
  {
    type: 'resourcefulness',
    trigger: 'environment_puzzle',
    prompts: [
      'A locked gate blocks the direct route. The hinges look rusted through.',
      'Water floods the lower passage. Debris nearby could be used to dam the flow.',
      'Power cables hang from the ceiling. Reconnecting them might open the sealed door.',
    ],
  },
];

// ── Generation Logic ────────────────────────────────────────────

let _promptId = 0;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a discovery prompt based on current environmental context.
 */
export function generateDiscoveryPrompt(
  pressureState: EmotionalPressureState,
  availableTriggers?: string[],
): CharacterDiscoveryPrompt | null {
  // Higher pressure = more intense prompt types
  const preferredTypes: DiscoveryPromptType[] =
    pressureState === 'critical' || pressureState === 'collapse'
      ? ['risk', 'moral']
      : pressureState === 'unstable'
        ? ['risk', 'curiosity', 'resourcefulness']
        : ['curiosity', 'empathy', 'resourcefulness'];

  // Filter templates by preferred types and available triggers
  let candidates = PROMPT_TEMPLATES.filter((t) => preferredTypes.includes(t.type));
  if (availableTriggers && availableTriggers.length > 0) {
    const filtered = candidates.filter((t) => availableTriggers.includes(t.trigger));
    if (filtered.length > 0) candidates = filtered;
  }

  if (candidates.length === 0) return null;

  const template = pickRandom(candidates);
  const prompt = pickRandom(template.prompts);

  return {
    id: `discovery_prompt_${++_promptId}`,
    type: template.type,
    prompt,
    trigger: template.trigger,
    optional: true,
  };
}

/**
 * Decide whether to generate a prompt this turn (probability-based).
 */
export function shouldGeneratePrompt(
  turnNumber: number,
  lastPromptTurn: number,
  pressureState: EmotionalPressureState,
): boolean {
  const turnsSinceLast = turnNumber - lastPromptTurn;
  if (turnsSinceLast < 3) return false; // minimum gap

  const baseChance =
    pressureState === 'critical' ? 0.5
      : pressureState === 'unstable' ? 0.35
        : pressureState === 'strained' ? 0.25
          : 0.15;

  // Chance increases the longer since last prompt
  const bonus = Math.min(0.3, (turnsSinceLast - 3) * 0.05);
  return Math.random() < baseChance + bonus;
}
