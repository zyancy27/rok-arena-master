// ChatEffectBrain — Public API

export { ChatEffectBrain, createChatEffectBrain } from './ChatEffectBrain';

export { composeEffects, composeEnvironmentEffects, composeActionEffects } from './effectComposer';
export type { ComposedChatEffect, EffectCompositionResult } from './effectComposer';

export {
  EFFECT_CATALOG,
  detectActionCategories,
  findMatchingEffects,
  getEnvironmentEffects,
} from './effectLogic';
export type { ChatEffect } from './effectLogic';
