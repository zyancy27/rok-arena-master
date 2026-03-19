import type { CampaignTime } from '@/lib/campaign-types';
import { buildGeneratedRuntimeMetadata, getGeneratedRuntimePackets } from '@/systems/pipeline/GeneratedRuntimeBridge';
import type { NpcReactionPacket } from '@/systems/types/PipelineTypes';
import type { StructuredCombatResult } from '@/systems/combat/CombatResolver';
import type { ResolvedCharacterContext } from '@/systems/character/CharacterContextResolver';
import type { GeneratedRuntimePackets } from '@/systems/types/PipelineTypes';
import { buildCampaignNpcTurn } from './NpcBrainAdapters';

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
  worldContext?: {
    zone?: string | null;
    environmentTags?: string[];
    relationshipSummary?: string[];
    memorySummary?: string[];
    generatedPackets?: GeneratedRuntimePackets;
    generatedCampaignSeed?: unknown;
    generatedWorldState?: unknown;
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export const NpcReactionCoordinator = {
  resolve(input: NpcReactionCoordinatorInput): NpcReactionPacket | null {
    const primaryEnemy = input.activeEnemies?.[0];
    if (!primaryEnemy) return null;

    const generatedPackets = input.worldContext?.generatedPackets ?? getGeneratedRuntimePackets(input.worldContext);
    const generatedSceneState = asRecord(generatedPackets.sceneState);
    const generatedNpcIdentity = asRecord(generatedPackets.npcIdentity);
    const generatedEncounter = asRecord(generatedPackets.encounter);

    const scenePressure = typeof generatedSceneState.scenePressure === 'string' ? generatedSceneState.scenePressure : null;
    const npcSocialReadiness = typeof generatedSceneState.npcSocialReadiness === 'string' ? generatedSceneState.npcSocialReadiness : null;
    const movementFriction = typeof generatedSceneState.movementFriction === 'string' ? generatedSceneState.movementFriction : null;
    const socialPosture = toStringArray(generatedNpcIdentity.socialPosture);
    const tacticalPressure = toStringArray(generatedEncounter.tacticalPressure);

    const effectiveChaosLevel = clamp(
      input.chaosLevel
        + (scenePressure === 'critical' ? 15 : scenePressure === 'high' ? 8 : scenePressure === 'low' ? -4 : 0)
        + (npcSocialReadiness === 'hostile' ? 12 : npcSocialReadiness === 'tense' ? 5 : 0)
        + (socialPosture.some((entry) => /cautious|guarded|measured/.test(entry)) ? -3 : 0)
        + (tacticalPressure.some((entry) => /ambush|overwhelming|explosive|killbox/.test(entry)) ? 8 : 0),
      0,
      100,
    );

    const effectiveEscapeRoutes = Math.max(
      0,
      (input.escapeRoutes ?? 2)
        + (movementFriction === 'locked' ? -2 : movementFriction === 'restricted' ? -1 : movementFriction === 'open' ? 1 : 0),
    );

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
        metadata: {
          ...(primaryEnemy.metadata || {}),
          ...buildGeneratedRuntimeMetadata(generatedPackets),
        },
      },
      player: input.actor,
      combatResult: input.combatResult,
      timeOfDay: input.timeOfDay,
      chaosLevel: effectiveChaosLevel,
      escapeRoutes: effectiveEscapeRoutes,
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
      generated: generatedPackets,
      metadata: {
        intent: turn.intent,
        action: turn.action,
        worldContext: input.worldContext,
        effectiveChaosLevel,
        effectiveEscapeRoutes,
        ...buildGeneratedRuntimeMetadata(generatedPackets),
      },
    };
  },
};
