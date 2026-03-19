export interface GeneratedWorldState {
  blueprintId?: string;
  regionType: string;
  terrainLogic: string[];
  dangerLogic: string[];
  socialDensity: string;
  economicTone: string;
  weatherPressure: string[];
  travelPressure: string[];
  hazardFamilies: string[];
  pointsOfInterest: string[];
  factionPresence: string[];
  culturalFlavor: string[];
  environmentalIdentity: string[];
  socialToneIdentity: string[];
  travelPressureIdentity: string[];
  hazardPosture: string[];
  visualEffectProfile: string[];
  audioPressureProfile: string[];
  volatilityProfile: string[];
  factionDensityProfile: string[];
  tags: string[];
  metadata?: Record<string, unknown>;
}
