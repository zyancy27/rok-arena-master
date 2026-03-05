/**
 * Procedural Environment Generator
 *
 * Generates battle environments from modular building blocks.
 * Combines location type + hazards + ambient effects into a
 * cohesive environment object for the combat engine.
 */

import { LOCATION_TYPES, getRandomLocation, getLocationsByTags, type LocationType } from './locationTypes';
import { getCompatibleHazards, pickRandomHazard, type HazardType } from './hazardTypes';
import { getAmbientEffectsForLocation, type AmbientEffect } from './ambientEffects';

// ─── Generated Environment ──────────────────────────────────────

export interface GeneratedEnvironment {
  /** Selected location */
  location: LocationType;
  /** Active hazards for this battle */
  activeHazards: HazardType[];
  /** Potential hazards that may trigger during battle */
  potentialHazards: HazardType[];
  /** Ambient effects */
  ambientEffects: AmbientEffect[];
  /** Combined terrain modifiers */
  terrainModifiers: string[];
  /** Narrator prompt for environment description */
  narratorPrompt: string;
  /** Short summary for UI display */
  summary: string;
}

export interface EnvironmentGeneratorOptions {
  /** Specific location ID to use (optional) */
  locationId?: string;
  /** Tags to filter locations by (optional) */
  preferredTags?: string[];
  /** Number of active hazards to start with */
  startingHazards?: number;
  /** Difficulty scale (affects hazard severity) */
  difficultyScale?: number;
  /** Custom location name override */
  customLocationName?: string;
  /** Custom description override */
  customDescription?: string;
  /** Seed for deterministic generation (optional) */
  seed?: string;
}

/**
 * Generate a complete battle environment from modular building blocks.
 */
export function generateEnvironment(options: EnvironmentGeneratorOptions = {}): GeneratedEnvironment {
  // 1. Select location
  let location: LocationType;

  if (options.locationId) {
    location = LOCATION_TYPES.find(l => l.id === options.locationId) ?? getRandomLocation();
  } else if (options.preferredTags && options.preferredTags.length > 0) {
    const matching = getLocationsByTags(options.preferredTags);
    location = matching.length > 0
      ? matching[Math.floor(Math.random() * matching.length)]
      : getRandomLocation();
  } else {
    location = getRandomLocation();
  }

  // Apply custom overrides
  if (options.customLocationName || options.customDescription) {
    location = {
      ...location,
      name: options.customLocationName ?? location.name,
      description: options.customDescription ?? location.description,
    };
  }

  // 2. Get compatible hazards
  const allHazards = getCompatibleHazards(location.tags);
  const startingCount = options.startingHazards ?? 0;

  // Select starting active hazards
  const activeHazards: HazardType[] = [];
  const shuffled = [...allHazards].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(startingCount, shuffled.length); i++) {
    activeHazards.push(shuffled[i]);
  }

  // Remaining are potential hazards
  const potentialHazards = allHazards.filter(h => !activeHazards.includes(h));

  // 3. Get ambient effects
  const ambientEffects = getAmbientEffectsForLocation(location.ambientSounds);

  // 4. Compile terrain modifiers
  const terrainModifiers = [
    ...location.terrainModifiers,
    ...activeHazards.map(h => h.combatEffect),
  ];

  // 5. Generate narrator prompt
  const narratorLines: string[] = [
    `\nBATTLE ENVIRONMENT: ${location.name.toUpperCase()}`,
    location.atmosphere,
    '',
  ];

  if (terrainModifiers.length > 0) {
    narratorLines.push('TERRAIN EFFECTS:');
    terrainModifiers.forEach(mod => narratorLines.push(`• ${mod}`));
    narratorLines.push('');
  }

  if (activeHazards.length > 0) {
    narratorLines.push('ACTIVE HAZARDS:');
    activeHazards.forEach(h => {
      narratorLines.push(`• ${h.name} (${h.severity}): ${h.description}`);
    });
    narratorLines.push('');
  }

  if (ambientEffects.length > 0) {
    narratorLines.push('ATMOSPHERE:');
    ambientEffects.forEach(a => narratorLines.push(`• ${a.narratorPrompt}`));
  }

  narratorLines.push('\nIncorporate these environmental elements naturally into combat descriptions.');

  // 6. Summary
  const summaryParts = [location.name];
  if (activeHazards.length > 0) {
    summaryParts.push(`${activeHazards.length} hazard${activeHazards.length > 1 ? 's' : ''}`);
  }
  const summary = summaryParts.join(' • ');

  return {
    location,
    activeHazards,
    potentialHazards,
    ambientEffects,
    terrainModifiers,
    narratorPrompt: narratorLines.join('\n'),
    summary,
  };
}

/**
 * Trigger a random hazard during battle.
 * Returns the hazard or null if none should trigger.
 */
export function triggerBattleHazard(
  environment: GeneratedEnvironment,
  messageCount: number,
  frequency: 'low' | 'medium' | 'high' = 'medium',
): HazardType | null {
  // Don't trigger on first few exchanges
  if (messageCount < 3) return null;

  const thresholds = { low: 0.1, medium: 0.2, high: 0.35 };
  if (Math.random() >= thresholds[frequency]) return null;

  if (environment.potentialHazards.length === 0) return null;

  return environment.potentialHazards[
    Math.floor(Math.random() * environment.potentialHazards.length)
  ];
}

/**
 * Generate a narrator prompt for a triggered hazard.
 */
export function getHazardNarratorPrompt(hazard: HazardType): string {
  return `\n⚠️ ENVIRONMENTAL HAZARD: ${hazard.name.toUpperCase()}\n${hazard.description}\n\nCombat Effect: ${hazard.combatEffect}\n\nYou MUST incorporate this hazard into your response. Describe the event first, then show both characters' reactions.`;
}
