import type { BlueprintBase } from '@/systems/blueprints/BlueprintTypes';

export interface CampaignBlueprintPayload extends Record<string, unknown> {
  centralTension?: string;
  openingHook?: string;
  pressureSources?: string[];
  worldFriction?: string[];
  allies?: string[];
  enemies?: string[];
  likelyObjectives?: string[];
  pacingCurve?: string[];
  mysteryDensity?: 'low' | 'medium' | 'high';
  conflictDensity?: 'low' | 'medium' | 'high';
  encounterOpportunities?: string[];
  npcPresence?: string[];
  environmentalIdentity?: string[];
  progressionShape?: string[];
}

export type CampaignBlueprint = BlueprintBase<CampaignBlueprintPayload>;
