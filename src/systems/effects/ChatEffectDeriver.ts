import type { GeneratedRuntimePackets } from '@/systems/types/PipelineTypes';

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
}

export const ChatEffectDeriver = {
  derive(packets: GeneratedRuntimePackets) {
    const scene = packets.sceneState;
    const actor = packets.actorIdentity;

    return [...new Set([
      ...toStringArray(packets.effectState?.chatBehaviors),
      ...toStringArray(scene?.chatPresentationTags),
      ...toStringArray(actor?.expressionIdentity).map((entry) => `expression:${entry}`),
      scene?.npcSocialReadiness ? `social:${scene.npcSocialReadiness}` : null,
    ].filter((entry): entry is string => Boolean(entry)))];
  },
};
