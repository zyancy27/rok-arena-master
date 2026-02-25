/**
 * Perception + Threat Processing System
 *
 * Layer 1 — Perception: Can the character detect/see the threat?
 * Layer 2 — Processing: Can their intelligence/BIQ interpret it and respond well?
 *
 * Outputs minimal indicators for the battle log.
 */

import type { CharacterStats } from './character-stats';

// ─── Types ───────────────────────────────────────────────────────

export type PerceptionLevel = 'detected' | 'partial' | 'undetected';
export type ProcessingLevel = 'understood' | 'misread' | 'delayed';

export interface PerceptionResult {
  perception: PerceptionLevel;
  processing: ProcessingLevel;
  /** One-line label for UI chip, e.g. "Perception: Partial" */
  label: string;
  /** Modifier applied to defense roll (negative = harder to defend) */
  defenseModifier: number;
  /** Context string for AI narrator prompt */
  narratorContext: string;
}

// ─── Constants ───────────────────────────────────────────────────

/** Stealth / obscurity keywords in action text */
const STEALTH_KEYWORDS = [
  'stealth', 'sneak', 'hidden', 'invisible', 'vanish', 'camouflage',
  'cloak', 'shadow', 'blend', 'disguise', 'conceal', 'undetected',
  'silent', 'quiet', 'muffled', 'suppress', 'mask', 'phase',
  'behind', 'from behind', 'blind spot', 'out of sight',
];

const OBSCURE_KEYWORDS = [
  'fog', 'smoke', 'mist', 'darkness', 'blind', 'flash',
  'dust', 'sand', 'blizzard', 'storm', 'haze', 'illusion',
];

const SPEED_KEYWORDS = [
  'instant', 'blitz', 'flash', 'teleport', 'warp', 'blink',
  'lightspeed', 'faster than', 'before they could', 'too fast',
];

// ─── Helpers ─────────────────────────────────────────────────────

function keywordScore(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.filter(kw => lower.includes(kw)).length;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ─── Core ────────────────────────────────────────────────────────

/**
 * Evaluate perception — can the defender detect the incoming threat?
 *
 * @param defenderStats   Defender's character stats
 * @param defenderTier    Defender's tier (1-7)
 * @param attackActionText The attacker's move text
 * @param environmentVisibility 0-1 where 1 = clear, 0 = total obscurity
 */
export function evaluatePerception(
  defenderStats: CharacterStats,
  defenderTier: number,
  attackActionText: string,
  environmentVisibility: number = 1.0,
): PerceptionLevel {
  // Perception score from stats (0-100 range mapped to 0-50 contribution)
  // Uses intelligence (awareness) + speed (reaction) + battle_iq (combat sense)
  const perceptionStat =
    (defenderStats.stat_intelligence * 0.35) +
    (defenderStats.stat_speed * 0.25) +
    (defenderStats.stat_battle_iq * 0.40);
  const perceptionBase = perceptionStat * 0.5; // 0-50

  // Tier adds flat bonus (higher tier = better senses)
  const tierBonus = (defenderTier - 1) * 4; // 0-24

  // Environment penalty
  const envPenalty = (1 - clamp(environmentVisibility, 0, 1)) * 30; // 0-30

  // Stealth / speed difficulty from attacker text
  const stealthDifficulty = keywordScore(attackActionText, STEALTH_KEYWORDS) * 8;
  const speedDifficulty = keywordScore(attackActionText, SPEED_KEYWORDS) * 6;
  const obscureDifficulty = keywordScore(attackActionText, OBSCURE_KEYWORDS) * 5;

  const totalScore = perceptionBase + tierBonus - envPenalty - stealthDifficulty - speedDifficulty - obscureDifficulty;

  // Thresholds (higher = better perception)
  if (totalScore >= 30) return 'detected';
  if (totalScore >= 15) return 'partial';
  return 'undetected';
}

/**
 * Evaluate threat processing — can the defender's mind interpret and respond?
 *
 * @param defenderStats   Defender's character stats
 * @param defenderTier    Defender's tier
 * @param perception      Result from Layer 1
 * @param psychModifier   Psychological state modifier (-20 to +10, from fear/confidence)
 */
export function evaluateProcessing(
  defenderStats: CharacterStats,
  defenderTier: number,
  perception: PerceptionLevel,
  psychModifier: number = 0,
): ProcessingLevel {
  // Can't process what you can't perceive
  if (perception === 'undetected') return 'delayed';

  // Processing score from stats
  const processingStat =
    (defenderStats.stat_intelligence * 0.40) +
    (defenderStats.stat_battle_iq * 0.45) +
    (defenderStats.stat_skill * 0.15);
  const processingBase = processingStat * 0.5; // 0-50

  const tierBonus = (defenderTier - 1) * 3; // 0-18
  const partialPenalty = perception === 'partial' ? 15 : 0;
  const psychBonus = clamp(psychModifier, -20, 10);

  const totalScore = processingBase + tierBonus - partialPenalty + psychBonus;

  if (totalScore >= 30) return 'understood';
  if (totalScore >= 15) return 'misread';
  return 'delayed';
}

/**
 * Full perception + processing evaluation — the main entry point.
 */
export function evaluateThreat(
  defenderStats: CharacterStats,
  defenderTier: number,
  attackActionText: string,
  environmentVisibility?: number,
  psychModifier?: number,
): PerceptionResult {
  const perception = evaluatePerception(defenderStats, defenderTier, attackActionText, environmentVisibility);
  const processing = evaluateProcessing(defenderStats, defenderTier, perception, psychModifier);

  // Calculate defense modifier
  let defenseModifier = 0;
  if (perception === 'partial') defenseModifier -= 2;
  if (perception === 'undetected') defenseModifier -= 5;
  if (processing === 'misread') defenseModifier -= 1;
  if (processing === 'delayed') defenseModifier -= 3;

  // Build label
  const perceptionLabels: Record<PerceptionLevel, string> = {
    detected: '👁 Detected',
    partial: '👁 Partial',
    undetected: '❌ Undetected',
  };
  const processingLabels: Record<ProcessingLevel, string> = {
    understood: '✓ Processed',
    misread: '⚠ Misread',
    delayed: '⏳ Delayed',
  };

  const label = `${perceptionLabels[perception]} · ${processingLabels[processing]}`;

  // Build narrator context
  const narratorLines: string[] = ['[PERCEPTION/PROCESSING]:'];

  if (perception === 'detected') {
    narratorLines.push(`The defender clearly perceives the incoming attack.`);
  } else if (perception === 'partial') {
    narratorLines.push(`The defender only partially detects the attack — timing or angle is unclear.`);
  } else {
    narratorLines.push(`The defender FAILS to detect the attack. They are caught completely off-guard.`);
  }

  if (processing === 'understood') {
    narratorLines.push(`Their battle instinct correctly interprets the threat and formulates a response.`);
  } else if (processing === 'misread') {
    narratorLines.push(`Their mind misreads the attack — they may react incorrectly or to the wrong angle.`);
  } else {
    narratorLines.push(`Mental processing is delayed — the response comes too late to be fully effective.`);
  }

  if (defenseModifier !== 0) {
    narratorLines.push(`Defense modifier: ${defenseModifier} to defense roll.`);
  }

  return {
    perception,
    processing,
    label,
    defenseModifier,
    narratorContext: narratorLines.join('\n'),
  };
}

/**
 * Check if the perception result is significant enough to display in battle log.
 * We only show indicators when something interesting happens (not full detection + understood).
 */
export function isPerceptionNotable(result: PerceptionResult): boolean {
  return result.perception !== 'detected' || result.processing !== 'understood';
}
