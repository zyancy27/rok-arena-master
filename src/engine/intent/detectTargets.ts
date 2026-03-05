/**
 * Target Detection
 *
 * Determines who/what the player is targeting in their action.
 */

import type { CentralBattleState } from '../state/BattleState';

export interface TargetResult {
  /** Primary target character ID (null if no specific target) */
  primaryTargetId: string | null;
  /** Targeted construct IDs */
  targetedConstructIds: string[];
  /** Whether environment is targeted */
  targetsEnvironment: boolean;
  /** Whether self is targeted (heal, buff, etc.) */
  targetsSelf: boolean;
}

const SELF_KEYWORDS = [
  'myself', 'my own', 'self', 'heal myself', 'buff myself',
  'protect myself', 'shield myself', 'brace',
];

const ENVIRONMENT_KEYWORDS = [
  'ground', 'terrain', 'floor', 'ceiling', 'wall', 'environment',
  'surroundings', 'building', 'rubble', 'debris', 'rock', 'tree',
];

/**
 * Detect targets from action text given current battle state.
 */
export function detectTargets(
  moveText: string,
  actorId: string,
  state: CentralBattleState,
): TargetResult {
  const text = moveText.toLowerCase();

  // Self-targeting
  const targetsSelf = SELF_KEYWORDS.some(kw => text.includes(kw));

  // Environment targeting
  const targetsEnvironment = ENVIRONMENT_KEYWORDS.some(kw => text.includes(kw));

  // Construct targeting
  const targetedConstructIds: string[] = [];
  for (const [id, construct] of Object.entries(state.constructs)) {
    if (text.includes(construct.name.toLowerCase())) {
      targetedConstructIds.push(id);
    }
  }
  // Generic construct keywords
  const constructKeywords = ['barrier', 'shield', 'wall', 'construct', 'summon', 'creature'];
  if (constructKeywords.some(kw => text.includes(kw))) {
    // Find opponent's constructs
    for (const [id, construct] of Object.entries(state.constructs)) {
      if (construct.creatorId !== actorId && !targetedConstructIds.includes(id)) {
        targetedConstructIds.push(id);
      }
    }
  }

  // Primary target: default to first opponent
  let primaryTargetId: string | null = null;
  if (!targetsSelf) {
    const opponents = state.turnOrder.filter(id => id !== actorId);
    if (opponents.length === 1) {
      primaryTargetId = opponents[0];
    } else if (opponents.length > 1) {
      // Check for name mentions
      for (const oppId of opponents) {
        const oppPlayer = state.players[oppId];
        if (oppPlayer && text.includes(oppPlayer.name.toLowerCase())) {
          primaryTargetId = oppId;
          break;
        }
      }
      // Default to first opponent if no name found
      if (!primaryTargetId && targetedConstructIds.length === 0 && !targetsEnvironment) {
        primaryTargetId = opponents[0];
      }
    }
  }

  return {
    primaryTargetId,
    targetedConstructIds,
    targetsEnvironment,
    targetsSelf,
  };
}
