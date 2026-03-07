/**
 * Mutation Interpreter
 *
 * Parses narrator text, player actions, and Living Arena metrics
 * into structured TerrainMutation records.
 */

import type {
  MutationType,
  MutationCategory,
  MutationIntensity,
  MutationSource,
  MutationInput,
  TerrainMutation,
} from './mutation-types';

// ── Pattern Definitions ─────────────────────────────────────────

interface MutationPattern {
  pattern: RegExp;
  type: MutationType;
  category: MutationCategory;
  baseIntensity: MutationIntensity;
  baseMagnitude: number;
  description: string;
}

const MUTATION_PATTERNS: MutationPattern[] = [
  // ─── Terrain ──────────────────────
  { pattern: /\b(crack|fracture|split|fissure)s?\b/i, type: 'terrain_crack', category: 'terrain', baseIntensity: 'minor', baseMagnitude: 0.3, description: 'Cracks appear in the terrain' },
  { pattern: /\b(collaps|cave.?in|sink.?hole|gives?\s*way)/i, type: 'terrain_collapse', category: 'terrain', baseIntensity: 'severe', baseMagnitude: 0.7, description: 'Section of ground collapses' },
  { pattern: /\b(landslide|avalanche|rock.?fall|debris.?slide)\b/i, type: 'terrain_landslide', category: 'terrain', baseIntensity: 'severe', baseMagnitude: 0.7, description: 'Landslide reshapes the terrain' },
  { pattern: /\b(crater|impact.?zone|blast.?hole|gouge)\b/i, type: 'terrain_crater', category: 'terrain', baseIntensity: 'moderate', baseMagnitude: 0.5, description: 'A crater forms in the ground' },
  { pattern: /\b(freeze|frozen|ice.?over|frost.?spread|glacial)\b/i, type: 'terrain_frozen', category: 'terrain', baseIntensity: 'moderate', baseMagnitude: 0.4, description: 'Surface freezes over' },
  { pattern: /\b(ground\s*(break|shatter|rupture)|broken\s*ground|earth\s*(tear|rip))\b/i, type: 'terrain_broken_ground', category: 'terrain', baseIntensity: 'moderate', baseMagnitude: 0.5, description: 'The ground breaks apart' },

  // ─── Structure ────────────────────
  { pattern: /\b(bridge|panel|plank|board|floor)\s*.{0,15}(crack|break|snap|split|buckle)/i, type: 'structure_damage', category: 'structure', baseIntensity: 'moderate', baseMagnitude: 0.5, description: 'Structure takes damage' },
  { pattern: /\b(wall|pillar|column|support|beam)\s*.{0,15}(crack|break|snap|crumbl)/i, type: 'structure_damage', category: 'structure', baseIntensity: 'moderate', baseMagnitude: 0.5, description: 'Structural element cracks' },
  { pattern: /\b(railing|guardrail|fence|barrier)\s*.{0,15}(collaps|break|fall|give|snap)/i, type: 'structure_collapse', category: 'structure', baseIntensity: 'moderate', baseMagnitude: 0.5, description: 'Railing collapses' },
  { pattern: /\b(catwalk|walkway|platform)\s*.{0,15}(bend|buckle|warp|sag|tilt)/i, type: 'structure_buckle', category: 'structure', baseIntensity: 'moderate', baseMagnitude: 0.5, description: 'Walkway buckles' },
  { pattern: /\b(glass|window|pane)\s*.{0,15}(shatter|break|crack|explod|burst)/i, type: 'structure_shatter', category: 'structure', baseIntensity: 'moderate', baseMagnitude: 0.5, description: 'Glass shatters' },
  { pattern: /\b(machiner|generator|reactor|engine|console)\s*.{0,15}(explod|blow|overload|meltdown)/i, type: 'structure_explode', category: 'structure', baseIntensity: 'severe', baseMagnitude: 0.8, description: 'Machinery explodes' },
  { pattern: /\b(door|gate|hatch)\s*.{0,15}(blow|break|slam|jam|open|burst)/i, type: 'structure_open', category: 'structure', baseIntensity: 'minor', baseMagnitude: 0.3, description: 'Doorway opens or breaks' },
  { pattern: /\b(support|cable|strut)\s*.{0,15}(snap|tear|break|sever)/i, type: 'structure_collapse', category: 'structure', baseIntensity: 'severe', baseMagnitude: 0.7, description: 'Support snaps' },
  { pattern: /\b(floor|ground)\s*.{0,15}buckle/i, type: 'structure_buckle', category: 'structure', baseIntensity: 'moderate', baseMagnitude: 0.5, description: 'Floor buckles under pressure' },

  // ─── Surface / spread ─────────────
  { pattern: /\b(fire|flame|burn|blaze|ignit|incinerat|scorch|ember)\b/i, type: 'surface_burn', category: 'hazard', baseIntensity: 'moderate', baseMagnitude: 0.5, description: 'Fire spreads across the surface' },
  { pattern: /\b(corrupt|taint|infest|spread.{0,10}dark|blight|decay)\b/i, type: 'surface_corruption', category: 'hazard', baseIntensity: 'moderate', baseMagnitude: 0.4, description: 'Corruption grows' },
  { pattern: /\b(mud|sludge|mire)\s*.{0,10}(spread|expand|seep|ooze)/i, type: 'surface_mud_spread', category: 'terrain', baseIntensity: 'minor', baseMagnitude: 0.3, description: 'Mud spreads' },

  // ─── Fluid ────────────────────────
  { pattern: /\b(flood|water\s*ris|water\s*pour|water\s*rush|rising\s*water|submer|drown)\b/i, type: 'flood_rise', category: 'hazard', baseIntensity: 'moderate', baseMagnitude: 0.5, description: 'Water level rises' },
  { pattern: /\b(gas|fume|toxic\s*cloud|poison\s*mist|spore|noxious)\s*.{0,10}(spread|expand|fill|thicken|seep)/i, type: 'gas_spread', category: 'hazard', baseIntensity: 'moderate', baseMagnitude: 0.5, description: 'Toxic gas spreads' },

  // ─── Visibility ───────────────────
  { pattern: /\b(fog|smoke|mist|haze|dust)\s*.{0,12}(thicken|spread|roll|billow|fill|dense)/i, type: 'visibility_drop', category: 'atmosphere', baseIntensity: 'minor', baseMagnitude: 0.3, description: 'Visibility drops' },
  { pattern: /\b(smoke|fog|mist)\s*.{0,10}(clear|dissipat|thin|lift|fade)/i, type: 'visibility_improve', category: 'atmosphere', baseIntensity: 'minor', baseMagnitude: 0.3, description: 'Visibility improves' },

  // ─── Electrical ───────────────────
  { pattern: /\b(electric|spark|arc|shock|surge|lightning|current)\b/i, type: 'electrical_surge', category: 'hazard', baseIntensity: 'moderate', baseMagnitude: 0.5, description: 'Electrical surge' },

  // ─── Debris ───────────────────────
  { pattern: /\b(debris|rubble|wreckage|shrapnel)\s*.{0,10}(fall|rain|scatter|shower|spray)/i, type: 'debris_spawn', category: 'terrain', baseIntensity: 'minor', baseMagnitude: 0.3, description: 'Debris falls' },

  // ─── Pathing ──────────────────────
  { pattern: /\b(block|seal|obstruct|barricad)\s*.{0,12}(path|route|way|passage|exit|entrance)/i, type: 'path_blocked', category: 'terrain', baseIntensity: 'moderate', baseMagnitude: 0.4, description: 'Path becomes blocked' },
  { pattern: /\b(open|clear|reveal|break\s*through)\s*.{0,12}(path|route|way|passage|wall)\b/i, type: 'path_opened', category: 'terrain', baseIntensity: 'moderate', baseMagnitude: 0.4, description: 'New path opens' },

  // ─── Elevation ────────────────────
  { pattern: /\b(ground\s*ris|floor\s*ris|uplift|elevat|sink|lower)\b/i, type: 'elevation_shift', category: 'terrain', baseIntensity: 'moderate', baseMagnitude: 0.5, description: 'Elevation changes' },
];

// ── Intensity Escalation ────────────────────────────────────────

const INTENSITY_BOOSTERS: { pattern: RegExp; boost: number }[] = [
  { pattern: /\b(massive|enormous|catastroph|devastat|colossal)\b/i, boost: 2 },
  { pattern: /\b(violent|extreme|severe|terrible|immense)\b/i, boost: 1 },
  { pattern: /\b(slight|minor|small|hairline|faint)\b/i, boost: -1 },
];

const INTENSITY_ORDER: MutationIntensity[] = ['minor', 'moderate', 'severe', 'catastrophic'];

function escalateIntensity(base: MutationIntensity, text: string): { intensity: MutationIntensity; magnitudeBoost: number } {
  let idx = INTENSITY_ORDER.indexOf(base);
  let magnitudeBoost = 0;
  for (const b of INTENSITY_BOOSTERS) {
    if (b.pattern.test(text)) {
      idx = Math.max(0, Math.min(INTENSITY_ORDER.length - 1, idx + b.boost));
      magnitudeBoost += b.boost * 0.15;
    }
  }
  return { intensity: INTENSITY_ORDER[idx], magnitudeBoost };
}

// ── Zone Targeting ──────────────────────────────────────────────

function findTargetZones(text: string, zoneIds: string[], zoneLabels: string[]): string[] {
  const lower = text.toLowerCase();
  const matched: string[] = [];
  for (let i = 0; i < zoneLabels.length; i++) {
    const label = zoneLabels[i].toLowerCase();
    // Match if any 2+ word segment of the label appears in text
    const words = label.split(/\s+/);
    const matchWord = words.some(w => w.length >= 4 && lower.includes(w));
    if (matchWord) matched.push(zoneIds[i]);
  }
  // If no specific zone found, target first zone (fallback to center)
  if (matched.length === 0 && zoneIds.length > 0) {
    const centerIdx = zoneIds.findIndex(id => id.includes('center'));
    matched.push(zoneIds[centerIdx >= 0 ? centerIdx : 0]);
  }
  return matched;
}

// ── Living Arena Threshold Mutations ────────────────────────────

function getArenaThresholdMutations(input: MutationInput): TerrainMutation[] {
  const mutations: TerrainMutation[] = [];
  const now = Date.now();

  if (input.arenaStability < 20) {
    mutations.push({
      id: `arena-critical-${now}`,
      type: 'terrain_collapse',
      category: 'terrain',
      intensity: 'severe',
      source: 'living_arena',
      targetZoneIds: input.zoneIds.slice(0, 2),
      description: 'Arena stability critical — structural collapse imminent',
      magnitude: 0.8,
      turnNumber: input.turnNumber,
      timestamp: now,
      applied: false,
    });
  } else if (input.arenaStability < 40) {
    mutations.push({
      id: `arena-unstable-${now}`,
      type: 'terrain_crack',
      category: 'terrain',
      intensity: 'moderate',
      source: 'living_arena',
      targetZoneIds: input.zoneIds.slice(0, 1),
      description: 'Arena instability causes new fractures',
      magnitude: 0.5,
      turnNumber: input.turnNumber,
      timestamp: now,
      applied: false,
    });
  }

  if (input.arenaHazardLevel > 70) {
    mutations.push({
      id: `hazard-escalate-${now}`,
      type: 'gas_spread',
      category: 'hazard',
      intensity: 'moderate',
      source: 'hazard_progression',
      targetZoneIds: input.zoneIds.slice(0, 3),
      description: 'Rising hazard levels cause toxic spread',
      magnitude: 0.5,
      turnNumber: input.turnNumber,
      timestamp: now,
      applied: false,
    });
  }

  return mutations;
}

// ── Main Interpreter ────────────────────────────────────────────

let _mutationCounter = 0;

export function interpretMutations(input: MutationInput): TerrainMutation[] {
  const mutations: TerrainMutation[] = [];
  const cleaned = input.text.replace(/\*/g, '');
  const now = Date.now();

  for (const pat of MUTATION_PATTERNS) {
    if (!pat.pattern.test(cleaned)) continue;

    const { intensity, magnitudeBoost } = escalateIntensity(pat.baseIntensity, cleaned);
    const magnitude = Math.min(1, Math.max(0, pat.baseMagnitude + magnitudeBoost));
    const targetZoneIds = findTargetZones(cleaned, input.zoneIds, input.zoneLabels);

    mutations.push({
      id: `mut-${++_mutationCounter}-${now}`,
      type: pat.type,
      category: pat.category,
      intensity,
      source: input.source,
      targetZoneIds,
      description: pat.description,
      magnitude,
      turnNumber: input.turnNumber,
      timestamp: now,
      applied: false,
    });
  }

  // Add Living Arena threshold mutations
  if (input.source !== 'living_arena') {
    mutations.push(...getArenaThresholdMutations(input));
  }

  return mutations;
}
