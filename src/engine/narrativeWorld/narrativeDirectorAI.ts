/**
 * Narrative Director AI
 *
 * Determines the current narrative mode of the story and adjusts
 * how the narrator prioritizes different types of content.
 * Acts as a "film director" choosing the right tone and focus.
 */

// ── Narrative Modes ─────────────────────────────────────────────

export type NarrativeMode =
  | 'exploration'
  | 'combat'
  | 'dialogue'
  | 'investigation'
  | 'travel'
  | 'rest'
  | 'crisis'
  | 'mystery'
  | 'stealth'
  | 'celebration';

export interface NarrativeDirective {
  mode: NarrativeMode;
  confidence: number; // 0–1
  toneSuggestion: string;
  pacingHint: 'slow' | 'measured' | 'brisk' | 'urgent';
  emphasize: string[];
  deemphasize: string[];
  transitionNote: string | null;
}

export interface DirectorContext {
  currentTension: number; // 0–10
  nearbyThreats: number;
  playerIntention: string; // classified action type
  activeWorldEvents: number;
  environmentDanger: number; // 0–10
  inCombat: boolean;
  inDialogue: boolean;
  inSettlement: boolean;
  daysSinceLastCombat: number;
  daysSinceLastRest: number;
  questActive: boolean;
  mysteryActive: boolean;
  previousMode: NarrativeMode | null;
}

// ── Mode Evaluation ─────────────────────────────────────────────

interface ModeCandidate {
  mode: NarrativeMode;
  score: number;
}

const MODE_CONFIGS: Record<NarrativeMode, {
  tone: string;
  pacing: 'slow' | 'measured' | 'brisk' | 'urgent';
  emphasize: string[];
  deemphasize: string[];
}> = {
  exploration: {
    tone: 'curious and atmospheric',
    pacing: 'measured',
    emphasize: ['environment_descriptions', 'discovery_hints', 'world_building'],
    deemphasize: ['combat_mechanics', 'threat_warnings'],
  },
  combat: {
    tone: 'intense and tactical',
    pacing: 'urgent',
    emphasize: ['combat_descriptions', 'tactical_terrain', 'injury_effects', 'enemy_behavior'],
    deemphasize: ['economy_details', 'casual_dialogue', 'lore_exposition'],
  },
  dialogue: {
    tone: 'character-driven and responsive',
    pacing: 'measured',
    emphasize: ['npc_personality', 'relationship_dynamics', 'information_exchange', 'rumors'],
    deemphasize: ['environment_details', 'combat_mechanics'],
  },
  investigation: {
    tone: 'analytical and suspenseful',
    pacing: 'slow',
    emphasize: ['clues', 'environmental_details', 'npc_reactions', 'mystery_hints'],
    deemphasize: ['combat_mechanics', 'economy_details'],
  },
  travel: {
    tone: 'scenic and transitional',
    pacing: 'brisk',
    emphasize: ['landscape_descriptions', 'regional_changes', 'encounter_hints', 'weather'],
    deemphasize: ['detailed_combat', 'economy_details', 'deep_dialogue'],
  },
  rest: {
    tone: 'contemplative and restorative',
    pacing: 'slow',
    emphasize: ['character_reflection', 'recovery', 'relationship_moments', 'ambient_sounds'],
    deemphasize: ['combat_mechanics', 'threat_warnings', 'time_pressure'],
  },
  crisis: {
    tone: 'tense and high-stakes',
    pacing: 'urgent',
    emphasize: ['immediate_threats', 'consequences', 'decision_pressure', 'environmental_collapse'],
    deemphasize: ['casual_descriptions', 'economy', 'exploration_hints'],
  },
  mystery: {
    tone: 'atmospheric and suspenseful',
    pacing: 'slow',
    emphasize: ['clues', 'atmosphere', 'npc_secrets', 'hidden_information', 'foreshadowing'],
    deemphasize: ['direct_combat', 'economy', 'travel_descriptions'],
  },
  stealth: {
    tone: 'tense and precise',
    pacing: 'measured',
    emphasize: ['sound_cues', 'enemy_awareness', 'environmental_cover', 'timing'],
    deemphasize: ['loud_descriptions', 'casual_dialogue', 'economy'],
  },
  celebration: {
    tone: 'triumphant and warm',
    pacing: 'measured',
    emphasize: ['achievements', 'npc_gratitude', 'world_improvements', 'character_growth'],
    deemphasize: ['threats', 'combat', 'danger_warnings'],
  },
};

// ── Public API ──────────────────────────────────────────────────

/**
 * Evaluate the current narrative situation and produce a directive.
 */
export function evaluateNarrativeMode(context: DirectorContext): NarrativeDirective {
  const candidates: ModeCandidate[] = [
    { mode: 'exploration', score: 10 }, // baseline
    { mode: 'combat', score: 0 },
    { mode: 'dialogue', score: 0 },
    { mode: 'investigation', score: 0 },
    { mode: 'travel', score: 0 },
    { mode: 'rest', score: 0 },
    { mode: 'crisis', score: 0 },
    { mode: 'mystery', score: 0 },
    { mode: 'stealth', score: 0 },
    { mode: 'celebration', score: 0 },
  ];

  const find = (m: NarrativeMode) => candidates.find(c => c.mode === m)!;

  // Combat signals
  if (context.inCombat) find('combat').score += 60;
  if (context.nearbyThreats > 0) find('combat').score += 20 + context.nearbyThreats * 5;

  // Crisis signals
  if (context.currentTension >= 8) find('crisis').score += 50;
  if (context.environmentDanger >= 8) find('crisis').score += 40;
  if (context.activeWorldEvents >= 3) find('crisis').score += 20;

  // Dialogue signals
  if (context.inDialogue) find('dialogue').score += 50;
  if (context.inSettlement && !context.inCombat) find('dialogue').score += 15;

  // Investigation / Mystery
  if (context.mysteryActive) {
    find('mystery').score += 35;
    find('investigation').score += 25;
  }
  if (context.playerIntention === 'investigation') find('investigation').score += 40;

  // Rest signals
  if (context.playerIntention === 'rest' || context.daysSinceLastRest >= 3) {
    find('rest').score += 30;
  }

  // Travel
  if (context.playerIntention === 'movement' && !context.nearbyThreats) {
    find('travel').score += 25;
  }

  // Stealth
  if (context.playerIntention === 'stealth' || (context.nearbyThreats > 0 && !context.inCombat)) {
    find('stealth').score += 25;
  }

  // Low tension, no threats → exploration or celebration
  if (context.currentTension <= 2 && context.nearbyThreats === 0) {
    find('exploration').score += 20;
    if (context.daysSinceLastCombat <= 1) find('celebration').score += 15;
  }

  // Sort and pick winner
  candidates.sort((a, b) => b.score - a.score);
  const winner = candidates[0];
  const totalScore = candidates.reduce((s, c) => s + c.score, 0);
  const confidence = totalScore > 0 ? winner.score / totalScore : 0.5;

  const config = MODE_CONFIGS[winner.mode];

  // Detect mode transition
  let transitionNote: string | null = null;
  if (context.previousMode && context.previousMode !== winner.mode) {
    transitionNote = `Transitioning from ${context.previousMode} → ${winner.mode}. Smooth the narrative shift.`;
  }

  return {
    mode: winner.mode,
    confidence: Math.min(1, confidence),
    toneSuggestion: config.tone,
    pacingHint: config.pacing,
    emphasize: config.emphasize,
    deemphasize: config.deemphasize,
    transitionNote,
  };
}

/**
 * Build narrator context from the directive.
 */
export function buildDirectorNarratorContext(directive: NarrativeDirective): string {
  const parts: string[] = [];
  parts.push(`NARRATIVE MODE: ${directive.mode.toUpperCase()} (confidence: ${(directive.confidence * 100).toFixed(0)}%)`);
  parts.push(`TONE: ${directive.toneSuggestion}`);
  parts.push(`PACING: ${directive.pacingHint}`);
  parts.push(`EMPHASIZE: ${directive.emphasize.join(', ')}`);
  parts.push(`MINIMIZE: ${directive.deemphasize.join(', ')}`);
  if (directive.transitionNote) parts.push(directive.transitionNote);
  return parts.join('. ');
}
