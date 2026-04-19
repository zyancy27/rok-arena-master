/**
 * Tester Feedback Actions
 * ─────────────────────────────────────────────────────────────────────
 * Persists slash-command outputs (/feedback, /flag, /donotlearn) to the
 * appropriate tables. Fire-and-forget — never blocks narration.
 *
 * - /feedback → tester_feedback (system-level)
 * - /flag     → tester_feedback (narrator-level, with last_response context)
 * - /donotlearn → campaigns.do_not_learn = true
 */

import { supabase } from '@/integrations/supabase/client';

export interface FeedbackContext {
  userId: string;
  campaignId?: string | null;
  lastNarratorResponse?: string | null;
}

export async function recordTesterFeedback(
  ctx: FeedbackContext,
  text: string,
  category?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await (supabase as any)
      .from('tester_feedback')
      .insert({
        user_id: ctx.userId,
        campaign_id: ctx.campaignId ?? null,
        feedback_kind: 'system',
        category: category ?? 'general',
        feedback_text: text,
        context: { source: 'slash_command_feedback' },
      });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'unknown error' };
  }
}

export async function flagNarratorResponse(
  ctx: FeedbackContext,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await (supabase as any)
      .from('tester_feedback')
      .insert({
        user_id: ctx.userId,
        campaign_id: ctx.campaignId ?? null,
        feedback_kind: 'narrator',
        category: 'narrator_consistency',
        feedback_text: text,
        context: {
          source: 'slash_command_flag',
          last_narrator_response: ctx.lastNarratorResponse ?? null,
        },
      });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'unknown error' };
  }
}

export async function markCampaignDoNotLearn(
  campaignId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('campaigns')
      .update({ do_not_learn: true })
      .eq('id', campaignId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'unknown error' };
  }
}
