/**
 * Action Classification
 *
 * Takes raw move text and produces a structured CombatAction
 * by combining intent interpretation with hit detection.
 */

import { interpretMove, type MoveIntent } from '@/lib/intent-interpreter';
import { detectDirectInteraction, classifyInteraction, type HitDetectionResult } from '@/lib/battle-hit-detection';
import { isMentalAttack } from '@/lib/move-validation';

export interface CombatAction {
  /** Original player text (never modified) */
  rawText: string;
  /** Intent metadata from interpreter */
  intent: MoveIntent;
  /** Hit detection result */
  hitDetection: HitDetectionResult;
  /** Interaction classification */
  interactionType: 'physical_attack' | 'ranged_attack' | 'grapple' | 'defensive' | 'none';
  /** Whether this is a mental/psychic attack */
  isMental: boolean;
  /** Whether dice should be rolled */
  requiresDiceRoll: boolean;
  /** Whether defense resolution is needed */
  requiresDefenseCheck: boolean;
}

/**
 * Classify a raw move text into a structured CombatAction.
 * Pure function — no side effects.
 */
export function classifyAction(moveText: string): CombatAction {
  const intent = interpretMove(moveText);
  const hitDetection = detectDirectInteraction(moveText);
  const interactionType = classifyInteraction(hitDetection);
  const mental = isMentalAttack(moveText);

  return {
    rawText: moveText,
    intent,
    hitDetection,
    interactionType,
    isMental: mental,
    requiresDiceRoll: hitDetection.shouldTriggerHitCheck,
    requiresDefenseCheck: hitDetection.shouldTriggerDefenseCheck,
  };
}
