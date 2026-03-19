import type { BlueprintBase } from '@/systems/blueprints/BlueprintTypes';

export interface EncounterBlueprintPayload {
  situationType?: string;
  tacticalPressure?: string[];
  threatComposition?: string[];
  environmentalConflicts?: string[];
  stakes?: string[];
  escalationVectors?: string[];
  recommendedEffectTags?: string[];
}

export type EncounterBlueprint = BlueprintBase<EncounterBlueprintPayload>;
