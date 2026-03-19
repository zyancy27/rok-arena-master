import type { ContextPacket, ContextTargetPacket } from '@/systems/types/PipelineTypes';

export function createContextTarget(target: ContextTargetPacket): ContextTargetPacket {
  return {
    id: target.id,
    name: target.name,
    kind: target.kind,
    context: target.context ?? null,
    metadata: target.metadata,
  };
}

export function finalizeContextPacket(context: ContextPacket): ContextPacket {
  return {
    ...context,
    targets: context.targets.map(createContextTarget),
    primaryTarget: context.primaryTarget ? createContextTarget(context.primaryTarget) : null,
    environmentTags: [...context.environmentTags],
    activeHazards: [...context.activeHazards],
    partyContext: context.partyContext ? [...context.partyContext] : undefined,
    relationshipContext: {
      entries: [...context.relationshipContext.entries],
      summary: [...context.relationshipContext.summary],
    },
    memoryContext: {
      entries: [...context.memoryContext.entries],
      summary: [...context.memoryContext.summary],
    },
    sceneState: { ...context.sceneState },
    metadata: context.metadata ? { ...context.metadata } : undefined,
  };
}
