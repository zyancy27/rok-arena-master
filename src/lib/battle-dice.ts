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
}

export interface BattleState {
  concentrationUsesLeft: Record<string, number>; // character_id -> uses remaining
  statPenalties: Record<string, number>; // character_id -> penalty % for next action
}

const MAX_CONCENTRATION_USES = 3;

/**
 * Roll a d20 with stat-based modifiers
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
  };
}

/**
 * Roll defense dice
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
  };
}

/**
 * Determine if an attack would hit
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
 * Initialize battle state for concentration tracking
 */
export function initializeBattleState(characterIds: string[]): BattleState {
  const concentrationUsesLeft: Record<string, number> = {};
  const statPenalties: Record<string, number> = {};
  
  characterIds.forEach(id => {
    concentrationUsesLeft[id] = MAX_CONCENTRATION_USES;
    statPenalties[id] = 0;
  });
  
  return { concentrationUsesLeft, statPenalties };
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
