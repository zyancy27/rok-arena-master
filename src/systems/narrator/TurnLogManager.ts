/**
 * Turn Log Manager
 * ─────────────────────────────────────────────────────────────────────
 * Captures raw turn-level memory before the Promotion Engine decides what
 * becomes durable campaign_brain memory.
 *
 * Turn logs are append-only short-term memory. They are NOT the same as
 * campaign_brain (which holds promoted/durable truth). The boundary is
 * intentional and strict.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface TurnLogInput {
  campaignId: string;
  characterId?: string | null;
  userId: string;
  turnNumber: number;
  dayNumber: number;
  timeBlock?: string | null;
  zone?: string | null;
  rawInput: string;
  parsedIntent?: Record<string, unknown>;
  resolvedAction?: Record<string, unknown>;
  rollResult?: Record<string, unknown> | null;
  sceneBeatSummary?: string;
  timeAdvance?: number;
  mapDelta?: Record<string, unknown>;
  npcDeltas?: unknown[];
  hookDeltas?: unknown[];
  opportunityDeltas?: unknown[];
  consequenceDeltas?: unknown[];
}

export interface TurnLogRecord extends TurnLogInput {
  id: string;
  promoted: boolean;
  promotedAt?: string | null;
  promotionNotes?: string | null;
  createdAt: string;
}

/**
 * Round-trip a value through JSON.stringify/parse so it satisfies the
 * Supabase generated `Json` type. Returns null on failure.
 */
function toJson(value: unknown): Json {
  try {
    return JSON.parse(JSON.stringify(value ?? null)) as Json;
  } catch {
    return null;
  }
}

function toJsonObject(value: Record<string, unknown> | null | undefined): Json {
  return toJson(value ?? {});
}

function toJsonArray(value: unknown[] | null | undefined): Json {
  return toJson(value ?? []);
}

/**
 * Append a raw turn log. Fire-and-forget on the client; failures are
 * logged but never block the narrator pipeline.
 */
export async function appendTurnLog(input: TurnLogInput): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('campaign_turn_logs')
      .insert([{
        campaign_id: input.campaignId,
        character_id: input.characterId ?? null,
        user_id: input.userId,
        turn_number: input.turnNumber,
        day_number: input.dayNumber,
        time_block: input.timeBlock ?? null,
        zone: input.zone ?? null,
        raw_input: input.rawInput,
        parsed_intent: toJsonObject(input.parsedIntent),
        resolved_action: toJsonObject(input.resolvedAction),
        roll_result: input.rollResult ? toJsonObject(input.rollResult) : null,
        scene_beat_summary: input.sceneBeatSummary ?? null,
        time_advance: input.timeAdvance ?? 0,
        map_delta: toJsonObject(input.mapDelta),
        npc_deltas: toJsonArray(input.npcDeltas),
        hook_deltas: toJsonArray(input.hookDeltas),
        opportunity_deltas: toJsonArray(input.opportunityDeltas),
        consequence_deltas: toJsonArray(input.consequenceDeltas),
      }])
      .select('id')
      .single();

    if (error) {
      console.warn('[TurnLog] append failed:', error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (e) {
    console.warn('[TurnLog] append exception:', e);
    return null;
  }
}

/**
 * Fetch recent unpromoted turn logs for a campaign.
 * Used by the Promotion Engine to decide what becomes campaign_brain truth.
 */
export async function fetchUnpromotedLogs(
  campaignId: string,
  limit = 20,
): Promise<TurnLogRecord[]> {
  const { data, error } = await supabase
    .from('campaign_turn_logs')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('promoted', false)
    .order('turn_number', { ascending: true })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    campaignId: row.campaign_id,
    characterId: row.character_id,
    userId: row.user_id,
    turnNumber: row.turn_number,
    dayNumber: row.day_number,
    timeBlock: row.time_block,
    zone: row.zone,
    rawInput: row.raw_input,
    parsedIntent: row.parsed_intent ?? {},
    resolvedAction: row.resolved_action ?? {},
    rollResult: row.roll_result,
    sceneBeatSummary: row.scene_beat_summary,
    timeAdvance: row.time_advance ?? 0,
    mapDelta: row.map_delta ?? {},
    npcDeltas: row.npc_deltas ?? [],
    hookDeltas: row.hook_deltas ?? [],
    opportunityDeltas: row.opportunity_deltas ?? [],
    consequenceDeltas: row.consequence_deltas ?? [],
    promoted: row.promoted,
    promotedAt: row.promoted_at,
    promotionNotes: row.promotion_notes,
    createdAt: row.created_at,
  }));
}

/**
 * Mark turn logs as promoted after the Promotion Engine consumes them.
 */
export async function markPromoted(logIds: string[], notes?: string): Promise<void> {
  if (logIds.length === 0) return;
  const { error } = await supabase
    .from('campaign_turn_logs')
    .update({
      promoted: true,
      promoted_at: new Date().toISOString(),
      promotion_notes: notes ?? null,
    })
    .in('id', logIds);

  if (error) console.warn('[TurnLog] markPromoted failed:', error.message);
}

/**
 * Fetch the last N raw turn logs for a campaign (used by debug UIs and
 * the narrator's short-term context window).
 */
export async function fetchRecentLogs(
  campaignId: string,
  limit = 5,
): Promise<TurnLogRecord[]> {
  const { data, error } = await supabase
    .from('campaign_turn_logs')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('turn_number', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data
    .map((row: any) => ({
      id: row.id,
      campaignId: row.campaign_id,
      characterId: row.character_id,
      userId: row.user_id,
      turnNumber: row.turn_number,
      dayNumber: row.day_number,
      timeBlock: row.time_block,
      zone: row.zone,
      rawInput: row.raw_input,
      parsedIntent: row.parsed_intent ?? {},
      resolvedAction: row.resolved_action ?? {},
      rollResult: row.roll_result,
      sceneBeatSummary: row.scene_beat_summary,
      timeAdvance: row.time_advance ?? 0,
      mapDelta: row.map_delta ?? {},
      npcDeltas: row.npc_deltas ?? [],
      hookDeltas: row.hook_deltas ?? [],
      opportunityDeltas: row.opportunity_deltas ?? [],
      consequenceDeltas: row.consequence_deltas ?? [],
      promoted: row.promoted,
      promotedAt: row.promoted_at,
      promotionNotes: row.promotion_notes,
      createdAt: row.created_at,
    }))
    .reverse(); // chronological
}
