/**
 * Narrative Priority Engine
 *
 * Determines what type of narrative information should be emphasized
 * in the current moment. Outputs a ranked priority stack so the
 * narrator focuses on what matters most and avoids noise.
 *
 * Feeds into the Story Orchestrator to gate which systems activate.
 */

// ── Priority Types ──────────────────────────────────────────────

export type NarrativeFocus =
  | 'combat'
  | 'environment'
  | 'dialogue'
  | 'exploration'
  | 'discovery'
  | 'investigation'
  | 'social'
  | 'economy'
  | 'travel'
  | 'rest'
  | 'crisis';

export interface PriorityScore {
  focus: NarrativeFocus;
  score: number; // 0–100
  reason: string;
}

export interface NarrativePriorityStack {
  /** Ordered from highest to lowest */
  stack: PriorityScore[];
  /** Top 1-3 active focuses */
  activeFocuses: NarrativeFocus[];
  /** Systems that should be suppressed this turn */
  suppressedSystems: string[];
  timestamp: number;
}

export interface PriorityContext {
  playerAction: string;
  currentZone: string;
  activeEnemies: number;
  activeNpcsNearby: number;
  activeWorldEvents: Array<{ event_type: string; impact_level: number; player_proximity: number }>;
  environmentalHazards: number;
  dangerLevel: number; // 0–10
  storyTension: number; // 0–10
  timeOfDay: string;
  recentCombat: boolean;
  hasActiveDialogue: boolean;
  hasActiveQuest: boolean;
  isInSettlement: boolean;
  activeRumors: number;
  discoveryNearby: boolean;
}

// ── Constants ───────────────────────────────────────────────────

const ACTION_FOCUS_MAP: Array<{ pattern: RegExp; focus: NarrativeFocus; boost: number }> = [
  // Combat
  { pattern: /\b(attack|strike|slash|stab|shoot|cast|fight|block|dodge|parry|charge|fire)\b/i, focus: 'combat', boost: 40 },
  // Dialogue
  { pattern: /\b(talk|speak|ask|say|tell|question|negotiate|greet|converse|reply|whisper)\b/i, focus: 'dialogue', boost: 35 },
  // Investigation
  { pattern: /\b(search|examine|inspect|investigate|look|study|analyze|check|read|decipher)\b/i, focus: 'investigation', boost: 30 },
  // Exploration
  { pattern: /\b(explore|wander|travel|walk|move|head|go|enter|leave|climb|cross)\b/i, focus: 'exploration', boost: 25 },
  // Social
  { pattern: /\b(trade|buy|sell|barter|haggle|offer|give|gift|hire|recruit)\b/i, focus: 'social', boost: 30 },
  { pattern: /\b(persuade|intimidate|charm|deceive|convince|threaten)\b/i, focus: 'social', boost: 30 },
  // Economy
  { pattern: /\b(shop|merchant|market|purchase|price|coin|gold|supplies)\b/i, focus: 'economy', boost: 25 },
  // Environment interaction
  { pattern: /\b(use|activate|open|close|push|pull|break|destroy|build|repair|light|extinguish)\b/i, focus: 'environment', boost: 20 },
  // Rest
  { pattern: /\b(rest|sleep|camp|meditate|heal|recover|wait)\b/i, focus: 'rest', boost: 35 },
];

const MAX_ACTIVE_FOCUSES = 3;

// ── Engine ──────────────────────────────────────────────────────

/**
 * Calculate the narrative priority stack based on current context.
 * Returns an ordered stack of focuses with scores.
 */
export function calculatePriorityStack(context: PriorityContext): NarrativePriorityStack {
  const scores: Record<NarrativeFocus, { score: number; reasons: string[] }> = {
    combat: { score: 0, reasons: [] },
    environment: { score: 0, reasons: [] },
    dialogue: { score: 0, reasons: [] },
    exploration: { score: 0, reasons: [] },
    discovery: { score: 0, reasons: [] },
    investigation: { score: 0, reasons: [] },
    social: { score: 0, reasons: [] },
    economy: { score: 0, reasons: [] },
    travel: { score: 0, reasons: [] },
    rest: { score: 0, reasons: [] },
    crisis: { score: 0, reasons: [] },
  };

  // 1. Player action analysis
  const actionLower = context.playerAction.toLowerCase();
  for (const { pattern, focus, boost } of ACTION_FOCUS_MAP) {
    if (pattern.test(actionLower)) {
      scores[focus].score += boost;
      scores[focus].reasons.push('player action');
    }
  }

  // 2. Active enemies → combat priority
  if (context.activeEnemies > 0) {
    scores.combat.score += 30 + context.activeEnemies * 10;
    scores.combat.reasons.push(`${context.activeEnemies} active enemies`);
  }
  if (context.recentCombat) {
    scores.combat.score += 15;
    scores.combat.reasons.push('recent combat');
  }

  // 3. Danger level → crisis / combat
  if (context.dangerLevel >= 8) {
    scores.crisis.score += 40;
    scores.crisis.reasons.push('extreme danger');
  } else if (context.dangerLevel >= 5) {
    scores.combat.score += 15;
    scores.environment.score += 10;
    scores.combat.reasons.push('elevated danger');
  }

  // 4. Story tension → various
  if (context.storyTension >= 7) {
    scores.crisis.score += 25;
    scores.crisis.reasons.push('high story tension');
  }
  if (context.storyTension >= 4) {
    scores.dialogue.score += 10;
    scores.investigation.score += 10;
  }

  // 5. NPCs nearby → dialogue / social
  if (context.activeNpcsNearby > 0) {
    scores.dialogue.score += 15 + context.activeNpcsNearby * 5;
    scores.social.score += 10;
    scores.dialogue.reasons.push(`${context.activeNpcsNearby} NPCs nearby`);
  }
  if (context.hasActiveDialogue) {
    scores.dialogue.score += 25;
    scores.dialogue.reasons.push('active dialogue');
  }

  // 6. Environmental hazards → environment
  if (context.environmentalHazards > 0) {
    scores.environment.score += 15 + context.environmentalHazards * 8;
    scores.environment.reasons.push(`${context.environmentalHazards} hazards`);
  }

  // 7. World events → various
  for (const event of context.activeWorldEvents) {
    if (event.impact_level >= 7 && event.player_proximity >= 5) {
      scores.crisis.score += 20;
      scores.crisis.reasons.push(`major event: ${event.event_type}`);
    }
    if (event.player_proximity >= 3) {
      scores.environment.score += 8;
    }
  }

  // 8. Discovery nearby
  if (context.discoveryNearby) {
    scores.discovery.score += 25;
    scores.discovery.reasons.push('discoverable location nearby');
    scores.exploration.score += 15;
  }

  // 9. Settlement → economy / social
  if (context.isInSettlement) {
    scores.economy.score += 15;
    scores.social.score += 15;
    scores.economy.reasons.push('in settlement');
  }

  // 10. Rumors → investigation
  if (context.activeRumors > 0) {
    scores.investigation.score += 10 + context.activeRumors * 3;
    scores.investigation.reasons.push(`${context.activeRumors} rumors`);
  }

  // 11. Active quest → exploration / investigation
  if (context.hasActiveQuest) {
    scores.exploration.score += 10;
    scores.investigation.score += 10;
  }

  // 12. Base exploration floor
  scores.exploration.score += 5;
  scores.environment.score += 5;

  // Build sorted stack
  const stack: PriorityScore[] = Object.entries(scores)
    .map(([focus, { score, reasons }]) => ({
      focus: focus as NarrativeFocus,
      score: Math.min(100, score),
      reason: reasons.join(', ') || 'baseline',
    }))
    .sort((a, b) => b.score - a.score);

  const activeFocuses = stack
    .filter(s => s.score >= 15)
    .slice(0, MAX_ACTIVE_FOCUSES)
    .map(s => s.focus);

  // Determine suppressed systems
  const suppressedSystems = determineSuppressedSystems(activeFocuses, stack);

  return {
    stack,
    activeFocuses,
    suppressedSystems,
    timestamp: Date.now(),
  };
}

/**
 * Determine which narrative systems should be suppressed based on active focuses.
 * This prevents the narrator from being overloaded with irrelevant context.
 */
function determineSuppressedSystems(
  activeFocuses: NarrativeFocus[],
  stack: PriorityScore[],
): string[] {
  const suppressed: string[] = [];
  const hasCombat = activeFocuses.includes('combat') || activeFocuses.includes('crisis');

  // During combat/crisis, suppress non-essential systems
  if (hasCombat) {
    suppressed.push('economy_details', 'rumor_mentions', 'exploration_hints', 'rest_descriptions');
  }

  // During rest, suppress combat systems
  if (activeFocuses.includes('rest')) {
    suppressed.push('combat_details', 'hazard_escalation', 'enemy_behavior');
  }

  // During dialogue, suppress environment noise
  if (activeFocuses.includes('dialogue') && !hasCombat) {
    suppressed.push('environment_details', 'hazard_escalation');
  }

  // Suppress very low scoring systems (< 5)
  for (const entry of stack) {
    if (entry.score < 5 && !activeFocuses.includes(entry.focus)) {
      suppressed.push(`${entry.focus}_system`);
    }
  }

  return [...new Set(suppressed)];
}

/**
 * Build narrator context from priority stack.
 */
export function buildPriorityNarratorContext(stack: NarrativePriorityStack): string {
  if (stack.activeFocuses.length === 0) return '';

  const parts: string[] = [];
  parts.push(`NARRATIVE FOCUS: ${stack.activeFocuses.join(' > ')}`);

  const top = stack.stack[0];
  if (top.score >= 50) {
    parts.push(`PRIMARY: ${top.focus} (${top.reason})`);
  }

  if (stack.suppressedSystems.length > 0) {
    parts.push(`MINIMIZE: ${stack.suppressedSystems.slice(0, 4).join(', ')}`);
  }

  return parts.join('. ');
}

/**
 * Check if a specific system should be active based on priority stack.
 */
export function isSystemActive(
  stack: NarrativePriorityStack,
  systemName: string,
): boolean {
  return !stack.suppressedSystems.includes(systemName);
}

/**
 * Get the dominant narrative mode from the priority stack.
 */
export function getDominantMode(stack: NarrativePriorityStack): NarrativeFocus {
  return stack.stack[0]?.focus || 'exploration';
}
