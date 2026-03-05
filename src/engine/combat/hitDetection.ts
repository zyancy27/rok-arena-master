/**
 * Hit Detection — Engine Wrapper
 *
 * Centralised access to hit detection and interaction classification.
 */

export {
  detectDirectInteraction,
  classifyInteraction,
  getHitDetectionContext,
  INTERACTION_VERBS,
} from '@/lib/battle-hit-detection';

export type {
  HitDetectionResult,
  InteractionIntent,
  VerbEntry,
} from '@/lib/battle-hit-detection';
