import type { GeneratedRuntimePackets } from '@/systems/types/PipelineTypes';

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
}

export const VisualEffectDeriver = {
  derive(packets: GeneratedRuntimePackets) {
    const scene = packets.sceneState;
    const world = packets.worldState;

    return [...new Set([
      ...toStringArray(packets.effectState?.visualLayers),
      ...toStringArray(scene?.effectTags).map((tag) => `visual:${tag}`),
      ...toStringArray(world?.hazardFamilies).map((tag) => `world:${tag}`),
      scene?.visualIntensity ? `intensity:${scene.visualIntensity}` : null,
    ].filter((entry): entry is string => Boolean(entry)))];
  },
};
