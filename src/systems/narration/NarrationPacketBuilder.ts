import { buildNarrationPlaybackOptions, buildNarratorMessageMetadata, getNarratorPlaybackMetadata } from '@/lib/narration-playback';
import { buildGeneratedRuntimeMetadata, getGeneratedRuntimePackets } from '@/systems/pipeline/GeneratedRuntimeBridge';
import type { GeneratedRuntimePackets, NarrationPacket, NpcReactionPacket, ResolvedActionPacket, SceneEffectPacket } from '@/systems/types/PipelineTypes';

export interface NarrationPacketBuilderInput {
  resolvedAction: ResolvedActionPacket;
  npcReaction?: NpcReactionPacket | null;
  sceneEffects?: SceneEffectPacket | null;
  narratorText?: string | null;
  narratorSource?: unknown;
  generatedPackets?: GeneratedRuntimePackets;
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

export const NarrationPacketBuilder = {
  build(input: NarrationPacketBuilderInput): NarrationPacket {
    const fallbackPlayback = input.npcReaction?.narration
      ? {
          context: input.resolvedAction.combatResult ? 'combat' as const : input.resolvedAction.context.narratorSceneContext,
          voiceRate: input.npcReaction.narration.voiceRate,
          voicePitch: input.npcReaction.narration.voicePitch,
          soundCue: input.npcReaction.narration.soundCue,
          animationTag: input.npcReaction.narration.animationTag,
        }
      : {
          context: input.resolvedAction.context.narratorSceneContext,
        };

    const generatedPackets = input.generatedPackets
      ?? input.sceneEffects?.generated
      ?? input.npcReaction?.generated
      ?? input.resolvedAction.context.generated
      ?? getGeneratedRuntimePackets(input.narratorSource);
    const sourceMetadata = asRecord(input.narratorSource);
    const generatedMetadata = buildGeneratedRuntimeMetadata(generatedPackets);
    const actorIdentity = generatedPackets?.actorIdentity;
    const npcIdentity = generatedPackets?.npcIdentity;
    const worldIdentity = generatedPackets?.worldState;
    const sceneState = generatedPackets?.sceneState;
    const effectState = generatedPackets?.effectState;
    const identityCueMetadata = {
      characterIdentityCues: {
        combatIdentity: toStringArray(actorIdentity?.combatIdentity),
        pressureIdentity: toStringArray((actorIdentity as any)?.pressureIdentity),
        movementIdentity: toStringArray((actorIdentity as any)?.movementIdentity),
        narrationBias: toStringArray((actorIdentity as any)?.narrationBias),
        effectBias: toStringArray((actorIdentity as any)?.effectBias),
        rolePosture: toStringArray((actorIdentity as any)?.rolePosture),
      },
      npcIdentityCues: {
        rolePosture: toStringArray((npcIdentity as any)?.rolePosture),
        threatPosture: toStringArray((npcIdentity as any)?.threatPosture),
        interactionStyle: toStringArray((npcIdentity as any)?.interactionStyle),
        narrationBias: toStringArray((npcIdentity as any)?.narrationBias),
        effectBias: toStringArray((npcIdentity as any)?.effectBias),
      },
      worldIdentityCues: {
        environmentalIdentity: toStringArray((worldIdentity as any)?.environmentalIdentity),
        hazardPosture: toStringArray((worldIdentity as any)?.hazardPosture),
        visualEffectProfile: toStringArray((worldIdentity as any)?.visualEffectProfile),
        audioPressureProfile: toStringArray((worldIdentity as any)?.audioPressureProfile),
        volatilityProfile: toStringArray((worldIdentity as any)?.volatilityProfile),
      },
      pressureCues: [
        ...(sceneState?.scenePressure ? [sceneState.scenePressure] : []),
        ...toStringArray((actorIdentity as any)?.pressureIdentity),
        ...toStringArray((npcIdentity as any)?.pressureStyle),
        ...toStringArray((worldIdentity as any)?.volatilityProfile),
      ],
      effectBiasCues: [
        ...toStringArray((actorIdentity as any)?.effectBias),
        ...toStringArray((npcIdentity as any)?.effectBias),
        ...toStringArray((worldIdentity as any)?.visualEffectProfile),
        ...toStringArray(effectState?.textEmphasisStyle),
      ],
    };
    const playbackMetadata = buildNarratorMessageMetadata(
      {
        ...generatedMetadata,
        ...sourceMetadata,
        ...identityCueMetadata,
      },
      fallbackPlayback,
    );
    const metadata = {
      ...generatedMetadata,
      ...sourceMetadata,
      ...identityCueMetadata,
      narrationFlavorTags: [
        ...toStringArray((actorIdentity as any)?.narrationBias),
        ...toStringArray((npcIdentity as any)?.narrationBias),
        ...toStringArray((worldIdentity as any)?.environmentalIdentity),
        ...toStringArray(sceneState?.narrationToneFlags),
      ],
      scenePressureTags: [
        ...(sceneState?.scenePressure ? [`scene:${sceneState.scenePressure}`] : []),
        ...toStringArray((worldIdentity as any)?.hazardPosture).map((entry) => `world:${entry}`),
        ...toStringArray((npcIdentity as any)?.threatPosture).map((entry) => `npc:${entry}`),
      ],
      ...(playbackMetadata || {}),
    };
    const playback = buildNarrationPlaybackOptions(metadata);
    const rawPlayback = getNarratorPlaybackMetadata(metadata);

    return {
      narratorText: input.narratorText ?? null,
      context: rawPlayback?.context ?? input.resolvedAction.context.narratorSceneContext,
      generated: generatedPackets,
      metadata,
      voiceSettings: playback?.voiceSettings,
      soundCue: rawPlayback?.soundCue,
      animationTag: rawPlayback?.animationTag,
      diceMetadata: input.resolvedAction.combatResult?.diceMetadata ?? null,
      npcReactionSummary: input.npcReaction?.summary ?? null,
      mapEffectTags: input.sceneEffects
        ? [
            ...input.sceneEffects.zoneShiftTags,
            ...input.sceneEffects.hazardPulseTags,
            ...input.sceneEffects.enemyPresenceTags,
            ...input.sceneEffects.environmentalPressureTags,
          ]
        : [],
    };
  },
};
