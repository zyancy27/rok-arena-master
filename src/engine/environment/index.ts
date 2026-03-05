// Environment Engine — Public API

export { LOCATION_TYPES, getLocationType, getLocationsByTags, getRandomLocation } from './locationTypes';
export type { LocationType } from './locationTypes';

export { HAZARD_TYPES, getCompatibleHazards, pickRandomHazard } from './hazardTypes';
export type { HazardType } from './hazardTypes';

export { AMBIENT_EFFECTS, getAmbientEffectsForCues, getAmbientEffectsForLocation } from './ambientEffects';
export type { AmbientEffect } from './ambientEffects';

export {
  generateEnvironment,
  triggerBattleHazard,
  getHazardNarratorPrompt,
} from './environmentGenerator';
export type { GeneratedEnvironment, EnvironmentGeneratorOptions } from './environmentGenerator';
