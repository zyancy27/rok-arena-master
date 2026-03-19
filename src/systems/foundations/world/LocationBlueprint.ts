import type { BlueprintBase } from '@/systems/blueprints/BlueprintTypes';

export interface LocationBlueprintPayload extends Record<string, unknown> {
  regionType?: string;
  pointsOfInterest?: string[];
  traversalPressure?: string[];
  tacticalValue?: string[];
}

export type LocationBlueprint = BlueprintBase<LocationBlueprintPayload>;
