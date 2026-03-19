import type {
  EmotionalState,
  EntityId,
  Goal,
  IntentType,
  MemoryEvent,
  NpcBrainState,
  NpcBrainTurnResult,
  PersonalityTrait,
  PerceivedEntity,
  PerceptionSnapshot,
  RelationshipVector,
  WorldState,
} from './npcBrainTypes';

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

const hasTrait = (b: NpcBrainState, t: PersonalityTrait) => b.identity.traits.includes(t);

const strongestThreat = (p: PerceptionSnapshot) =>
  [...p.visibleEntities].sort((a, b) => b.threatScore - a.threatScore)[0];

const weakestEnemy = (p: PerceptionSnapshot) =>
  p.visibleEntities.filter(entity => !entity.isAlly).sort((a, b) => b.vulnerability - a.vulnerability)[0];

export function createRelationshipVector(overrides: Partial<RelationshipVector> = {}): RelationshipVector {
  return {
    trust: 0,
    fear: 0,
    respect: 0,
    affection: 0,
    resentment: 0,
    loyalty: 0,
    rivalry: 0,
    ...overrides,
  };
}

export function createGoal(id: string, category: string, priority: number): Goal {
  return { id, category, priority };
}

export function updateEmotion(brain: NpcBrainState, perception: PerceptionSnapshot): EmotionalState {
  if (perception.wasAttacked) {
    return brain.identity.bravery < 50 || brain.combat.healthPct < 30
      ? { type: 'fear', intensity: 70, turnsRemaining: 2 }
      : { type: 'anger', intensity: 70, turnsRemaining: 2 };
  }

  if (perception.sawEnemyWeakened) {
    return { type: 'confidence', intensity: 60, turnsRemaining: 2 };
  }

  if (brain.combat.healthPct < 20) {
    return { type: 'panic', intensity: 80, turnsRemaining: 1 };
  }

  return { ...brain.emotion };
}

function scoreIntent(
  intent: IntentType,
  brain: NpcBrainState,
  perception: PerceptionSnapshot,
  world: WorldState,
): number {
  let score = 5;

  const lowHp = brain.combat.healthPct < 30;
  const threat = strongestThreat(perception);
  const vulnerableEnemy = weakestEnemy(perception);

  if (brain.emotion.type === 'anger' && intent === 'attack') score += 20;
  if (brain.emotion.type === 'fear' && intent === 'flee') score += 25;
  if (brain.emotion.type === 'panic' && (intent === 'retreat' || intent === 'flee')) score += 30;
  if (brain.emotion.type === 'confidence' && (intent === 'attack' || intent === 'pursue')) score += 18;

  if (lowHp && ['retreat', 'flee', 'hide', 'stall'].includes(intent)) score += 20;
  if (!lowHp && brain.combat.isInCombat && ['attack', 'counterattack', 'defend'].includes(intent)) score += 10;

  if (hasTrait(brain, 'aggressive') && ['attack', 'counterattack', 'taunt', 'pursue'].includes(intent)) score += 15;
  if (hasTrait(brain, 'cowardly') && ['flee', 'hide', 'retreat'].includes(intent)) score += 15;
  if (hasTrait(brain, 'strategic') && ['ambush', 'observe', 'protect_ally', 'defend'].includes(intent)) score += 14;
  if (hasTrait(brain, 'protective') && intent === 'protect_ally') score += 18;
  if (hasTrait(brain, 'manipulative') && ['deceive', 'threaten', 'stall'].includes(intent)) score += 12;
  if (hasTrait(brain, 'territorial') && intent === 'pursue') score += 10;
  if (hasTrait(brain, 'honorable') && intent === 'defend') score += 8;
  if (hasTrait(brain, 'impulsive') && intent === 'attack') score += 8;

  if (world.isNight && ['hide', 'ambush'].includes(intent)) score += 10;
  if (world.escapeRoutes <= 1 && intent === 'flee') score -= 10;
  if (world.chaosLevel > 60 && ['attack', 'counterattack', 'ambush'].includes(intent)) score += 8;

  if (perception.wasAttacked && intent === 'counterattack') score += 20;
  if (threat && threat.threatScore > 70 && ['defend', 'retreat', 'hide'].includes(intent)) score += 10;
  if (vulnerableEnemy && vulnerableEnemy.vulnerability > 60 && ['attack', 'pursue'].includes(intent)) score += 12;

  return score;
}

export function decideIntent(
  brain: NpcBrainState,
  perception: PerceptionSnapshot,
  world: WorldState,
): IntentType {
  const intents: IntentType[] = [
    'attack',
    'counterattack',
    'defend',
    'protect_ally',
    'retreat',
    'flee',
    'negotiate',
    'threaten',
    'observe',
    'hide',
    'ambush',
    'stall',
    'surrender',
    'ignore',
  ];

  return intents
    .map(i => ({ i, s: scoreIntent(i, brain, perception, world) }))
    .sort((a, b) => b.s - a.s)[0]?.i ?? 'ignore';
}

export function intentToAction(intent: IntentType, perception: PerceptionSnapshot) {
  const threat = strongestThreat(perception);
  const weakest = weakestEnemy(perception);
  const target = threat ?? weakest;

  switch (intent) {
    case 'attack':
    case 'counterattack':
    case 'pursue':
    case 'ambush':
      return { action: 'melee_strike' as const, targetId: target?.entityId };
    case 'defend':
    case 'protect_ally':
      return { action: 'block' as const, targetId: threat?.entityId };
    case 'flee':
      return { action: 'run_to_cover' as const };
    case 'retreat':
    case 'stall':
      return { action: 'step_back' as const };
    case 'hide':
      return { action: 'hide' as const };
    case 'threaten':
    case 'taunt':
      return { action: 'issue_threat' as const, targetId: target?.entityId };
    case 'deceive':
      return { action: 'lie' as const, targetId: target?.entityId };
    case 'negotiate':
    case 'help':
      return { action: 'speak' as const, targetId: target?.entityId };
    case 'heal':
      return { action: 'heal_ally' as const };
    case 'surrender':
      return { action: 'kneel' as const };
    default:
      return { action: 'wait' as const };
  }
}

export function addMemory(brain: NpcBrainState, event: MemoryEvent): NpcBrainState {
  return {
    ...brain,
    memory: [...brain.memory, event].slice(-100),
  };
}

export function evolveRelationship(rel: RelationshipVector, memory: MemoryEvent): RelationshipVector {
  const next = { ...rel };

  if (memory.type === 'attacked_me') {
    next.trust -= 20;
    next.resentment += 30;
    next.fear += 10;
  }

  if (memory.type === 'helped_me') {
    next.trust += 20;
    next.loyalty += 10;
  }

  if (memory.type === 'humiliated_me') {
    next.respect -= 15;
    next.resentment += 20;
    next.rivalry += 15;
  }

  return {
    ...next,
    trust: clamp(next.trust, -100, 100),
    fear: clamp(next.fear, 0, 100),
    respect: clamp(next.respect, -100, 100),
    affection: clamp(next.affection, 0, 100),
    resentment: clamp(next.resentment, 0, 100),
    loyalty: clamp(next.loyalty, 0, 100),
    rivalry: clamp(next.rivalry, 0, 100),
  };
}

export function summarizePerceptionTarget(entity?: PerceivedEntity) {
  if (!entity) return 'no clear target';
  return `${entity.entityId}: threat ${entity.threatScore}, vulnerability ${entity.vulnerability}`;
}

export function runNpcBrainTurn(
  brain: NpcBrainState,
  perception: PerceptionSnapshot,
  world: WorldState,
): NpcBrainTurnResult {
  const emotion = updateEmotion(brain, perception);
  const updated = { ...brain, emotion };
  const intent = decideIntent(updated, perception, world);
  const action = intentToAction(intent, perception);

  return {
    updatedBrain: updated,
    intent,
    action,
  };
}
