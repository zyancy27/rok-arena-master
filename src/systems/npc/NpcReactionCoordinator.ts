import type { CampaignTime } from '@/lib/campaign-types';
import { buildCampaignNpcTurn } from './NpcBrainAdapters';
import type { NpcReactionPacket } from '@/systems/types/PipelineTypes';
import type { StructuredCombatResult } from '@/systems/combat/CombatResolver';
import type { ResolvedCharacterContext } from '@/systems/character/CharacterContextResolver';

export interface NpcReactionCoordinatorInput {
  activeEnemies?: Array<{
    id: string;
    name: string;
    tier: number;
    hp: number;
    hpMax: number;
    description?: string | null;
    behaviorProfile?: string | null;
    lastAction?: string | null;
    metadata?: Record<string, unknown> | null;
  }>;
  actor: {
    id: string;
    name: string;
    healthPct: number;
    context: ResolvedCharacterContext;
  };
  timeOfDay: CampaignTime;
  chaosLevel: number;
  escapeRoutes?: number;
  combatResult?: StructuredCombatResult | null;
}

export const NpcReactionCoordinator = {
  resolve(input: NpcReactionCoordinatorInput): NpcReactionPacket | null {
    const primaryEnemy = input.activeEnemies?.[0];
    if (!primaryEnemy) return null;

    const turn = buildCampaignNpcTurn({
      enemy: {
        id: primaryEnemy.id,
        name: primaryEnemy.name,
        tier: primaryEnemy.tier,
        hp: primaryEnemy.hp,
        hpMax: primaryEnemy.hpMax,
        description: primaryEnemy.description,
        behaviorProfile: primaryEnemy.behaviorProfile,
        lastAction: primaryEnemy.lastAction,
        metadata: primaryEnemy.metadata,
      },
      player: input.actor,
      combatResult: input.combatResult,
      timeOfDay: input.timeOfDay,
      chaosLevel: input.chaosLevel,
      escapeRoutes: input.escapeRoutes,
    });

    return {
      summary: turn.summary,
      focusTargetId: turn.focusTargetId,
      narration: {
        text: turn.narration.text,
        voiceRate: turn.narration.voiceRate,
        voicePitch: turn.narration.voicePitch,
        soundCue: turn.narration.soundCue,
        animationTag: turn.narration.animationTag,
      },
      rawTurn: turn,
      metadata: {
        intent: turn.intent,
        action: turn.action,
      },
    };
  },
};
