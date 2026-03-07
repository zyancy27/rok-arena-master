/**
 * Arena Scene Builder
 *
 * High-level composer that converts battle location metadata
 * into a full ProceduralScene ready for the 3D renderer.
 */

import { getMergedBiome } from './arena-structure-presets';
import { generateProceduralScene, type ProceduralScene } from './procedural-structures';
import type { BattlefieldZone } from '@/lib/tactical-zones';
import type { ArenaState } from '@/lib/living-arena';

export interface ArenaSceneInput {
  /** The generated arena location name (e.g. "Infested Holy Forest") */
  locationName?: string | null;
  /** Terrain / environment tags from ScenarioBrain or theme engine */
  terrainTags?: string[];
  /** Active zones */
  zones: BattlefieldZone[];
  /** Living Arena state */
  arenaState?: ArenaState;
}

/**
 * Build a complete procedural 3D scene from arena metadata.
 * This is the main entry point for the 3D map's structure layer.
 */
export function buildArenaScene(input: ArenaSceneInput): ProceduralScene {
  const tags = input.terrainTags ?? [];

  // Infer extra tags from location name for better biome matching
  const inferredTags = inferTagsFromName(input.locationName);
  const allTags = [...tags, ...inferredTags];

  // Resolve biome preset (merges multiple matched biomes)
  const biome = getMergedBiome(allTags, input.locationName);

  // Generate the procedural scene
  return generateProceduralScene(
    biome,
    input.zones,
    input.arenaState,
    input.locationName ?? allTags.join('-'),
  );
}

// ── Tag Inference ───────────────────────────────────────────────

const INFERENCE_KEYWORDS: Record<string, string[]> = {
  forest: ['forest', 'woods', 'grove', 'jungle', 'treeline', 'canopy', 'wilderness', 'wild'],
  ruins: ['ruins', 'ancient', 'crumbl', 'collapsed', 'temple', 'derelict', 'abandoned', 'dungeon', 'crypt', 'tomb'],
  industrial: ['factory', 'warehouse', 'plant', 'industrial', 'assembly', 'smelting', 'dam', 'turbine', 'generator', 'pump', 'crane', 'refinery', 'foundry', 'mill'],
  bridge: ['bridge', 'suspension', 'overpass', 'viaduct', 'crossing'],
  urban: ['city', 'rooftop', 'street', 'alley', 'downtown', 'district', 'mall', 'plaza', 'market', 'station', 'terminal', 'high-rise', 'highrise', 'tower', 'skyscraper', 'apartment', 'office', 'village', 'town', 'settlement'],
  cave: ['cave', 'cavern', 'canyon', 'gorge', 'tunnel', 'mine', 'underground', 'sewer', 'catacombs'],
  volcanic: ['volcanic', 'lava', 'magma', 'caldera', 'volcano', 'basalt', 'molten'],
  holy: ['holy', 'sacred', 'shrine', 'temple', 'cathedral', 'blessed', 'divine', 'chapel', 'monastery'],
  underwater: ['underwater', 'ocean', 'deep sea', 'aquatic', 'abyss', 'coral', 'submerged'],
  airship: ['airship', 'vessel', 'ship', 'deck', 'zeppelin', 'frigate', 'carrier', 'aircraft'],
  infested: ['infested', 'corrupt', 'plague', 'hive', 'parasite', 'tainted', 'blight', 'swarm'],
  facility: ['facility', 'lab', 'laboratory', 'research', 'complex', 'bunker', 'base', 'compound'],
  reactor: ['reactor', 'nuclear', 'meltdown', 'power station', 'cooling', 'containment'],
};

function inferTagsFromName(name?: string | null): string[] {
  if (!name) return [];
  const lower = name.toLowerCase();
  const inferred: string[] = [];

  for (const [tag, keywords] of Object.entries(INFERENCE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      inferred.push(tag);
    }
  }

  return inferred;
}
