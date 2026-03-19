import type { BlueprintBase } from '@/systems/blueprints/BlueprintTypes';

export interface EffectBlueprintPayload {
  visualLayers?: string[];
  audioLayers?: string[];
  chatBehaviors?: string[];
  statusOverlays?: string[];
  environmentPersistence?: string[];
  burstImpacts?: string[];
}

export type EffectBlueprint = BlueprintBase<EffectBlueprintPayload>;
