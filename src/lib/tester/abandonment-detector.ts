/**
 * Campaign Abandonment Detector
 * ─────────────────────────────────────────────────────────────────────
 * Heuristic to mark short/abandoned tester campaigns with `do_not_learn`
 * so they don't pollute long-term narrator behavior or global learning.
 *
 * Per user spec: "if I leave or close a campaign and I've only engaged
 * a few times or close it out within the in-game days, single day, then
 * know I'm testing it out."
 */

import { supabase } from '@/integrations/supabase/client';

export interface AbandonmentSignals {
  campaignId: string;
  dayCount: number;
  turnCount: number;
  isTester: boolean;
}

/** Threshold rules — tunable as we learn from real usage. */
const TESTER_ABANDON_TURN_THRESHOLD = 6;
const TESTER_ABANDON_DAY_THRESHOLD = 1;

export function shouldMarkDoNotLearn(s: AbandonmentSignals): { mark: boolean; reason: string } {
  if (!s.isTester) return { mark: false, reason: 'not_tester' };

  if (s.dayCount <= TESTER_ABANDON_DAY_THRESHOLD && s.turnCount <= TESTER_ABANDON_TURN_THRESHOLD) {
    return {
      mark: true,
      reason: `tester_short_campaign:days=${s.dayCount},turns=${s.turnCount}`,
    };
  }

  return { mark: false, reason: 'campaign_passed_thresholds' };
}

/**
 * Apply do_not_learn flag + abandonment reason. Idempotent.
 */
export async function markCampaignDoNotLearn(
  campaignId: string,
  reason: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('campaigns')
    .update({
      do_not_learn: true,
      abandonment_reason: reason,
    })
    .eq('id', campaignId);

  if (error) {
    console.warn('[Abandonment] mark failed:', error.message);
    return false;
  }
  return true;
}

/**
 * Count player turns in a campaign. Used by close/leave handlers.
 */
export async function getCampaignTurnCount(campaignId: string): Promise<number> {
  const { count } = await supabase
    .from('campaign_messages')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('sender_type', 'player');
  return count ?? 0;
}

/**
 * Convenience: evaluate + mark in one call. Safe to await on close handlers.
 */
export async function evaluateAndMark(
  campaignId: string,
  dayCount: number,
  isTester: boolean,
): Promise<{ marked: boolean; reason: string }> {
  if (!isTester) return { marked: false, reason: 'not_tester' };
  const turnCount = await getCampaignTurnCount(campaignId);
  const decision = shouldMarkDoNotLearn({ campaignId, dayCount, turnCount, isTester });
  if (!decision.mark) return { marked: false, reason: decision.reason };
  const ok = await markCampaignDoNotLearn(campaignId, decision.reason);
  return { marked: ok, reason: decision.reason };
}
