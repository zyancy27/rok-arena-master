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
    const playbackMetadata = buildNarratorMessageMetadata(
      {
        ...generatedMetadata,
        ...sourceMetadata,
      },
      fallbackPlayback,
    );
    const metadata = {
      ...generatedMetadata,
      ...sourceMetadata,
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
