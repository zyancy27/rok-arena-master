import { NarrationPacketBuilder } from '@/systems/narration/NarrationPacketBuilder';
import type { ActionPipelineResult, NarrationPacket } from '@/systems/types/PipelineTypes';
import { buildGeneratedRuntimeMetadata } from './GeneratedRuntimeBridge';

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function collectPipelineMetadata(result: ActionPipelineResult) {
  const generatedPackets = result.generatedPackets ?? result.context.generated;

  return {
    ...asRecord(result.context.metadata),
    ...asRecord(result.narrationPacket.metadata),
    ...buildGeneratedRuntimeMetadata(generatedPackets),
    contextPacket: result.context,
    resolvedActionPacket: result.resolvedAction,
    npcReactionPacket: result.npcReaction,
    sceneEffectPacket: result.sceneEffects,
  };
}

export function buildPlayerMessageMetadata(
  result: ActionPipelineResult,
  extraMetadata: Record<string, unknown> = {},
) {
  return {
    ...collectPipelineMetadata(result),
    intentDebug: result.resolvedAction.intentDebug,
    actionResult: result.resolvedAction.actionResult,
    combatResult: result.resolvedAction.combatResult ?? null,
    ...extraMetadata,
  };
}

export function buildNarratorMessagePacket(
  result: ActionPipelineResult,
  narratorText: string,
  narratorSource?: unknown,
): NarrationPacket {
  const narrationPacket = NarrationPacketBuilder.build({
    resolvedAction: result.resolvedAction,
    npcReaction: result.npcReaction,
    sceneEffects: result.sceneEffects,
    narratorText,
    narratorSource,
    generatedPackets: result.generatedPackets ?? result.context.generated,
  });

  narrationPacket.metadata = {
    ...collectPipelineMetadata(result),
    ...asRecord(narrationPacket.metadata),
    narrationContext: narrationPacket.context,
    voiceSettings: narrationPacket.voiceSettings,
    soundCue: narrationPacket.soundCue,
    animationTag: narrationPacket.animationTag,
    diceMetadata: narrationPacket.diceMetadata,
    npcReactionSummary: narrationPacket.npcReactionSummary,
    mapEffectTags: narrationPacket.mapEffectTags,
  };
  narrationPacket.generated = result.generatedPackets ?? result.context.generated;

  return narrationPacket;
}
