export interface GeneratedCampaignSeed {
  blueprintId?: string;
  centralTension: string;
  openingHook: string;
  pressureSources: string[];
  worldFriction: string[];
  allies: string[];
  enemies: string[];
  likelyObjectives: string[];
  pacingCurve: string[];
  mysteryDensity: 'low' | 'medium' | 'high';
  conflictDensity: 'low' | 'medium' | 'high';
  encounterOpportunities: string[];
  npcPresence: string[];
  environmentalIdentity: string[];
  progressionShape: string[];
  tags: string[];
  metadata?: Record<string, unknown>;
}
