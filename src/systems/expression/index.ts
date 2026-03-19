/**
 * Expression System — barrel export
 */

export type {
  ExpressionPacket,
  EmotionType,
  EmotionState,
  BodyLanguageState,
  VocalTone,
  VocalStyle,
  PhysicalState,
  PresenceState,
  BiomeTag,
  EnvironmentInfluence,
  DeceptionLayer,
  AttentionTarget,
} from './ExpressionPacket';
export { DEFAULT_EXPRESSION } from './ExpressionPacket';

export { ExpressionDeriver } from './ExpressionDeriver';
export { EmotionalMomentumTracker } from './EmotionalMomentumTracker';
export { ExpressionCssEngine } from './ExpressionCssEngine';
export type { ExpressionDataAttributes, ExpressionCssVars } from './ExpressionCssEngine';
