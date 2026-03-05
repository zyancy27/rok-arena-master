// ScenarioBrain — Public API

export { ScenarioBrain, createScenarioBrain } from './ScenarioBrain';
export type { ScenarioBrainOptions } from './ScenarioBrain';

export { composeScenario } from './scenarioComposer';
export type { ComposedScenario } from './scenarioComposer';

export { ScenarioMemory, createScenarioMemory } from './scenarioMemory';
export type { ScenarioFingerprint } from './scenarioMemory';

export {
  selectEnvironment,
  selectSituation,
  selectHazards,
  selectUrgency,
} from './scenarioLogic';
export type { ScenarioContext } from './scenarioLogic';

export {
  ENVIRONMENT_TYPES,
  SITUATION_STATES,
  HAZARD_TYPES,
  URGENCY_LEVELS,
  pick,
  pickN,
  generateVariation,
} from './scenarioRandomizer';
export type { VariationRange, UrgencyLevel } from './scenarioRandomizer';
