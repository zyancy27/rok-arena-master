import { BattleSituationFramework } from './BattleSituationFramework';
import { TacticalPressureFramework } from './TacticalPressureFramework';
import { ThreatCompositionFramework } from './ThreatCompositionFramework';

export interface CombatScenarioBuilderInput {
  tags?: string[];
  activeHazards?: string[];
  rangeState?: string | null;
  enemyCount?: number;
}

export const CombatScenarioBuilder = {
  build(input: CombatScenarioBuilderInput) {
    const situation = BattleSituationFramework.build(input.tags || [], input.activeHazards || []);
    const pressure = TacticalPressureFramework.build(input.rangeState, input.activeHazards || []);
    const threats = ThreatCompositionFramework.build(input.enemyCount ?? 1, input.tags || []);

    return {
      ...situation,
      ...pressure,
      ...threats,
      stakes: ['position', 'survival', 'momentum'],
      escalationVectors: ['timing collapse', 'resource drain', 'territory loss'],
      recommendedEffectTags: [...new Set([...(input.tags || []), ...(input.activeHazards || [])])],
    };
  },
};
