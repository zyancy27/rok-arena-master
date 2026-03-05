/**
 * Scenario Logic
 *
 * Contextual rules that shape scenario generation based on
 * battle state, player abilities, narrative tension, and physics.
 */

import {
  type EnvironmentType,
  type SituationState,
  type HazardType,
  type UrgencyLevel,
  ENVIRONMENT_TYPES,
  SITUATION_STATES,
  HAZARD_TYPES,
  URGENCY_LEVELS,
  pick,
  pickN,
  weightedPick,
  getUrgencyWeights,
} from './scenarioRandomizer';

// ── Context Input ───────────────────────────────────────────────

export interface ScenarioContext {
  /** Battle intensity 0 (calm) to 1 (extreme) */
  battleIntensity: number;
  /** Average character tier/level (1-5) */
  averageTier: number;
  /** Character ability keywords (e.g. ['fire', 'telekinesis', 'speed']) */
  characterAbilities: string[];
  /** Planet/location type hint */
  locationHint?: string;
  /** Previous hazards used this session */
  previousHazards: string[];
  /** Narrative escalation count (how many turns of escalating tension) */
  escalationCount: number;
  /** Custom RNG function */
  rng?: () => number;
}

// ── Affinity Maps ───────────────────────────────────────────────

/** Environment types that synergize with character ability keywords */
const ABILITY_ENVIRONMENT_AFFINITY: Record<string, string[]> = {
  fire: ['oil refinery', 'fuel depot', 'chemical plant', 'volcanic caldera', 'smelting forge'],
  ice: ['glacier crevasse', 'permafrost ridge', 'cryogenics vault', 'geothermal springs'],
  water: ['hydroelectric dam', 'coral atoll', 'tidal cave system', 'cargo freighter deck'],
  electric: ['power substation', 'particle accelerator ring', 'radio telescope array'],
  earth: ['mining shaft', 'karst sinkhole', 'lava tube', 'salt flat'],
  telekinesis: ['orbital research station', 'zero-g experiment chamber', 'space elevator tether'],
  speed: ['bullet train cabin', 'monorail track', 'highway overpass', 'airport runway'],
  strength: ['steel foundry', 'shipyard drydock', 'aircraft carrier deck', 'suspension bridge'],
  flight: ['wind turbine field', 'helipad tower', 'gondola cable line', 'space elevator tether'],
  psychic: ['biocontainment wing', 'deep sea research lab', 'crystal spire nexus'],
  gravity: ['gravity well temple', 'asteroid mining rig', 'zero-g experiment chamber'],
  stealth: ['sewage overflow tunnel', 'underground market', 'bunker corridor', 'munitions depot'],
};

/** Situation states that naturally pair with hazard types */
const SITUATION_HAZARD_AFFINITY: Record<string, string[]> = {
  collapsing: ['debris', 'structural collapse', 'falling infrastructure', 'dust explosion'],
  exploding: ['explosive shrapnel', 'fire', 'energy overload', 'sonic shockwave'],
  flooding: ['flooding water', 'pressure', 'extreme cold', 'electrical hazards'],
  burning: ['fire', 'toxic gas', 'steam venting', 'molten metal'],
  malfunctioning: ['electricity', 'energy overload', 'magnetic interference', 'plasma discharge'],
  falling: ['gravity anomalies', 'debris', 'vacuum exposure', 'sonic shockwave'],
  pressurizing: ['pressure', 'structural collapse', 'steam venting', 'explosive shrapnel'],
  decompressing: ['vacuum exposure', 'debris', 'extreme cold', 'structural collapse'],
  freezing: ['extreme cold', 'structural collapse', 'pressure'],
  overheating: ['fire', 'molten metal', 'steam venting', 'energy overload'],
  'chain-reacting': ['energy overload', 'fire', 'explosive shrapnel', 'radiation'],
};

/** Tier-scaled environment categories */
const TIER_ENVIRONMENT_POOLS: Record<number, string[]> = {
  1: ['subway station', 'parking structure', 'residential tower', 'train terminal',
      'shopping mall', 'harbor dockyard', 'grain silo complex', 'ferry terminal'],
  2: ['oil refinery', 'suspension bridge', 'chemical plant', 'power substation',
      'aircraft carrier deck', 'cargo freighter deck', 'steel foundry', 'munitions depot'],
  3: ['hydroelectric dam', 'particle accelerator ring', 'missile silo', 'deep sea research lab',
      'cryogenics vault', 'volcanic caldera', 'glacier crevasse', 'monorail track'],
  4: ['orbital research station', 'space elevator tether', 'asteroid mining rig',
      'warp gate scaffold', 'derelict freighter', 'gravity well temple'],
  5: ['bioluminescent hive', 'crystal spire nexus', 'living architecture colony',
      'obsidian monolith plaza', 'spore forest', 'lunar excavation site'],
};

// ── Logic Functions ─────────────────────────────────────────────

/**
 * Select an environment type based on context.
 * Considers tier, abilities, and location hints.
 */
export function selectEnvironment(ctx: ScenarioContext): EnvironmentType {
  const rng = ctx.rng ?? Math.random;

  // 30% chance: pick from ability-affinity pool
  if (ctx.characterAbilities.length > 0 && rng() < 0.3) {
    const abilityKey = pick(ctx.characterAbilities, rng);
    const affinityPool = ABILITY_ENVIRONMENT_AFFINITY[abilityKey.toLowerCase()];
    if (affinityPool && affinityPool.length > 0) {
      return pick(affinityPool, rng);
    }
  }

  // 40% chance: pick from tier-appropriate pool
  const tierPool = TIER_ENVIRONMENT_POOLS[Math.min(ctx.averageTier, 5)] ??
                   TIER_ENVIRONMENT_POOLS[3];
  if (rng() < 0.4) {
    return pick(tierPool, rng);
  }

  // Otherwise: fully random from master pool
  return pick(ENVIRONMENT_TYPES, rng);
}

/**
 * Select a situation state based on battle intensity and escalation.
 */
export function selectSituation(ctx: ScenarioContext): SituationState {
  const rng = ctx.rng ?? Math.random;

  // High intensity or high escalation → dramatic states
  if (ctx.battleIntensity > 0.7 || ctx.escalationCount > 5) {
    const dramaticStates: SituationState[] = [
      'collapsing', 'exploding', 'chain-reacting', 'spinning out of control',
      'decompressing', 'breached',
    ];
    return pick(dramaticStates, rng);
  }

  // Low intensity → calmer states
  if (ctx.battleIntensity < 0.3) {
    const calmStates: SituationState[] = [
      'stable', 'unstable', 'malfunctioning', 'losing power', 'pressurizing',
    ];
    return pick(calmStates, rng);
  }

  // Medium → any state
  return pick(SITUATION_STATES, rng);
}

/**
 * Select hazards based on situation, avoiding recent duplicates.
 */
export function selectHazards(
  situation: SituationState,
  ctx: ScenarioContext,
  count: number = 2,
): HazardType[] {
  const rng = ctx.rng ?? Math.random;

  // Start with situation-affinity hazards if available
  const affinityPool = SITUATION_HAZARD_AFFINITY[situation as string] ?? [];
  const availableHazards = HAZARD_TYPES.filter(
    (h) => !ctx.previousHazards.includes(h),
  );

  const combined = [...new Set([...affinityPool, ...availableHazards])];
  if (combined.length === 0) return pickN(HAZARD_TYPES, count, rng) as HazardType[];

  return pickN(combined, count, rng) as HazardType[];
}

/**
 * Select urgency level based on battle intensity.
 */
export function selectUrgency(ctx: ScenarioContext): UrgencyLevel {
  const rng = ctx.rng ?? Math.random;
  const weights = getUrgencyWeights(ctx.battleIntensity);
  return weightedPick(URGENCY_LEVELS, weights, rng);
}

/**
 * Generate narrative description based on composed layers.
 */
export function composeNarrativeHook(
  environment: string,
  situation: string,
  hazards: string[],
  urgency: string,
): string {
  const hazardStr = hazards.length > 1
    ? `${hazards.slice(0, -1).join(', ')} and ${hazards[hazards.length - 1]}`
    : hazards[0] ?? 'unknown danger';

  const urgencyAdverb: Record<string, string> = {
    minor: 'slowly',
    moderate: 'steadily',
    severe: 'rapidly',
    catastrophic: 'violently',
  };

  return `The ${environment} is ${urgencyAdverb[urgency] ?? 'steadily'} ${situation}. ${hazardStr} threatens everyone present.`;
}
