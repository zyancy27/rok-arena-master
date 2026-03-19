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
  storyLogic?: {
    centralConflict?: string | null;
    stakes?: string[];
    pressureSources?: string[];
    pacingCurve?: string[];
  } | null;
  actorIdentity?: Record<string, unknown> | null;
}

export const CampaignSeedBuilder = {
  build(input: CampaignSeedBuilderInput) {
    const structure = CampaignStructureFramework.build(
      input.storyLogic?.centralConflict || input.theme,
      input.goal,
    );
    const pressure = CampaignPressureFramework.build(input.tags || [], input.worldState);
    const objectives = CampaignObjectiveFramework.build(input.goal, input.currentZone);
    const pacing = CampaignPacingFramework.build(pressure.conflictDensity);
    const actorTone = Array.isArray(input.actorIdentity?.narrativeTone)
      ? (input.actorIdentity?.narrativeTone as string[])
      : [];
    const actorPressure = Array.isArray(input.actorIdentity?.pressureStyle)
      ? (input.actorIdentity?.pressureStyle as string[])
      : [];
    const sparseFallbackTheme = input.theme || input.goal || actorTone[0] || 'grounded frontier pressure';

    return {
      ...structure,
      ...pressure,
      ...objectives,
      ...pacing,
      centralTension: input.storyLogic?.centralConflict || structure.centralTension || sparseFallbackTheme,
      pressureSources: [...new Set([...(pressure.pressureSources || []), ...(input.storyLogic?.pressureSources || []), ...actorPressure])],
      likelyObjectives: [...new Set([...(objectives.likelyObjectives || []), ...(input.storyLogic?.stakes || []).map((stake) => `protect ${stake}`)])],
      pacingCurve: [...new Set([...(pacing.pacingCurve || []), ...(input.storyLogic?.pacingCurve || []), ...actorTone])],
      allies: input.goal ? ['goal-aligned contact', 'situational ally'] : ['situational ally', 'reluctant helper'],
      enemies: input.theme ? ['theme-born pressure source', 'active rival'] : ['pressure source', 'opportunistic rival'],
      encounterOpportunities: [
        'contested route',
        'unstable negotiation',
        'hazard-bound confrontation',
        input.currentZone ? `pressure flashpoint in ${input.currentZone}` : 'pressure flashpoint',
      ],
      npcPresence: input.goal
        ? ['local stakeholders', 'pressure agents', 'goal gatekeeper']
        : ['local stakeholders', 'pressure agents', 'wandering opportunist'],
      environmentalIdentity: input.tags?.length ? input.tags : [sparseFallbackTheme],
      progressionShape: input.goal
        ? ['hook', 'pressure reveal', 'complication ladder', 'payoff']
        : ['hook', 'discovery', 'pressure rise', 'payoff'],
    };
  },
};

