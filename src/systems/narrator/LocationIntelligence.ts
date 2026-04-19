/**
 * LocationIntelligence — Part 12 of the ROK Narrator Brain
 * ─────────────────────────────────────────────────────────────────────
 * Updater for `campaign_location_state`. Each meaningful zone tracks:
 *   • territorial ownership (controlled_by / control_type)
 *   • local habits, environmental friction, scene residue, quiet value
 *   • familiarity_level — how well the party knows this place
 *   • times_visited / last_visited_day for cadence
 *
 * This module is a narrator-owned tool, NOT a separate brain.
 * Pure write-through helpers — the narrator decides WHAT changes; this
 * module just captures and persists those changes correctly.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface LocationVisitInput {
  campaignId: string;
  zoneName: string;
  currentDay: number;
  /** Optional residue line to append (kept short; max 8 retained per zone). */
  sceneResidue?: string;
  /** Optional mood override. */
  locationMood?: string;
  /** Optional notable feature(s) to add. */
  notableFeatures?: string[];
}

export interface LocationOwnershipInput {
  campaignId: string;
  zoneName: string;
  controlledBy: string | null;
  controlType?: 'unclaimed' | 'contested' | 'occupied' | 'patrolled' | 'sanctified';
  controlDescription?: string;
}

export interface LocationVisitResult {
  applied: boolean;
  zone: string;
  timesVisited: number;
  familiarityLevel: number;
  changedFields: string[];
  reason?: string;
}

const RESIDUE_MAX = 8;
const FEATURES_MAX = 12;
const FAMILIARITY_MAX = 5;

function asArray<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function bumpFamiliarity(current: number, timesVisited: number): number {
  // Familiarity climbs the first few visits, then plateaus.
  if (timesVisited >= 8) return Math.min(FAMILIARITY_MAX, Math.max(current, 5));
  if (timesVisited >= 4) return Math.min(FAMILIARITY_MAX, Math.max(current, 4));
  if (timesVisited >= 2) return Math.min(FAMILIARITY_MAX, Math.max(current, 2));
  return Math.min(FAMILIARITY_MAX, Math.max(current, 1));
}

/**
 * Record a visit to a zone. Creates the row if it doesn't exist; otherwise
 * updates counters and merges optional state.
 */
export async function recordZoneVisit(input: LocationVisitInput): Promise<LocationVisitResult> {
  const { campaignId, zoneName, currentDay, sceneResidue, locationMood, notableFeatures } = input;

  if (!campaignId || !zoneName) {
    return { applied: false, zone: zoneName, timesVisited: 0, familiarityLevel: 0, changedFields: [], reason: 'missing ids' };
  }

  const { data: existing, error: readError } = await supabase
    .from('campaign_location_state')
    .select('id, times_visited, familiarity_level, scene_residue, notable_features, location_mood')
    .eq('campaign_id', campaignId)
    .eq('zone_name', zoneName)
    .maybeSingle();

  if (readError) {
    return {
      applied: false,
      zone: zoneName,
      timesVisited: 0,
      familiarityLevel: 0,
      changedFields: [],
      reason: readError.message,
    };
  }

  const changed: string[] = [];

  // Build merged residue (newest-wins, capped)
  const baseResidue = asArray<string>(existing?.scene_residue);
  const nextResidue = sceneResidue
    ? [...baseResidue.filter((r) => r !== sceneResidue), sceneResidue].slice(-RESIDUE_MAX)
    : baseResidue;
  if (sceneResidue && nextResidue.length !== baseResidue.length) changed.push('scene_residue');

  // Build merged features
  const baseFeatures = Array.isArray(existing?.notable_features) ? (existing!.notable_features as string[]) : [];
  let nextFeatures = baseFeatures;
  if (notableFeatures?.length) {
    const additions = notableFeatures.filter((f) => !baseFeatures.includes(f));
    if (additions.length) {
      nextFeatures = [...baseFeatures, ...additions].slice(-FEATURES_MAX);
      changed.push('notable_features');
    }
  }

  if (!existing) {
    const timesVisited = 1;
    const familiarity = bumpFamiliarity(0, timesVisited);
    const { error: insertError } = await supabase.from('campaign_location_state').insert({
      campaign_id: campaignId,
      zone_name: zoneName,
      times_visited: timesVisited,
      last_visited_day: currentDay,
      familiarity_level: familiarity,
      location_mood: locationMood ?? 'neutral',
      scene_residue: nextResidue as unknown as Json,
      notable_features: nextFeatures,
    });
    if (insertError) {
      return {
        applied: false,
        zone: zoneName,
        timesVisited: 0,
        familiarityLevel: 0,
        changedFields: [],
        reason: insertError.message,
      };
    }
    return {
      applied: true,
      zone: zoneName,
      timesVisited,
      familiarityLevel: familiarity,
      changedFields: ['created', 'times_visited', 'familiarity_level', ...changed],
    };
  }

  const timesVisited = (existing.times_visited ?? 0) + 1;
  const familiarity = bumpFamiliarity(existing.familiarity_level ?? 0, timesVisited);

  const update: Record<string, Json | string | number> = {
    times_visited: timesVisited,
    last_visited_day: currentDay,
    familiarity_level: familiarity,
  };
  changed.push('times_visited', 'last_visited_day');
  if (familiarity !== (existing.familiarity_level ?? 0)) changed.push('familiarity_level');

  if (sceneResidue) {
    update.scene_residue = nextResidue as unknown as Json;
  }
  if (notableFeatures?.length) {
    update.notable_features = nextFeatures as unknown as Json;
  }
  if (locationMood && locationMood !== existing.location_mood) {
    update.location_mood = locationMood;
    changed.push('location_mood');
  }

  const { error: updateError } = await supabase
    .from('campaign_location_state')
    .update(update)
    .eq('id', existing.id);

  if (updateError) {
    return {
      applied: false,
      zone: zoneName,
      timesVisited,
      familiarityLevel: familiarity,
      changedFields: [],
      reason: updateError.message,
    };
  }

  return {
    applied: true,
    zone: zoneName,
    timesVisited,
    familiarityLevel: familiarity,
    changedFields: changed,
  };
}

/**
 * Update territorial ownership of a zone.
 * Use sparingly — this is a "promoted" change that should reflect a
 * meaningful shift in control, not flavor.
 */
export async function setZoneOwnership(
  input: LocationOwnershipInput,
): Promise<{ applied: boolean; reason?: string }> {
  const { campaignId, zoneName, controlledBy, controlType, controlDescription } = input;

  const { data: existing } = await supabase
    .from('campaign_location_state')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('zone_name', zoneName)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from('campaign_location_state').insert({
      campaign_id: campaignId,
      zone_name: zoneName,
      controlled_by: controlledBy,
      control_type: controlType ?? (controlledBy ? 'occupied' : 'unclaimed'),
      control_description: controlDescription ?? null,
    });
    return { applied: !error, reason: error?.message };
  }

  const update: Record<string, string | null> = {
    controlled_by: controlledBy,
  };
  if (controlType) update.control_type = controlType;
  if (controlDescription !== undefined) update.control_description = controlDescription;

  const { error } = await supabase
    .from('campaign_location_state')
    .update(update)
    .eq('id', existing.id);

  return { applied: !error, reason: error?.message };
}

/**
 * Append a single environmental friction descriptor to a zone.
 * Bounded to the 6 most recent.
 */
export async function addEnvironmentalFriction(
  campaignId: string,
  zoneName: string,
  friction: string,
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('campaign_location_state')
    .select('id, environmental_friction')
    .eq('campaign_id', campaignId)
    .eq('zone_name', zoneName)
    .maybeSingle();

  if (!existing) return false;

  const base = asArray<string>(existing.environmental_friction);
  if (base.includes(friction)) return true;
  const next = [...base, friction].slice(-6);

  const { error } = await supabase
    .from('campaign_location_state')
    .update({ environmental_friction: next as unknown as Json })
    .eq('id', existing.id);

  return !error;
}
