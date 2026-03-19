import type { GeneratedRuntimePackets } from '@/systems/types/PipelineTypes';
import { ScenePressureGenerator } from './ScenePressureGenerator';
import { SceneHazardProfileGenerator } from './SceneHazardProfileGenerator';
import { SceneEffectTagGenerator } from './SceneEffectTagGenerator';

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
}

export const SceneDerivationEngine = {
  derive(packets: GeneratedRuntimePackets) {
    const actor = packets.actorIdentity;
    const world = packets.worldState;
    const encounter = packets.encounter;
    const existingScene = packets.sceneState;
    const tags = [...new Set([
      ...toStringArray(actor?.tags),
      ...toStringArray(world?.tags),
      ...toStringArray(encounter?.tags),
      ...toStringArray(existingScene?.effectTags),
    ])];

    const pressure = ScenePressureGenerator.generate({ tags });
    const hazard = SceneHazardProfileGenerator.generate(tags);
    const effectTags = SceneEffectTagGenerator.generate(tags);

    return {
      scenePressure: existingScene?.scenePressure ?? pressure,
      hazardDensity: existingScene?.hazardDensity ?? hazard.hazardDensity,
      movementFriction: existingScene?.movementFriction ?? hazard.movementFriction,
      combatVolatility: existingScene?.combatVolatility ?? hazard.combatVolatility,
      narrationToneFlags: [...new Set([...(existingScene?.narrationToneFlags || []), `tone:${pressure}`])],
      effectTags: [...new Set([...(existingScene?.effectTags || []), ...effectTags])],
    };
  },
};
