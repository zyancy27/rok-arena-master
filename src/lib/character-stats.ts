// Character stat definitions with descriptions
export const CHARACTER_STATS = [
  {
    key: 'stat_intelligence',
    name: 'Intelligence',
    description: 'Mental capacity, problem-solving, tactical thinking. 100 = Omniscience',
    icon: 'Brain',
    color: 'hsl(220 70% 55%)', // Blue
  },
  {
    key: 'stat_battle_iq',
    name: 'Battle IQ',
    description: 'Combat instincts, tactical awareness in battle. Distinct from Intelligence - measures fight IQ (like Goku). 100 = Perfect combat intuition',
    icon: 'Crosshair',
    color: 'hsl(35 90% 55%)', // Orange
  },
  {
    key: 'stat_strength',
    name: 'Strength',
    description: 'Physical scaling - how easily you can move weight with your body. 100 = Can lift/push anything physical',
    icon: 'Dumbbell',
    color: 'hsl(0 70% 55%)', // Red
  },
  {
    key: 'stat_power',
    name: 'Power',
    description: 'Non-physical capabilities - telekinesis, constructs, force abilities. 100 = Absolute mastery of non-physical manipulation',
    icon: 'Flame',
    color: 'hsl(45 90% 55%)', // Gold
  },
  {
    key: 'stat_speed',
    name: 'Speed',
    description: 'Movement speed, reflexes, reaction time. 100 = Instantaneous movement',
    icon: 'Zap',
    color: 'hsl(180 70% 50%)', // Cyan
  },
  {
    key: 'stat_durability',
    name: 'Durability',
    description: 'Resistance to damage, toughness, defensive capability. 100 = Invulnerable',
    icon: 'Shield',
    color: 'hsl(270 70% 60%)', // Purple
  },
  {
    key: 'stat_stamina',
    name: 'Stamina',
    description: 'Endurance, ability to sustain effort over time. 100 = Infinite endurance',
    icon: 'Heart',
    color: 'hsl(320 70% 55%)', // Pink
  },
  {
    key: 'stat_skill',
    name: 'Skill',
    description: 'Combat proficiency, technique mastery, trained abilities. 100 = Perfected technique',
    icon: 'Target',
    color: 'hsl(120 60% 45%)', // Green
  },
  {
    key: 'stat_luck',
    name: 'Luck',
    description: 'Fortune, probability manipulation, serendipity. 100 = Absolute fortune',
    icon: 'Sparkles',
    color: 'hsl(45 100% 65%)', // Bright gold
  },
] as const;

export type StatKey = typeof CHARACTER_STATS[number]['key'];

export interface CharacterStats {
  stat_intelligence: number;
  stat_battle_iq: number;
  stat_strength: number;
  stat_power: number;
  stat_speed: number;
  stat_durability: number;
  stat_stamina: number;
  stat_skill: number;
  stat_luck: number;
}

export const DEFAULT_STATS: CharacterStats = {
  stat_intelligence: 50,
  stat_battle_iq: 50,
  stat_strength: 50,
  stat_power: 50,
  stat_speed: 50,
  stat_durability: 50,
  stat_stamina: 50,
  stat_skill: 50,
  stat_luck: 50,
};

// Base stat templates scaled by power tier (1-7)
// These represent typical stats for each tier level
export const TIER_BASE_STATS: Record<number, CharacterStats> = {
  // Tier 1: Common Human - Normal human capabilities
  1: {
    stat_intelligence: 25,
    stat_battle_iq: 20,
    stat_strength: 15,
    stat_power: 0,
    stat_speed: 15,
    stat_durability: 15,
    stat_stamina: 20,
    stat_skill: 20,
    stat_luck: 25,
  },
  // Tier 2: Enhanced Human - Peak physical condition
  2: {
    stat_intelligence: 35,
    stat_battle_iq: 40,
    stat_strength: 35,
    stat_power: 10,
    stat_speed: 35,
    stat_durability: 30,
    stat_stamina: 40,
    stat_skill: 45,
    stat_luck: 30,
  },
  // Tier 3: Super Human - Beyond human limits
  3: {
    stat_intelligence: 45,
    stat_battle_iq: 55,
    stat_strength: 50,
    stat_power: 40,
    stat_speed: 50,
    stat_durability: 45,
    stat_stamina: 50,
    stat_skill: 55,
    stat_luck: 35,
  },
  // Tier 4: Title of God - Mass manipulation, energy control
  4: {
    stat_intelligence: 60,
    stat_battle_iq: 70,
    stat_strength: 65,
    stat_power: 65,
    stat_speed: 65,
    stat_durability: 60,
    stat_stamina: 65,
    stat_skill: 70,
    stat_luck: 45,
  },
  // Tier 5: Title of Titan - Reality/dimensional control
  5: {
    stat_intelligence: 75,
    stat_battle_iq: 80,
    stat_strength: 80,
    stat_power: 80,
    stat_speed: 80,
    stat_durability: 75,
    stat_stamina: 80,
    stat_skill: 85,
    stat_luck: 55,
  },
  // Tier 6: Logic Bending - Balance restoration powers
  6: {
    stat_intelligence: 90,
    stat_battle_iq: 92,
    stat_strength: 90,
    stat_power: 92,
    stat_speed: 90,
    stat_durability: 88,
    stat_stamina: 90,
    stat_skill: 95,
    stat_luck: 70,
  },
  // Tier 7: Logic Resorts (7:1) - Willpower-based paradox
  7: {
    stat_intelligence: 98,
    stat_battle_iq: 95,
    stat_strength: 98,
    stat_power: 99,
    stat_speed: 98,
    stat_durability: 97,
    stat_stamina: 98,
    stat_skill: 99,
    stat_luck: 85,
  },
};

export function getTierBaseStats(tier: number): CharacterStats {
  return TIER_BASE_STATS[tier] || DEFAULT_STATS;
}

export function getStatLabel(value: number): string {
  if (value === 0) return 'None';
  if (value <= 20) return 'Minimal';
  if (value <= 40) return 'Below Average';
  if (value <= 60) return 'Average';
  if (value <= 80) return 'Above Average';
  if (value <= 95) return 'Exceptional';
  if (value < 100) return 'Near Absolute';
  return 'Absolute';
}

export function getStatColor(value: number): string {
  if (value <= 20) return 'hsl(var(--tier-1))';
  if (value <= 40) return 'hsl(var(--tier-2))';
  if (value <= 60) return 'hsl(var(--tier-3))';
  if (value <= 80) return 'hsl(var(--tier-4))';
  if (value <= 95) return 'hsl(var(--tier-5))';
  return 'hsl(var(--tier-6))';
}
