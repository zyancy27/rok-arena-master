/**
 * Promotion Engine — Phase 1 scaffold
 * ─────────────────────────────────────────────────────────────────────
 * Decides what from raw turn logs becomes durable campaign_brain memory.
 *
 * Phase 1 implements deterministic heuristics. Phase 3 will add an
 * AI-assisted pass for edge cases.
 *
 * Design rules:
 * - Promote: lasting NPC relationship changes, world changes, unresolved
 *   hooks, location residue, faction changes, pressure shifts.
 * - Discard: filler narration, trivial movement, generic flavor.
 * - Cool off: stale hooks beyond N days without re-engagement.
 */

import type { TurnLogRecord } from './TurnLogManager';

export interface PromotionDecision {
  logId: string;
  promote: boolean;
  reasons: string[];
  promotedFields: {
    consequence?: string;
    npcShift?: { npcId?: string; npcName?: string; delta: string };
    hook?: { id?: string; status: 'new' | 'escalated' | 'cooled' | 'resolved'; summary: string };
    locationResidue?: { zone: string; residue: string };
    pressureShift?: { from?: string; to: string; reason: string };
  };
}

const TRIVIAL_INTENT_TYPES = new Set(['observe', 'move']);
const HIGH_VALUE_INTENT_TYPES = new Set(['attack', 'ability', 'speak', 'interact']);

/**
 * Score a single turn log for promotion. Pure function, no IO.
 */
export function evaluateLog(log: TurnLogRecord): PromotionDecision {
  const reasons: string[] = [];
  const promotedFields: PromotionDecision['promotedFields'] = {};

  const intent = (log.parsedIntent ?? {}) as { type?: string; isCombatAction?: boolean };
  const action = (log.resolvedAction ?? {}) as { outcome?: string; severity?: string };
  const roll = log.rollResult as { band?: string; type?: string } | null;

  // Rule 1: Combat actions with non-trivial outcomes always promote
  if (intent.isCombatAction && roll?.band && roll.band !== 'normal_success') {
    reasons.push(`combat outcome:${roll.band}`);
  }

  // Rule 2: Strong successes / severe failures matter
  if (roll?.band === 'strong_success' || roll?.band === 'severe_failure') {
    reasons.push(`extreme roll band:${roll.band}`);
  }

  // Rule 3: Consequence deltas always promote
  if (Array.isArray(log.consequenceDeltas) && log.consequenceDeltas.length > 0) {
    reasons.push(`consequence_deltas:${log.consequenceDeltas.length}`);
    promotedFields.consequence = `Day ${log.dayNumber}: ${log.sceneBeatSummary || 'consequence triggered'}`;
  }

  // Rule 4: NPC deltas always promote
  if (Array.isArray(log.npcDeltas) && log.npcDeltas.length > 0) {
    reasons.push(`npc_deltas:${log.npcDeltas.length}`);
    const first = log.npcDeltas[0] as any;
    if (first?.delta) {
      promotedFields.npcShift = {
        npcId: first.npcId,
        npcName: first.npcName,
        delta: String(first.delta),
      };
    }
  }

  // Rule 5: Hook deltas — promote new/escalated/resolved
  if (Array.isArray(log.hookDeltas) && log.hookDeltas.length > 0) {
    const hook = log.hookDeltas[0] as any;
    if (hook?.status && ['new', 'escalated', 'resolved'].includes(hook.status)) {
      reasons.push(`hook:${hook.status}`);
      promotedFields.hook = {
        id: hook.id,
        status: hook.status,
        summary: hook.summary || 'hook updated',
      };
    }
  }

  // Rule 6: Discard trivial observe/move with no deltas
  if (
    TRIVIAL_INTENT_TYPES.has(intent.type ?? '')
    && reasons.length === 0
    && !roll
  ) {
    return { logId: log.id, promote: false, reasons: ['trivial:observe_or_move'], promotedFields: {} };
  }

  // Rule 7: High-value intent types with explicit beat get a soft promotion
  if (HIGH_VALUE_INTENT_TYPES.has(intent.type ?? '') && log.sceneBeatSummary) {
    reasons.push(`high_value_intent:${intent.type}`);
  }

  return {
    logId: log.id,
    promote: reasons.length > 0,
    reasons,
    promotedFields,
  };
}

/**
 * Batch-evaluate multiple logs. Returns only logs marked for promotion.
 */
export function selectPromotions(logs: TurnLogRecord[]): PromotionDecision[] {
  return logs.map(evaluateLog).filter((d) => d.promote);
}
