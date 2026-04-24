/**
 * Emergency Blueprint Selector
 *
 * Picks a blueprint from the catalog using tier, rarity, planet hints, and
 * dedup history, then layers modular twists (civilian density, time-pressure
 * mechanic, dynamic factor) onto it so two picks from the same blueprint
 * still feel distinct.
 *
 * Pure / dependency-free so it loads in both Deno (edge fn) and the browser.
 */

import {
  EMERGENCY_BLUEPRINTS,
  type EmergencyBlueprint,
  type RarityTier,
} from './emergencyBlueprints.ts';

export interface BlueprintSelectionInput {
  averageTier?: number;          // 1-5
  battleIntensity?: number;      // 0-1
  planetName?: string | null;
  planetDescription?: string | null;
  /** Blueprint ids already used this session — never repeat */
  recentBlueprintIds?: string[];
  /** Categories used recently — discouraged but not forbidden */
  recentCategories?: string[];
  rarityOverride?: RarityTier;
  rng?: () => number;
}

export interface BlueprintTwist {
  civilianDensity: string;
  timePressure: string;
  movementConstraint: string;
  dynamicFactor: string;
  collateralHook: string;
  mood: string;
}

export interface SelectedBlueprint {
  blueprint: EmergencyBlueprint;
  twist: BlueprintTwist;
  rarity: RarityTier;
}

const MOODS = [
  'eerie countdown silence', 'screaming chaos', 'methodical collapse',
  'numbed shock', 'frantic improvisation', 'unnatural calm before impact',
  'sirens layered with civilian shouting', 'dust-muffled stillness',
];

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)] as T;
}

function rollRarity(rng: () => number): RarityTier {
  const r = rng();
  if (r < 0.70) return 'grounded';
  if (r < 0.90) return 'advanced';
  if (r < 0.98) return 'extreme';
  return 'mythic';
}

export function selectEmergencyBlueprint(input: BlueprintSelectionInput): SelectedBlueprint {
  const rng = input.rng ?? Math.random;
  const tier = Math.max(1, Math.min(5, Math.round(input.averageTier ?? 3)));
  const rarity = input.rarityOverride ?? rollRarity(rng);
  const recentIds = new Set(input.recentBlueprintIds ?? []);
  const recentCats = new Set(input.recentCategories ?? []);

  // Filter pool: rarity + tier band + not recently used
  let pool = EMERGENCY_BLUEPRINTS.filter(
    (b) => b.rarity === rarity && tier >= b.minTier && tier <= b.maxTier && !recentIds.has(b.id),
  );

  // Fallback ladders if too restrictive
  if (pool.length === 0) {
    pool = EMERGENCY_BLUEPRINTS.filter(
      (b) => b.rarity === rarity && tier >= b.minTier && tier <= b.maxTier,
    );
  }
  if (pool.length === 0) {
    pool = EMERGENCY_BLUEPRINTS.filter((b) => b.rarity === rarity);
  }
  if (pool.length === 0) pool = EMERGENCY_BLUEPRINTS;

  // Soft penalty: prefer un-used categories when possible
  const fresh = pool.filter((b) => !recentCats.has(b.category));
  const finalPool = fresh.length >= 3 ? fresh : pool;
  const blueprint = pick(finalPool, rng);

  // Build a twist by sampling from the blueprint's modular fields
  const twist: BlueprintTwist = {
    civilianDensity: pick(
      blueprint.collateral.length > 0
        ? blueprint.collateral
        : ['no civilians present — pure tactical scenario'],
      rng,
    ),
    timePressure: pick(blueprint.timePressure, rng),
    movementConstraint: pick(blueprint.movementConstraints, rng),
    dynamicFactor: pick(blueprint.dynamicFactors, rng),
    collateralHook: pick(
      blueprint.collateral.length > 0
        ? blueprint.collateral
        : ['environmental collateral only — infrastructure at risk'],
      rng,
    ),
    mood: pick(MOODS, rng),
  };

  return { blueprint, twist, rarity };
}

/** Render the blueprint + twist into a creative-direction prompt fragment. */
export function renderBlueprintBrief(selection: SelectedBlueprint): string {
  const { blueprint, twist } = selection;
  return `BASE BLUEPRINT — you MUST build the emergency around this seed (do not invent a different category):
• Title seed: "${blueprint.title}"
• Concept: ${blueprint.concept}
• Category: ${blueprint.category}
• Scope: ${blueprint.scope} | Intensity: ${blueprint.intensity}
• Inherent tags: ${blueprint.tags.join(', ')}

LAYERED TWISTS — weave these specific elements into the scene:
• Civilian / collateral hook: ${twist.civilianDensity}
• Time-pressure mechanic: ${twist.timePressure}
• Movement constraint: ${twist.movementConstraint}
• Dynamic escalation factor: ${twist.dynamicFactor}
• Mood: ${twist.mood}

You may rename the location to something more vivid and specific, but the underlying disaster type, scope, and tags MUST match the blueprint above. This guarantees variety across generations — the catalog has 100+ distinct base disasters and you have been handed THIS one.`;
}
