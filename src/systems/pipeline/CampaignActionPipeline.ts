import type { Campaign, CampaignParticipant, CampaignTime } from '@/lib/campaign-types';
import { IntentEngine } from '@/systems/intent/IntentEngine';
import { CombatResolver } from '@/systems/combat/CombatResolver';
import { createCombatState } from '@/systems/combat/CombatState';
import { EffectCompositionEngine } from '@/systems/composition/EffectCompositionEngine';
import { EncounterCompositionEngine } from '@/systems/composition/EncounterCompositionEngine';
import { SceneCompositionEngine } from '@/systems/composition/SceneCompositionEngine';
import { CampaignContextAssembler } from '@/systems/context/CampaignContextAssembler';
import { buildResolvedActionPacket } from './ActionPipeline';
import { attachGeneratedToContext } from './GeneratedRuntimeBridge';
import { NpcReactionCoordinator } from '@/systems/npc/NpcReactionCoordinator';
import { NarrationPacketBuilder } from '@/systems/narration/NarrationPacketBuilder';
import { SceneEffectBridge } from '@/systems/map/SceneEffectBridge';
import { CharacterIdentityGenerator } from '@/systems/identity/CharacterIdentityGenerator';
import { NpcIdentityGenerator } from '@/systems/identity/NpcIdentityGenerator';
import { WorldIdentityGenerator } from '@/systems/identity/WorldIdentityGenerator';
import { SparseCampaignSeedBuilder } from '@/systems/campaign/SparseCampaignSeedBuilder';
import { RelationshipPersistenceEngine, type RelationshipPersistenceSnapshot } from '@/systems/memory/RelationshipPersistenceEngine';
import { WorldMemoryEngine } from '@/systems/memory/WorldMemoryEngine';

import { SceneDerivationEngine } from '@/systems/scene/SceneDerivationEngine';
import { EffectDerivationEngine } from '@/systems/effects/EffectDerivationEngine';
import type { ActionPipelineResult, GeneratedRuntimePackets } from '@/systems/types/PipelineTypes';

export interface CampaignActionPipelineInput {
  rawText: string;
  participant: CampaignParticipant;
  campaign: Campaign;
  equippedItems?: string[];
  activeHazards?: string[];
  environmentTags?: string[];
  activeEnemies?: Array<{
    id: string;
    name: string;
    tier: number;
    hp: number;
    hp_max: number;
    description?: string | null;
    behavior_profile?: string | null;
    last_action?: string | null;
    metadata?: Record<string, unknown> | null;
    status?: string;
  }>;
  knownNpcs?: Array<{ id?: string; name: string; role?: string; current_zone?: string | null; [key: string]: unknown }>;
  partyContext?: string[];
  relationshipState?: unknown[];
  memoryState?: unknown[];
}

export interface CampaignActionPipelineResult extends ActionPipelineResult {
  primaryEnemy: CampaignActionPipelineInput['activeEnemies'] extends Array<infer T> ? T | null : never;
}

function extractChaosLevel(worldState: Record<string, unknown> | null | undefined) {
  return Number(worldState?.chaosLevel ?? 40);
}

function extractEscapeRoutes(worldState: Record<string, unknown> | null | undefined) {
  return Number(worldState?.escapeRoutes ?? 2);
}

function deriveRelationshipSignals(rawText: string, combatResult: ReturnType<typeof CombatResolver.resolve> | null) {
  const joined = `${rawText} ${combatResult?.outcome || ''}`.toLowerCase();
  return [
    /protect|save|shield|help/.test(joined) ? 'protect' : null,
    /threat|threaten|intimidate/.test(joined) ? 'threaten' : null,
    /talk|negotiate|trade|deal/.test(joined) ? 'negotiate' : null,
    /betray|abandon/.test(joined) ? 'betray' : null,
    /repair|restore|stabilize/.test(joined) ? 'repair' : null,
  ].filter((value): value is string => Boolean(value));
}

export const CampaignActionPipeline = {
  execute(input: CampaignActionPipelineInput): CampaignActionPipelineResult {
    const activeEnemies = (input.activeEnemies || []).filter((enemy) => enemy.status === 'active' || enemy.status === 'hiding' || !enemy.status);
    const knownNpcs = input.knownNpcs || [];
    const defaultTool = input.equippedItems?.[0] ?? null;
    const character = (input.participant.character || null) as Record<string, unknown> | null;

    const intentResult = IntentEngine.resolve(input.rawText, {
      mode: 'campaign',
      actorName: input.participant.character?.name,
      possibleTargets: [
        ...activeEnemies.map((enemy) => ({ id: enemy.id, name: enemy.name, kind: 'enemy' as const })),
        ...knownNpcs.map((npc) => ({ id: typeof npc.id === 'string' ? npc.id : undefined, name: npc.name, kind: 'npc' as const })),
      ],
      defaultTool,
    });

    const context = CampaignContextAssembler.assemble({
      actor: {
        characterId: input.participant.character_id,
        name: input.participant.character?.name || 'Character',
        tier: input.participant.character?.level || input.participant.campaign_level,
        stats: {
          stat_strength: input.participant.character?.stat_strength ?? 50,
          stat_speed: Number(character?.stat_speed ?? 50),
          stat_power: Number(character?.stat_power ?? 50),
          stat_skill: Number(character?.stat_skill ?? 50),
          stat_battle_iq: Number(character?.stat_battle_iq ?? 50),
          stat_durability: Number(character?.stat_durability ?? 50),
          stat_stamina: Number(character?.stat_stamina ?? 50),
          stat_intelligence: Number(character?.stat_intelligence ?? 50),
          stat_luck: Number(character?.stat_luck ?? 50),
        },
        abilities: input.participant.character?.abilities,
        powers: input.participant.character?.powers,
        equippedItems: input.equippedItems,
        stamina: Math.round((input.participant.campaign_hp / Math.max(1, input.participant.campaign_hp_max)) * 100),
      },
      activeEnemies: activeEnemies.map((enemy) => ({
        id: enemy.id,
        name: enemy.name,
        tier: enemy.tier,
        hp: enemy.hp,
        hpMax: enemy.hp_max,
        description: enemy.description,
        behaviorProfile: enemy.behavior_profile,
        lastAction: enemy.last_action,
        metadata: enemy.metadata,
      })),
      knownNpcs,
      currentZone: input.campaign.current_zone,
      environmentTags: input.environmentTags ?? input.campaign.environment_tags,
      activeHazards: input.activeHazards,
      worldState: input.campaign.world_state,
      partyContext: input.partyContext,
      relationshipState: input.relationshipState,
      memoryState: input.memoryState,
    });

    const generatedActorIdentity = CharacterIdentityGenerator.generate({
      id: input.participant.character_id,
      name: input.participant.character?.name,
      level: input.participant.character?.level || input.participant.campaign_level,
      powers: input.participant.character?.powers,
      abilities: input.participant.character?.abilities,
      personality: typeof character?.personality === 'string' ? character.personality : null,
      mentality: typeof character?.mentality === 'string' ? character.mentality : null,
      race: typeof character?.race === 'string' ? character.race : null,
      sub_race: typeof character?.sub_race === 'string' ? character.sub_race : null,
      lore: typeof character?.lore === 'string' ? character.lore : null,
      weapons_items: typeof character?.weapons_items === 'string' ? character.weapons_items : null,
      appearance_aura: typeof character?.appearance_aura === 'string' ? character.appearance_aura : null,
      appearance_movement_style: typeof character?.appearance_movement_style === 'string' ? character.appearance_movement_style : null,
      appearance_voice: typeof character?.appearance_voice === 'string' ? character.appearance_voice : null,
      stat_strength: input.participant.character?.stat_strength,
      stat_speed: Number(character?.stat_speed ?? 50),
      stat_power: Number(character?.stat_power ?? 50),
      stat_skill: Number(character?.stat_skill ?? 50),
      stat_battle_iq: Number(character?.stat_battle_iq ?? 50),
    });

    const sparseSeed = SparseCampaignSeedBuilder.build({
      id: input.campaign.id,
      name: input.campaign.name,
      description: input.campaign.description,
      current_zone: input.campaign.current_zone,
      chosen_location: input.campaign.chosen_location,
      environment_tags: input.campaign.environment_tags,
      world_state: input.campaign.world_state,
      story_context: input.campaign.story_context,
      theme: String((input.campaign.story_context as Record<string, unknown> | null)?.theme || input.campaign.description || ''),
      goal: String((input.campaign.story_context as Record<string, unknown> | null)?.goal || ''),
      character: {
        id: input.participant.character_id,
        name: input.participant.character?.name,
        level: input.participant.character?.level || input.participant.campaign_level,
        powers: input.participant.character?.powers,
        abilities: input.participant.character?.abilities,
        personality: typeof character?.personality === 'string' ? character.personality : null,
        mentality: typeof character?.mentality === 'string' ? character.mentality : null,
        race: typeof character?.race === 'string' ? character.race : null,
        sub_race: typeof character?.sub_race === 'string' ? character.sub_race : null,
        lore: typeof character?.lore === 'string' ? character.lore : null,
        weapons_items: typeof character?.weapons_items === 'string' ? character.weapons_items : null,
        appearance_aura: typeof character?.appearance_aura === 'string' ? character.appearance_aura : null,
        appearance_movement_style: typeof character?.appearance_movement_style === 'string' ? character.appearance_movement_style : null,
        appearance_voice: typeof character?.appearance_voice === 'string' ? character.appearance_voice : null,
        stat_strength: input.participant.character?.stat_strength,
        stat_speed: Number(character?.stat_speed ?? 50),
        stat_power: Number(character?.stat_power ?? 50),
        stat_skill: Number(character?.stat_skill ?? 50),
        stat_battle_iq: Number(character?.stat_battle_iq ?? 50),
      },
    });
    const generatedCampaignSeed = sparseSeed.generatedCampaignSeed;

    const generatedWorldState = WorldIdentityGenerator.generate({
      id: `campaign-world:${input.campaign.id}`,
      name: input.campaign.current_zone,
      regionType: input.campaign.current_zone,
      environmentTags: [...(input.environmentTags ?? input.campaign.environment_tags ?? []), ...generatedCampaignSeed.environmentalIdentity],
      activeHazards: input.activeHazards ?? [],
      factionPresence: [...knownNpcs.map((npc) => String(npc.role || 'local actors')), ...generatedCampaignSeed.npcPresence],
    });

    const generatedNpcIdentity = knownNpcs[0]
      ? NpcIdentityGenerator.generate({
          id: typeof knownNpcs[0].id === 'string' ? knownNpcs[0].id : undefined,
          name: knownNpcs[0].name,
          role: typeof knownNpcs[0].role === 'string' ? knownNpcs[0].role : null,
          current_zone: knownNpcs[0].current_zone,
          personality: typeof knownNpcs[0].personality === 'string' ? knownNpcs[0].personality : null,
          npc_goal: typeof knownNpcs[0].npc_goal === 'string' ? knownNpcs[0].npc_goal : null,
          npc_motivation: typeof knownNpcs[0].npc_motivation === 'string' ? knownNpcs[0].npc_motivation : null,
          npc_current_activity: typeof knownNpcs[0].npc_current_activity === 'string' ? knownNpcs[0].npc_current_activity : null,
          metadata: knownNpcs[0] as Record<string, unknown>,
        })
      : null;

    const generatedEncounter = EncounterCompositionEngine.compose({
      id: `campaign-encounter:${input.campaign.id}`,
      name: input.campaign.current_zone || input.campaign.name,
      situationType: intentResult.intent.isCombatAction ? 'campaign confrontation' : 'campaign situation',
      environmentTags: [...context.environmentTags, ...generatedWorldState.environmentalIdentity],
      activeHazards: [...context.activeHazards, ...generatedWorldState.hazardPosture],
      actorTags: [...generatedActorIdentity.tags, ...generatedActorIdentity.effectBias, ...generatedActorIdentity.rolePosture],
      campaignTags: [...generatedCampaignSeed.tags, ...generatedCampaignSeed.pressureSources, ...generatedCampaignSeed.npcPresence],
      npcTags: [
        ...(generatedNpcIdentity?.tags || []),
        ...(generatedNpcIdentity?.threatPosture || []),
        ...activeEnemies.map((enemy) => enemy.name.toLowerCase().replace(/\s+/g, '_')),
      ],
      pressureSeed: [...generatedCampaignSeed.pressureSources, ...generatedActorIdentity.pressureIdentity],
    });

    // World simulation is now narrator-owned (server-side). Derive minimal drift tags from existing generated state.
    const worldTickDriftTags = [
      ...generatedCampaignSeed.pressureSources.slice(0, 2),
      ...(generatedNpcIdentity?.motivations.slice(0, 1).map((g) => `npc-goal:${g}`) || []),
    ];

    const worldMemory = WorldMemoryEngine.summarize(WorldMemoryEngine.update({
      worldId: input.campaign.id,
      factions: (generatedWorldState.factionPresence || []).slice(0, 3).map((faction, index) => ({
        factionId: `${index}:${faction}`,
        pressureHistory: [],
        activeConflicts: generatedCampaignSeed.pressureSources.slice(0, 2),
        stability: 55,
      })),
      locations: [{
        locationId: input.campaign.current_zone || input.campaign.id,
        hazardHistory: [],
        changeMarkers: [],
        stability: 52,
      }],
      rumorSeeds: (input.memoryState || []).map((entry) => String(entry)),
    }, {
      type: 'location',
      id: input.campaign.current_zone || input.campaign.id,
      detail: 'location shifts',
    }));

    const relationshipSignals = deriveRelationshipSignals(input.rawText, null);
    const relationshipPersistence: RelationshipPersistenceSnapshot[] = (knownNpcs[0] ? [RelationshipPersistenceEngine.update({
      entityId: String(knownNpcs[0].id || knownNpcs[0].name),
      trust: 50,
      disposition: 'uncertain',
      definingMoments: [],
    }, relationshipSignals[0] || 'talk')] : []);

    const generatedSceneState = SceneDerivationEngine.derive({
      actorIdentity: generatedActorIdentity,
      campaignSeed: generatedCampaignSeed,
      worldState: generatedWorldState,
      npcIdentity: generatedNpcIdentity,
      encounter: generatedEncounter,
      sceneState: SceneCompositionEngine.compose({
        blueprintIds: [
          generatedActorIdentity.blueprintId,
          generatedCampaignSeed.blueprintId,
          generatedWorldState.blueprintId,
          generatedNpcIdentity?.blueprintId,
          generatedEncounter.blueprintId,
        ].filter(Boolean) as string[],
        tags: [
          ...generatedActorIdentity.tags,
          ...generatedActorIdentity.pressureIdentity,
          ...generatedActorIdentity.effectBias,
          ...generatedCampaignSeed.tags,
          ...generatedCampaignSeed.pressureSources,
          ...generatedCampaignSeed.npcPresence,
          ...generatedWorldState.tags,
          ...generatedWorldState.environmentalIdentity,
          ...generatedWorldState.visualEffectProfile,
          ...(generatedNpcIdentity?.tags || []),
          ...(generatedNpcIdentity?.threatPosture || []),
          ...generatedEncounter.tags,
        ],
      }),
    }, {
      activeHazards: context.activeHazards,
      environmentTags: context.environmentTags,
      worldTickTags: worldTick.driftTags,
      narratorMetadata: {
        actorNarrationBias: generatedActorIdentity.narrationBias,
        npcNarrationBias: generatedNpcIdentity?.narrationBias,
        worldVolatility: generatedWorldState.volatilityProfile,
      },
    });

    const generatedPackets: GeneratedRuntimePackets = {
      actorIdentity: generatedActorIdentity,
      campaignSeed: generatedCampaignSeed,
      worldState: generatedWorldState,
      npcIdentity: generatedNpcIdentity,
      encounter: generatedEncounter,
      sceneState: generatedSceneState,
    };

    attachGeneratedToContext(context, generatedPackets);
    context.metadata = {
      ...(context.metadata || {}),
      activeCharacterIdentity: generatedActorIdentity,
      activeNpcIdentity: generatedNpcIdentity,
      activeWorldIdentity: generatedWorldState,
      relationshipPersistence,
      worldMemory,
      worldTick,
    };

    const primaryEnemy = activeEnemies[0] ?? null;
    const targetContext = context.primaryTarget?.kind === 'enemy' ? context.primaryTarget.context ?? null : null;
    const combatResult = intentResult.intent.isCombatAction && primaryEnemy && targetContext
      ? CombatResolver.resolve(
          intentResult.intent,
          context.actor,
          createCombatState({
            participants: [
              {
                id: input.participant.character_id,
                name: input.participant.character?.name || 'Character',
                stats: {
                  hp: input.participant.campaign_hp,
                  stamina: context.actor.stamina,
                  speed: context.actor.stats.stat_speed,
                  strength: context.actor.stats.stat_strength,
                },
              },
              {
                id: primaryEnemy.id,
                name: primaryEnemy.name,
                stats: {
                  hp: primaryEnemy.hp,
                  stamina: 100,
                  speed: targetContext.stats.stat_speed,
                  strength: targetContext.stats.stat_strength,
                },
              },
            ],
            rangeZone: 'mid',
            zone: input.campaign.current_zone,
            terrainTags: [...(input.activeHazards ?? []), ...generatedWorldState.hazardPosture, ...generatedActorIdentity.movementIdentity],
          }),
          {
            actorId: input.participant.character_id,
            targetId: primaryEnemy.id,
            targetContext,
          },
        )
      : null;

    const resolvedAction = buildResolvedActionPacket({
      rawText: input.rawText,
      intentResult,
      context,
      actorContext: context.actor,
      targetContext,
      combatResult,
    });

    const npcReaction = NpcReactionCoordinator.resolve({
      activeEnemies: primaryEnemy ? [{
        id: primaryEnemy.id,
        name: primaryEnemy.name,
        tier: primaryEnemy.tier,
        hp: primaryEnemy.hp,
        hpMax: primaryEnemy.hp_max,
        description: primaryEnemy.description,
        behaviorProfile: primaryEnemy.behavior_profile,
        lastAction: primaryEnemy.last_action,
        metadata: {
          ...(primaryEnemy.metadata || {}),
          generatedNpcIdentity,
          generatedEncounter,
        },
      }] : [],
      actor: {
        id: input.participant.character_id,
        name: input.participant.character?.name || 'Character',
        healthPct: Math.round((input.participant.campaign_hp / Math.max(1, input.participant.campaign_hp_max)) * 100),
        context: context.actor,
      },
      timeOfDay: input.campaign.time_of_day as CampaignTime,
      chaosLevel: extractChaosLevel(input.campaign.world_state),
      escapeRoutes: extractEscapeRoutes(input.campaign.world_state),
      combatResult,
      worldContext: {
        zone: context.zone,
        environmentTags: context.environmentTags,
        relationshipSummary: context.relationshipContext.summary,
        memorySummary: context.memoryContext.summary,
        generatedPackets,
        generatedCampaignSeed,
        generatedWorldState,
        relationshipPersistence,
        worldMemory,
        worldTick,
      },
    });

    const seededSceneEffects = SceneEffectBridge.build(context, resolvedAction, npcReaction);
    const generatedEffectState = EffectDerivationEngine.derive({
      ...generatedPackets,
      effectState: EffectCompositionEngine.compose({
        name: 'campaign-turn',
        tags: [
          ...context.environmentTags,
          ...generatedSceneState.effectTags,
          ...generatedSceneState.chatPresentationTags,
          ...generatedActorIdentity.effectBias,
          ...(generatedNpcIdentity?.effectBias || []),
          ...generatedWorldState.visualEffectProfile,
          ...generatedWorldState.audioPressureProfile,
          ...seededSceneEffects.zoneShiftTags,
          ...seededSceneEffects.hazardPulseTags,
          ...seededSceneEffects.enemyPresenceTags,
          ...seededSceneEffects.environmentalPressureTags,
        ],
        environmentState: {
          zone: context.zone,
          worldState: input.campaign.world_state,
          sceneState: context.sceneState,
          scenePressure: generatedSceneState.scenePressure,
        },
      }),
    }, {
      sceneEffectPacket: seededSceneEffects,
      narratorSceneContext: context.narratorSceneContext,
    });

    generatedPackets.effectState = generatedEffectState;
    attachGeneratedToContext(context, generatedPackets);

    const sceneEffects = SceneEffectBridge.build(context, resolvedAction, npcReaction);
    const narrationPacket = NarrationPacketBuilder.build({
      resolvedAction,
      npcReaction,
      sceneEffects,
      generatedPackets,
    });
    narrationPacket.generated = generatedPackets;
    narrationPacket.metadata = {
      ...(narrationPacket.metadata || {}),
      sceneEffectPacket: sceneEffects,
    };

    return {
      context,
      resolvedAction,
      npcReaction,
      sceneEffects,
      narrationPacket,
      generatedPackets,
      primaryEnemy,
    };
  },
};
