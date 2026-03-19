import { CampaignBlueprintAdapter, type CampaignBlueprintAdapterInput } from '@/systems/adapters/CampaignBlueprintAdapter';
import { BlueprintRegistry } from '@/systems/blueprints/BlueprintRegistry';
import { CampaignSeedBuilder } from '@/systems/foundations/campaign/CampaignSeedBuilder';
import { ConflictFramework } from '@/systems/storylogic/ConflictFramework';
import { EscalationFramework } from '@/systems/storylogic/EscalationFramework';
import { StakesFramework } from '@/systems/storylogic/StakesFramework';
import { StoryLogicFramework } from '@/systems/storylogic/StoryLogicFramework';
import type { GeneratedCampaignSeed } from '@/systems/generated/GeneratedCampaignSeed';
import { CompositionEngine } from './CompositionEngine';

export interface CampaignCompositionInput extends CampaignBlueprintAdapterInput {
  theme?: string | null;
  goal?: string | null;
}

export const CampaignCompositionEngine = {
  compose(input: CampaignCompositionInput): GeneratedCampaignSeed {
    const blueprint = CampaignBlueprintAdapter.fromCampaign(input);
    BlueprintRegistry.register(blueprint);
    const composition = CompositionEngine.compose({ kind: 'campaign', blueprintIds: [blueprint.id] });
    const storyLogic = StoryLogicFramework.build({
      centralConflict: String(composition.blueprint.payload.centralTension || input.theme || input.goal || 'unstable status quo'),
      pressureSources: composition.runtime.pressureIdentity,
      pacingCurve: composition.runtime.narrativeImplications,
      stakes: StakesFramework.build(composition.runtime.tags),
    });
    const seed = CampaignSeedBuilder.build({
      theme: input.theme,
      goal: input.goal,
      tags: composition.runtime.tags,
      worldState: input.world_state,
      currentZone: input.current_zone,
      storyLogic,
      actorIdentity: (input.story_context as Record<string, unknown> | null)?.generatedActorIdentity as Record<string, unknown> | null,
    });
    const conflict = ConflictFramework.build(seed.centralTension, composition.runtime.tags);

    return {
      blueprintId: blueprint.id,
      centralTension: storyLogic.centralConflict,
      openingHook: seed.openingHook,
      pressureSources: [...new Set([...seed.pressureSources, ...storyLogic.pressureSources, ...composition.runtime.pressureIdentity])],
      worldFriction: [...new Set([...seed.worldFriction, conflict.core, ...composition.runtime.sceneOutputs.environmentalPressure])],
      allies: seed.allies,
      enemies: seed.enemies,
      likelyObjectives: seed.likelyObjectives,
      pacingCurve: [...new Set([...seed.pacingCurve, ...storyLogic.pacingCurve, ...EscalationFramework.build(composition.runtime.tags)])],
      mysteryDensity: seed.mysteryDensity,
      conflictDensity: seed.conflictDensity,
      encounterOpportunities: seed.encounterOpportunities,
      npcPresence: seed.npcPresence,
      environmentalIdentity: [...new Set([...seed.environmentalIdentity, ...composition.runtime.tags])],
      progressionShape: seed.progressionShape,
      tags: composition.runtime.tags,
      metadata: {
        stakes: storyLogic.stakes,
        conflict,
        runtime: composition.runtime,
      },
    };
  },
};

