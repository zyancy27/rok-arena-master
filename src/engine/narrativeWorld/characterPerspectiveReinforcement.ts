/**
 * System 16 — Character Perspective Reinforcement
 *
 * Gently reminds players to think and respond as their character
 * rather than as themselves. Integrates with Reflection, Echo,
 * Pressure, Gravity, and Narrator systems to frame prompts,
 * actions, and feedback in character-driven language.
 */

import type { EmotionalPressureState, CharacterSignatureProfile } from './types';

// ── Types ───────────────────────────────────────────────────────

export type ReinforcementKind =
  | 'narrator_framing'      // Reframes "what do you do?" into character perspective
  | 'reflection_nudge'      // Encourages thinking about character motivations
  | 'immersion_reminder'    // Subtle reminder to stay in character (rare)
  | 'consistency_feedback'  // Highlights tension with prior statements/traits
  | 'action_reframe';       // Reframes player action description as character-driven

export interface ReinforcementEntry {
  id: string;
  kind: ReinforcementKind;
  /** The text shown to the player / injected into narration */
  text: string;
  /** Turn when generated */
  turn: number;
  /** Whether the player has seen / acknowledged it */
  delivered: boolean;
}

export interface ReinforcementConditions {
  turnNumber: number;
  inCombat: boolean;
  campaignDay: number;
  environmentStability: EmotionalPressureState;
  /** Total turns the player has taken in this session */
  sessionTurnCount: number;
  /** Whether an echo or reflection was recently shown */
  recentSystemPrompt: boolean;
  /** Known character traits (personality keywords) */
  characterTraits: string[];
  /** Prior statements recorded by Echo System */
  priorStatements: string[];
}

export interface PerspectiveState {
  entries: ReinforcementEntry[];
  lastEntryTurn: number;
  /** Count per kind — used to throttle */
  kindCounts: Record<ReinforcementKind, number>;
  /** Immersion reminders stop after this many total */
  immersionRemindersCap: number;
}

// ── Constants ───────────────────────────────────────────────────

const MIN_TURNS_BETWEEN = 6;

/** Immersion reminders only in early gameplay */
const IMMERSION_REMINDER_MAX = 3;

const NARRATOR_FRAMINGS: string[] = [
  'How does your character react to this situation?',
  'What does your character think as they witness this?',
  'How would your character handle this moment?',
  'What instinct does your character follow here?',
  'How does your character read the situation before them?',
];

const REFLECTION_NUDGES: string[] = [
  'What part of your character\'s personality influences their decision here?',
  'What does your character believe is the right thing to do in this moment?',
  'What emotion does your character feel as they face this situation?',
  'What memory or belief shapes your character\'s next move?',
  'What would your character refuse to do — even now?',
];

const IMMERSION_REMINDERS: string[] = [
  'Remember to think from your character\'s perspective rather than your own.',
  'Consider how your character — not you — would see this moment.',
  'Let your character\'s personality guide your response.',
];

const ACTION_REFRAME_TEMPLATES: string[] = [
  'Your character {verb}, driven by their {trait}.',
  'Driven by {trait}, your character {verb}.',
  'Your character acts on {trait} and {verb}.',
];

// ── Internals ───────────────────────────────────────────────────

let _entryId = 0;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function emptyKindCounts(): Record<ReinforcementKind, number> {
  return {
    narrator_framing: 0,
    reflection_nudge: 0,
    immersion_reminder: 0,
    consistency_feedback: 0,
    action_reframe: 0,
  };
}

// ── Public API ──────────────────────────────────────────────────

export function createPerspectiveState(): PerspectiveState {
  return {
    entries: [],
    lastEntryTurn: -999,
    kindCounts: emptyKindCounts(),
    immersionRemindersCap: IMMERSION_REMINDER_MAX,
  };
}

/** Decide whether any reinforcement should appear this turn. */
export function shouldReinforce(
  state: PerspectiveState,
  conditions: ReinforcementConditions,
): boolean {
  if (conditions.recentSystemPrompt) return false;
  if (conditions.turnNumber - state.lastEntryTurn < MIN_TURNS_BETWEEN) return false;

  let chance = 0.10;
  if (conditions.sessionTurnCount < 10) chance += 0.12; // early session boost
  if (conditions.environmentStability === 'critical' || conditions.environmentStability === 'collapse') {
    chance += 0.08;
  }
  // Reduce if combat is fast-paced
  if (conditions.inCombat) chance *= 0.4;

  return Math.random() < chance;
}

/** Select the most appropriate reinforcement kind. */
export function selectReinforcementKind(
  state: PerspectiveState,
  conditions: ReinforcementConditions,
): ReinforcementKind {
  // Early session → immersion reminder (if cap not hit)
  if (
    conditions.sessionTurnCount < 8 &&
    state.kindCounts.immersion_reminder < state.immersionRemindersCap
  ) {
    return 'immersion_reminder';
  }

  // High pressure → reflection nudge
  if (
    conditions.environmentStability === 'critical' ||
    conditions.environmentStability === 'collapse'
  ) {
    return 'reflection_nudge';
  }

  // Default rotation
  const roll = Math.random();
  if (roll < 0.45) return 'narrator_framing';
  if (roll < 0.75) return 'reflection_nudge';
  return 'narrator_framing';
}

/** Generate a reinforcement entry. */
export function generateReinforcement(
  state: PerspectiveState,
  conditions: ReinforcementConditions,
  kind?: ReinforcementKind,
): { state: PerspectiveState; entry: ReinforcementEntry } {
  const selectedKind = kind ?? selectReinforcementKind(state, conditions);

  let text: string;
  switch (selectedKind) {
    case 'narrator_framing':
      text = pick(NARRATOR_FRAMINGS);
      break;
    case 'reflection_nudge':
      text = pick(REFLECTION_NUDGES);
      break;
    case 'immersion_reminder':
      text = pick(IMMERSION_REMINDERS);
      break;
    default:
      text = pick(NARRATOR_FRAMINGS);
  }

  const entry: ReinforcementEntry = {
    id: `perspective_${++_entryId}`,
    kind: selectedKind,
    text,
    turn: conditions.turnNumber,
    delivered: false,
  };

  const newCounts = { ...state.kindCounts };
  newCounts[selectedKind] = (newCounts[selectedKind] || 0) + 1;

  return {
    state: {
      ...state,
      entries: [...state.entries, entry],
      lastEntryTurn: conditions.turnNumber,
      kindCounts: newCounts,
      immersionRemindersCap: state.immersionRemindersCap,
    },
    entry,
  };
}

/** Generate consistency feedback when action contradicts known traits/statements. */
export function generateConsistencyFeedback(
  state: PerspectiveState,
  actionText: string,
  conditions: ReinforcementConditions,
): { state: PerspectiveState; entry: ReinforcementEntry | null } {
  // Search prior statements for contradictions
  const lower = actionText.toLowerCase();
  let matchedStatement: string | null = null;

  for (const stmt of conditions.priorStatements) {
    const stmtLower = stmt.toLowerCase();
    // Simple contradiction heuristics
    if (
      (stmtLower.includes('never') && lower.includes(stmtLower.replace(/.*never\s+/, '').split(/[.,!]/)[0])) ||
      (stmtLower.includes('always') && lower.includes('refuse')) ||
      (stmtLower.includes('protect') && (lower.includes('abandon') || lower.includes('leave behind')))
    ) {
      matchedStatement = stmt;
      break;
    }
  }

  if (!matchedStatement) return { state, entry: null };

  const text = `You once said: "${matchedStatement}." How does your character reconcile that with this decision?`;

  const entry: ReinforcementEntry = {
    id: `perspective_${++_entryId}`,
    kind: 'consistency_feedback',
    text,
    turn: conditions.turnNumber,
    delivered: false,
  };

  const newCounts = { ...state.kindCounts };
  newCounts.consistency_feedback += 1;

  return {
    state: {
      ...state,
      entries: [...state.entries, entry],
      lastEntryTurn: conditions.turnNumber,
      kindCounts: newCounts,
      immersionRemindersCap: state.immersionRemindersCap,
    },
    entry,
  };
}

/** Reframe a player's action description as character-driven narration. */
export function reframeAction(
  actionVerb: string,
  dominantTrait: string,
): string {
  const template = pick(ACTION_REFRAME_TEMPLATES);
  return template
    .replace('{verb}', actionVerb)
    .replace('{trait}', dominantTrait);
}

/** Mark an entry as delivered. */
export function markDelivered(
  state: PerspectiveState,
  entryId: string,
): PerspectiveState {
  return {
    ...state,
    entries: state.entries.map((e) =>
      e.id === entryId ? { ...e, delivered: true } : e,
    ),
  };
}

/** Build narrator context for the current perspective reinforcement state. */
export function buildPerspectiveNarratorContext(state: PerspectiveState): string {
  const recent = state.entries.filter((e) => e.delivered).slice(-2);
  if (recent.length === 0) return '';

  return (
    'Perspective reinforcement active. ' +
    'Frame prompts using character perspective ("How does your character…") ' +
    'rather than player perspective ("What do you do?"). ' +
    'Describe player actions as character-driven: reference traits, personality, and motivations.'
  );
}

/** Summary of all delivered reinforcements for memory persistence. */
export function buildPerspectiveSummary(state: PerspectiveState): string {
  const delivered = state.entries.filter((e) => e.delivered);
  if (delivered.length === 0) return '';

  const byKind = delivered.reduce<Record<string, number>>((acc, e) => {
    acc[e.kind] = (acc[e.kind] || 0) + 1;
    return acc;
  }, {});

  const parts = Object.entries(byKind).map(([k, v]) => `${k}: ${v}`);
  return `Perspective reinforcements delivered — ${parts.join(', ')}`;
}
