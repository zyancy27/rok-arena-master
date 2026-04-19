/**
 * WorldPulse — Part 10 of the ROK Narrator Brain
 * ─────────────────────────────────────────────────────────────────────
 * Subtle between-turn world evolution. The world is allowed to breathe
 * without injecting random drama or stealing player agency.
 *
 * The pulse runs AFTER a narrator response is committed and produces a
 * bounded set of deltas to merge back into campaign_brain.
 *
 * It is NOT a separate AI. It is a deterministic state aging layer
 * driven by what's already in the brain.
 *
 * Bounded behaviors:
 *   • Hook cooling — active hooks lose a small amount of urgency each tick.
 *   • Hook expiration — fully-cold hooks are marked surfaced/dormant.
 *   • Pressure aging — sustained "high" pressure relaxes if nothing reinforced it.
 *   • Region mood drift — moods bias slowly toward neutral.
 *   • Social heat decay — heat shifts back toward baseline over time.
 *   • Opportunity reshape — opportunities past their window get demoted.
 *
 * Off-screen NPC/faction motion is intentionally NOT done here yet —
 * Phase 4 spec marks those as optional and they require richer data.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface WorldPulseDeltas {
  storyHookChanges: Array<{ id: string; oldHeat?: number; newHeat: number; status?: string }>;
  opportunityChanges: Array<{ id: string; status: string }>;
  pressureChange: { from: string | null; to: string | null } | null;
  regionMoodDrifts: Array<{ region: string; from: string; to: string }>;
  socialHeatShifts: Array<{ scope: string; from: number; to: number }>;
  reasons: string[];
}

export interface WorldPulseResult {
  applied: boolean;
  deltas: WorldPulseDeltas;
  /** Compact human-readable summary for tester debug. */
  summary: string;
}

const HOOK_COOLDOWN_PER_TICK = 8;       // 0-100 scale
const HOOK_EXPIRY_THRESHOLD = 5;
const HEAT_DECAY_PER_TICK = 6;
const HEAT_BASELINE = 0;

function asArray<T = Record<string, unknown>>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

// ─── Pure transforms ─────────────────────────────────────────────────

export function ageHooks(hooks: Array<Record<string, unknown>>) {
  const changes: WorldPulseDeltas['storyHookChanges'] = [];
  const next = hooks.map((h) => {
    const id = String(h.id ?? '');
    const status = String(h.status ?? 'active');
    if (status !== 'active') return h;
    const heat = typeof h.heat === 'number' ? (h.heat as number) : 50;
    const newHeat = Math.max(0, heat - HOOK_COOLDOWN_PER_TICK);
    if (newHeat <= HOOK_EXPIRY_THRESHOLD) {
      changes.push({ id, oldHeat: heat, newHeat, status: 'dormant' });
      return { ...h, heat: newHeat, status: 'dormant' };
    }
    if (newHeat !== heat) {
      changes.push({ id, oldHeat: heat, newHeat });
    }
    return { ...h, heat: newHeat };
  });
  return { next, changes };
}

export function reshapeOpportunities(
  opps: Array<Record<string, unknown>>,
  currentDay: number,
) {
  const changes: WorldPulseDeltas['opportunityChanges'] = [];
  const next = opps.map((o) => {
    const id = String(o.id ?? '');
    const status = String(o.status ?? 'active');
    if (status !== 'active') return o;
    const expiresOnDay = typeof o.expires_on_day === 'number' ? (o.expires_on_day as number) : null;
    if (expiresOnDay !== null && currentDay > expiresOnDay) {
      changes.push({ id, status: 'expired' });
      return { ...o, status: 'expired' };
    }
    return o;
  });
  return { next, changes };
}

export function agePressure(current: string | null): { next: string | null; changed: boolean } {
  // Relax sustained crisis/high pressure by one tier per tick if not refreshed.
  const ladder = ['low_pressure', 'building', 'elevated', 'high', 'crisis'];
  if (!current) return { next: null, changed: false };
  const idx = ladder.indexOf(current);
  if (idx <= 0) return { next: current, changed: false };
  return { next: ladder[idx - 1], changed: true };
}

export function driftRegionMoods(regionMoods: Record<string, unknown>) {
  const drifts: WorldPulseDeltas['regionMoodDrifts'] = [];
  const next: Record<string, unknown> = { ...regionMoods };
  for (const [region, mood] of Object.entries(regionMoods)) {
    const current = typeof mood === 'string' ? mood : String((mood as any)?.mood ?? 'neutral');
    if (current === 'neutral') continue;
    // Bias one step toward neutral
    const towardNeutralMap: Record<string, string> = {
      tense: 'wary',
      wary: 'neutral',
      uneasy: 'neutral',
      hopeful: 'neutral',
      somber: 'neutral',
      celebratory: 'hopeful',
      hostile: 'tense',
    };
    const drifted = towardNeutralMap[current] ?? 'neutral';
    if (drifted !== current) {
      drifts.push({ region, from: current, to: drifted });
      next[region] = drifted;
    }
  }
  return { next, drifts };
}

export function decaySocialHeat(heat: Record<string, unknown>) {
  const shifts: WorldPulseDeltas['socialHeatShifts'] = [];
  const next: Record<string, unknown> = {};
  for (const [scope, value] of Object.entries(heat)) {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric)) {
      next[scope] = value;
      continue;
    }
    let drifted = numeric;
    if (numeric > HEAT_BASELINE) drifted = Math.max(HEAT_BASELINE, numeric - HEAT_DECAY_PER_TICK);
    else if (numeric < HEAT_BASELINE) drifted = Math.min(HEAT_BASELINE, numeric + HEAT_DECAY_PER_TICK);
    if (drifted !== numeric) {
      shifts.push({ scope, from: numeric, to: drifted });
    }
    next[scope] = drifted;
  }
  return { next, shifts };
}

// ─── Top-level runner ────────────────────────────────────────────────

/**
 * Run one world-pulse tick against campaign_brain.
 * Fire-and-forget safe: any failure short-circuits and reports applied:false.
 */
export async function runWorldPulse(campaignId: string): Promise<WorldPulseResult> {
  const empty: WorldPulseDeltas = {
    storyHookChanges: [],
    opportunityChanges: [],
    pressureChange: null,
    regionMoodDrifts: [],
    socialHeatShifts: [],
    reasons: [],
  };

  const { data: brain, error } = await supabase
    .from('campaign_brain')
    .select('story_hooks, gated_opportunities, current_pressure, region_moods, regional_social_heat, current_day')
    .eq('campaign_id', campaignId)
    .maybeSingle();

  if (error || !brain) {
    return { applied: false, deltas: empty, summary: '[world-pulse] brain unavailable' };
  }

  const hooks = asArray(brain.story_hooks);
  const opps = asArray(brain.gated_opportunities);
  const moods = asObject(brain.region_moods);
  const heat = asObject(brain.regional_social_heat);
  const currentDay = typeof brain.current_day === 'number' ? brain.current_day : 1;

  const hookPass = ageHooks(hooks);
  const oppPass = reshapeOpportunities(opps, currentDay);
  const pressurePass = agePressure(brain.current_pressure as string | null);
  const moodPass = driftRegionMoods(moods);
  const heatPass = decaySocialHeat(heat);

  const deltas: WorldPulseDeltas = {
    storyHookChanges: hookPass.changes,
    opportunityChanges: oppPass.changes,
    pressureChange: pressurePass.changed
      ? { from: brain.current_pressure as string | null, to: pressurePass.next }
      : null,
    regionMoodDrifts: moodPass.drifts,
    socialHeatShifts: heatPass.shifts,
    reasons: [],
  };

  const anyChange =
    hookPass.changes.length > 0 ||
    oppPass.changes.length > 0 ||
    pressurePass.changed ||
    moodPass.drifts.length > 0 ||
    heatPass.shifts.length > 0;

  if (!anyChange) {
    return { applied: false, deltas, summary: '[world-pulse] no changes' };
  }

  // Build reasons (bounded)
  if (hookPass.changes.length) deltas.reasons.push(`hooks×${hookPass.changes.length}`);
  if (oppPass.changes.length) deltas.reasons.push(`opps×${oppPass.changes.length}`);
  if (pressurePass.changed) deltas.reasons.push(`pressure↓`);
  if (moodPass.drifts.length) deltas.reasons.push(`mood×${moodPass.drifts.length}`);
  if (heatPass.shifts.length) deltas.reasons.push(`heat×${heatPass.shifts.length}`);

  const update: Record<string, Json> = {
    story_hooks: hookPass.next as unknown as Json,
    gated_opportunities: oppPass.next as unknown as Json,
    region_moods: moodPass.next as unknown as Json,
    regional_social_heat: heatPass.next as unknown as Json,
  };
  if (pressurePass.changed) {
    update.current_pressure = pressurePass.next as unknown as Json;
  }

  const { error: writeError } = await supabase
    .from('campaign_brain')
    .update(update)
    .eq('campaign_id', campaignId);

  if (writeError) {
    return {
      applied: false,
      deltas,
      summary: `[world-pulse] write failed: ${writeError.message}`,
    };
  }

  return {
    applied: true,
    deltas,
    summary: `[world-pulse] ${deltas.reasons.join(' · ') || 'subtle'}`,
  };
}
