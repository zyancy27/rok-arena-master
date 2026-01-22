export const POWER_TIERS = [
  { level: 1, name: 'Awakened', description: 'Basic power manifestation' },
  { level: 2, name: 'Adept', description: 'Skilled control over abilities' },
  { level: 3, name: 'Master', description: 'Advanced techniques unlocked' },
  { level: 4, name: 'Champion', description: 'Legendary combat prowess' },
  { level: 5, name: 'Sovereign', description: 'Reality-bending potential' },
  { level: 6, name: 'Celestial', description: 'Near-godlike power' },
  { level: 7, name: 'Transcendent', description: 'Beyond mortal comprehension' },
] as const;

export const ROK_RULES = [
  {
    id: 1,
    title: 'One Base Power',
    description: 'Each character may only possess one base power. This power defines your character\'s core abilities and cannot be stacked with other base powers.',
  },
  {
    id: 2,
    title: 'Conjunction Limit',
    description: 'When describing an attack or action, you may only use one conjunction (and, or, but). This prevents chaining multiple effects into a single overwhelming attack.',
  },
  {
    id: 3,
    title: 'Charging Time',
    description: 'Powerful moves require charging time proportional to their strength. Higher tier abilities require more turns to prepare, giving opponents a chance to react.',
  },
  {
    id: 4,
    title: 'No Refusing Valid Attacks',
    description: 'If an opponent launches a valid attack that your character cannot reasonably dodge or counter, you must acknowledge the hit. No godmodding or auto-dodging.',
  },
  {
    id: 5,
    title: 'Turn-Based Responses',
    description: 'In multi-player battles, you may only respond when it is your turn. Wait for all preceding players to complete their actions before taking yours.',
  },
  {
    id: 6,
    title: 'Honourable Resolution',
    description: 'When a character is "in check" (no valid moves to escape defeat), the battle should be resolved honourably. The losing player should concede gracefully.',
  },
] as const;

export function getTierName(level: number): string {
  return POWER_TIERS.find(t => t.level === level)?.name || 'Unknown';
}

export function getTierColor(level: number): string {
  const colors = {
    1: 'tier-1',
    2: 'tier-2',
    3: 'tier-3',
    4: 'tier-4',
    5: 'tier-5',
    6: 'tier-6',
    7: 'tier-7',
  };
  return colors[level as keyof typeof colors] || 'tier-1';
}
