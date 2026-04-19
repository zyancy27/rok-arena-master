/**
 * MapDeltaEngine — Part 11 of the ROK Narrator Brain
 * ─────────────────────────────────────────────────────────────────────
 * Lightweight, narrator-owned layer that records *changes* to the live
 * map per turn rather than rebuilding a static display. Deltas are
 * appended to `campaign_turn_logs.map_delta` (already JSONB) so the
 * map UI can replay them as pulses, highlights, breadcrumbs, icon swaps,
 * and zone emphasis without needing a giant simulation engine.
 *
 * Design rules (per the ROK Narrator Brain spec):
 *   • narrator-owned tool — NOT a separate brain
 *   • bounded set of delta kinds — keep map readable, not cluttered
 *   • subtle, layered visual cues only — never steal player agency
 *   • deterministic construction from turn data; no AI inside this module
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// ── Delta vocabulary ────────────────────────────────────────────────

export type MapDeltaKind =
  | 'player_move'
  | 'npc_move'
  | 'enemy_move'
  | 'enemy_spawn'
  | 'landmark_discovered'
  | 'terrain_changed'
  | 'hazard_added'
  | 'hazard_cleared'
  | 'control_shifted'
  | 'clue_visible'
  | 'objective_visible'
  | 'structure_damaged'
  | 'structure_repaired'
  | 'environment_state';

export type MapDeltaEmphasis = 'subtle' | 'normal' | 'strong';

export interface MapDelta {
  kind: MapDeltaKind;
  /** Free-form short label, e.g. "Eastern Watchtower" */
  label?: string;
  /** Zone the delta applies to (zone_name). */
  zone?: string;
  /** Optional secondary zone (movement from → to). */
  fromZone?: string;
  toZone?: string;
  /** Optional subject (npc/enemy/landmark name). */
  subject?: string;
  /** Visual hint — UI may map to pulses/highlights/icon swaps. */
  emphasis?: MapDeltaEmphasis;
  /** One-line human reason; used for tooltips / debug. */
  note?: string;
  /** Turn number this delta belongs to. */
  turnNumber?: number;
}

export interface MapDeltaBuildInput {
  turnNumber: number;
  zone?: string | null;
  previousZone?: string | null;
  /** Resolved action / roll info — used to detect movement & outcomes. */
  parsedIntent?: Record<string, unknown> | null;
  rollResult?: Record<string, unknown> | null;
  /** Optional explicit deltas the caller wants merged in. */
  explicitDeltas?: MapDelta[];
  /** Newly-discovered landmark / clue surfaced by narrator response. */
  discoveredLandmarks?: string[];
  /** Newly-spawned enemy names (already persisted upstream). */
  spawnedEnemies?: string[];
  /** Hazard family strings detected by scene effect bridge. */
  newHazards?: string[];
  /** Hazards removed/dispersed by the action's outcome. */
  clearedHazards?: string[];
  /** Faction/control flip note, e.g. "Watchtower → Iron Wardens". */
  controlShifts?: Array<{ zone: string; controlledBy: string | null; description?: string }>;
}

// ── Construction ────────────────────────────────────────────────────

const DELTA_CAP = 16; // hard cap per turn — keeps map legible

function inferEmphasis(kind: MapDeltaKind): MapDeltaEmphasis {
  switch (kind) {
    case 'enemy_spawn':
    case 'control_shifted':
    case 'objective_visible':
      return 'strong';
    case 'landmark_discovered':
    case 'hazard_added':
    case 'structure_damaged':
    case 'clue_visible':
      return 'normal';
    default:
      return 'subtle';
  }
}

function dedupeDeltas(deltas: MapDelta[]): MapDelta[] {
  const seen = new Set<string>();
  const out: MapDelta[] = [];
  for (const d of deltas) {
    const key = `${d.kind}|${d.zone ?? ''}|${d.toZone ?? ''}|${d.subject ?? ''}|${d.label ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
    if (out.length >= DELTA_CAP) break;
  }
  return out;
}

/**
 * Build a structured set of map deltas from this turn's raw signals.
 * Pure function — deterministic, no IO.
 */
export function buildMapDeltas(input: MapDeltaBuildInput): MapDelta[] {
  const deltas: MapDelta[] = [];
  const turnNumber = input.turnNumber;

  // Player movement
  if (input.zone && input.previousZone && input.zone !== input.previousZone) {
    deltas.push({
      kind: 'player_move',
      fromZone: input.previousZone,
      toZone: input.zone,
      zone: input.zone,
      emphasis: 'normal',
      note: `Party moved to ${input.zone}`,
      turnNumber,
    });
  }

  // Spawned enemies → enemy_spawn deltas
  for (const name of input.spawnedEnemies ?? []) {
    if (!name) continue;
    deltas.push({
      kind: 'enemy_spawn',
      subject: name,
      zone: input.zone ?? undefined,
      emphasis: 'strong',
      note: `${name} appeared`,
      turnNumber,
    });
  }

  // Discovered landmarks → landmark_discovered (subtle breadcrumb)
  for (const label of input.discoveredLandmarks ?? []) {
    if (!label) continue;
    deltas.push({
      kind: 'landmark_discovered',
      label,
      zone: input.zone ?? undefined,
      emphasis: 'normal',
      note: `Discovered: ${label}`,
      turnNumber,
    });
  }

  // Hazards added / cleared
  for (const h of input.newHazards ?? []) {
    if (!h) continue;
    deltas.push({
      kind: 'hazard_added',
      label: h,
      zone: input.zone ?? undefined,
      emphasis: inferEmphasis('hazard_added'),
      note: `Hazard surfaced: ${h}`,
      turnNumber,
    });
  }
  for (const h of input.clearedHazards ?? []) {
    if (!h) continue;
    deltas.push({
      kind: 'hazard_cleared',
      label: h,
      zone: input.zone ?? undefined,
      emphasis: 'subtle',
      note: `Hazard cleared: ${h}`,
      turnNumber,
    });
  }

  // Control shifts
  for (const shift of input.controlShifts ?? []) {
    if (!shift?.zone) continue;
    deltas.push({
      kind: 'control_shifted',
      zone: shift.zone,
      subject: shift.controlledBy ?? 'unclaimed',
      emphasis: 'strong',
      note: shift.description ?? `${shift.zone} → ${shift.controlledBy ?? 'unclaimed'}`,
      turnNumber,
    });
  }

  // Caller-supplied explicit deltas (narrator-driven)
  for (const d of input.explicitDeltas ?? []) {
    deltas.push({
      ...d,
      emphasis: d.emphasis ?? inferEmphasis(d.kind),
      turnNumber: d.turnNumber ?? turnNumber,
    });
  }

  return dedupeDeltas(deltas);
}

// ── Persistence ─────────────────────────────────────────────────────

export interface RecordMapDeltasInput {
  campaignId: string;
  turnLogId: string | null;
  deltas: MapDelta[];
}

export interface RecordMapDeltasResult {
  applied: boolean;
  written: number;
  reason?: string;
}

/**
 * Persist deltas onto the matching `campaign_turn_logs` row. If we don't
 * yet have a turn-log id we silently no-op (the deltas can be re-derived
 * on the next pulse). Never throws — fire-and-forget safe.
 */
export async function recordMapDeltas(
  input: RecordMapDeltasInput,
): Promise<RecordMapDeltasResult> {
  const { campaignId, turnLogId, deltas } = input;
  if (!campaignId || !turnLogId || deltas.length === 0) {
    return { applied: false, written: 0, reason: 'no-op' };
  }

  try {
    // Read current map_delta to merge non-destructively
    const { data: existing, error: readErr } = await supabase
      .from('campaign_turn_logs')
      .select('map_delta')
      .eq('id', turnLogId)
      .maybeSingle();
    if (readErr) {
      console.warn('[MapDeltaEngine] read failed', readErr.message);
    }

    const prior = (existing?.map_delta && typeof existing.map_delta === 'object'
      ? existing.map_delta
      : {}) as Record<string, unknown>;
    const priorList = Array.isArray(prior.deltas) ? (prior.deltas as MapDelta[]) : [];
    const merged = dedupeDeltas([...priorList, ...deltas]);

    const payload: Record<string, unknown> = {
      ...prior,
      version: 1,
      deltas: merged,
      lastUpdated: new Date().toISOString(),
    };

    const { error: writeErr } = await supabase
      .from('campaign_turn_logs')
      .update({ map_delta: payload as unknown as Json })
      .eq('id', turnLogId);
    if (writeErr) {
      console.warn('[MapDeltaEngine] write failed', writeErr.message);
      return { applied: false, written: 0, reason: writeErr.message };
    }
    return { applied: true, written: merged.length - priorList.length };
  } catch (err) {
    console.warn('[MapDeltaEngine] unexpected error', err);
    return { applied: false, written: 0, reason: String(err) };
  }
}

// ── Convenience ─────────────────────────────────────────────────────

/** Compact human label for tester debug surfacing. */
export function summarizeDeltas(deltas: MapDelta[]): string {
  if (deltas.length === 0) return 'no map changes';
  const counts = new Map<MapDeltaKind, number>();
  for (const d of deltas) counts.set(d.kind, (counts.get(d.kind) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([k, n]) => `${k}×${n}`)
    .join(' · ');
}
