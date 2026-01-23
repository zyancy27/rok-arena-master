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
  stat_strength: 50,
  stat_power: 50,
  stat_speed: 50,
  stat_durability: 50,
  stat_stamina: 50,
  stat_skill: 50,
  stat_luck: 50,
};

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
