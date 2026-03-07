/**
 * Mutation Apply
 *
 * High-level function that combines interpretation, zone effects,
 * scene instructions, and memory into a single MutationResult.
 */

import type {
  MutationInput,
  MutationResult,
  TerrainMutation,
} from './mutation-types';
import { interpretMutations } from './mutation-interpreter';
import { computeZoneEffects } from './mutation-zone-updates';
import { computeSceneInstructions } from './mutation-scene-updates';

// ── Cinematic Threshold ─────────────────────────────────────────

const CINEMATIC_TYPES = new Set([
  'terrain_collapse',
  'terrain_landslide',
  'structure_collapse',
  'structure_explode',
  'flood_rise',
]);

function shouldTriggerCinematic(mutations: TerrainMutation[]): boolean {
  return mutations.some(
    m => CINEMATIC_TYPES.has(m.type) && (m.intensity === 'severe' || m.intensity === 'catastrophic')
  );
}

// ── Narrator Marker ─────────────────────────────────────────────

function pickNarratorMarker(mutations: TerrainMutation[]) {
  // Pick the most dramatic mutation for a marker
  const dramatic = mutations
    .filter(m => m.intensity === 'severe' || m.intensity === 'catastrophic')
    .sort((a, b) => b.magnitude - a.magnitude)[0];

  if (!dramatic) return undefined;

  return {
    label: dramatic.description,
    zoneId: dramatic.targetZoneIds[0],
    urgency: dramatic.intensity === 'catastrophic' ? 'high' as const : 'medium' as const,
  };
}

// ── Main Apply Pipeline ─────────────────────────────────────────

export function applyMutationPipeline(input: MutationInput): MutationResult {
  // Step 1: Interpret text into mutations
  const mutations = interpretMutations(input);

  if (mutations.length === 0) {
    return { mutations: [], zoneEffects: [], sceneInstructions: [], cinematic: false };
  }

  // Step 2: Compute zone effects
  const zoneEffects = computeZoneEffects(mutations);

  // Step 3: Compute scene instructions
  const sceneInstructions = computeSceneInstructions(mutations);

  // Step 4: Determine cinematic trigger
  const cinematic = shouldTriggerCinematic(mutations);

  // Step 5: Pick narrator marker
  const narratorMarker = pickNarratorMarker(mutations);

  return {
    mutations,
    zoneEffects,
    sceneInstructions,
    narratorMarker,
    cinematic,
  };
}
