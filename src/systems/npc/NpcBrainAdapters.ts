import type { CampaignTime } from '@/lib/campaign-types';
import type { ResolvedCharacterContext } from '@/systems/character/CharacterContextResolver';
import type { StructuredCombatResult } from '@/systems/combat/CombatResolver';
import {
  createGoal,
  createRelationshipVector,
  runNpcBrainTurn,
  summarizePerceptionTarget,
} from './NpcBrain';
import { generateNarration, type NarratorOutput } from './NarratorEngine';
import type {
  EmotionType,
  NpcBrainState,
  NpcBrainTurnResult,
  NpcRole,
  PersonalityTrait,
} from './npcBrainTypes';

export interface CampaignEnemyBrainInput {
  enemy: {
    id: string;
    name: string;
    tier: number;
    hp: number;
    hpMax: number;
    description?: string | null;
    behaviorProfile?: string | null;
    lastAction?: string | null;
    metadata?: Record<string, unknown> | null;
  };
  player: {
    id: string;
    name: string;
    healthPct: number;
    context?: ResolvedCharacterContext | null;
  };
  combatResult?: StructuredCombatResult | null;
  timeOfDay: CampaignTime;
  chaosLevel: number;
  escapeRoutes?: number;
}

export interface CampaignNpcBrainTurn extends NpcBrainTurnResult {
  summary: string;
  focusTargetId?: string;
  narration: NarratorOutput;
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

function toTraits(profile?: string | null, description?: string | null): PersonalityTrait[] {
  const haystack = `${profile || ''} ${description || ''}`.toLowerCase();
  const traits = new Set<PersonalityTrait>();

  if (/aggressive|berserk|feral|bloodthirsty/.test(haystack)) {
    traits.add('aggressive');
    traits.add('impulsive');
  }
  if (/defensive|guardian|guard|shield/.test(haystack)) {
    traits.add('protective');
    traits.add('calm');
  }
  if (/tactical|strategic|commander|smart|cunning/.test(haystack)) {
    traits.add('strategic');
    traits.add('calm');
  }
  if (/coward|fearful|skittish/.test(haystack)) traits.add('cowardly');
  if (/ambush|assassin|stealth|hidden/.test(haystack)) {
    traits.add('manipulative');
    traits.add('territorial');
  }
  if (/honor|honour|knight|duelist/.test(haystack)) {
    traits.add('honorable');
    traits.add('prideful');
  }
  if (/mercy|kind|healer/.test(haystack)) traits.add('merciful');
  if (/revenge|vengeful/.test(haystack)) traits.add('vengeful');
  if (/loyal/.test(haystack)) traits.add('loyal');
  if (/curious|scholar|mystic/.test(haystack)) traits.add('curious');

  if (traits.size === 0) {
    traits.add('aggressive');
  }

  return [...traits];
}

function inferRole(profile?: string | null, description?: string | null, tier = 1): NpcRole {
  const haystack = `${profile || ''} ${description || ''}`.toLowerCase();
  if (/boss|overlord|chief|captain/.test(haystack) || tier >= 6) return 'boss';
  if (/beast|wolf|creature|monster/.test(haystack)) return 'beast';
  if (/merchant|trader/.test(haystack)) return 'merchant';
  if (/guard/.test(haystack)) return 'guard';
  if (/assassin|ambush/.test(haystack)) return 'assassin';
  if (/scholar|sage/.test(haystack)) return 'scholar';
  if (/healer|medic/.test(haystack)) return 'healer';
  if (/bandit|raider/.test(haystack)) return 'bandit';
  if (/noble|lord|lady/.test(haystack)) return 'noble';
  return 'soldier';
}

function deriveEmotionType(input: CampaignEnemyBrainInput): EmotionType {
  if ((input.combatResult?.damage?.amount ?? 0) > 0) {
    return input.enemy.hp / Math.max(1, input.enemy.hpMax) < 0.3 ? 'fear' : 'anger';
  }
  if (input.player.healthPct < 35) return 'confidence';
  return 'neutral';
}

function buildBrainState(input: CampaignEnemyBrainInput): NpcBrainState {
  const traits = toTraits(input.enemy.behaviorProfile, input.enemy.description);
  const tier = Math.max(1, input.enemy.tier || 1);
  const healthPct = clamp(Math.round((input.enemy.hp / Math.max(1, input.enemy.hpMax)) * 100));

  return {
    identity: {
      npcId: input.enemy.id,
      name: input.enemy.name,
      role: inferRole(input.enemy.behaviorProfile, input.enemy.description, tier),
      intelligence: clamp(35 + tier * 8 + (traits.includes('strategic') ? 14 : 0) + (traits.includes('curious') ? 8 : 0)),
      bravery: clamp(35 + tier * 7 + (traits.includes('aggressive') ? 10 : 0) - (traits.includes('cowardly') ? 18 : 0)),
      aggression: clamp(40 + tier * 6 + (traits.includes('aggressive') ? 16 : 0) + (traits.includes('vengeful') ? 10 : 0) - (traits.includes('merciful') ? 8 : 0)),
      caution: clamp(35 + (traits.includes('strategic') ? 18 : 0) + (traits.includes('cowardly') ? 14 : 0) - (traits.includes('impulsive') ? 12 : 0)),
      pride: clamp(25 + tier * 5 + (traits.includes('prideful') ? 16 : 0) + (traits.includes('honorable') ? 10 : 0)),
      traits,
    },
    combat: {
      healthPct,
      isInCombat: true,
    },
    emotion: {
      type: deriveEmotionType(input),
      intensity: healthPct < 30 ? 70 : 40,
    },
    goals: [
      createGoal('survive', 'survival', healthPct < 30 ? 95 : 60),
      createGoal('win-exchange', 'combat', 90),
      createGoal('control-space', 'positioning', 75),
    ],
    memory: input.enemy.lastAction
      ? [{
          id: `${input.enemy.id}-last-action`,
          type: 'last_action',
          subjectId: input.player.id,
          intensity: 35,
          timestamp: Date.now() - 1000,
          valence: -10,
        }]
      : [],
    relationships: {
      [input.player.id]: createRelationshipVector({
        fear: input.player.healthPct > 65 ? 20 : 5,
        respect: input.player.context?.tier ? input.player.context.tier * 5 : 10,
        resentment: (input.combatResult?.damage?.amount ?? 0) > 0 ? 25 : 0,
        rivalry: 15,
      }),
    },
  };
}

export function buildCampaignNpcTurn(input: CampaignEnemyBrainInput): CampaignNpcBrainTurn {
  const playerStats = input.player.context?.stats;
  const playerPower = playerStats
    ? Math.round((playerStats.stat_strength + playerStats.stat_speed + playerStats.stat_power + playerStats.stat_skill) / 4)
    : 50;
  const perception = {
    visibleEntities: [
      {
        entityId: input.player.id,
        threatScore: clamp(playerPower + (input.combatResult?.outcome === 'hit' || input.combatResult?.outcome === 'partial_hit' ? 12 : 0)),
        apparentPower: clamp(playerPower),
        vulnerability: clamp(100 - input.player.healthPct + (input.combatResult?.outcome === 'interrupt' || input.combatResult?.outcome === 'miss' ? 12 : 0)),
        isAlly: false,
      },
    ],
    wasAttacked: Boolean(input.combatResult?.damage?.amount),
    sawEnemyWeakened: input.player.healthPct < 40 || input.combatResult?.outcome === 'interrupt' || input.combatResult?.outcome === 'miss',
  };
  const world = {
    chaosLevel: clamp(input.chaosLevel),
    escapeRoutes: Math.max(0, input.escapeRoutes ?? 2),
    isNight: input.timeOfDay === 'night' || input.timeOfDay === 'midnight',
  };
  const brain = buildBrainState(input);
  const turn = runNpcBrainTurn(brain, perception, world);
  const focusTarget = perception.visibleEntities[0];
  const narration = generateNarration({
    actorName: input.enemy.name,
    targetName: input.player.name,
    intent: turn.intent,
    action: turn.action.action,
    emotion: turn.updatedBrain.emotion,
  });

  return {
    ...turn,
    focusTargetId: focusTarget?.entityId,
    narration,
    summary: [
      `npc=${input.enemy.name}`,
      `emotion=${turn.updatedBrain.emotion.type}:${turn.updatedBrain.emotion.intensity}`,
      `intent=${turn.intent}`,
      `action=${turn.action.action}`,
      turn.action.targetId ? `target=${turn.action.targetId}` : null,
      `focus=${summarizePerceptionTarget(focusTarget)}`,
      `line=${narration.text}`,
      `voiceRate=${narration.voiceRate}`,
      `voicePitch=${narration.voicePitch}`,
      narration.soundCue ? `soundCue=${narration.soundCue}` : null,
      narration.animationTag ? `animationTag=${narration.animationTag}` : null,
      `chaos=${world.chaosLevel}`,
    ].filter(Boolean).join(' | '),
  };
}

export function formatNpcBrainForNarrator(turn: CampaignNpcBrainTurn) {
  return [
    `line=${turn.narration.text}`,
    `intent=${turn.intent}`,
    `emotion=${turn.updatedBrain.emotion.type}:${turn.updatedBrain.emotion.intensity}`,
    `voiceRate=${turn.narration.voiceRate}`,
    `voicePitch=${turn.narration.voicePitch}`,
    turn.narration.soundCue ? `soundCue=${turn.narration.soundCue}` : null,
    turn.narration.animationTag ? `animationTag=${turn.narration.animationTag}` : null,
  ].filter(Boolean).join(' | ');
}
