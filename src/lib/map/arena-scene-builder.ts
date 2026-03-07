/**
 * Arena Scene Builder
 *
 * High-level composer that converts battle location metadata
 * into a full ProceduralScene ready for the 3D renderer.
 * 
 * Now powered by BiomeComposer for richer, biome-driven generation.
 */

import { composeBiomeScene } from '@/engine/biomeComposer';
import type { BiomeComposerInput } from '@/engine/biomeComposer';
import { biomeSceneToProceduralScene } from './biome-scene-bridge';
import { getMergedBiome } from './arena-structure-presets';
import { generateProceduralScene, type ProceduralScene } from './procedural-structures';
import type { BattlefieldZone } from '@/lib/tactical-zones';
import type { ArenaState } from '@/lib/living-arena';
import { hashString } from '@/engine/biomeComposer/utils';

export interface ArenaSceneInput {
  /** The generated arena location name (e.g. "Infested Holy Forest") */
  locationName?: string | null;
  /** Terrain / environment tags from ScenarioBrain or theme engine */
  terrainTags?: string[];
  /** Active zones */
  zones: BattlefieldZone[];
  /** Living Arena state */
  arenaState?: ArenaState;
  /** Narrator scene description */
  narratorDescription?: string | null;
  /** Game mode */
  mode?: 'battle' | 'campaign';
  /** Active hazard names */
  activeHazards?: string[];
  /** Performance tier */
  performanceTier?: 'low' | 'medium' | 'high';
}

/**
 * Build a complete procedural 3D scene from arena metadata.
 * Uses BiomeComposer for rich biome-driven generation.
 */
export function buildArenaScene(input: ArenaSceneInput): ProceduralScene {
  // Build BiomeComposer input
  const composerInput: BiomeComposerInput = {
    locationName: input.locationName,
    narratorDescription: input.narratorDescription,
    activeHazards: input.activeHazards,
    arenaStability: input.arenaState?.stability,
    arenaHazardLevel: input.arenaState?.hazardLevel,
    arenaConditionTags: input.arenaState?.conditionTags,
    mode: input.mode ?? 'battle',
    seed: input.locationName ?? input.terrainTags?.join('-') ?? 'default',
    performanceTier: input.performanceTier ?? 'high',
  };

  // Generate the biome scene plan
  const plan = composeBiomeScene(composerInput);

  // Convert to ProceduralScene for the renderer (with urban detection)
  const seed = hashString(composerInput.seed ?? 'default');
  const biomeScene = biomeSceneToProceduralScene(
    plan, seed, input.locationName, input.terrainTags, input.arenaState?.stability,
  );

  // Also generate legacy structures for zones that need them
  // (zone landmarks and zone-specific placements)
  if (input.zones.length > 0) {
    const tags = input.terrainTags ?? [];
    const inferredTags = inferTagsFromName(input.locationName);
    const allTags = [...tags, ...inferredTags];
    const biome = getMergedBiome(allTags, input.locationName);
    const legacyScene = generateProceduralScene(
      biome, input.zones, input.arenaState,
      input.locationName ?? allTags.join('-'),
    );

    // Merge: use BiomeComposer's ground/fog/atmosphere, add legacy zone structures
    return {
      structures: [...biomeScene.structures, ...legacyScene.structures],
      groundColor: biomeScene.groundColor,
      fogColor: biomeScene.fogColor,
      fogDensity: biomeScene.fogDensity,
      ambientColor: biomeScene.ambientColor,
      ambientIntensity: biomeScene.ambientIntensity,
      terrainBumps: [...biomeScene.terrainBumps, ...legacyScene.terrainBumps],
    };
  }

  return biomeScene;
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
