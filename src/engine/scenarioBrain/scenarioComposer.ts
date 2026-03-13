/**
 * Scenario Composer
 *
 * Assembles the final scenario from logic-selected layers,
 * applies memory deduplication, and produces the output structure.
 */

import { type ScenarioContext, selectEnvironment, selectSituation, selectHazards, selectUrgency, composeNarrativeHook } from './scenarioLogic';
import { type ScenarioFingerprint, type ScenarioMemory } from './scenarioMemory';
import { generateVariation, type VariationRange } from './scenarioRandomizer';

// ── Output Types ────────────────────────────────────────────────

export interface SituationLayer {
  /** Structured participants in the scene */
  participants: string[];
  /** Notable objects / interactables */
  objects: string[];
  /** Environmental pressure description */
  pressure: string;
  /** Opportunities available */
  opportunities: string[];
  /** Active story thread hints */
  storyThreadHints: string[];
  /** Visibility conditions */
  visibility: 'clear' | 'reduced' | 'poor' | 'none';
  /** Terrain type */
  terrain: string;
  /** Cover availability */
  coverAvailable: boolean;
  /** Elevation variance */
  hasElevation: boolean;
}

export interface ComposedScenario {
  /** Environment type (e.g. "hydroelectric dam") */
  environment: string;
  /** Current situation state */
  situation: string;
  /** Active hazard types */
  hazards: string[];
  /** Urgency level */
  urgency: 'minor' | 'moderate' | 'severe' | 'catastrophic';
  /** Generated narrative hook */
  narrativeHook: string;
  /** Visual/audio variation parameters */
  variation: VariationRange;
  /** Fingerprint for memory tracking */
  fingerprint: ScenarioFingerprint;
  /** Tags for theme engine integration */
  tags: string[];
  /** Structured situation layer */
  situationLayer: SituationLayer;
}

const MAX_REROLL_ATTEMPTS = 8;

/**
 * Compose a unique scenario from context, with memory deduplication.
 */
export function composeScenario(
  ctx: ScenarioContext,
  memory: ScenarioMemory,
): ComposedScenario {
  const rng = ctx.rng ?? Math.random;
  let attempts = 0;

  while (attempts < MAX_REROLL_ATTEMPTS) {
    attempts++;

    const environment = selectEnvironment(ctx);
    const situation = selectSituation(ctx);
    const hazards = selectHazards(situation, ctx);
    const urgency = selectUrgency(ctx);

    const fingerprint: ScenarioFingerprint = {
      environment,
      situation,
      hazards,
      urgency,
      timestamp: Date.now(),
    };

    // Check memory — reroll if too similar
    if (memory.isTooSimilar(fingerprint) && attempts < MAX_REROLL_ATTEMPTS) {
      continue;
    }

    // Record in memory
    memory.record(fingerprint);

    const narrativeHook = composeNarrativeHook(environment, situation, hazards, urgency);
    const variation = generateVariation(rng);
    const tags = deriveTagsFromScenario(environment, situation, hazards);

    return {
      environment,
      situation,
      hazards,
      urgency,
      narrativeHook,
      variation,
      fingerprint,
      tags,
    };
  }

  // Fallback — force generate even if similar
  const environment = selectEnvironment(ctx);
  const situation = selectSituation(ctx);
  const hazards = selectHazards(situation, ctx);
  const urgency = selectUrgency(ctx);

  const fingerprint: ScenarioFingerprint = {
    environment, situation, hazards, urgency, timestamp: Date.now(),
  };
  memory.record(fingerprint);

  return {
    environment,
    situation,
    hazards,
    urgency,
    narrativeHook: composeNarrativeHook(environment, situation, hazards, urgency),
    variation: generateVariation(rng),
    fingerprint,
    tags: deriveTagsFromScenario(environment, situation, hazards),
  };
}

// ── Tag Derivation ──────────────────────────────────────────────

const TAG_KEYWORD_MAP: Record<string, string[]> = {
  fire: ['fire', 'burn', 'flame', 'molten', 'lava', 'ignit', 'inferno', 'forge', 'smelting', 'furnace'],
  ice: ['ice', 'frozen', 'frost', 'glacier', 'cryo', 'cold', 'permafrost', 'blizzard'],
  electric: ['electric', 'power', 'plasma', 'lightning', 'substation', 'voltage', 'tesla'],
  water: ['water', 'flood', 'hydro', 'ocean', 'sea', 'tidal', 'coral', 'aqua', 'delta', 'dam'],
  toxic: ['toxic', 'chemical', 'gas', 'contamina', 'biohazard', 'waste', 'sludge', 'acid'],
  radiation: ['radiation', 'nuclear', 'reactor', 'radioactive'],
  space: ['space', 'orbit', 'asteroid', 'lunar', 'warp', 'zero-g', 'derelict'],
  underground: ['underground', 'mining', 'tunnel', 'cave', 'sewer', 'bunker', 'shaft', 'lava tube'],
  storm: ['storm', 'hurricane', 'tornado', 'cyclone', 'tempest', 'wind'],
  gravity: ['gravity', 'weight', 'crush', 'compress'],
  emergency: ['explod', 'collaps', 'meltdown', 'breach', 'catastroph', 'chain-react', 'evacuating'],
  metal: ['steel', 'iron', 'metal', 'foundry', 'shipyard', 'forge', 'alloy'],
  rubble: ['debris', 'rubble', 'collapse', 'crumbl', 'shrapnel', 'falling infrastructure'],
  smoke: ['smoke', 'fume', 'exhaust', 'steam'],
  rock: ['rock', 'boulder', 'cliff', 'quarry', 'gorge', 'canyon', 'monolith'],
  crystal: ['crystal', 'spire', 'geode', 'obsidian'],
  fog: ['fog', 'mist', 'haze'],
  darkness: ['dark', 'shadow', 'blackout', 'void'],
  ruins: ['ruin', 'ancient', 'temple', 'derelict'],
  mech: ['factory', 'assembly', 'industrial', 'warehouse', 'machinery'],
};

function deriveTagsFromScenario(
  environment: string,
  situation: string,
  hazards: string[],
): string[] {
  const combined = `${environment} ${situation} ${hazards.join(' ')}`.toLowerCase();
  const tags = new Set<string>();

  for (const [tag, keywords] of Object.entries(TAG_KEYWORD_MAP)) {
    if (keywords.some((kw) => combined.includes(kw))) {
      tags.add(tag);
    }
  }

  // Always add emergency tag if urgency is high
  if (combined.includes('catastroph') || combined.includes('explod')) {
    tags.add('emergency');
  }

  return Array.from(tags);
}
