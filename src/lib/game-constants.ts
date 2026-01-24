export const POWER_TIERS = [
  { 
    level: 1, 
    name: 'Common Human', 
    description: 'No special abilities whatsoever. Examples: pedestrian, cop, judge. Normal human limitations apply.',
    examples: 'Pedestrian, domesticated dog, cop, judge'
  },
  { 
    level: 2, 
    name: 'Enhanced Human', 
    description: 'Physical abilities have specific maximums. Can run, jump, punch, and think vastly greater than normal, but limited by human body. Subject to fatigue, stamina loss, and injury. Still needs oxygen, sun, and basic human needs.',
    examples: 'Batman, Bane, Captain America, Deathstroke'
  },
  { 
    level: 3, 
    name: 'Super Human', 
    description: 'Not limited by physical body. Can alter physical form, wield reality-enhancing weapons, possess increased healing, heat vision, psychic powers (telekinesis, telepathy). Could survive without oxygen, sun, or water. Cannot control dimensions.',
    examples: 'Spider-Man, Flash, Wolverine, Green Lantern'
  },
  { 
    level: 4, 
    name: 'Legend', 
    description: 'Uses surroundings as an extension of body. Can control and manipulate vast amounts of mass to create objects. Does not need a physical body but is still composed of energy—tangible and killable. Exists in a single dimension, cannot move outside the 5th dimensional wall. Can exist outside of time but cannot control other dimensions.',
    examples: 'Cosmic entities, lesser deities'
  },
  { 
    level: 5, 
    name: 'Title of Titan', 
    description: 'Can control and create other dimensions. Can rewrite reality as they see fit. Can freely annihilate any lower tier, but requires more skill against same-level opponents. Cannot be killed (only erased from existence). Still abides by scientific laws and cannot break complex rules like quantum theory.',
    examples: 'Reality warpers, dimension lords'
  },
  { 
    level: 6, 
    name: 'Logic Bending', 
    description: 'Can do as they please with a simple phrase or thought addition. These powers exist outside the R.O.K. ruleset. Only to be used to restore balance in the game.',
    examples: 'Awesome Guy, Train of Thought, Dyslexicon, Ellipsis'
  },
  { 
    level: 7, 
    name: 'Logic Resorts', 
    description: 'Uses willpower and emotions to nullify direct commands—word-based attacks have no effect if unwanted. Level 7s function as Level 1s and vice versa. The ultimate paradox tier.',
    examples: 'Transcendent beings beyond classification'
  },
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

export function getTierSummary(level: number): string {
  const summaries: Record<number, string> = {
    1: 'No special abilities. Normal human limitations.',
    2: 'Peak physical abilities, but still human. Subject to fatigue.',
    3: 'Superhuman powers, healing, psychic abilities. Not limited by body.',
    4: 'Legendary control over mass and energy. Exists in single dimension.',
    5: 'Can create dimensions and rewrite reality. Cannot be killed.',
    6: 'Logic-bending powers. Exists outside normal rules.',
    7: 'Paradox tier. Willpower nullifies attacks. Functions as Tier 1 and 7.',
  };
  return summaries[level] || 'Unknown tier';
}
