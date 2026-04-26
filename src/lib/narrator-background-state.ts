/**
 * Narrator/Campaign background-state persistence.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 * Chat message rows must stay small (see CHAT_MESSAGE_METADATA_ALLOWLIST in
 * campaign-message-normalizer.ts). But the narrator pipeline still produces
 * large, valuable continuity data per turn — generated runtime packets,
 * scene-effect packets, lore/identity context, narration flavor cues, etc.
 *
 * That data must NOT be lost just because it is too heavy to embed on every
 * chat bubble. Instead it is written, fire-and-forget, into `campaign_logs`
 * (an existing JSONB diagnostics table) keyed by the same `turnGroupId` that
 * stitches the chat beats together. Durable promoted memory continues to
 * flow through the existing TurnLogManager → PromotionEngine → campaign_brain
 * pipeline; this helper is the safety net that guarantees nothing important
 * is silently discarded by the trim step.
 *
 * ── Failure model ───────────────────────────────────────────────────────
 *  - This helper is fire-and-forget. It NEVER throws into the caller.
 *  - If the background insert fails, chat messages still appear normally.
 *  - The failure is logged for diagnostics; the caller may retry later.
 *  - The payload is automatically compacted/summarized when oversized so we
 *    keep a usable trace even when the full packet would be rejected.
 */

import { supabase } from '@/integrations/supabase/client';

/** Soft cap before we summarize the payload (≈ keeps us well under PostgREST limits). */
const MAX_PAYLOAD_BYTES = 200_000;

export interface NarratorBackgroundStateInput {
  campaignId: string;
  turnGroupId: string;
  /**
   * The full narrator metadata bag (generatedPackets, sceneEffectPacket,
   * resolved action, identity cues, etc.). Anything goes — this function
   * is responsible for compacting it.
   */
  heavyMetadata?: Record<string, unknown> | null;
  /** Raw narration text the AI returned, for full continuity replay. */
  rawNarration?: string | null;
  /** Player input that triggered this turn, if known. */
  playerInput?: string | null;
  /** Character that acted, if known. */
  characterId?: string | null;
  /** Optional turn-log id linking this background state to a campaign_turn_logs row. */
  turnLogId?: string | null;
}

function approxByteLength(value: unknown): number {
  try {
    return JSON.stringify(value)?.length ?? 0;
  } catch {
    return 0;
  }
}

/**
 * If a single field is huge (e.g. full conversationHistory or generated lore),
 * collapse it to a short summary so the row still fits while preserving a
 * useful trace.
 */
function compactHeavyMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const compacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    const size = approxByteLength(value);
    if (size <= 16_000) {
      compacted[key] = value;
      continue;
    }
    // Field is too big — keep a structural summary instead of raw payload.
    if (Array.isArray(value)) {
      compacted[key] = {
        __summarized: true,
        kind: 'array',
        length: value.length,
        sampleHead: value.slice(0, 2),
        approxBytes: size,
      };
    } else if (value && typeof value === 'object') {
      compacted[key] = {
        __summarized: true,
        kind: 'object',
        keys: Object.keys(value as Record<string, unknown>).slice(0, 24),
        approxBytes: size,
      };
    } else {
      compacted[key] = {
        __summarized: true,
        kind: typeof value,
        approxBytes: size,
      };
    }
  }
  return compacted;
}

/**
 * Write the heavy narrator turn snapshot to background storage.
 *
 * Returns the inserted log id (so callers can attach it back as a pointer on
 * chat messages if they want), or null on failure. Never throws.
 */
export async function persistNarratorBackgroundState(
  input: NarratorBackgroundStateInput,
): Promise<string | null> {
  try {
    if (!input.campaignId || !input.turnGroupId) return null;

    const heavy = input.heavyMetadata ?? {};
    let payload: Record<string, unknown> = {
      turnGroupId: input.turnGroupId,
      turnLogId: input.turnLogId ?? null,
      characterId: input.characterId ?? null,
      playerInput: input.playerInput ?? null,
      rawNarration: input.rawNarration ?? null,
      heavyMetadata: heavy,
      capturedAt: new Date().toISOString(),
    };

    if (approxByteLength(payload) > MAX_PAYLOAD_BYTES) {
      payload = {
        ...payload,
        heavyMetadata: compactHeavyMetadata(heavy),
        __compacted: true,
      };
    }

    const { data, error } = await supabase
      .from('campaign_logs')
      .insert({
        campaign_id: input.campaignId,
        event_type: 'narrator:background_state',
        event_data: payload as never,
      })
      .select('id')
      .maybeSingle();

    if (error) {
      console.warn('[narrator-bg] background state persist failed', {
        error,
        turnGroupId: input.turnGroupId,
      });
      return null;
    }

    return (data?.id as string | undefined) ?? null;
  } catch (error) {
    // Absolutely never let a background-state failure bubble up into chat.
    console.warn('[narrator-bg] unexpected background state error', error);
    return null;
  }
}
