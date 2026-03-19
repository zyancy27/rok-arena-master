import type { BlueprintBase } from '@/systems/blueprints/BlueprintTypes';

export interface WorldBlueprintPayload extends Record<string, unknown> {
  regionType?: string;
  terrainLogic?: string[];
  dangerLogic?: string[];
  socialDensity?: string;
  economicTone?: string;
  weatherPressure?: string[];
  travelPressure?: string[];
  hazardFamilies?: string[];
  pointsOfInterest?: string[];
  factionPresence?: string[];
  culturalFlavor?: string[];
}

export type WorldBlueprint = BlueprintBase<WorldBlueprintPayload>;
