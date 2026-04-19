/**
 * Promotion Engine — Phase 2: commit pathway
 * ─────────────────────────────────────────────────────────────────────
 * Decides what from raw turn logs becomes durable campaign_brain memory,
 * then commits the merged deltas back to campaign_brain and marks the
 * source turn logs as promoted.
 *
 * Design rules:
 * - Promote: lasting NPC relationship changes, world changes, unresolved
 *   hooks, location residue, faction changes, pressure shifts.
 * - Discard: filler narration, trivial movement, generic flavor.
 * - Cool off: stale hooks beyond N days without re-engagement.
 *
 * Safety:
 * - All commits are bounded merges (capped array sizes, dedup by signature)
 *   to keep campaign_brain from unbounded growth.
 * - Failures never block narration. They surface as console warnings only.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  fetchUnpromotedLogs,
  markPromoted,
  type TurnLogRecord,
} from './TurnLogManager';

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

export interface PromotionRunResult {
  evaluated: number;
  promoted: number;
  skipped: number;
  reasons: string[];
  committed: boolean;
}

const TRIVIAL_INTENT_TYPES = new Set(['observe', 'move']);
const HIGH_VALUE_INTENT_TYPES = new Set(['attack', 'ability', 'speak', 'interact']);

// Bounds to keep campaign_brain compact
const MAX_CONSEQUENCE_SUMMARY = 40;
const MAX_PLAYER_IMPACT_LOG = 60;
const MAX_ACTIVE_HOOKS = 24;

/**
 * Score a single turn log for promotion. Pure function, no IO.
 */
export function evaluateLog(log: TurnLogRecord): PromotionDecision {
  const reasons: string[] = [];
  const promotedFields: PromotionDecision['promotedFields'] = {};

  const intent = (log.parsedIntent ?? {}) as { type?: string; isCombatAction?: boolean };
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
    const first = log.npcDeltas[0] as { npcId?: string; npcName?: string; delta?: unknown };
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
    const hook = log.hookDeltas[0] as { id?: string; status?: string; summary?: string };
    if (hook?.status && ['new', 'escalated', 'resolved'].includes(hook.status)) {
      reasons.push(`hook:${hook.status}`);
      promotedFields.hook = {
        id: hook.id,
        status: hook.status as PromotionDecision['promotedFields']['hook']['status'],
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

/**
 * Bounded array merge — appends new items, dedupes by stringified
 * signature, and caps at `max` (newest wins).
 */
function mergeBounded<T>(existing: unknown, additions: T[], max: number): T[] {
  const base = Array.isArray(existing) ? (existing as T[]) : [];
  if (additions.length === 0) return base;
  const seen = new Set(base.map((x) => JSON.stringify(x)));
  const merged = [...base];
  for (const item of additions) {
    const sig = JSON.stringify(item);
    if (!seen.has(sig)) {
      merged.push(item);
      seen.add(sig);
    }
  }
  return merged.slice(-max);
}

/**
 * Apply a batch of promotion decisions to campaign_brain.
 * - Merges consequence summaries (bounded)
 * - Merges player impact log entries (bounded)
 * - Adds new/escalated hooks to story_hooks (bounded)
 * - Records pressure shifts on current_pressure
 *
 * Returns true if a brain update was committed.
 */
async function commitToBrain(
  campaignId: string,
  decisions: PromotionDecision[],
  logs: TurnLogRecord[],
): Promise<boolean> {
  if (decisions.length === 0) return false;

  const { data: brain, error: loadErr } = await supabase
    .from('campaign_brain')
    .select('consequence_summary, player_impact_log, story_hooks, current_pressure')
    .eq('campaign_id', campaignId)
    .maybeSingle();

  if (loadErr) {
    console.warn('[PromotionEngine] failed to load brain:', loadErr.message);
    return false;
  }

  const logById = new Map(logs.map((l) => [l.id, l]));

  const newConsequences: string[] = [];
  const newImpactEntries: Array<{ day: number; turn: number; summary: string; reasons: string[] }> = [];
  const newHooks: Array<{ id?: string; status: string; summary: string; day: number }> = [];
  let pressureShift: PromotionDecision['promotedFields']['pressureShift'] | null = null;

  for (const decision of decisions) {
    const log = logById.get(decision.logId);
    if (!log) continue;

    if (decision.promotedFields.consequence) {
      newConsequences.push(decision.promotedFields.consequence);
    }

    newImpactEntries.push({
      day: log.dayNumber,
      turn: log.turnNumber,
      summary: log.sceneBeatSummary?.slice(0, 280) || log.rawInput.slice(0, 200),
      reasons: decision.reasons.slice(0, 4),
    });

    if (decision.promotedFields.hook) {
      newHooks.push({
        id: decision.promotedFields.hook.id,
        status: decision.promotedFields.hook.status,
        summary: decision.promotedFields.hook.summary,
        day: log.dayNumber,
      });
    }

    if (decision.promotedFields.pressureShift) {
      pressureShift = decision.promotedFields.pressureShift;
    }
  }

  const update: Record<string, unknown> = {
    consequence_summary: mergeBounded(brain?.consequence_summary, newConsequences, MAX_CONSEQUENCE_SUMMARY),
    player_impact_log: mergeBounded(brain?.player_impact_log, newImpactEntries, MAX_PLAYER_IMPACT_LOG),
    story_hooks: mergeBounded(brain?.story_hooks, newHooks, MAX_ACTIVE_HOOKS),
    updated_at: new Date().toISOString(),
  };

  if (pressureShift) {
    update.current_pressure = pressureShift.to;
  }

  const { error: updateErr } = await supabase
    .from('campaign_brain')
    .update(update)
    .eq('campaign_id', campaignId);

  if (updateErr) {
    console.warn('[PromotionEngine] commit failed:', updateErr.message);
    return false;
  }

  return true;
}

/**
 * Full promotion pass for a campaign:
 *   1) load unpromoted turn logs
 *   2) evaluate them
 *   3) commit promoted deltas into campaign_brain (bounded merge)
 *   4) mark all evaluated logs as promoted (so we don't re-evaluate)
 *
 * Safe to call after every turn — cheap when nothing to promote.
 * Never throws; returns structured run result.
 */
export async function runPromotionPass(
  campaignId: string,
  options: { batchSize?: number } = {},
): Promise<PromotionRunResult> {
  const result: PromotionRunResult = {
    evaluated: 0,
    promoted: 0,
    skipped: 0,
    reasons: [],
    committed: false,
  };

  try {
    const logs = await fetchUnpromotedLogs(campaignId, options.batchSize ?? 20);
    result.evaluated = logs.length;
    if (logs.length === 0) return result;

    const allDecisions = logs.map(evaluateLog);
    const promotions = allDecisions.filter((d) => d.promote);
    result.promoted = promotions.length;
    result.skipped = allDecisions.length - promotions.length;
    result.reasons = promotions.flatMap((d) => d.reasons).slice(0, 12);

    if (promotions.length > 0) {
      result.committed = await commitToBrain(campaignId, promotions, logs);
    }

    // Mark every evaluated log as promoted (even discarded ones get a
    // "skipped" marker so we don't re-evaluate them forever).
    const allIds = allDecisions.map((d) => d.logId);
    const note = result.committed
      ? `promoted=${promotions.length}, skipped=${result.skipped}`
      : `evaluated_only=${allDecisions.length}`;
    await markPromoted(allIds, note);
  } catch (e) {
    console.warn('[PromotionEngine] run exception:', e);
  }

  return result;
}
