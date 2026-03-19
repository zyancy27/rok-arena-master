import { CampaignObjectiveFramework } from './CampaignObjectiveFramework';
import { CampaignPacingFramework } from './CampaignPacingFramework';
import { CampaignPressureFramework } from './CampaignPressureFramework';
import { CampaignStructureFramework } from './CampaignStructureFramework';

export interface CampaignSeedBuilderInput {
  theme?: string | null;
  goal?: string | null;
  tags?: string[];
  worldState?: Record<string, unknown> | null;
  currentZone?: string | null;
}

export const CampaignSeedBuilder = {
  build(input: CampaignSeedBuilderInput) {
    const structure = CampaignStructureFramework.build(input.theme, input.goal);
    const pressure = CampaignPressureFramework.build(input.tags || [], input.worldState);
    const objectives = CampaignObjectiveFramework.build(input.goal, input.currentZone);
    const pacing = CampaignPacingFramework.build(pressure.conflictDensity);

    return {
      ...structure,
      ...pressure,
      ...objectives,
      ...pacing,
      allies: ['situational ally'],
      enemies: ['pressure source'],
      encounterOpportunities: ['contested route', 'unstable negotiation', 'hazard-bound confrontation'],
      npcPresence: ['local stakeholders', 'pressure agents'],
      environmentalIdentity: input.tags?.length ? input.tags : ['grounded frontier'],
    };
  },
};
