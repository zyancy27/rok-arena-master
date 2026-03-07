/**
 * System 15 — Story Gravity Engine
 *
 * Subtly guides narrative generation toward themes that emerge from
 * a character's behavior, dialogue, and decisions over time.
 * Never forces outcomes — only adjusts probabilities.
 */

import type { CharacterSignatureProfile, SignaturePattern } from './types';
import type { NarrativePressureType } from './narrativePressureEngine';
import type { EchoFragment } from './characterEchoSystem';

// ── Theme Taxonomy ──────────────────────────────────────────────

export type StoryTheme =
  | 'curiosity'
  | 'compassion'
  | 'defiance'
  | 'honor'
  | 'revenge'
  | 'survival'
  | 'exploration'
  | 'knowledge_seeking'
  | 'protector'
  | 'isolation'
  | 'ambition'
  | 'redemption';

export type ThemeEvolution = {
  from: StoryTheme;
  to: StoryTheme;
  /** Minimum weight of `from` before evolution can trigger */
  threshold: number;
};

// ── State ───────────────────────────────────────────────────────

export interface ThemeWeight {
  theme: StoryTheme;
  weight: number;          // 0–100
  signalCount: number;     // raw signal tally
  lastSignalTurn: number;
}

export interface StoryGravityState {
  characterId: string;
  themes: ThemeWeight[];
  dominantThemes: StoryTheme[];   // top 1-2
  secondaryThemes: StoryTheme[];  // 3-5
  totalSignals: number;
  lastEvaluationTurn: number;
}

// ── Influence Output ────────────────────────────────────────────

export type InfluenceCategory =
  | 'exploration_encounter'
  | 'environmental_object'
  | 'pressure_situation'
  | 'discovery_event'
  | 'faction_encounter'
  | 'landmark_discovery'
  | 'environmental_mystery';

export interface GravityInfluence {
  category: InfluenceCategory;
  themeBias: StoryTheme;
  /** 0–1 probability boost */
  boost: number;
  narratorHint: string;
}

export interface WorldAcknowledgement {
  theme: StoryTheme;
  narratorLine: string;
  /** Minimum weight required to fire */
  threshold: number;
}

// ── Constants ───────────────────────────────────────────────────

const ALL_THEMES: StoryTheme[] = [
  'curiosity', 'compassion', 'defiance', 'honor', 'revenge',
  'survival', 'exploration', 'knowledge_seeking', 'protector',
  'isolation', 'ambition', 'redemption',
];

const SIGNATURE_TO_THEME: Record<SignaturePattern, StoryTheme[]> = {
  investigation: ['curiosity', 'knowledge_seeking'],
  exploration: ['exploration', 'curiosity'],
  stealth: ['survival', 'isolation'],
  aggression: ['defiance', 'revenge'],
  protection: ['protector', 'compassion', 'honor'],
  diplomacy: ['compassion', 'honor'],
  destruction: ['defiance', 'revenge', 'ambition'],
};

const PRESSURE_TO_THEME: Record<NarrativePressureType, StoryTheme[]> = {
  moral: ['compassion', 'honor', 'redemption'],
  risk: ['survival', 'defiance'],
  curiosity: ['curiosity', 'knowledge_seeking', 'exploration'],
  emotional: ['compassion', 'isolation'],
  identity: ['defiance', 'ambition', 'redemption'],
};

const ECHO_TYPE_TO_THEME: Record<string, StoryTheme[]> = {
  value: ['honor', 'defiance', 'compassion'],
  decision: ['ambition', 'defiance', 'survival'],
  emotional_moment: ['compassion', 'isolation', 'redemption'],
  relationship_moment: ['compassion', 'protector', 'honor'],
  memory: ['curiosity', 'knowledge_seeking'],
};

const THEME_INFLUENCE_MAP: Record<StoryTheme, { hints: string[]; categories: InfluenceCategory[] }> = {
  curiosity:         { hints: ['mysterious ruins', 'ancient devices', 'hidden chambers', 'environmental puzzles'], categories: ['exploration_encounter', 'environmental_mystery', 'discovery_event'] },
  compassion:        { hints: ['rescue scenarios', 'vulnerable NPC encounters', 'wounded travelers'], categories: ['faction_encounter', 'pressure_situation'] },
  defiance:          { hints: ['oppressive factions', 'unjust structures', 'confrontation opportunities'], categories: ['faction_encounter', 'pressure_situation'] },
  honor:             { hints: ['oath-bound challenges', 'ceremonial grounds', 'dueling arenas'], categories: ['faction_encounter', 'landmark_discovery'] },
  revenge:           { hints: ['remnants of past conflicts', 'trail of destruction', 'familiar adversaries'], categories: ['environmental_object', 'pressure_situation'] },
  survival:          { hints: ['harsh environments', 'endurance tests', 'scarce resources'], categories: ['exploration_encounter', 'environmental_mystery'] },
  exploration:       { hints: ['hidden paths', 'secret locations', 'uncharted terrain'], categories: ['exploration_encounter', 'discovery_event', 'landmark_discovery'] },
  knowledge_seeking: { hints: ['ancient libraries', 'encoded messages', 'scholarly NPCs'], categories: ['environmental_object', 'discovery_event'] },
  protector:         { hints: ['trapped individuals', 'environmental disasters', 'threatened settlements'], categories: ['pressure_situation', 'faction_encounter'] },
  isolation:         { hints: ['abandoned outposts', 'silent wastelands', 'solitary ruins'], categories: ['environmental_mystery', 'exploration_encounter'] },
  ambition:          { hints: ['seats of power', 'contested resources', 'strategic high ground'], categories: ['faction_encounter', 'landmark_discovery'] },
  redemption:        { hints: ['places of atonement', 'second-chance encounters', 'forgiving NPCs'], categories: ['pressure_situation', 'faction_encounter'] },
};

const THEME_EVOLUTIONS: ThemeEvolution[] = [
  { from: 'curiosity', to: 'knowledge_seeking', threshold: 60 },
  { from: 'knowledge_seeking', to: 'exploration', threshold: 70 },
  { from: 'compassion', to: 'protector', threshold: 55 },
  { from: 'defiance', to: 'ambition', threshold: 65 },
  { from: 'survival', to: 'defiance', threshold: 60 },
  { from: 'revenge', to: 'redemption', threshold: 70 },
  { from: 'isolation', to: 'survival', threshold: 50 },
  { from: 'honor', to: 'protector', threshold: 60 },
];

const WORLD_ACKNOWLEDGEMENTS: WorldAcknowledgement[] = [
  { theme: 'compassion', narratorLine: 'Someone approaches cautiously. Word has spread that you help those in need.', threshold: 55 },
  { theme: 'curiosity', narratorLine: 'You notice several strange symbols carved into the stone. Your instincts tell you these might be important.', threshold: 50 },
  { theme: 'defiance', narratorLine: 'The locals watch you warily — they have heard of someone who does not bow easily.', threshold: 55 },
  { theme: 'protector', narratorLine: 'A child tugs at your sleeve. "Are you the one who keeps people safe?"', threshold: 60 },
  { theme: 'knowledge_seeking', narratorLine: 'An elderly figure beckons from a doorway, holding a weathered tome.', threshold: 55 },
  { theme: 'exploration', narratorLine: 'The path forks ahead. One trail is well-worn; the other disappears into shadow. You feel drawn to the unknown.', threshold: 50 },
  { theme: 'survival', narratorLine: 'The wind shifts. You catch the scent of approaching danger before anyone else.', threshold: 55 },
  { theme: 'honor', narratorLine: 'A warrior steps forward and bows — your reputation for integrity precedes you.', threshold: 60 },
  { theme: 'revenge', narratorLine: 'A familiar sigil catches your eye. The trail grows warmer.', threshold: 50 },
  { theme: 'isolation', narratorLine: 'The silence settles comfortably around you, an old companion.', threshold: 45 },
  { theme: 'ambition', narratorLine: 'From this vantage point, the territory stretches endlessly. Yours to shape.', threshold: 60 },
  { theme: 'redemption', narratorLine: 'For a moment, the air feels lighter — as if the world is offering a second chance.', threshold: 55 },
];

const SIGNAL_INCREMENT = 8;
const DECAY_PER_EVALUATION = 2;
const MAX_DOMINANT = 2;
const MAX_SECONDARY = 3;
const DOMINANT_THRESHOLD = 35;
const SECONDARY_THRESHOLD = 15;

// ── Factory ─────────────────────────────────────────────────────

export function createStoryGravity(characterId: string): StoryGravityState {
  return {
    characterId,
    themes: ALL_THEMES.map((t) => ({ theme: t, weight: 0, signalCount: 0, lastSignalTurn: 0 })),
    dominantThemes: [],
    secondaryThemes: [],
    totalSignals: 0,
    lastEvaluationTurn: 0,
  };
}

// ── Signal Ingestion ────────────────────────────────────────────

function addSignal(state: StoryGravityState, theme: StoryTheme, turn: number, strength = SIGNAL_INCREMENT): StoryGravityState {
  const themes = state.themes.map((tw) =>
    tw.theme === theme
      ? { ...tw, weight: Math.min(100, tw.weight + strength), signalCount: tw.signalCount + 1, lastSignalTurn: turn }
      : tw,
  );
  return { ...state, themes, totalSignals: state.totalSignals + 1 };
}

/** Ingest signal from a signature pattern (System 7). */
export function ingestFromSignature(state: StoryGravityState, pattern: SignaturePattern, turn: number): StoryGravityState {
  const mapped = SIGNATURE_TO_THEME[pattern] ?? [];
  let s = state;
  for (const theme of mapped) s = addSignal(s, theme, turn, SIGNAL_INCREMENT);
  return s;
}

/** Ingest signal from a narrative pressure event (System 10). */
export function ingestFromPressure(state: StoryGravityState, pressureType: NarrativePressureType, turn: number): StoryGravityState {
  const mapped = PRESSURE_TO_THEME[pressureType] ?? [];
  let s = state;
  for (const theme of mapped) s = addSignal(s, theme, turn, SIGNAL_INCREMENT * 0.75);
  return s;
}

/** Ingest signal from an echo fragment (System 12). */
export function ingestFromEcho(state: StoryGravityState, echo: Pick<EchoFragment, 'echoType' | 'emotionalWeight'>, turn: number): StoryGravityState {
  const mapped = ECHO_TYPE_TO_THEME[echo.echoType] ?? [];
  const strength = SIGNAL_INCREMENT * (echo.emotionalWeight / 10);
  let s = state;
  for (const theme of mapped) s = addSignal(s, theme, turn, strength);
  return s;
}

/** Ingest signal from a reflection answer (System 13). */
export function ingestFromReflection(state: StoryGravityState, reflectionText: string, turn: number): StoryGravityState {
  const lower = reflectionText.toLowerCase();
  let s = state;
  const keywordMap: [RegExp, StoryTheme][] = [
    [/protect|save|defend|shield/i, 'protector'],
    [/curious|wonder|mystery|explore|discover/i, 'curiosity'],
    [/defy|resist|rebel|refuse/i, 'defiance'],
    [/honor|oath|duty|promise/i, 'honor'],
    [/alone|solitary|silence|withdrawn/i, 'isolation'],
    [/revenge|avenge|payback|grudge/i, 'revenge'],
    [/survive|endure|persist|tough/i, 'survival'],
    [/learn|study|know|understand|read/i, 'knowledge_seeking'],
    [/help|heal|care|mercy|kind/i, 'compassion'],
    [/power|conquer|rule|dominate/i, 'ambition'],
    [/atone|forgive|redeem|repent/i, 'redemption'],
    [/path|journey|wander|roam|travel/i, 'exploration'],
  ];
  for (const [rx, theme] of keywordMap) {
    if (rx.test(lower)) s = addSignal(s, theme, turn, SIGNAL_INCREMENT * 0.6);
  }
  return s;
}

/** Ingest from raw dialogue text. */
export function ingestFromDialogue(state: StoryGravityState, text: string, turn: number): StoryGravityState {
  return ingestFromReflection(state, text, turn);
}

// ── Evaluation ──────────────────────────────────────────────────

/** Decay weights and recalculate dominant/secondary. Call once per turn or every N turns. */
export function evaluateGravity(state: StoryGravityState, currentTurn: number): StoryGravityState {
  // Apply passive decay
  const themes = state.themes.map((tw) => ({
    ...tw,
    weight: Math.max(0, tw.weight - DECAY_PER_EVALUATION),
  }));

  // Check for theme evolution
  for (const evo of THEME_EVOLUTIONS) {
    const from = themes.find((t) => t.theme === evo.from);
    const to = themes.find((t) => t.theme === evo.to);
    if (from && to && from.weight >= evo.threshold) {
      // Transfer a portion of weight to evolved theme
      const transfer = Math.min(from.weight * 0.15, 10);
      from.weight = Math.max(0, from.weight - transfer);
      to.weight = Math.min(100, to.weight + transfer);
    }
  }

  // Sort by weight descending
  const sorted = [...themes].sort((a, b) => b.weight - a.weight);

  const dominant = sorted
    .filter((t) => t.weight >= DOMINANT_THRESHOLD)
    .slice(0, MAX_DOMINANT)
    .map((t) => t.theme);

  const secondary = sorted
    .filter((t) => t.weight >= SECONDARY_THRESHOLD && !dominant.includes(t.theme))
    .slice(0, MAX_SECONDARY)
    .map((t) => t.theme);

  return { ...state, themes, dominantThemes: dominant, secondaryThemes: secondary, lastEvaluationTurn: currentTurn };
}

// ── Gravity Influence ───────────────────────────────────────────

/** Get probability biases for scenario generation. */
export function getGravityInfluences(state: StoryGravityState): GravityInfluence[] {
  const influences: GravityInfluence[] = [];

  for (const tw of state.themes) {
    if (tw.weight < SECONDARY_THRESHOLD) continue;
    const mapping = THEME_INFLUENCE_MAP[tw.theme];
    if (!mapping) continue;

    const isDominant = state.dominantThemes.includes(tw.theme);
    const boost = isDominant ? Math.min(0.35, tw.weight / 200) : Math.min(0.15, tw.weight / 400);
    const hint = mapping.hints[Math.floor(Math.random() * mapping.hints.length)];
    const category = mapping.categories[Math.floor(Math.random() * mapping.categories.length)];

    influences.push({ category, themeBias: tw.theme, boost, narratorHint: hint });
  }

  return influences;
}

/** Apply gravity bias to a base probability. Never exceeds cap. */
export function applyGravityBias(baseProbability: number, influences: GravityInfluence[], theme: StoryTheme, cap = 0.85): number {
  const relevant = influences.filter((i) => i.themeBias === theme);
  if (relevant.length === 0) return baseProbability;
  const totalBoost = relevant.reduce((sum, i) => sum + i.boost, 0);
  return Math.min(cap, baseProbability + totalBoost);
}

// ── World Acknowledgement ───────────────────────────────────────

/** Check if the world should acknowledge recurring character behaviour. Returns narrator line or null. */
export function checkWorldAcknowledgement(state: StoryGravityState): WorldAcknowledgement | null {
  // Only fire occasionally — use simple random gate
  if (Math.random() > 0.12) return null;

  for (const ack of WORLD_ACKNOWLEDGEMENTS) {
    const tw = state.themes.find((t) => t.theme === ack.theme);
    if (tw && tw.weight >= ack.threshold) return ack;
  }
  return null;
}

// ── Narrator Context ────────────────────────────────────────────

/** Build a compact narrator context string describing the character's gravity. */
export function buildGravityNarratorContext(state: StoryGravityState): string {
  if (state.dominantThemes.length === 0 && state.secondaryThemes.length === 0) {
    return '';
  }
  const parts: string[] = [];
  if (state.dominantThemes.length > 0) {
    parts.push(`Dominant story themes: ${state.dominantThemes.join(', ')}.`);
  }
  if (state.secondaryThemes.length > 0) {
    parts.push(`Emerging themes: ${state.secondaryThemes.join(', ')}.`);
  }
  parts.push('Subtly guide encounters and environmental details to reflect these themes without forcing outcomes.');
  return parts.join(' ');
}

/** Build a profile summary for persistence or debugging. */
export function buildGravitySummary(state: StoryGravityState): string {
  const active = state.themes.filter((t) => t.weight > 0).sort((a, b) => b.weight - a.weight);
  if (active.length === 0) return 'No story gravity detected yet.';
  return active.map((t) => `${t.theme}: ${Math.round(t.weight)}`).join(' | ');
}
