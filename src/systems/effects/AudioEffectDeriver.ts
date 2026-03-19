import type { GeneratedRuntimePackets } from '@/systems/types/PipelineTypes';

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
}

export const AudioEffectDeriver = {
  derive(packets: GeneratedRuntimePackets) {
    const scene = packets.sceneState;

    return [...new Set([
      ...toStringArray(packets.effectState?.audioLayers),
      ...toStringArray(scene?.narrationToneFlags),
      scene?.scenePressure ? `cue:${scene.scenePressure}` : null,
      scene?.combatVolatility ? `cadence:${scene.combatVolatility}` : null,
    ].filter((entry): entry is string => Boolean(entry)))];
  },
};
