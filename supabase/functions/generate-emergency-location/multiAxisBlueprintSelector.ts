/**
 * Multi-Axis Emergency Blueprint Selector
 *
 * Improves on the basic selector by:
 *   1. Merging the legacy catalog (`EMERGENCY_BLUEPRINTS`) with the extended
 *      grounded/human catalog (`EXTENDED_EMERGENCY_BLUEPRINTS`).
 *   2. Filtering on a *family* axis (in addition to rarity + tier) so generation
 *      can deliberately rotate between criminal / political / transport / etc.
 *   3. Biasing strongly toward `grounded` groundedness (configurable) so cosmic
 *      / sci-fi outputs are the exception, not the default.
 *   4. Sampling N candidates and scoring each via `distinctnessAgainstRecent`
 *      to reject "same-but-slightly-different" picks.
 *   5. Tracking recent picks as structured `RecentEntry` records (family,
 *      imagery, tags, scope) for the similarity check.
 *
 * Falls back gracefully through rarity → tier → family bands if the pool is
 * empty. Pure / dependency-free — Deno + browser compatible.
 */

import {
  EMERGENCY_BLUEPRINTS,
  type EmergencyBlueprint,
  type RarityTier,
} from './emergencyBlueprints.ts';
import { EXTENDED_EMERGENCY_BLUEPRINTS } from './emergencyBlueprintsExtended.ts';
import {
  inferFamily,
  inferGroundedness,
  inferObjectives,
  inferEnemyPressure,
  inferEscalation,
  inferCombatFrame,
  inferImagery,
  type DangerFamily,
  type Groundedness,
  type DangerTaxonomyFields,
  type ObjectiveType,
  type EnemyPressureType,
  type EscalationPathTag,
  type CombatFrameTag,
} from './dangerTaxonomy.ts';
import {
  distinctnessAgainstRecent,
  toRecentEntry,
  type Candidate,
  type RecentEntry,
} from './blueprintSimilarity.ts';

/** Unified pool: legacy + extended, all typed as Candidate. */
export const ALL_BLUEPRINTS: Candidate[] = [
  ...(EMERGENCY_BLUEPRINTS as Candidate[]),
  ...EXTENDED_EMERGENCY_BLUEPRINTS,
];

// ── Groundedness distribution ──────────────────────────────────────────────
// Strong bias toward grounded human-scale disasters. Sci-fi/cosmic stay rare.
const DEFAULT_GROUNDEDNESS_WEIGHTS: Record<Groundedness, number> = {
  grounded: 0.78,
  speculative: 0.17,
  exotic: 0.05,
};

function rollGroundedness(
  rng: () => number,
  weights = DEFAULT_GROUNDEDNESS_WEIGHTS,
): Groundedness {
  const r = rng();
  if (r < weights.grounded) return 'grounded';
  if (r < weights.grounded + weights.speculative) return 'speculative';
  return 'exotic';
}

function rollRarity(rng: () => number): RarityTier {
  const r = rng();
  if (r < 0.70) return 'grounded';
  if (r < 0.90) return 'advanced';
  if (r < 0.98) return 'extreme';
  return 'mythic';
}

// ── Twist sampling (richer than the basic selector) ────────────────────────
const MOODS = [
  'eerie countdown silence', 'screaming chaos', 'methodical collapse',
  'numbed shock', 'frantic improvisation', 'unnatural calm before impact',
  'sirens layered with civilian shouting', 'dust-muffled stillness',
  'gallows humour from exhausted responders', 'whispered prayers in the dark',
  'professional grim focus', 'children crying somewhere unseen',
];

export interface MultiAxisInput {
  averageTier?: number;
  battleIntensity?: number;
  planetName?: string | null;
  planetDescription?: string | null;
  /** Structured recent picks — preferred over loose id list */
  recentEntries?: RecentEntry[];
  /** Backward-compat: ids only (will be filtered out from pool) */
  recentBlueprintIds?: string[];
  /** Optional explicit overrides */
  rarityOverride?: RarityTier;
  groundednessOverride?: Groundedness;
  /** Force a family (used by EvE rotation logic) */
  familyOverride?: DangerFamily;
  /** Forbid these families (e.g. just used last turn) */
  excludeFamilies?: DangerFamily[];
  /** Tune groundedness mix (PvP often wants higher grounded) */
  groundednessWeights?: Partial<Record<Groundedness, number>>;
  /** How many candidates to sample for distinctness scoring (default 6) */
  candidateSampleSize?: number;
  /** Min distinctness score to accept (0-1, default 0.55) */
  minDistinctness?: number;
  rng?: () => number;
}

export interface MultiAxisSelection {
  blueprint: Candidate;
  rarity: RarityTier;
  groundedness: Groundedness;
  family: DangerFamily;
  objectives: ObjectiveType[];
  enemyPressure: EnemyPressureType[];
  escalation: EscalationPathTag[];
  combatFrame: CombatFrameTag[];
  imagery: string[];
  twist: {
    civilianHook: string;
    timePressure: string;
    movementConstraint: string;
    dynamicFactor: string;
    mood: string;
    primaryObjective: ObjectiveType;
    enemyType: EnemyPressureType;
  };
  /** Avg distinctness vs recent window (0-1) */
  distinctness: number;
  /** True if we had to relax filters to find anything */
  fellBack: boolean;
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)] as T;
}

function sampleN<T>(arr: readonly T[], n: number, rng: () => number): T[] {
  if (arr.length <= n) return [...arr];
  const out: T[] = [];
  const used = new Set<number>();
  while (out.length < n) {
    const i = Math.floor(rng() * arr.length);
    if (!used.has(i)) {
      used.add(i);
      out.push(arr[i]);
    }
  }
  return out;
}

export function selectMultiAxisBlueprint(input: MultiAxisInput): MultiAxisSelection {
  const rng = input.rng ?? Math.random;
  const tier = Math.max(1, Math.min(5, Math.round(input.averageTier ?? 3)));
  const rarity = input.rarityOverride ?? rollRarity(rng);

  const weights = { ...DEFAULT_GROUNDEDNESS_WEIGHTS, ...input.groundednessWeights };
  const targetGroundedness =
    input.groundednessOverride ?? rollGroundedness(rng, weights);

  const recentEntries = input.recentEntries ?? [];
  const recentIds = new Set([
    ...recentEntries.map((r) => r.id),
    ...(input.recentBlueprintIds ?? []),
  ]);
  const excludeFamilies = new Set(input.excludeFamilies ?? []);

  // Build successive filter ladders. Each step relaxes one constraint.
  const ladders: Array<(b: Candidate) => boolean> = [
    // 1) ideal: rarity + tier + groundedness + family-not-excluded + not-recent
    (b) =>
      b.rarity === rarity &&
      tier >= b.minTier && tier <= b.maxTier &&
      inferGroundedness(b) === targetGroundedness &&
      !excludeFamilies.has(inferFamily(b)) &&
      !recentIds.has(b.id) &&
      (input.familyOverride ? inferFamily(b) === input.familyOverride : true),
    // 2) drop family-override
    (b) =>
      b.rarity === rarity &&
      tier >= b.minTier && tier <= b.maxTier &&
      inferGroundedness(b) === targetGroundedness &&
      !excludeFamilies.has(inferFamily(b)) &&
      !recentIds.has(b.id),
    // 3) drop excludeFamilies
    (b) =>
      b.rarity === rarity &&
      tier >= b.minTier && tier <= b.maxTier &&
      inferGroundedness(b) === targetGroundedness &&
      !recentIds.has(b.id),
    // 4) drop groundedness target
    (b) =>
      b.rarity === rarity &&
      tier >= b.minTier && tier <= b.maxTier &&
      !recentIds.has(b.id),
    // 5) drop tier band
    (b) => b.rarity === rarity && !recentIds.has(b.id),
    // 6) drop recent dedup
    (b) => b.rarity === rarity,
    // 7) anything
    () => true,
  ];

  let pool: Candidate[] = [];
  let fellBack = false;
  for (let i = 0; i < ladders.length; i++) {
    pool = ALL_BLUEPRINTS.filter(ladders[i]);
    if (pool.length > 0) {
      fellBack = i > 0;
      break;
    }
  }

  // Sample N candidates and pick the most-distinct one above threshold.
  const sampleSize = input.candidateSampleSize ?? 6;
  const minDistinct = input.minDistinctness ?? 0.55;
  const candidates = sampleN(pool, Math.min(sampleSize, pool.length), rng);

  let best: Candidate = candidates[0];
  let bestScore = -1;
  for (const c of candidates) {
    const s = distinctnessAgainstRecent(c, recentEntries);
    if (s > bestScore) {
      best = c;
      bestScore = s;
    }
  }

  // If even the best falls under the threshold and we have alternatives in the
  // *full pool*, do one extra wider sample to try to clear the bar.
  if (bestScore < minDistinct && pool.length > sampleSize) {
    const wider = sampleN(pool, Math.min(sampleSize * 2, pool.length), rng);
    for (const c of wider) {
      const s = distinctnessAgainstRecent(c, recentEntries);
      if (s > bestScore) {
        best = c;
        bestScore = s;
      }
    }
  }

  return buildSelection(best, rarity, bestScore, fellBack, rng);
}

function buildSelection(
  blueprint: Candidate,
  rarity: RarityTier,
  distinctness: number,
  fellBack: boolean,
  rng: () => number,
): MultiAxisSelection {
  const objectives = inferObjectives(blueprint);
  const enemyPressure = inferEnemyPressure(blueprint);
  const escalation = inferEscalation(blueprint);
  const combatFrame = inferCombatFrame(blueprint);
  const imagery = inferImagery(blueprint);
  const family = inferFamily(blueprint);
  const groundedness = inferGroundedness(blueprint);

  const civilianHook = blueprint.collateral.length
    ? pick(blueprint.collateral, rng)
    : 'no civilians present — pure tactical scenario';

  return {
    blueprint,
    rarity,
    groundedness,
    family,
    objectives,
    enemyPressure,
    escalation,
    combatFrame,
    imagery,
    twist: {
      civilianHook,
      timePressure: pick(blueprint.timePressure, rng),
      movementConstraint: pick(blueprint.movementConstraints, rng),
      dynamicFactor: pick(blueprint.dynamicFactors, rng),
      mood: pick(MOODS, rng),
      primaryObjective: pick(objectives, rng),
      enemyType: pick(enemyPressure, rng),
    },
    distinctness,
    fellBack,
  };
}

/** Render the multi-axis selection into an AI prompt fragment. */
export function renderMultiAxisBrief(s: MultiAxisSelection): string {
  const { blueprint, twist } = s;
  return `BASE BLUEPRINT — you MUST build the emergency around this seed (do not invent a different category):
• Title seed: "${blueprint.title}"
• Concept: ${blueprint.concept}
• Family: ${s.family} | Groundedness: ${s.groundedness}
• Scope: ${blueprint.scope} | Intensity: ${blueprint.intensity} | Rarity: ${s.rarity}
• Inherent tags: ${blueprint.tags.join(', ')}
• Dominant imagery: ${s.imagery.join(', ') || '(none)'}

PRIMARY OBJECTIVE: ${twist.primaryObjective}
SECONDARY OBJECTIVES (weave in if natural): ${s.objectives.filter((o) => o !== twist.primaryObjective).join(', ') || '(none)'}
ENEMY / OPPOSITION PRESSURE: ${twist.enemyType}
ESCALATION PATH (worsens if untouched): ${s.escalation.join(', ')}
COMBAT FRAMING (how this reshapes the fight): ${s.combatFrame.join(', ')}

LAYERED TWISTS — weave these specific elements into the scene:
• Civilian / collateral hook: ${twist.civilianHook}
• Time-pressure mechanic: ${twist.timePressure}
• Movement constraint: ${twist.movementConstraint}
• Dynamic escalation factor: ${twist.dynamicFactor}
• Mood: ${twist.mood}

You may rename the location to something more vivid and specific, but the underlying disaster family (${s.family}), scope, and tags MUST match the blueprint above. The catalog has hundreds of distinct human-scale and exotic disasters — you have been handed THIS one. Do NOT default to tectonic plates, submarine implosions, dam failures, or space stations unless the blueprint above explicitly calls for them.`;
}

/** Convenience: create a RecentEntry from a finalized selection. */
export function selectionToRecent(s: MultiAxisSelection): RecentEntry {
  return toRecentEntry(s.blueprint);
}
