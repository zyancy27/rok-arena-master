import type { BlueprintBase } from '@/systems/blueprints/BlueprintTypes';

export interface LocationBlueprintPayload {
  regionType?: string;
  pointsOfInterest?: string[];
  traversalPressure?: string[];
  tacticalValue?: string[];
}

export type LocationBlueprint = BlueprintBase<LocationBlueprintPayload>;
