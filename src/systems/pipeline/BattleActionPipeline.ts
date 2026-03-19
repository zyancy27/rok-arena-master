import { applyHardClamp, type CharacterProfile, type ClampResult } from '@/lib/hard-clamp';
import { IntentEngine } from '@/systems/intent/IntentEngine';
import { CombatResolver } from '@/systems/combat/CombatResolver';
import { createCombatState } from '@/systems/combat/CombatState';
import { BattleContextAssembler } from '@/systems/context/BattleContextAssembler';
import { CharacterCompositionEngine } from '@/systems/composition/CharacterCompositionEngine';
import { EffectCompositionEngine } from '@/systems/composition/EffectCompositionEngine';
import { EncounterCompositionEngine } from '@/systems/composition/EncounterCompositionEngine';
import { SceneCompositionEngine } from '@/systems/composition/SceneCompositionEngine';
import { WorldCompositionEngine } from '@/systems/composition/WorldCompositionEngine';
import { buildResolvedActionPacket } from './ActionPipeline';
import { NarrationPacketBuilder } from '@/systems/narration/NarrationPacketBuilder';
import { SceneEffectBridge } from '@/systems/map/SceneEffectBridge';
import type { ActionPipelineResult } from '@/systems/types/PipelineTypes';

export interface BattleActionPipelineInput {
  rawText: string;
  actor: {
    characterId: string;
    name: string;
    tier: number;
    stats: CharacterProfile['stats'];
    abilities?: string | null;
    powers?: string | null;
    statusEffects?: Array<{ type: string; intensity?: string }>;
    stamina?: number | null;
    energy?: number | null;
    personality?: string | null;
    mentality?: string | null;
    race?: string | null;
    sub_race?: string | null;
    lore?: string | null;
    weapons_items?: string | null;
    appearance_aura?: string | null;
    appearance_movement_style?: string | null;
    appearance_voice?: string | null;
  };
  opponents?: Array<{
    id: string;
    name: string;
    tier?: number;
    stats?: CharacterProfile['stats'];
    abilities?: string | null;
    powers?: string | null;
  }>;
  battleZone?: string | null;
  activeHazards?: string[];
  environmentTags?: string[];
  rangeState?: { zone?: string; meters?: number };
  sceneState?: Record<string, unknown>;
  defaultTool?: string | null;
  consecutiveHighForceTurns?: number;
}

export interface BattleActionPipelineResult extends ActionPipelineResult {
  clampResult: ClampResult;
  highForceTurnCount: number;
}

export const BattleActionPipeline = {
  execute(input: BattleActionPipelineInput): BattleActionPipelineResult {
    const intentResult = IntentEngine.resolve(input.rawText, {
      mode: 'battle',
      actorName: input.actor.name,
      possibleTargets: (input.opponents || []).map((opponent) => ({
        id: opponent.id,
        name: opponent.name,
        kind: 'enemy' as const,
      })),
      defaultTool: input.defaultTool ?? null,
    });

    const profile: CharacterProfile = {
      name: input.actor.name,
      tier: input.actor.tier,
      stats: input.actor.stats,
      powers: input.actor.powers ?? null,
      abilities: input.actor.abilities ?? null,
      consecutiveHighForceTurns: input.consecutiveHighForceTurns ?? 0,
    };
    const clampResult = applyHardClamp(intentResult.legacyMoveIntent, profile);

    const context = BattleContextAssembler.assemble({
      actor: input.actor,
      opponents: input.opponents,
      battleZone: input.battleZone,
      activeHazards: input.activeHazards,
      environmentTags: input.environmentTags,
      rangeState: input.rangeState,
      narratorSceneState: input.sceneState,
    });

    const generatedActorIdentity = CharacterCompositionEngine.compose({
      id: input.actor.characterId,
      name: input.actor.name,
      level: input.actor.tier,
      powers: input.actor.powers,
      abilities: input.actor.abilities,
      personality: input.actor.personality,
      mentality: input.actor.mentality,
      race: input.actor.race,
      sub_race: input.actor.sub_race,
      lore: input.actor.lore,
      weapons_items: input.actor.weapons_items,
      appearance_aura: input.actor.appearance_aura,
      appearance_movement_style: input.actor.appearance_movement_style,
      appearance_voice: input.actor.appearance_voice,
      stat_strength: input.actor.stats?.stat_strength,
      stat_speed: input.actor.stats?.stat_speed,
      stat_power: input.actor.stats?.stat_power,
      stat_skill: input.actor.stats?.stat_skill,
      stat_battle_iq: input.actor.stats?.stat_battle_iq,
    });

    const generatedWorldState = WorldCompositionEngine.compose({
      id: `battle-world:${input.battleZone ?? 'unknown'}`,
      name: input.battleZone ?? 'Battle Zone',
      regionType: input.battleZone,
      environmentTags: input.environmentTags ?? [],
      activeHazards: input.activeHazards ?? [],
    });

    const generatedEncounter = EncounterCompositionEngine.compose({
      id: `battle-encounter:${input.actor.characterId}`,
      name: input.battleZone || 'Battle Encounter',
      situationType: intentResult.intent.isCombatAction ? 'combat exchange' : 'tense positioning',
      environmentTags: context.environmentTags,
      activeHazards: context.activeHazards,
      actorTags: generatedActorIdentity.tags,
      npcTags: (input.opponents || []).flatMap((opponent) => [opponent.name.toLowerCase().replace(/\s+/g, '_')]),
      pressureSeed: [intentResult.legacyMoveIntent.intentCategory, intentResult.legacyMoveIntent.posture].filter(Boolean),
    });

    const generatedSceneState = SceneCompositionEngine.compose({
      blueprintIds: [generatedActorIdentity.blueprintId, generatedWorldState.blueprintId, generatedEncounter.blueprintId].filter(Boolean) as string[],
      tags: [
        ...generatedActorIdentity.tags,
        ...generatedWorldState.tags,
        ...generatedEncounter.tags,
        ...context.environmentTags,
        ...context.activeHazards,
      ],
    });

    context.metadata = {
      ...(context.metadata || {}),
      generatedActorIdentity,
      generatedWorldState,
      generatedEncounter,
      generatedSceneState,
    };

    const primaryTarget = context.primaryTarget?.context ?? null;
    const combatResult = intentResult.intent.isCombatAction && context.primaryTarget?.id && primaryTarget
      ? CombatResolver.resolve(
          intentResult.intent,
          context.actor,
          createCombatState({
            participants: [
              {
                id: context.actor.characterId || input.actor.characterId,
                name: context.actor.name,
                stats: {
                  hp: Math.max(1, context.actor.stamina),
                  stamina: context.actor.stamina,
                  speed: context.actor.stats.stat_speed,
                  strength: context.actor.stats.stat_strength,
                },
              },
              {
                id: context.primaryTarget.id,
                name: context.primaryTarget.name,
                stats: {
                  hp: Math.max(1, primaryTarget.stamina),
                  stamina: primaryTarget.stamina,
                  speed: primaryTarget.stats.stat_speed,
                  strength: primaryTarget.stats.stat_strength,
                },
              },
            ],
            rangeZone: (input.rangeState?.zone as 'close' | 'mid' | 'far' | undefined) ?? 'mid',
            zone: input.battleZone ?? null,
            terrainTags: input.activeHazards ?? [],
          }),
          {
            actorId: context.actor.characterId || input.actor.characterId,
            targetId: context.primaryTarget.id,
            targetContext: primaryTarget,
          },
        )
      : null;

    const resolvedAction = buildResolvedActionPacket({
      rawText: input.rawText,
      intentResult,
      context,
      actorContext: context.actor,
      targetContext: primaryTarget,
      combatResult,
    });

    const seededSceneEffects = SceneEffectBridge.build(context, resolvedAction, null);
    const generatedEffectState = EffectCompositionEngine.compose({
      name: 'battle-turn',
      tags: [
        ...context.environmentTags,
        ...generatedSceneState.effectTags,
        ...generatedSceneState.chatPresentationTags,
        ...seededSceneEffects.zoneShiftTags,
        ...seededSceneEffects.hazardPulseTags,
        ...seededSceneEffects.enemyPresenceTags,
        ...seededSceneEffects.environmentalPressureTags,
      ],
      environmentState: {
        zone: context.zone,
        sceneState: context.sceneState,
        scenePressure: generatedSceneState.scenePressure,
      },
    });

    context.metadata = {
      ...(context.metadata || {}),
      generatedEffectState,
    };

    const sceneEffects = SceneEffectBridge.build(context, resolvedAction, null);
    const narrationPacket = NarrationPacketBuilder.build({
      resolvedAction,
      sceneEffects,
    });
    narrationPacket.metadata = {
      ...(narrationPacket.metadata || {}),
      generatedActorIdentity,
      generatedWorldState,
      generatedEncounter,
      generatedSceneState,
      generatedEffectState,
      sceneEffectPacket: sceneEffects,
    };

    const isHighForce = intentResult.legacyMoveIntent.intentCategory === 'HIGH_FORCE' || intentResult.legacyMoveIntent.posture === 'RECKLESS';

    return {
      context,
      resolvedAction,
      npcReaction: null,
      sceneEffects,
      narrationPacket,
      generatedPackets: {
        actorIdentity: generatedActorIdentity,
        worldState: generatedWorldState,
        encounter: generatedEncounter,
        sceneState: generatedSceneState,
        effectState: generatedEffectState,
      },
      clampResult,
      highForceTurnCount: isHighForce ? (input.consecutiveHighForceTurns ?? 0) + 1 : 0,
    };
  },
};

