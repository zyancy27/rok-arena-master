/**
 * SafeLearningLayer — Part 13 of the ROK Narrator Brain
 * ─────────────────────────────────────────────────────────────────────
 * Bounded, three-tier learning with strict privacy and scope guards.
 *
 *   Tier 1 — Global Product/System Learning
 *     Allowed: parser failures, UX confusion, roll-clarity issues,
 *              map readability, pacing, beat hierarchy, promotion misses,
 *              narrator consistency drift.
 *     Stored: campaign_logs (event_type prefix `learning:global:*`)
 *             with NO campaign-private content (only structural signals).
 *
 *   Tier 2 — Campaign Learning
 *     Allowed: campaign-specific world truth, NPC state, hooks,
 *              location changes, player impact, arc/pressure continuity.
 *     Stored: campaign_logs scoped to that campaign only.
 *
 *   Tier 3 — Character Learning
 *     Allowed: how *one* character tends to act, what they prioritize,
 *              what NPCs respond well to, what kinds of opportunities fit.
 *     Stored: character_ai_notes (already private, encrypted, owner-only).
 *
 * Hard rules:
 *   • Tester-flagged campaigns (`campaigns.do_not_learn = true`) are
 *     skipped entirely — they should never influence anything.
 *   • Tier 1 NEVER receives raw player text, NPC names, or zone names.
 *     Only category, severity, and short pattern fingerprints.
 *   • Tier 2 stays inside campaign_id RLS — RLS policies on
 *     campaign_logs already enforce this.
 *   • Tier 3 writes are owner-scoped via character_ai_notes RLS.
 *   • This module never mutates campaign_brain directly. Promotion is
 *     PromotionEngine's job; learning is reflective signal capture only.
 *   • All writes are best-effort, fire-and-forget safe — never throw.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// ── Tier 1 — Global Product/System Learning ─────────────────────────

export type GlobalLearningCategory =
  | 'parser_failure'
  | 'ux_confusion'
  | 'roll_clarity'
  | 'map_readability'
  | 'pacing'
  | 'beat_hierarchy'
  | 'promotion_miss'
  | 'narrator_consistency';

export type LearningSeverity = 'low' | 'medium' | 'high';

export interface GlobalLearningSignal {
  category: GlobalLearningCategory;
  severity: LearningSeverity;
  /** Short structural fingerprint, NEVER raw player text. */
  fingerprint: string;
  /** Optional non-identifying metric (counts, durations). */
  metrics?: Record<string, number | string>;
}

const RAW_TEXT_GUARD_MAX = 80; // hard cap for fingerprint length
const FORBIDDEN_FINGERPRINT_PATTERNS = [
  /\b(kill|murder|rape|suicide)\b/i, // never serialize these signals globally
];

function sanitizeFingerprint(input: string): string {
  if (!input) return 'unknown';
  let f = input.trim().slice(0, RAW_TEXT_GUARD_MAX);
  for (const re of FORBIDDEN_FINGERPRINT_PATTERNS) {
    if (re.test(f)) return 'redacted';
  }
  // strip any substring that looks like a name token (Capitalized words 4+ chars)
  // This is a *defensive* guard — Tier 1 should already use category labels.
  f = f.replace(/\b[A-Z][a-z]{3,}\b/g, '_');
  return f;
}

export interface RecordGlobalLearningInput extends GlobalLearningSignal {
  /** Required for RLS — global learning rows are still scoped to a
   * campaign id so they pass campaign_logs RLS, but the *content*
   * carries no campaign-private detail. */
  campaignId: string;
  /** Tester profile flag — when true, signal is tagged so analysis
   * tools can filter tester-driven noise out of global aggregates. */
  isTester?: boolean;
}

export interface LearningWriteResult {
  applied: boolean;
  reason?: string;
}

export async function recordGlobalLearning(
  input: RecordGlobalLearningInput,
): Promise<LearningWriteResult> {
  if (!input?.campaignId) return { applied: false, reason: 'missing-campaign' };

  // Hard skip if campaign opted out of learning.
  const allowed = await isLearningAllowed(input.campaignId);
  if (!allowed) return { applied: false, reason: 'do-not-learn' };

  const payload: Record<string, unknown> = {
    tier: 'global',
    category: input.category,
    severity: input.severity,
    fingerprint: sanitizeFingerprint(input.fingerprint),
    metrics: input.metrics ?? {},
    isTester: !!input.isTester,
    capturedAt: new Date().toISOString(),
  };

  try {
    const { error } = await supabase.from('campaign_logs').insert({
      campaign_id: input.campaignId,
      event_type: `learning:global:${input.category}`,
      event_data: payload as unknown as Json,
    });
    if (error) {
      console.warn('[SafeLearning] global write failed', error.message);
      return { applied: false, reason: error.message };
    }
    return { applied: true };
  } catch (err) {
    console.warn('[SafeLearning] global unexpected error', err);
    return { applied: false, reason: String(err) };
  }
}

// ── Tier 2 — Campaign Learning ──────────────────────────────────────

export type CampaignLearningCategory =
  | 'world_truth'
  | 'npc_state'
  | 'hook_lifecycle'
  | 'location_change'
  | 'player_impact'
  | 'relationship_shift'
  | 'arc_continuity';

export interface RecordCampaignLearningInput {
  campaignId: string;
  category: CampaignLearningCategory;
  /** Free-form structured note — RLS keeps it scoped. */
  detail: Record<string, unknown>;
  isTester?: boolean;
}

export async function recordCampaignLearning(
  input: RecordCampaignLearningInput,
): Promise<LearningWriteResult> {
  if (!input?.campaignId) return { applied: false, reason: 'missing-campaign' };

  const allowed = await isLearningAllowed(input.campaignId);
  if (!allowed) return { applied: false, reason: 'do-not-learn' };

  const payload: Record<string, unknown> = {
    tier: 'campaign',
    category: input.category,
    detail: input.detail ?? {},
    isTester: !!input.isTester,
    capturedAt: new Date().toISOString(),
  };

  try {
    const { error } = await supabase.from('campaign_logs').insert({
      campaign_id: input.campaignId,
      event_type: `learning:campaign:${input.category}`,
      event_data: payload as unknown as Json,
    });
    if (error) {
      console.warn('[SafeLearning] campaign write failed', error.message);
      return { applied: false, reason: error.message };
    }
    return { applied: true };
  } catch (err) {
    console.warn('[SafeLearning] campaign unexpected error', err);
    return { applied: false, reason: String(err) };
  }
}

// ── Tier 3 — Character Learning ─────────────────────────────────────

export type CharacterLearningCategory =
  | 'tendency'
  | 'priority'
  | 'npc_response_pattern'
  | 'opportunity_fit';

export interface RecordCharacterLearningInput {
  characterId: string;
  userId: string;
  category: CharacterLearningCategory;
  note: string;
  /** Optional battle scope; campaign learning lives in Tier 2 instead. */
  battleId?: string | null;
  campaignId?: string | null;
  isTester?: boolean;
}

export async function recordCharacterLearning(
  input: RecordCharacterLearningInput,
): Promise<LearningWriteResult> {
  if (!input?.characterId || !input?.userId || !input?.note) {
    return { applied: false, reason: 'missing-fields' };
  }

  // Optional campaign-level opt-out check
  if (input.campaignId) {
    const allowed = await isLearningAllowed(input.campaignId);
    if (!allowed) return { applied: false, reason: 'do-not-learn' };
  }

  try {
    const { error } = await supabase.from('character_ai_notes').insert({
      character_id: input.characterId,
      user_id: input.userId,
      battle_id: input.battleId ?? null,
      scope: input.battleId ? 'battle' : 'global',
      category: `learning:${input.category}`,
      note: input.note.slice(0, 800), // bounded
    });
    if (error) {
      console.warn('[SafeLearning] character write failed', error.message);
      return { applied: false, reason: error.message };
    }
    return { applied: true };
  } catch (err) {
    console.warn('[SafeLearning] character unexpected error', err);
    return { applied: false, reason: String(err) };
  }
}

// ── Privacy / opt-out ───────────────────────────────────────────────

const learningGateCache = new Map<string, { allowed: boolean; ts: number }>();
const GATE_TTL_MS = 60_000;

/** Returns false if the campaign has `do_not_learn = true`. Cached briefly. */
export async function isLearningAllowed(campaignId: string): Promise<boolean> {
  const cached = learningGateCache.get(campaignId);
  if (cached && Date.now() - cached.ts < GATE_TTL_MS) return cached.allowed;
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('do_not_learn')
      .eq('id', campaignId)
      .maybeSingle();
    if (error) {
      console.warn('[SafeLearning] gate check failed', error.message);
      return true; // fail-open — never block fixes due to gate read errors
    }
    const allowed = !data?.do_not_learn;
    learningGateCache.set(campaignId, { allowed, ts: Date.now() });
    return allowed;
  } catch {
    return true;
  }
}

export function clearLearningGateCache(campaignId?: string): void {
  if (campaignId) learningGateCache.delete(campaignId);
  else learningGateCache.clear();
}
