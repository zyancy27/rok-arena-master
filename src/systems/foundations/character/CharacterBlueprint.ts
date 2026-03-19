import type { BlueprintBase } from '@/systems/blueprints/BlueprintTypes';

export interface CharacterBlueprintPayload extends Record<string, unknown> {
  combatIdentity?: string[];
  socialIdentity?: string[];
  expressionIdentity?: string[];
  movementStyle?: string[];
  narrativeTone?: string[];
  dangerProfile?: string[];
  pressureStyle?: string[];
  signatureBehaviorPatterns?: string[];
  sourceFields?: Record<string, unknown>;
}

export type CharacterBlueprint = BlueprintBase<CharacterBlueprintPayload>;
