import type { CampaignTime } from '@/lib/campaign-types';
import type { ResolvedCharacterContext } from '@/systems/character/CharacterContextResolver';
import type { StructuredCombatResult } from '@/systems/combat/CombatResolver';
import { buildGeneratedRuntimeMetadata } from '@/systems/pipeline/GeneratedRuntimeBridge';
import type { GeneratedRuntimePackets, NpcReactionPacket } from '@/systems/types/PipelineTypes';
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
    relationshipPersistence?: unknown;
    worldMemory?: unknown;
    worldTick?: unknown;
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

    const generatedPackets = input.worldContext?.generatedPackets ?? {};
    const generatedSceneState = asRecord(generatedPackets.sceneState);
    const generatedNpcIdentity = asRecord(generatedPackets.npcIdentity);
    const generatedEncounter = asRecord(generatedPackets.encounter);
    const generatedActorIdentity = asRecord(generatedPackets.actorIdentity);
    const generatedWorldState = asRecord(generatedPackets.worldState);
    const generatedCampaignSeed = asRecord(generatedPackets.campaignSeed ?? input.worldContext?.generatedCampaignSeed);
    const relationshipPersistence = Array.isArray(input.worldContext?.relationshipPersistence)
      ? input.worldContext?.relationshipPersistence as Record<string, unknown>[]
      : [];
    const worldMemory = asRecord(input.worldContext?.worldMemory);
    const worldTick = asRecord(input.worldContext?.worldTick);

    const scenePressure = typeof generatedSceneState.scenePressure === 'string' ? generatedSceneState.scenePressure : null;
    const npcSocialReadiness = typeof generatedSceneState.npcSocialReadiness === 'string' ? generatedSceneState.npcSocialReadiness : null;
    const movementFriction = typeof generatedSceneState.movementFriction === 'string' ? generatedSceneState.movementFriction : null;
    const socialPosture = toStringArray(generatedNpcIdentity.socialPosture);
    const threatPosture = toStringArray(generatedNpcIdentity.threatPosture);
    const interactionStyle = toStringArray(generatedNpcIdentity.interactionStyle);
    const dangerStyle = toStringArray(generatedNpcIdentity.dangerStyle);
    const memoryPosture = toStringArray(generatedNpcIdentity.memoryPosture);
    const tacticalPressure = toStringArray(generatedEncounter.tacticalPressure);
    const actorPressure = toStringArray(generatedActorIdentity.pressureIdentity ?? generatedActorIdentity.pressureStyle);
    const actorRolePosture = toStringArray(generatedActorIdentity.rolePosture);
    const worldTravelPressure = toStringArray(generatedWorldState.travelPressureIdentity ?? generatedWorldState.travelPressure);
    const worldHazards = toStringArray(generatedWorldState.hazardPosture ?? generatedWorldState.hazardFamilies);
    const worldFactionDensity = toStringArray(generatedWorldState.factionDensityProfile);
    const campaignPressure = toStringArray(generatedCampaignSeed.pressureSources);
    const tickFactionEvents = Array.isArray(worldTick.factions)
      ? (worldTick.factions as Record<string, unknown>[]).map((entry) => String(entry.event || ''))
      : [];
    const tickLocationEvents = Array.isArray(worldTick.locations)
      ? (worldTick.locations as Record<string, unknown>[]).map((entry) => String(entry.event || ''))
      : [];
    const tickNpcGoals = Array.isArray(worldTick.npcs)
      ? (worldTick.npcs as Record<string, unknown>[]).flatMap((entry) => toStringArray(entry.nextGoals))
      : [];
    const averageTrust = relationshipPersistence.length
      ? relationshipPersistence.reduce((sum, entry) => sum + Number(entry.trust || 0), 0) / relationshipPersistence.length
      : 50;
    const relationshipDisposition = relationshipPersistence.map((entry) => String(entry.disposition || '')).join(' ');
    const rumorHeat = toStringArray(worldMemory.rumorPressure ?? worldMemory.rumorSeeds).join(' ');

    const effectiveChaosLevel = clamp(
      input.chaosLevel
        + (scenePressure === 'critical' ? 15 : scenePressure === 'high' ? 8 : scenePressure === 'low' ? -4 : 0)
        + (npcSocialReadiness === 'hostile' ? 12 : npcSocialReadiness === 'tense' ? 5 : 0)
        + (socialPosture.some((entry) => /cautious|guarded|measured/.test(entry)) ? -3 : 0)
        + (threatPosture.some((entry) => /dominant|predatory|overwhelm/.test(entry)) ? 8 : 0)
        + (dangerStyle.some((entry) => /volatile|fear|explosive/.test(entry)) ? 5 : 0)
        + (tacticalPressure.some((entry) => /ambush|overwhelming|explosive|killbox/.test(entry)) ? 8 : 0)
        + (actorPressure.some((entry) => /relentless|aggressive|force/.test(entry)) ? 4 : 0)
        + (worldHazards.some((entry) => /fire|storm|toxic|collapse|volatile/.test(entry)) ? 4 : 0)
        + (worldFactionDensity.some((entry) => /crowded|localized/.test(entry)) ? 2 : 0)
        + (campaignPressure.some((entry) => /war|siege|hostile|crack/.test(entry)) ? 4 : 0)
        + (tickFactionEvents.some((entry) => /escalation|maneuver/.test(entry)) ? 6 : 0)
        + (tickLocationEvents.some((entry) => /destabilizes|shifts/.test(entry)) ? 5 : 0)
        + (/fraying|hostile|betray/.test(relationshipDisposition) ? 5 : 0)
        + (memoryPosture.some((entry) => /grudge|predatory/.test(entry)) ? 4 : 0)
        + (averageTrust > 65 ? -4 : averageTrust < 35 ? 5 : 0)
        + (/rumor|pressure|danger|unstable/.test(rumorHeat) ? 3 : 0),
      0,
      100,
    );

    const effectiveEscapeRoutes = Math.max(
      0,
      (input.escapeRoutes ?? 2)
        + (movementFriction === 'locked' ? -2 : movementFriction === 'restricted' ? -1 : movementFriction === 'open' ? 1 : 0)
        + (worldTravelPressure.some((entry) => /restricted|sealed|blocked/.test(entry)) ? -1 : 0)
        + (actorRolePosture.some((entry) => /protective|guarded|command/.test(entry)) ? 1 : 0),
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
          relationshipPersistence,
          worldMemory,
          worldTick,
          tickNpcGoals,
          npcIdentityModifiers: {
            rolePosture: toStringArray(generatedNpcIdentity.rolePosture),
            threatPosture,
            interactionStyle,
            narrationBias: toStringArray(generatedNpcIdentity.narrationBias),
          },
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
        relationshipDisposition,
        averageTrust,
        tickNpcGoals,
        identityInfluence: {
          rolePosture: toStringArray(generatedNpcIdentity.rolePosture),
          threatPosture,
          interactionStyle,
          memoryPosture,
        },
        ...buildGeneratedRuntimeMetadata(generatedPackets),
      },
    };
  },
};
