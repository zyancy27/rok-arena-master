/**
 * Arena Modifiers — Seed-based daily/weekly rotating modifiers
 * All players see the same modifier on the same day.
 */

export interface ArenaModifier {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Prompt injection for AI to incorporate */
  promptEffect: string;
  /** Stat modifier percentages (applied on top of existing) */
  statMods?: Partial<Record<'strength' | 'speed' | 'durability' | 'stamina' | 'power' | 'skill' | 'luck' | 'intelligence' | 'battle_iq', number>>;
  /** Risk chance modifier (-0.1 = 10% less risk) */
  glitchMod?: number;
  /** Momentum gain multiplier */
  momentumMultiplier?: number;
  /** Affects overcharge risk */
  overchargeRiskMod?: number;
  /** Visual theme hint */
  theme: 'fire' | 'ice' | 'storm' | 'cosmic' | 'chaos' | 'zen' | 'gravity' | 'toxic' | 'shadow' | 'light';
  /** Rarity weight (lower = rarer) */
  weight: number;
}

// ─── Modifier Pool ───────────────────────────────────────────────────────────

const DAILY_MODIFIERS: ArenaModifier[] = [
  {
    id: 'solar_flare',
    name: 'Solar Flare',
    emoji: '☀️',
    description: 'Intense solar radiation boosts power but drains stamina faster.',
    promptEffect: 'A massive solar flare bathes the arena in blinding golden light. All energy-based attacks are amplified, but the intense radiation causes fighters to tire faster. Describe how the oppressive heat affects combat.',
    statMods: { power: 10, stamina: -8 },
    theme: 'fire',
    weight: 3,
  },
  {
    id: 'void_tide',
    name: 'Void Tide',
    emoji: '🌀',
    description: 'Dimensional rifts make attacks unpredictable. Higher risk chance, but momentum builds faster.',
    promptEffect: 'Small dimensional rifts flicker in and out of existence across the arena. Reality feels unstable — attacks may phase partially through targets or strike from unexpected angles. Describe the dimensional instability.',
    glitchMod: 0.1,
    momentumMultiplier: 1.3,
    theme: 'chaos',
    weight: 2,
  },
  {
    id: 'frozen_domain',
    name: 'Frozen Domain',
    emoji: '❄️',
    description: 'Sub-zero temperatures increase durability but slow everyone down.',
    promptEffect: 'The arena is encased in permafrost. Breath crystallizes instantly, movements feel sluggish, but the cold hardens the body against impacts. Describe how the freezing conditions affect each action.',
    statMods: { speed: -10, durability: 12 },
    theme: 'ice',
    weight: 3,
  },
  {
    id: 'thunder_cage',
    name: 'Thunder Cage',
    emoji: '⚡',
    description: 'Constant electrical discharge. Speed surges but overcharge is riskier.',
    promptEffect: 'Lightning arcs continuously between towering conductors ringing the arena. The electric field supercharges nerve impulses but makes energy techniques dangerously volatile. Describe the crackling atmosphere.',
    statMods: { speed: 12 },
    overchargeRiskMod: 0.15,
    theme: 'storm',
    weight: 3,
  },
  {
    id: 'lunar_serenity',
    name: 'Lunar Serenity',
    emoji: '🌙',
    description: 'Moonlit calm reduces risk chance and boosts intelligence.',
    promptEffect: 'A serene full moon hangs impossibly close, bathing the arena in silver light. Minds feel clearer, strategies sharper, and the tranquil energy stabilizes dimensional frequencies. Describe the peaceful yet intense atmosphere.',
    statMods: { intelligence: 8, battle_iq: 8 },
    glitchMod: -0.08,
    theme: 'zen',
    weight: 3,
  },
  {
    id: 'heavy_world',
    name: 'Heavy World',
    emoji: '🪨',
    description: '2x gravity crushes the arena. Strength matters more, speed matters less.',
    promptEffect: 'Gravity has doubled. Every step feels like wading through mud, jumps barely leave the ground, but punches land with devastating weight. Only the strongest can move freely. Describe the crushing gravitational pressure.',
    statMods: { strength: 15, speed: -15, stamina: -5 },
    theme: 'gravity',
    weight: 2,
  },
  {
    id: 'miasma_zone',
    name: 'Miasma Zone',
    emoji: '☠️',
    description: 'Toxic fog poisons the air. Stamina drain accelerates, luck decreases.',
    promptEffect: 'A sickly green miasma seeps from the ground, corroding everything it touches. Breathing is labored, focus wavers, and prolonged exposure weakens the body. Describe how fighters cope with the poisonous atmosphere.',
    statMods: { stamina: -12, luck: -8 },
    theme: 'toxic',
    weight: 2,
  },
  {
    id: 'cosmic_alignment',
    name: 'Cosmic Alignment',
    emoji: '🌌',
    description: 'Stars align — all stats get a small boost. A blessed day.',
    promptEffect: 'A rare cosmic alignment channels celestial energy into the arena. Both fighters feel empowered, their abilities resonating with the universe. Every action feels slightly more potent. Describe the cosmic energy flowing through the combatants.',
    statMods: { strength: 5, speed: 5, power: 5, durability: 5, skill: 5 },
    theme: 'cosmic',
    weight: 1, // rare
  },
  {
    id: 'shadow_veil',
    name: 'Shadow Veil',
    emoji: '🌑',
    description: 'Darkness shrouds the arena. Skill-based attacks are more accurate, but luck drops.',
    promptEffect: 'An impenetrable shadow blankets the battlefield. Visibility is near zero — fighters must rely on instinct and trained senses. Skilled combatants thrive; the lucky falter. Describe how darkness shapes each exchange.',
    statMods: { skill: 10, luck: -10 },
    theme: 'shadow',
    weight: 3,
  },
  {
    id: 'radiant_surge',
    name: 'Radiant Surge',
    emoji: '✨',
    description: 'Holy light heals between turns. Durability boosted, momentum slower.',
    promptEffect: 'Pillars of radiant light pulse through the arena, washing over fighters between exchanges. Minor wounds close, but the calming energy makes it harder to build aggressive momentum. Describe the healing light.',
    statMods: { durability: 10 },
    momentumMultiplier: 0.7,
    theme: 'light',
    weight: 2,
  },
];

const WEEKLY_MODIFIERS: ArenaModifier[] = [
  {
    id: 'tournament_of_legends',
    name: 'Tournament of Legends',
    emoji: '🏆',
    description: 'Week-long tournament rules: all momentum gains doubled.',
    promptEffect: 'The Tournament of Legends is in effect this week! The arena crackles with competitive energy. Crowd reactions are louder, momentum shifts are dramatic, and every exchange feels like a championship bout.',
    momentumMultiplier: 2.0,
    theme: 'light',
    weight: 1,
  },
  {
    id: 'chaos_week',
    name: 'Chaos Week',
    emoji: '🎪',
    description: 'Anything can happen. Risk chance increased, but overcharge is more powerful.',
    promptEffect: 'It\'s Chaos Week! Reality itself seems drunk. Physics work differently moment to moment, attacks can have unexpected side effects, and the impossible becomes merely improbable.',
    glitchMod: 0.15,
    overchargeRiskMod: -0.1,
    theme: 'chaos',
    weight: 1,
  },
  {
    id: 'endurance_trial',
    name: 'Endurance Trial',
    emoji: '🏋️',
    description: 'This week tests stamina. All fights last longer, stamina drain reduced.',
    promptEffect: 'The Endurance Trial is active this week. Both fighters feel inexhaustible — the arena suppresses fatigue, allowing longer, more drawn-out exchanges. Every fight is a war of attrition.',
    statMods: { stamina: 20 },
    theme: 'zen',
    weight: 1,
  },
  {
    id: 'glass_cannon_week',
    name: 'Glass Cannon Week',
    emoji: '💥',
    description: 'Power way up, durability way down. Every hit counts.',
    promptEffect: 'Glass Cannon Week makes every exchange lethal. Attacks hit with devastating force, but defenses are paper-thin. One mistake could end it all. Describe the heightened danger.',
    statMods: { power: 20, strength: 10, durability: -20 },
    theme: 'fire',
    weight: 1,
  },
];

// ─── Deterministic Seed ──────────────────────────────────────────────────────

/** Simple seeded PRNG (mulberry32) */
function seededRandom(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateToDaySeed(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 86400000);
}

function dateToWeekSeed(date: Date): number {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  // Align to Monday
  d.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 86400000);
}

function weightedPick<T extends { weight: number }>(items: T[], rng: () => number): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * totalWeight;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ActiveArenaModifiers {
  daily: ArenaModifier;
  weekly: ArenaModifier;
  /** Combined stat mods (daily + weekly) */
  combinedStatMods: Record<string, number>;
  /** Combined prompt for AI */
  combinedPrompt: string;
  /** Combined risk modifier */
  glitchMod: number;
  /** Combined momentum multiplier */
  momentumMultiplier: number;
  /** Combined overcharge risk modifier */
  overchargeRiskMod: number;
  /** Days/hours until daily rotation */
  dailyResetsIn: string;
  /** Days until weekly rotation */
  weeklyResetsIn: string;
}

/**
 * Get the active arena modifiers for a given date.
 * Same date = same modifiers for all players globally.
 */
export function getActiveArenaModifiers(date: Date = new Date()): ActiveArenaModifiers {
  const daySeed = dateToDaySeed(date);
  const weekSeed = dateToWeekSeed(date);

  const dailyRng = seededRandom(daySeed * 31337);
  const weeklyRng = seededRandom(weekSeed * 7919);

  const daily = weightedPick(DAILY_MODIFIERS, dailyRng);
  const weekly = weightedPick(WEEKLY_MODIFIERS, weeklyRng);

  // Combine stat mods
  const combinedStatMods: Record<string, number> = {};
  const allStatMods = [daily.statMods, weekly.statMods];
  for (const mods of allStatMods) {
    if (!mods) continue;
    for (const [key, val] of Object.entries(mods)) {
      combinedStatMods[key] = (combinedStatMods[key] || 0) + (val ?? 0);
    }
  }

  // Combined prompt
  const combinedPrompt = [
    `\n\n🌐 DAILY ARENA MODIFIER — ${daily.emoji} ${daily.name.toUpperCase()}:\n${daily.promptEffect}`,
    `\n\n🗓️ WEEKLY ARENA MODIFIER — ${weekly.emoji} ${weekly.name.toUpperCase()}:\n${weekly.promptEffect}`,
    '\nIMPORTANT: Weave both arena modifiers into your battle narration. Show how the environmental conditions affect combat actions, strategy, and the fighters\' experience.',
  ].join('\n');

  // Reset timers
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const hoursLeft = Math.max(0, Math.ceil((tomorrow.getTime() - date.getTime()) / 3600000));
  const dailyResetsIn = hoursLeft <= 1 ? '<1 hour' : `${hoursLeft} hours`;

  const dayOfWeek = date.getDay();
  const daysToMonday = (8 - dayOfWeek) % 7 || 7;
  const weeklyResetsIn = daysToMonday === 1 ? '1 day' : `${daysToMonday} days`;

  return {
    daily,
    weekly,
    combinedStatMods,
    combinedPrompt,
    glitchMod: (daily.glitchMod ?? 0) + (weekly.glitchMod ?? 0),
    momentumMultiplier: (daily.momentumMultiplier ?? 1) * (weekly.momentumMultiplier ?? 1),
    overchargeRiskMod: (daily.overchargeRiskMod ?? 0) + (weekly.overchargeRiskMod ?? 0),
    dailyResetsIn,
    weeklyResetsIn,
  };
}

/**
 * Apply arena stat modifiers to a character's base stats
 */
export function applyArenaStatMods(
  baseStat: number,
  statKey: string,
  mods: Record<string, number>
): number {
  const mod = mods[statKey] ?? 0;
  return Math.max(1, Math.min(100, baseStat + mod));
}
