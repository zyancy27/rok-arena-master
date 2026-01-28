// Battle dice mechanics and hit/concentration system
import type { CharacterStats } from './character-stats';

export interface DiceRollResult {
  baseRoll: number;
  modifiers: {
    tierBonus: number;
    statBonus: number;
    skillBonus: number;
    battleIqBonus: number;
  };
  total: number;
  rollType: 'attack' | 'defense' | 'mental_attack' | 'mental_defense';
}

export interface ConcentrationResult {
  bonusRoll: number; // 1-3
  statPenalty: number; // % reduction for next move
  dodgeSuccess: boolean;
  newDefenseTotal: number;
}

export interface HitDetermination {
  attackRoll: DiceRollResult;
  defenseRoll: DiceRollResult;
  wouldHit: boolean;
  gap: number; // Difference between attack and defense
  isMentalAttack: boolean;
}

// Distance zones for battle positioning
export type DistanceZone = 'melee' | 'close' | 'mid' | 'long' | 'extreme';

export interface DistanceState {
  currentZone: DistanceZone;
  estimatedMeters: number; // Approximate distance in meters
  lastMovement: 'closer' | 'away' | 'none';
}

export interface TravelTimeResult {
  seconds: number;
  description: string;
  isInstant: boolean;
  speedTier: 'slow' | 'normal' | 'fast' | 'superhuman' | 'instant';
}

// Construct (skill-created objects like barriers, summoned entities, etc.)
export interface Construct {
  id: string;
  name: string;
  creatorId: string;
  maxDurability: number; // Based on creator's Power + Skill
  currentDurability: number;
  type: 'barrier' | 'summon' | 'weapon' | 'trap' | 'other';
}

export interface ConstructDefenseResult {
  constructId: string;
  attackRoll: DiceRollResult;
  defenseRoll: DiceRollResult;
  damage: number; // How much durability lost
  destroyed: boolean;
  remainingDurability: number;
}

export interface ConstructRepairResult {
  constructId: string;
  repairAmount: number;
  newDurability: number;
  statPenalty: number; // Penalty applied to character for next action
  success: boolean;
}

export interface BattleState {
  concentrationUsesLeft: Record<string, number>; // character_id -> uses remaining
  statPenalties: Record<string, number>; // character_id -> penalty % for next action
  distance: DistanceState; // Current distance between fighters
  constructs: Record<string, Construct>; // construct_id -> Construct
}

const MAX_CONCENTRATION_USES = 3;

// Distance zone definitions (in meters)
const DISTANCE_ZONES: Record<DistanceZone, { min: number; max: number; description: string }> = {
  melee: { min: 0, max: 2, description: 'Within arm\'s reach - punches, grabs, and close combat effective' },
  close: { min: 2, max: 5, description: 'A few steps apart - quick lunges and short-range attacks work' },
  mid: { min: 5, max: 15, description: 'Moderate distance - projectiles and charges needed to close' },
  long: { min: 15, max: 50, description: 'Far apart - ranged attacks or significant movement required' },
  extreme: { min: 50, max: 200, description: 'Very distant - only long-range powers or travel can bridge the gap' },
};

/**
 * Roll a d20 with stat-based modifiers for physical attacks
 */
export function rollAttackDice(
  attackerStats: CharacterStats,
  attackerTier: number,
  usesSkill: boolean = false
): DiceRollResult {
  const baseRoll = Math.floor(Math.random() * 20) + 1; // d20
  
  // Tier bonus: +1 per tier level
  const tierBonus = attackerTier;
  
  // Stat bonus from relevant combat stats (strength, power, speed)
  const relevantStats = (attackerStats.stat_strength + attackerStats.stat_power + attackerStats.stat_speed) / 3;
  const statBonus = Math.floor(relevantStats / 10); // +1 per 10 points average
  
  // Battle IQ bonus for attack accuracy
  const battleIqBonus = Math.floor(attackerStats.stat_battle_iq / 20); // +1 per 20 points
  
  // Skill bonus if using character's trained abilities
  const skillBonus = usesSkill ? Math.floor(attackerStats.stat_skill / 15) : 0; // +1 per 15 skill points
  
  return {
    baseRoll,
    modifiers: {
      tierBonus,
      statBonus,
      skillBonus,
      battleIqBonus,
    },
    total: baseRoll + tierBonus + statBonus + skillBonus + battleIqBonus,
    rollType: 'attack',
  };
}

/**
 * Roll a d20 with stat-based modifiers for mental/psychic attacks
 */
export function rollMentalAttackDice(
  attackerStats: CharacterStats,
  attackerTier: number,
  usesSkill: boolean = false
): DiceRollResult {
  const baseRoll = Math.floor(Math.random() * 20) + 1; // d20
  
  // Tier bonus
  const tierBonus = attackerTier;
  
  // Mental attacks use intelligence + power + battle_iq
  const relevantStats = (attackerStats.stat_intelligence + attackerStats.stat_power + attackerStats.stat_battle_iq) / 3;
  const statBonus = Math.floor(relevantStats / 10);
  
  // Battle IQ is crucial for mental attacks
  const battleIqBonus = Math.floor(attackerStats.stat_battle_iq / 15); // +1 per 15 points (stronger for mental)
  
  // Skill bonus
  const skillBonus = usesSkill ? Math.floor(attackerStats.stat_skill / 15) : 0;
  
  return {
    baseRoll,
    modifiers: {
      tierBonus,
      statBonus,
      skillBonus,
      battleIqBonus,
    },
    total: baseRoll + tierBonus + statBonus + skillBonus + battleIqBonus,
    rollType: 'mental_attack',
  };
}

/**
 * Roll mental defense dice
 */
export function rollMentalDefenseDice(
  defenderStats: CharacterStats,
  defenderTier: number,
  currentPenalty: number = 0
): DiceRollResult {
  const baseRoll = Math.floor(Math.random() * 20) + 1; // d20
  
  // Tier bonus
  const tierBonus = defenderTier;
  
  // Mental defense uses intelligence + willpower (stamina) + battle IQ
  const relevantStats = (defenderStats.stat_intelligence + defenderStats.stat_stamina + defenderStats.stat_battle_iq) / 3;
  const statBonus = Math.floor(relevantStats / 10);
  
  // Battle IQ helps resist mental attacks
  const battleIqBonus = Math.floor(defenderStats.stat_battle_iq / 20);
  
  // Apply penalty from previous concentration use
  const penaltyReduction = Math.floor((tierBonus + statBonus + battleIqBonus) * (currentPenalty / 100));
  
  return {
    baseRoll,
    modifiers: {
      tierBonus,
      statBonus,
      skillBonus: 0,
      battleIqBonus,
    },
    total: Math.max(1, baseRoll + tierBonus + statBonus + battleIqBonus - penaltyReduction),
    rollType: 'mental_defense',
  };
}

/**
 * Roll defense dice for physical attacks
 */
export function rollDefenseDice(
  defenderStats: CharacterStats,
  defenderTier: number,
  currentPenalty: number = 0 // % penalty from previous concentration use
): DiceRollResult {
  const baseRoll = Math.floor(Math.random() * 20) + 1; // d20
  
  // Tier bonus
  const tierBonus = defenderTier;
  
  // Stat bonus from defensive stats (durability, speed)
  const relevantStats = (defenderStats.stat_durability + defenderStats.stat_speed) / 2;
  const statBonus = Math.floor(relevantStats / 10);
  
  // Battle IQ helps anticipate attacks
  const battleIqBonus = Math.floor(defenderStats.stat_battle_iq / 25); // +1 per 25 points
  
  // Apply penalty from previous concentration use
  const penaltyReduction = Math.floor((tierBonus + statBonus + battleIqBonus) * (currentPenalty / 100));
  
  return {
    baseRoll,
    modifiers: {
      tierBonus,
      statBonus,
      skillBonus: 0,
      battleIqBonus,
    },
    total: Math.max(1, baseRoll + tierBonus + statBonus + battleIqBonus - penaltyReduction),
    rollType: 'defense',
  };
}

/**
 * Determine if a physical attack would hit
 */
export function determineHit(
  attackerStats: CharacterStats,
  attackerTier: number,
  defenderStats: CharacterStats,
  defenderTier: number,
  usesSkill: boolean = false,
  defenderPenalty: number = 0
): HitDetermination {
  const attackRoll = rollAttackDice(attackerStats, attackerTier, usesSkill);
  const defenseRoll = rollDefenseDice(defenderStats, defenderTier, defenderPenalty);
  
  const gap = attackRoll.total - defenseRoll.total;
  const wouldHit = gap > 0;
  
  return {
    attackRoll,
    defenseRoll,
    wouldHit,
    gap,
    isMentalAttack: false,
  };
}

/**
 * Determine if a mental/psychic attack would hit
 */
export function determineMentalHit(
  attackerStats: CharacterStats,
  attackerTier: number,
  defenderStats: CharacterStats,
  defenderTier: number,
  usesSkill: boolean = false,
  defenderPenalty: number = 0
): HitDetermination {
  const attackRoll = rollMentalAttackDice(attackerStats, attackerTier, usesSkill);
  const defenseRoll = rollMentalDefenseDice(defenderStats, defenderTier, defenderPenalty);
  
  const gap = attackRoll.total - defenseRoll.total;
  const wouldHit = gap > 0;
  
  return {
    attackRoll,
    defenseRoll,
    wouldHit,
    gap,
    isMentalAttack: true,
  };
}

/**
 * Use concentration to attempt a last-ditch dodge
 * Only available if the attack would hit
 */
export function useConcentration(
  defenderStats: CharacterStats,
  hitDetermination: HitDetermination
): ConcentrationResult {
  // Concentration bonus roll: 1-3 based on intelligence and speed
  const concentrationBonus = Math.max(1, Math.min(3, 
    1 + Math.floor((defenderStats.stat_intelligence + defenderStats.stat_speed) / 100)
  ));
  
  const bonusRoll = Math.floor(Math.random() * concentrationBonus) + 1;
  
  const newDefenseTotal = hitDetermination.defenseRoll.total + bonusRoll;
  const dodgeSuccess = newDefenseTotal >= hitDetermination.attackRoll.total;
  
  // Stat penalty for next move based on how close the dodge was
  // Wider gap = higher penalty (had to push harder to dodge)
  const basePenalty = Math.abs(hitDetermination.gap) * 3; // 3% per point of gap
  const statPenalty = Math.min(50, basePenalty); // Cap at 50% penalty
  
  return {
    bonusRoll,
    statPenalty: dodgeSuccess ? statPenalty : 0, // Only apply penalty if dodge succeeded
    dodgeSuccess,
    newDefenseTotal,
  };
}

/**
 * Calculate skill bonus for counter-attacks
 * Using trained skills in counter-moves adds to concentration capacity
 */
export function calculateCounterSkillBonus(
  defenderStats: CharacterStats,
  usesSkillInCounter: boolean
): number {
  if (!usesSkillInCounter) return 0;
  
  // Skill proficiency adds to concentration effectiveness
  return Math.floor(defenderStats.stat_skill / 25); // +1 concentration point per 25 skill
}

/**
 * Initialize battle state for concentration tracking and distance
 */
export function initializeBattleState(characterIds: string[], startingDistance: DistanceZone = 'mid'): BattleState {
  const concentrationUsesLeft: Record<string, number> = {};
  const statPenalties: Record<string, number> = {};
  
  characterIds.forEach(id => {
    concentrationUsesLeft[id] = MAX_CONCENTRATION_USES;
    statPenalties[id] = 0;
  });
  
  const zoneInfo = DISTANCE_ZONES[startingDistance];
  const estimatedMeters = (zoneInfo.min + zoneInfo.max) / 2;
  
  return { 
    concentrationUsesLeft, 
    statPenalties,
    distance: {
      currentZone: startingDistance,
      estimatedMeters,
      lastMovement: 'none',
    },
    constructs: {},
  };
}

/**
 * Create a construct (barrier, summon, etc.) based on character stats
 */
export function createConstruct(
  creatorStats: CharacterStats,
  creatorId: string,
  constructName: string,
  constructType: Construct['type'] = 'other'
): Construct {
  // Durability based on Power + Skill, scaled to reasonable range
  const baseDurability = Math.floor((creatorStats.stat_power + creatorStats.stat_skill) / 2);
  const maxDurability = Math.max(10, baseDurability); // Minimum 10 durability
  
  return {
    id: crypto.randomUUID(),
    name: constructName,
    creatorId,
    maxDurability,
    currentDurability: maxDurability,
    type: constructType,
  };
}

/**
 * Roll defense dice for a construct being attacked
 * Constructs defend based on their remaining durability ratio and creator's skill
 */
export function rollConstructDefenseDice(
  construct: Construct,
  creatorStats: CharacterStats,
  creatorTier: number
): DiceRollResult {
  const baseRoll = Math.floor(Math.random() * 20) + 1; // d20
  
  // Tier bonus from creator
  const tierBonus = Math.floor(creatorTier / 2); // Half tier bonus for constructs
  
  // Durability ratio affects defense (damaged constructs are weaker)
  const durabilityRatio = construct.currentDurability / construct.maxDurability;
  const durabilityBonus = Math.floor(durabilityRatio * 5); // 0-5 based on health
  
  // Skill bonus from creator
  const skillBonus = Math.floor(creatorStats.stat_skill / 20); // +1 per 20 skill
  
  // Power contributes to construct resilience
  const statBonus = Math.floor(creatorStats.stat_power / 15); // +1 per 15 power
  
  return {
    baseRoll,
    modifiers: {
      tierBonus,
      statBonus,
      skillBonus,
      battleIqBonus: durabilityBonus, // Repurpose for durability display
    },
    total: baseRoll + tierBonus + statBonus + skillBonus + durabilityBonus,
    rollType: 'defense',
  };
}

/**
 * Determine if an attack damages a construct and by how much
 */
export function attackConstruct(
  attackerStats: CharacterStats,
  attackerTier: number,
  construct: Construct,
  creatorStats: CharacterStats,
  creatorTier: number,
  usesSkill: boolean = false
): ConstructDefenseResult {
  const attackRoll = rollAttackDice(attackerStats, attackerTier, usesSkill);
  const defenseRoll = rollConstructDefenseDice(construct, creatorStats, creatorTier);
  
  const gap = attackRoll.total - defenseRoll.total;
  
  // Damage scales with how much the attack exceeded defense
  const damage = gap > 0 ? Math.max(1, Math.floor(gap * 1.5)) : 0;
  const newDurability = Math.max(0, construct.currentDurability - damage);
  const destroyed = newDurability <= 0;
  
  return {
    constructId: construct.id,
    attackRoll,
    defenseRoll,
    damage,
    destroyed,
    remainingDurability: newDurability,
  };
}

/**
 * Use concentration to repair a damaged construct
 * Costs 1 concentration use and applies stat penalty for next action
 */
export function repairConstructWithConcentration(
  creatorStats: CharacterStats,
  construct: Construct
): ConstructRepairResult {
  // Repair amount based on intelligence + skill (focusing to rebuild)
  const baseRepair = Math.max(1, Math.floor((creatorStats.stat_intelligence + creatorStats.stat_skill) / 40));
  const repairRoll = Math.floor(Math.random() * baseRepair) + baseRepair; // baseRepair to 2*baseRepair
  
  const newDurability = Math.min(construct.maxDurability, construct.currentDurability + repairRoll);
  
  // Stat penalty for diverting focus to repair (15-30% based on damage repaired)
  const repairRatio = repairRoll / construct.maxDurability;
  const statPenalty = Math.min(30, Math.max(15, Math.floor(repairRatio * 50)));
  
  return {
    constructId: construct.id,
    repairAmount: repairRoll,
    newDurability,
    statPenalty,
    success: true,
  };
}

/**
 * Update a construct's durability in battle state
 */
export function updateConstructDurability(
  battleState: BattleState,
  constructId: string,
  newDurability: number
): BattleState {
  if (!battleState.constructs[constructId]) return battleState;
  
  const updatedConstructs = { ...battleState.constructs };
  
  if (newDurability <= 0) {
    // Construct is destroyed, remove it
    delete updatedConstructs[constructId];
  } else {
    updatedConstructs[constructId] = {
      ...updatedConstructs[constructId],
      currentDurability: newDurability,
    };
  }
  
  return {
    ...battleState,
    constructs: updatedConstructs,
  };
}

/**
 * Add a construct to battle state
 */
export function addConstructToBattle(
  battleState: BattleState,
  construct: Construct
): BattleState {
  return {
    ...battleState,
    constructs: {
      ...battleState.constructs,
      [construct.id]: construct,
    },
  };
}

/**
 * Get all constructs belonging to a character
 */
export function getCharacterConstructs(
  battleState: BattleState,
  characterId: string
): Construct[] {
  return Object.values(battleState.constructs).filter(c => c.creatorId === characterId);
}

/**
 * Detect if action text mentions creating or summoning a construct
 */
export function detectConstructCreation(actionText: string): {
  isCreating: boolean;
  constructType: Construct['type'];
  suggestedName: string;
} {
  const text = actionText.toLowerCase();
  
  const barrierKeywords = ['barrier', 'shield', 'wall', 'forcefield', 'dome', 'bubble', 'block'];
  const summonKeywords = ['summon', 'conjure', 'create creature', 'manifest', 'call forth', 'bring forth'];
  const weaponKeywords = ['construct weapon', 'create sword', 'create blade', 'form weapon', 'manifest blade'];
  const trapKeywords = ['trap', 'snare', 'mine', 'tripwire', 'ambush construct'];
  
  if (barrierKeywords.some(kw => text.includes(kw))) {
    return { isCreating: true, constructType: 'barrier', suggestedName: 'Energy Barrier' };
  }
  if (summonKeywords.some(kw => text.includes(kw))) {
    return { isCreating: true, constructType: 'summon', suggestedName: 'Summoned Entity' };
  }
  if (weaponKeywords.some(kw => text.includes(kw))) {
    return { isCreating: true, constructType: 'weapon', suggestedName: 'Construct Weapon' };
  }
  if (trapKeywords.some(kw => text.includes(kw))) {
    return { isCreating: true, constructType: 'trap', suggestedName: 'Tactical Trap' };
  }
  
  // Generic construct keywords
  const genericKeywords = ['construct', 'create', 'form', 'materialize', 'generate'];
  if (genericKeywords.some(kw => text.includes(kw)) && 
      (text.includes('energy') || text.includes('power') || text.includes('ki') || text.includes('chakra'))) {
    return { isCreating: true, constructType: 'other', suggestedName: 'Energy Construct' };
  }
  
  return { isCreating: false, constructType: 'other', suggestedName: '' };
}

/**
 * Detect if action text mentions attacking a construct
 */
export function detectConstructAttack(actionText: string): boolean {
  const text = actionText.toLowerCase();
  
  const attackKeywords = ['attack', 'strike', 'hit', 'destroy', 'break', 'shatter', 'smash', 'blast'];
  const constructTargets = ['barrier', 'shield', 'wall', 'construct', 'summon', 'creature', 'creation'];
  
  return attackKeywords.some(ak => text.includes(ak)) && constructTargets.some(ct => text.includes(ct));
}

/**
 * Calculate travel time based on character speed stat and distance
 * Speed stat 0-100 maps to movement capability
 */
export function calculateTravelTime(
  speedStat: number,
  tier: number,
  fromZone: DistanceZone,
  toZone: DistanceZone
): TravelTimeResult {
  const fromInfo = DISTANCE_ZONES[fromZone];
  const toInfo = DISTANCE_ZONES[toZone];
  
  // Calculate distance to cover (using midpoints)
  const fromMid = (fromInfo.min + fromInfo.max) / 2;
  const toMid = (toInfo.min + toInfo.max) / 2;
  const distanceMeters = Math.abs(toMid - fromMid);
  
  if (distanceMeters === 0) {
    return { seconds: 0, description: 'Already there', isInstant: true, speedTier: 'instant' };
  }
  
  // Base speed in m/s based on speed stat + tier
  // Speed 0 = 2 m/s (slow walk), Speed 50 = 10 m/s (fast run), Speed 100 = 30 m/s (superhuman)
  // Tier adds multiplier: T1=1x, T4=2x, T7=4x
  const baseSpeedMs = 2 + (speedStat / 100) * 28; // 2-30 m/s range
  const tierMultiplier = 1 + (tier - 1) * 0.5; // 1x to 4x
  const effectiveSpeedMs = baseSpeedMs * tierMultiplier;
  
  const seconds = distanceMeters / effectiveSpeedMs;
  
  // Determine speed tier description
  let speedTier: TravelTimeResult['speedTier'];
  let description: string;
  
  if (seconds < 0.1) {
    speedTier = 'instant';
    description = 'Instantaneous - too fast to perceive';
  } else if (seconds < 0.5) {
    speedTier = 'superhuman';
    description = `A blur of motion (~${(seconds * 1000).toFixed(0)}ms)`;
  } else if (seconds < 2) {
    speedTier = 'fast';
    description = `Quick movement (~${seconds.toFixed(1)}s)`;
  } else if (seconds < 5) {
    speedTier = 'normal';
    description = `Several seconds (~${Math.round(seconds)}s)`;
  } else {
    speedTier = 'slow';
    description = `Takes time (~${Math.round(seconds)}s to cover ${distanceMeters.toFixed(0)}m)`;
  }
  
  return { seconds, description, isInstant: seconds < 0.1, speedTier };
}

/**
 * Analyze action text to detect movement/positioning changes
 */
export function detectMovementInAction(actionText: string): {
  movement: 'closer' | 'away' | 'none';
  suggestedZoneChange: number; // -2 to +2 zone steps
  keywords: string[];
} {
  const text = actionText.toLowerCase();
  
  const closerKeywords = [
    'rush', 'charge', 'close the distance', 'lunge', 'dash toward', 'sprint at',
    'move closer', 'approach', 'close in', 'advance', 'tackle', 'grab', 'grapple',
    'get in close', 'engage', 'intercept', 'meet', 'step forward', 'leap at'
  ];
  
  const awayKeywords = [
    'retreat', 'back away', 'create distance', 'jump back', 'dash away', 'flee',
    'run away', 'escape', 'disengage', 'fall back', 'step back', 'leap away',
    'put distance', 'evade', 'dodge away', 'roll away', 'fly away', 'teleport away'
  ];
  
  const majorMovementKeywords = [
    'across the battlefield', 'the entire', 'far away', 'great distance',
    'teleport', 'instant transmission', 'warp', 'flash step', 'blink'
  ];
  
  const matchedCloser = closerKeywords.filter(kw => text.includes(kw));
  const matchedAway = awayKeywords.filter(kw => text.includes(kw));
  const hasMajorMovement = majorMovementKeywords.some(kw => text.includes(kw));
  
  let movement: 'closer' | 'away' | 'none' = 'none';
  let suggestedZoneChange = 0;
  const keywords: string[] = [];
  
  if (matchedCloser.length > matchedAway.length) {
    movement = 'closer';
    suggestedZoneChange = hasMajorMovement ? -2 : -1;
    keywords.push(...matchedCloser);
  } else if (matchedAway.length > matchedCloser.length) {
    movement = 'away';
    suggestedZoneChange = hasMajorMovement ? 2 : 1;
    keywords.push(...matchedAway);
  }
  
  return { movement, suggestedZoneChange, keywords };
}

/**
 * Update distance zone based on movement
 */
export function updateDistance(
  currentState: DistanceState,
  zoneChange: number
): DistanceState {
  const zones: DistanceZone[] = ['melee', 'close', 'mid', 'long', 'extreme'];
  const currentIndex = zones.indexOf(currentState.currentZone);
  const newIndex = Math.max(0, Math.min(zones.length - 1, currentIndex + zoneChange));
  const newZone = zones[newIndex];
  const zoneInfo = DISTANCE_ZONES[newZone];
  
  return {
    currentZone: newZone,
    estimatedMeters: (zoneInfo.min + zoneInfo.max) / 2,
    lastMovement: zoneChange < 0 ? 'closer' : zoneChange > 0 ? 'away' : 'none',
  };
}

/**
 * Get distance context for AI narrator
 */
export function getDistanceContext(distance: DistanceState): string {
  const zoneInfo = DISTANCE_ZONES[distance.currentZone];
  return `📍 CURRENT DISTANCE: ${distance.currentZone.toUpperCase()} RANGE (~${distance.estimatedMeters.toFixed(0)}m apart)\n${zoneInfo.description}`;
}

/**
 * Check if an attack type is valid for current distance
 */
export function isAttackValidForDistance(
  actionText: string,
  currentZone: DistanceZone
): { valid: boolean; warning: string | null } {
  const text = actionText.toLowerCase();
  
  const meleeOnlyKeywords = ['punch', 'kick', 'grab', 'grapple', 'headbutt', 'elbow', 'knee', 'bite', 'claw', 'slash', 'stab'];
  const closeRangeKeywords = ['throw', 'tackle', 'sweep', 'trip'];
  
  const isMeleeAttack = meleeOnlyKeywords.some(kw => text.includes(kw));
  const isCloseAttack = closeRangeKeywords.some(kw => text.includes(kw));
  
  // Check if melee attack at long range
  if (isMeleeAttack && (currentZone === 'long' || currentZone === 'extreme')) {
    return {
      valid: false,
      warning: `⚠️ Distance Warning: You're attempting a melee attack from ${currentZone} range (~${DISTANCE_ZONES[currentZone].min}-${DISTANCE_ZONES[currentZone].max}m). You'll need to close the distance first or use a ranged attack.`
    };
  }
  
  if (isCloseAttack && currentZone === 'extreme') {
    return {
      valid: false,
      warning: `⚠️ Distance Warning: You're too far away for this attack. Consider moving closer or using a long-range ability.`
    };
  }
  
  return { valid: true, warning: null };
}

/**
 * Format distance info for display
 */
export function formatDistanceInfo(distance: DistanceState, attackerSpeed: number, defenderSpeed: number, attackerTier: number, defenderTier: number): string {
  const zoneInfo = DISTANCE_ZONES[distance.currentZone];
  
  // Calculate travel times for both fighters to close to melee
  const attackerTravel = calculateTravelTime(attackerSpeed, attackerTier, distance.currentZone, 'melee');
  const defenderTravel = calculateTravelTime(defenderSpeed, defenderTier, distance.currentZone, 'melee');
  
  let output = `📍 **Distance**: ${distance.currentZone.charAt(0).toUpperCase() + distance.currentZone.slice(1)} Range (~${distance.estimatedMeters.toFixed(0)}m)\n`;
  output += `*${zoneInfo.description}*\n\n`;
  
  if (distance.currentZone !== 'melee') {
    output += `⚡ **Travel to Melee**:\n`;
    output += `• Attacker: ${attackerTravel.description}\n`;
    output += `• Defender: ${defenderTravel.description}`;
  }
  
  return output;
}

/**
 * Format dice roll for display
 */
export function formatDiceRoll(roll: DiceRollResult): string {
  const modParts: string[] = [];
  
  if (roll.modifiers.tierBonus > 0) modParts.push(`+${roll.modifiers.tierBonus} tier`);
  if (roll.modifiers.statBonus > 0) modParts.push(`+${roll.modifiers.statBonus} stats`);
  if (roll.modifiers.battleIqBonus > 0) modParts.push(`+${roll.modifiers.battleIqBonus} BIQ`);
  if (roll.modifiers.skillBonus > 0) modParts.push(`+${roll.modifiers.skillBonus} skill`);
  
  const modString = modParts.length > 0 ? ` (${modParts.join(', ')})` : '';
  
  return `🎲 ${roll.baseRoll}${modString} = ${roll.total}`;
}

/**
 * Detect if action text mentions area effects or stage hazards
 */
export function detectEnvironmentalEffects(actionText: string): {
  hasAoE: boolean;
  hasStageHazard: boolean;
  effects: string[];
} {
  const text = actionText.toLowerCase();
  
  const aoeKeywords = [
    'area', 'explosion', 'blast', 'wave', 'burst', 'radius', 'surrounding',
    'everyone', 'all around', 'widespread', 'massive', 'engulf', 'engulfs',
    'shockwave', 'pulse', 'sweep', 'cleave'
  ];
  
  const stageHazardKeywords = {
    smoke: ['smoke', 'fog', 'mist', 'haze', 'obscure', 'visibility'],
    ice: ['ice', 'freeze', 'frozen', 'frost', 'slippery', 'cold', 'glacier'],
    fire: ['lava', 'fire', 'flame', 'burning', 'inferno', 'magma', 'scorching'],
    water: ['water', 'flood', 'drown', 'underwater', 'breathable', 'submerge'],
    terrain: ['crater', 'rubble', 'debris', 'collapse', 'destroy the ground', 'shatter'],
    air: ['vacuum', 'no air', 'suffocate', 'atmosphere', 'oxygen'],
    gravity: ['gravity', 'weightless', 'heavy', 'crushing force'],
    darkness: ['darkness', 'blind', 'shadow', 'light'],
    electricity: ['electric', 'lightning', 'shock', 'charged', 'static'],
    poison: ['poison', 'toxic', 'gas', 'fumes', 'corrosive'],
  };
  
  const hasAoE = aoeKeywords.some(kw => text.includes(kw));
  
  const effects: string[] = [];
  let hasStageHazard = false;
  
  Object.entries(stageHazardKeywords).forEach(([hazardType, keywords]) => {
    if (keywords.some(kw => text.includes(kw))) {
      hasStageHazard = true;
      effects.push(hazardType);
    }
  });
  
  return { hasAoE, hasStageHazard, effects };
}

/**
 * Generate environmental effect narration for the defender to consider
 */
export function generateEnvironmentalWarning(effects: string[]): string {
  if (effects.length === 0) return '';
  
  const warnings: Record<string, string> = {
    smoke: '⚠️ **Visibility Reduced**: Smoke fills the arena. Targeting and awareness may be impaired.',
    ice: '⚠️ **Icy Terrain**: The ground is frozen. Movement is slippery and footing is unstable.',
    fire: '⚠️ **Burning Hazard**: Fire/lava covers parts of the battlefield. Contact causes damage.',
    water: '⚠️ **Flooded Arena**: Water fills the space. Breathing and movement are affected.',
    terrain: '⚠️ **Destroyed Terrain**: The ground is unstable with craters and debris.',
    air: '⚠️ **Atmosphere Changed**: Breathable air is compromised. Stamina may drain faster.',
    gravity: '⚠️ **Gravity Shift**: The gravitational field has changed. Adjust your movements.',
    darkness: '⚠️ **Darkness Falls**: Light is limited. Visual abilities may be impaired.',
    electricity: '⚠️ **Electrified Zone**: Static charge in the area. Metal and water conduct.',
    poison: '⚠️ **Toxic Environment**: Poisonous substances in the air. Prolonged exposure is dangerous.',
  };
  
  return effects.map(e => warnings[e] || '').filter(Boolean).join('\n');
}
