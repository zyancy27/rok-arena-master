/**
 * Living Rulebook Registry
 * 
 * Maps every engine mechanic to an auto-generated rule page.
 * When a mechanic fires for the first time, it "unlocks" in the rulebook.
 * The registry also defines cross-references between related mechanics.
 */

import type { MechanicKey } from './mechanic-discovery';

// ── Types ───────────────────────────────────────────────────

export interface LivingRuleEntry {
  mechanicKey: MechanicKey;
  title: string;
  icon: string;
  chapter: LivingChapter;
  description: string;
  example: string;
  relatedKeys: MechanicKey[];
}

export type LivingChapter =
  | 'Core Mechanics'
  | 'Combat Systems'
  | 'Environmental Systems'
  | 'Status Effects'
  | 'Character Mechanics'
  | 'Campaign Systems'
  | 'Advanced Systems';

// ── Full Registry ───────────────────────────────────────────

export const LIVING_RULE_ENTRIES: LivingRuleEntry[] = [
  // ── Core Mechanics ──
  {
    mechanicKey: 'dice_roll',
    title: 'Dice Rolls',
    icon: '🎲',
    chapter: 'Core Mechanics',
    description: 'A d20 roll determines whether attacks land or miss. Your character\'s stats (Skill, Power, Speed) modify the roll. Higher rolls favor the attacker; the defender\'s stats create the threshold to beat.',
    example: 'You swing your blade — the system rolls d20 + your Skill modifier (14) vs the opponent\'s defense threshold (12). A roll of 15 + 14 = 29, easily clearing 12. The hit lands cleanly.',
    relatedKeys: ['hit_detection', 'critical_hit', 'skill_mishap'],
  },
  {
    mechanicKey: 'hit_detection',
    title: 'Hit Detection',
    icon: '💥',
    chapter: 'Core Mechanics',
    description: 'After dice are rolled, the system determines if the attack connects, grazes, or misses entirely. The gap between attack and defense rolls affects damage severity — a narrow win means a glancing blow, while a large gap means a devastating strike.',
    example: 'Your attack roll beats the defense by only 2 points — the narrator describes the hit as a glancing blow that clips the opponent\'s shoulder rather than a full impact.',
    relatedKeys: ['dice_roll', 'critical_hit', 'concentration'],
  },
  {
    mechanicKey: 'move_validation',
    title: 'Move Validation (Hard Clamp)',
    icon: '⚠️',
    chapter: 'Core Mechanics',
    description: 'The system checks your moves against your character\'s known abilities. If you attempt something outside your character sheet, you\'ll be asked to justify it. Valid explanations add the technique to your profile permanently.',
    example: 'You describe your fire-wielding character using ice. The Narrator tab glows, asking you to explain how this fits your power. You explain your fire can reach absolute-zero temperatures — the system accepts and catalogs "Thermal Inversion" as a new technique.',
    relatedKeys: ['stat_modification', 'charge_attack'],
  },

  // ── Combat Systems ──
  {
    mechanicKey: 'concentration',
    title: 'Concentration & Dodge',
    icon: '🎯',
    chapter: 'Combat Systems',
    description: 'When an attack hits you, you can spend a Concentration charge to attempt a dodge. You get 3 uses per battle. A successful dodge avoids damage but applies a small stat penalty on your next action. AI opponents also use Concentration.',
    example: 'A devastating energy blast is about to hit you. You activate Concentration — the system rolls for your dodge. Success! Your character narrowly sidesteps, but your next attack will have -5 to its roll.',
    relatedKeys: ['hit_detection', 'dice_roll', 'overcharge'],
  },
  {
    mechanicKey: 'charge_attack',
    title: 'Charge Attacks',
    icon: '⚡',
    chapter: 'Combat Systems',
    description: 'Certain abilities require time to gather power before they are released. Describing a charging or powered-up attack signals the system that your character is building energy. Charged attacks deal more damage but leave you briefly vulnerable during the charge phase.',
    example: 'A player spends two turns concentrating energy into their fist, describing the glow intensifying. On the third turn, they release it — the system recognizes the charge buildup and amplifies the attack\'s potency by 1.8×.',
    relatedKeys: ['concentration', 'overcharge', 'stat_modification'],
  },
  {
    mechanicKey: 'overcharge',
    title: 'Overcharge & Risk',
    icon: '🔥',
    chapter: 'Combat Systems',
    description: 'Toggle Overcharge before an attack for 1.5–2× potency — but with a 30% chance of a risk misfire. Success means massive damage amplification. Failure means misfire, momentum loss, and a psychological penalty. Edge State reduces risk chance.',
    example: 'You activate ⚡ Overcharge before your signature move. The system rolls risk — 70% chance of success. It lands! Your attack deals 1.8× its normal damage. But if it had misfired, you\'d lose 20 momentum and take a confidence hit.',
    relatedKeys: ['charge_attack', 'skill_mishap', 'critical_hit'],
  },
  {
    mechanicKey: 'critical_hit',
    title: 'Critical Hits',
    icon: '✨',
    chapter: 'Combat Systems',
    description: 'A natural 20 or exceptionally high roll triggers a critical hit, dealing enhanced damage. Your Skill stat increases the critical range, making crits more likely for skilled fighters.',
    example: 'Your Skill is 85, expanding your crit range to 18–20. You roll a natural 19 — critical hit! The narrator describes your precision strike finding the perfect weak point.',
    relatedKeys: ['dice_roll', 'hit_detection', 'skill_mishap'],
  },
  {
    mechanicKey: 'skill_mishap',
    title: 'Skill Mishaps',
    icon: '💫',
    chapter: 'Combat Systems',
    description: 'When a character attempts something beyond their Skill level, there\'s a chance of a mishap — the move partially fails or backfires. Higher Skill reduces mishap chance.',
    example: 'Your low-Skill character tries an acrobatic backflip attack. The system determines a mishap — your character stumbles mid-flip, leaving them open to a counter-attack.',
    relatedKeys: ['dice_roll', 'critical_hit', 'overcharge'],
  },
  {
    mechanicKey: 'area_damage',
    title: 'Area Damage',
    icon: '💣',
    chapter: 'Combat Systems',
    description: 'Some attacks affect an area rather than a single target. In group battles, area attacks can hit multiple combatants. The system detects area-of-effect language and applies damage to everyone in range.',
    example: 'You describe your character slamming the ground, sending a shockwave in all directions. In a 3-player battle, both opponents take reduced damage from the AoE.',
    relatedKeys: ['hit_detection', 'environment_effect', 'distance_zone'],
  },
  {
    mechanicKey: 'mental_attack',
    title: 'Mental & Psychic Attacks',
    icon: '🧠',
    chapter: 'Combat Systems',
    description: 'Psychic or mental abilities use Intelligence and Battle IQ instead of physical stats for dice rolls. Mental defenses work differently — willpower and focus determine resistance.',
    example: 'Your telepath attacks the opponent\'s mind. The roll uses Intelligence (78) instead of Strength. The defender\'s Battle IQ (45) sets the threshold — your mental assault breaks through.',
    relatedKeys: ['dice_roll', 'stat_modification', 'concentration'],
  },

  // ── Environmental Systems ──
  {
    mechanicKey: 'environment_effect',
    title: 'Environmental Hazards',
    icon: '🌋',
    chapter: 'Environmental Systems',
    description: 'The battlefield has dynamic environmental hazards — fire, collapsing terrain, storms. These affect all combatants and can change the flow of battle. The Living Arena tracks stability, hazard level, and environmental pressure.',
    example: 'During an intense exchange, the arena\'s stability drops below 40%. The narrator announces: "The ceiling groans — cracks race across the support pillars." Both fighters now deal with falling debris.',
    relatedKeys: ['distance_zone', 'area_damage', 'stat_modification'],
  },
  {
    mechanicKey: 'distance_zone',
    title: 'Distance Zones',
    icon: '📏',
    chapter: 'Environmental Systems',
    description: 'Combatants occupy distance zones (close, mid, far, extreme). Your character\'s Speed stat affects how quickly they can close or create distance. Some attacks only work at certain ranges.',
    example: 'Your sniper character is at "far" range. Your melee opponent tries to close the gap — their Speed determines how many turns it takes to reach "close" range.',
    relatedKeys: ['environment_effect', 'area_damage', 'charge_attack'],
  },

  // ── Status Effects ──
  {
    mechanicKey: 'stat_modification',
    title: 'Dynamic Stat Shifts',
    icon: '📊',
    chapter: 'Status Effects',
    description: 'Your actions in battle temporarily change your stats. Dropping your guard lowers defense, charging up boosts power, sprinting increases speed but drains stamina. The system reads your moves and adjusts automatically.',
    example: 'You describe your character pushing through pain to fight harder. The system temporarily boosts your Strength by +8 but drops your Durability by -5 for the next 2 turns.',
    relatedKeys: ['concentration', 'overcharge', 'charge_attack'],
  },

  // ── Advanced Combat Systems ──
  {
    mechanicKey: 'momentum',
    title: 'Momentum & Edge State',
    icon: '🔥',
    chapter: 'Advanced Systems',
    description: 'Each fighter has a hidden Momentum meter (0–100). Landing combos, successful counters, and physics exploits build Momentum. At 100, you enter Edge State for 1–2 turns — halving risk chance and boosting damage multipliers. Getting interrupted, misfiring, or taking critical hits drains Momentum rapidly.',
    example: 'You chain three consecutive hits, building momentum to 95. On your next turn you land another combo — the system triggers Edge State! For the next two turns your attacks deal bonus damage and Overcharge risk is halved.',
    relatedKeys: ['overcharge', 'psychology', 'critical_hit', 'charge_attack'],
  },
  {
    mechanicKey: 'psychology',
    title: 'Psychological Warfare',
    icon: '🧠',
    chapter: 'Advanced Systems',
    description: 'Four hidden psychological stats — Confidence, Fear, Resolve, and Rage — shift in response to combat events. Dominating raises confidence; getting outplayed raises fear; taking damage fuels rage. These influence accuracy modifiers, risk chance, momentum gain rate, and how the narrator portrays your character\'s composure. Players see only subtle visual cues, never raw numbers.',
    example: 'After landing three unanswered hits, your confidence rises — the narrator describes your character\'s movements becoming fluid and assured. Your opponent\'s fear rises, slightly reducing their accuracy on the next roll.',
    relatedKeys: ['momentum', 'overcharge', 'stat_modification', 'concentration'],
  },

  {
    mechanicKey: 'construct',
    title: 'Constructs',
    icon: '🛡️',
    chapter: 'Character Mechanics',
    description: 'Some abilities let you create battlefield constructs — shields, barriers, summons. These have their own durability and can absorb attacks or block paths. Opponents can target and destroy them.',
    example: 'Your earth-bender raises a stone wall (durability: 60). The opponent\'s next attack targets the wall — dealing 45 damage. The wall holds at 15 durability, blocking the attack from reaching you.',
    relatedKeys: ['environment_effect', 'area_damage', 'move_validation'],
  },

  // ── Campaign Systems ──
  {
    mechanicKey: 'campaign_xp',
    title: 'Experience Points',
    icon: '⭐',
    chapter: 'Campaign Systems',
    description: 'Your actions in campaign mode earn Experience Points. Combat victories, exploration, creative problem-solving, and story progress all reward XP. Accumulate enough to level up.',
    example: 'After defeating a group of enemies, you earn 150 XP. With creative narration during the fight, the system awards a bonus 30 XP for storytelling quality.',
    relatedKeys: ['campaign_level_up', 'campaign_inventory'],
  },
  {
    mechanicKey: 'campaign_level_up',
    title: 'Level Up',
    icon: '🎉',
    chapter: 'Campaign Systems',
    description: 'When you gain enough XP, your campaign character levels up — gaining +3 stat points to distribute and unlocking access to higher-tier abilities. Campaign level is separate from base tier.',
    example: 'You reach 500 XP, triggering a level up to Campaign Level 3. You gain 3 stat points and can now access Tier 3 abilities within the campaign.',
    relatedKeys: ['campaign_xp', 'campaign_power_reset', 'stat_modification'],
  },
  {
    mechanicKey: 'campaign_inventory',
    title: 'Campaign Inventory',
    icon: '🎒',
    chapter: 'Campaign Systems',
    description: 'Find items during adventures — weapons, potions, artifacts. Equip items for stat bonuses. Items are specific to the campaign session and don\'t transfer to your base character.',
    example: 'You discover a "Shard of the Void" in a hidden alcove. Equipping it grants +10 Power but -5 Luck. You can trade items with party members.',
    relatedKeys: ['campaign_xp', 'campaign_zone'],
  },
  {
    mechanicKey: 'campaign_time',
    title: 'Time Progression',
    icon: '🕐',
    chapter: 'Campaign Systems',
    description: 'The campaign world has a day/night cycle. Your actions advance time through phases: dawn, morning, midday, afternoon, dusk, evening, night, midnight. Different times affect environment, NPC behavior, and encounters.',
    example: 'You rest until dawn. The narrator announces morning — shopkeepers open their stalls, nocturnal enemies retreat, and new quests become available.',
    relatedKeys: ['campaign_zone', 'environment_effect'],
  },
  {
    mechanicKey: 'campaign_zone',
    title: 'Zone Travel',
    icon: '🗺️',
    chapter: 'Campaign Systems',
    description: 'The campaign world is divided into zones. Actions can move the party to new areas with different environments, encounters, and story threads.',
    example: 'You describe your party following the river downstream. The narrator transitions you from "Ancient Forest" to "Riverside Ruins" — a new zone with different enemies and loot.',
    relatedKeys: ['campaign_time', 'environment_effect', 'campaign_inventory'],
  },
  {
    mechanicKey: 'campaign_solo_mode',
    title: 'Solo Exploration',
    icon: '🚶',
    chapter: 'Campaign Systems',
    description: 'Explore independently by describing your character going off on their own. While solo, you act freely without waiting for the group.',
    example: 'You write: "I slip away from the camp to investigate the strange noise." The system puts you in solo mode — you can act freely until you describe returning to the party.',
    relatedKeys: ['campaign_zone', 'campaign_character_swap'],
  },
  {
    mechanicKey: 'campaign_power_reset',
    title: 'Power Reset',
    icon: '⚡',
    chapter: 'Campaign Systems',
    description: 'In campaigns, characters start at Campaign Level 1 regardless of their base tier. You unlock higher-tier abilities as you level up, keeping the adventure balanced.',
    example: 'Your Tier 5 character enters a campaign but starts at Level 1. You must earn your way back to full power through gameplay.',
    relatedKeys: ['campaign_level_up', 'campaign_xp'],
  },
  {
    mechanicKey: 'campaign_character_swap',
    title: 'Character Swap',
    icon: '🔄',
    chapter: 'Campaign Systems',
    description: 'Swap to another of your characters mid-campaign. The swapped-out character\'s data is preserved. New characters start fresh; returning characters keep their progress.',
    example: 'Your warrior is injured. You swap to your healer character — they start at Level 1 with fresh stats, but your warrior\'s Level 4 progress is saved for when you swap back.',
    relatedKeys: ['campaign_power_reset', 'campaign_solo_mode'],
  },
];

// ── Lookup helpers ──────────────────────────────────────────

const entryMap = new Map(LIVING_RULE_ENTRIES.map(e => [e.mechanicKey, e]));

export function getRuleEntry(key: MechanicKey): LivingRuleEntry | undefined {
  return entryMap.get(key);
}

export function getRelatedEntries(key: MechanicKey): LivingRuleEntry[] {
  const entry = entryMap.get(key);
  if (!entry) return [];
  return entry.relatedKeys
    .map(k => entryMap.get(k))
    .filter((e): e is LivingRuleEntry => !!e);
}

// ── Discovery state (localStorage) ─────────────────────────

const DISCOVERED_KEY = 'rok-living-rulebook-discovered';
const READ_KEY = 'rok-living-rulebook-read';

export function getDiscoveredMechanics(): Set<MechanicKey> {
  try {
    const raw = localStorage.getItem(DISCOVERED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

export function markDiscovered(key: MechanicKey) {
  const set = getDiscoveredMechanics();
  set.add(key);
  localStorage.setItem(DISCOVERED_KEY, JSON.stringify([...set]));
}

export function getReadMechanics(): Set<MechanicKey> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

export function markRead(key: MechanicKey) {
  const set = getReadMechanics();
  set.add(key);
  localStorage.setItem(READ_KEY, JSON.stringify([...set]));
}

export function getUnreadCount(): number {
  const discovered = getDiscoveredMechanics();
  const read = getReadMechanics();
  let count = 0;
  discovered.forEach(k => { if (!read.has(k)) count++; });
  return count;
}

// ── Chapter grouping for the book ──────────────────────────

export interface LivingBookChapter {
  chapter: LivingChapter;
  icon: string;
  entries: LivingRuleEntry[];
  hasUnread: boolean;
}

const CHAPTER_ICONS: Record<LivingChapter, string> = {
  'Core Mechanics': '⚙️',
  'Combat Systems': '⚔️',
  'Environmental Systems': '🌍',
  'Status Effects': '🧠',
  'Character Mechanics': '🛡️',
  'Campaign Systems': '🗺️',
  'Advanced Systems': '🔬',
};

const CHAPTER_ORDER: LivingChapter[] = [
  'Core Mechanics',
  'Combat Systems',
  'Environmental Systems',
  'Status Effects',
  'Character Mechanics',
  'Campaign Systems',
  'Advanced Systems',
];

/**
 * Build the living chapters from discovered mechanics.
 * Only chapters with at least one discovered entry are shown.
 * If showAll is true, all entries appear (for the static rulebook view).
 */
export function buildLivingChapters(showAll = false): LivingBookChapter[] {
  const discovered = getDiscoveredMechanics();
  const read = getReadMechanics();

  const grouped = new Map<LivingChapter, LivingRuleEntry[]>();

  for (const entry of LIVING_RULE_ENTRIES) {
    if (!showAll && !discovered.has(entry.mechanicKey)) continue;
    const list = grouped.get(entry.chapter) || [];
    list.push(entry);
    grouped.set(entry.chapter, list);
  }

  return CHAPTER_ORDER
    .filter(ch => grouped.has(ch))
    .map(ch => {
      const entries = grouped.get(ch)!;
      const hasUnread = entries.some(e => discovered.has(e.mechanicKey) && !read.has(e.mechanicKey));
      return {
        chapter: ch,
        icon: CHAPTER_ICONS[ch],
        entries,
        hasUnread,
      };
    });
}
