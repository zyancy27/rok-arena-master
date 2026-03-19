export interface GeneratedNpcIdentity {
  blueprintId?: string;
  name: string;
  role: string;
  personalityCluster: string[];
  motivations: string[];
  fearProfile: string[];
  loyaltyProfile: string[];
  factionAlignment: string[];
  powerStyle: string[];
  socialPosture: string[];
  combatPressureStyle: string[];
  relationshipPosture: string[];
  tags: string[];
  metadata?: Record<string, unknown>;
}
