import type { BlueprintBase } from '@/systems/blueprints/BlueprintTypes';

export interface NpcBlueprintPayload {
  role?: string;
  personalityCluster?: string[];
  motivations?: string[];
  fearProfile?: string[];
  loyaltyProfile?: string[];
  factionAlignment?: string[];
  powerStyle?: string[];
  socialPosture?: string[];
  combatPressureStyle?: string[];
  relationshipPosture?: string[];
  sourceFields?: Record<string, unknown>;
}

export type NpcBlueprint = BlueprintBase<NpcBlueprintPayload>;
