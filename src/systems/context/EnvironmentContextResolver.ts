import type { NarratorSceneContext } from '@/systems/narration/SpeechManager';

export interface EnvironmentContextInput {
  zone?: string | null;
  environmentTags?: string[];
  activeHazards?: string[];
  worldState?: Record<string, unknown> | null;
  hasThreat?: boolean;
  sceneState?: Record<string, unknown>;
}

export interface EnvironmentContextResult {
  zone: string | null;
  environmentTags: string[];
  activeHazards: string[];
  worldState: Record<string, unknown> | null;
  narratorSceneContext: NarratorSceneContext;
  sceneState: Record<string, unknown>;
}

export const EnvironmentContextResolver = {
  resolve(input: EnvironmentContextInput): EnvironmentContextResult {
    const environmentTags = (input.environmentTags || []).filter(Boolean);
    const activeHazards = (input.activeHazards || []).filter(Boolean);
    const hasThreat = Boolean(input.hasThreat);

    const narratorSceneContext: NarratorSceneContext = hasThreat
      ? 'combat'
      : activeHazards.length > 0
        ? 'danger'
        : 'ambient';

    return {
      zone: input.zone ?? null,
      environmentTags,
      activeHazards,
      worldState: input.worldState ?? null,
      narratorSceneContext,
      sceneState: {
        ...(input.sceneState || {}),
        zone: input.zone ?? null,
        environmentTags,
        activeHazards,
        threatPresent: hasThreat,
      },
    };
  },
};
