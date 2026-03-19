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
    const seed = CampaignSeedBuilder.build({
      theme: input.theme,
      goal: input.goal,
      tags: composition.taxonomy.tags,
      worldState: input.world_state,
      currentZone: input.current_zone,
    });
    const storyLogic = StoryLogicFramework.build({
      centralConflict: seed.centralTension,
      pressureSources: seed.pressureSources,
      pacingCurve: seed.pacingCurve,
    });
    const conflict = ConflictFramework.build(seed.centralTension, composition.taxonomy.tags);

    return {
      blueprintId: blueprint.id,
      centralTension: storyLogic.centralConflict,
      openingHook: seed.openingHook,
      pressureSources: seed.pressureSources,
      worldFriction: [...new Set([...seed.worldFriction, conflict.core])],
      allies: seed.allies,
      enemies: seed.enemies,
      likelyObjectives: seed.likelyObjectives,
      pacingCurve: [...new Set([...seed.pacingCurve, ...EscalationFramework.build(composition.taxonomy.tags)])],
      mysteryDensity: seed.mysteryDensity,
      conflictDensity: seed.conflictDensity,
      encounterOpportunities: seed.encounterOpportunities,
      npcPresence: seed.npcPresence,
      environmentalIdentity: seed.environmentalIdentity,
      progressionShape: seed.progressionShape,
      tags: composition.taxonomy.tags,
      metadata: {
        stakes: StakesFramework.build(composition.taxonomy.tags),
        conflict,
      },
    };
  },
};
