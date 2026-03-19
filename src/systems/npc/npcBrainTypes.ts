export type EntityId = string;
export type NpcId = string;
export type FactionId = string;
export type LocationId = string;

export type PersonalityTrait =
  | 'aggressive'
  | 'calm'
  | 'strategic'
  | 'loyal'
  | 'curious'
  | 'cowardly'
  | 'prideful'
  | 'manipulative'
  | 'merciful'
  | 'vengeful'
  | 'impulsive'
  | 'protective'
  | 'territorial'
  | 'honorable';

export type NpcRole =
  | 'guard'
  | 'merchant'
  | 'assassin'
  | 'wanderer'
  | 'scholar'
  | 'soldier'
  | 'beast'
  | 'noble'
  | 'healer'
  | 'bandit'
  | 'boss'
  | 'companion';

export type EmotionType =
  | 'neutral'
  | 'anger'
  | 'fear'
  | 'confidence'
  | 'suspicion'
  | 'panic';

export type IntentType =
  | 'attack'
  | 'counterattack'
  | 'defend'
  | 'protect_ally'
  | 'retreat'
  | 'flee'
  | 'negotiate'
  | 'threaten'
  | 'deceive'
  | 'observe'
  | 'taunt'
  | 'pursue'
  | 'hide'
  | 'ambush'
  | 'help'
  | 'heal'
  | 'stall'
  | 'surrender'
  | 'ignore';

export type ActionType =
  | 'melee_strike'
  | 'ranged_attack'
  | 'block'
  | 'step_back'
  | 'run_to_cover'
  | 'issue_threat'
  | 'speak'
  | 'lie'
  | 'heal_ally'
  | 'wait'
  | 'hide'
  | 'kneel';

export interface RelationshipVector {
  trust: number;
  fear: number;
  respect: number;
  affection: number;
  resentment: number;
  loyalty: number;
  rivalry: number;
}

export interface EmotionalState {
  type: EmotionType;
  intensity: number;
  turnsRemaining?: number;
}

export interface MemoryEvent {
  id: string;
  type: string;
  subjectId: EntityId;
  intensity: number;
  timestamp: number;
  valence: number;
  persistent?: boolean;
}

export interface Goal {
  id: string;
  category: string;
  priority: number;
}

export interface IdentityProfile {
  npcId: NpcId;
  name: string;
  role: NpcRole;
  intelligence: number;
  bravery: number;
  aggression: number;
  caution: number;
  pride: number;
  traits: PersonalityTrait[];
}

export interface NpcCombatState {
  healthPct: number;
  isInCombat: boolean;
}

export interface PerceivedEntity {
  entityId: EntityId;
  threatScore: number;
  apparentPower: number;
  vulnerability: number;
  isAlly: boolean;
}

export interface PerceptionSnapshot {
  visibleEntities: PerceivedEntity[];
  wasAttacked: boolean;
  sawEnemyWeakened: boolean;
}

export interface WorldState {
  chaosLevel: number;
  escapeRoutes: number;
  isNight: boolean;
}

export interface NpcBrainState {
  identity: IdentityProfile;
  combat: NpcCombatState;
  emotion: EmotionalState;
  goals: Goal[];
  memory: MemoryEvent[];
  relationships: Record<EntityId, RelationshipVector>;
}

export interface NpcBrainAction {
  action: ActionType;
  targetId?: EntityId;
}

export interface NpcBrainTurnResult {
  updatedBrain: NpcBrainState;
  intent: IntentType;
  action: NpcBrainAction;
}
