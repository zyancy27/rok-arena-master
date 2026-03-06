/**
 * Mechanic Discovery System
 * Tracks which battle mechanics a player has encountered for the first time.
 * When a new mechanic triggers, it queues a narrator explanation message
 * and unlocks the corresponding page in the Living Rulebook.
 */

import { markDiscovered as markRulebookDiscovered } from './living-rulebook-registry';

export type MechanicKey =
  | 'dice_roll'
  | 'concentration'
  | 'hit_detection'
  | 'construct'
  | 'distance_zone'
  | 'environment_effect'
  | 'skill_mishap'
  | 'critical_hit'
  | 'stat_modification'
  | 'move_validation'
  | 'area_damage'
  | 'mental_attack'
  | 'charge_attack'
  | 'overcharge'
  // Campaign-specific mechanics
  | 'campaign_xp'
  | 'campaign_level_up'
  | 'campaign_inventory'
  | 'campaign_time'
  | 'campaign_zone'
  | 'campaign_solo_mode'
  | 'campaign_power_reset'
  | 'campaign_character_swap';

interface MechanicInfo {
  title: string;
  summary: string;
}

const MECHANIC_EXPLANATIONS: Record<MechanicKey, MechanicInfo> = {
  dice_roll: {
    title: '🎲 Dice Rolls',
    summary: 'A d20 roll determines whether attacks land or miss. Your character\'s stats (Skill, Power, Speed) modify the roll. Higher rolls favor the attacker; the defender\'s stats create the threshold to beat.',
  },
  concentration: {
    title: '🎯 Concentration',
    summary: 'When an attack would hit you, you can spend a Concentration charge to attempt a dodge. You get 3 uses per battle. A successful dodge avoids damage but may apply a small stat penalty on your next action.',
  },
  hit_detection: {
    title: '💥 Hit Detection',
    summary: 'After dice are rolled, the system determines if the attack connects, grazes, or misses entirely. The gap between attack and defense rolls affects damage severity.',
  },
  construct: {
    title: '🛡️ Constructs',
    summary: 'Some abilities let you create battlefield constructs — shields, barriers, summons. These have their own durability and can absorb attacks or block paths. Opponents can target and destroy them.',
  },
  distance_zone: {
    title: '📏 Distance Zones',
    summary: 'Combatants occupy distance zones (close, mid, far, extreme). Your character\'s Speed stat affects how quickly they can close or create distance. Some attacks only work at certain ranges.',
  },
  environment_effect: {
    title: '🌋 Environment Effects',
    summary: 'The battlefield has dynamic environmental hazards — fire, collapsing terrain, storms. These affect all combatants equally and can change the flow of battle. Adapt your strategy accordingly.',
  },
  skill_mishap: {
    title: '⚡ Skill Mishap',
    summary: 'When a character attempts something beyond their Skill level, there\'s a chance of a mishap — the move partially fails or backfires. Higher Skill reduces mishap chance.',
  },
  critical_hit: {
    title: '✨ Critical Hit',
    summary: 'A natural 20 or exceptionally high roll triggers a critical hit, dealing enhanced damage. Your Skill stat increases the critical range, making crits more likely for skilled fighters.',
  },
  stat_modification: {
    title: '📊 Stat Shift',
    summary: 'Your actions in battle can temporarily change your stats. Dropping your guard lowers defense, charging up boosts power, sprinting increases speed but drains stamina. The system reads your moves and adjusts automatically.',
  },
  move_validation: {
    title: '⚠️ Move Validation',
    summary: 'The system checks your moves against your character\'s known abilities. If you attempt something new, you\'ll be asked to explain how it fits your character. Valid explanations add the move to your abilities.',
  },
  area_damage: {
    title: '💣 Area Damage',
    summary: 'Some attacks affect an area rather than a single target. In group battles, area attacks can hit multiple combatants. The system detects these and applies effects to everyone in range.',
  },
  mental_attack: {
    title: '🧠 Mental Attack',
    summary: 'Psychic or mental abilities use Intelligence and Battle IQ instead of physical stats for dice rolls. Mental defenses work differently — willpower and focus determine resistance.',
  },
  charge_attack: {
    title: '⚡ Charge Attack',
    summary: 'Describing a charging or powered-up attack signals to the system that your character is building energy. Charged attacks deal more damage but leave you briefly vulnerable.',
  },
  overcharge: {
    title: '🔥 Overcharge',
    summary: 'Pushing an ability beyond its normal limits. Overcharged moves are stronger but risk a mishap or stamina drain. The narrator factors this into the outcome.',
  },
  campaign_xp: {
    title: '⭐ Campaign XP',
    summary: 'Your actions in the campaign earn Experience Points. Combat victories, exploration, creative problem-solving, and story progress all reward XP. Accumulate enough to level up your campaign character.',
  },
  campaign_level_up: {
    title: '🎉 Campaign Level Up',
    summary: 'When you gain enough XP, your campaign character levels up — gaining +3 stat points to distribute and unlocking access to higher-tier abilities. Your campaign level is separate from your character\'s base tier.',
  },
  campaign_inventory: {
    title: '🎒 Campaign Inventory',
    summary: 'You can find items during your adventure — weapons, potions, artifacts. Equip items for stat bonuses. Items are specific to this campaign session and don\'t transfer to your base character.',
  },
  campaign_time: {
    title: '🕐 Time Progression',
    summary: 'The campaign world has a day/night cycle. Your actions advance time — dawn, morning, midday, afternoon, dusk, evening, night, midnight. Different times affect the environment, NPC behavior, and available encounters.',
  },
  campaign_zone: {
    title: '🗺️ Zone Travel',
    summary: 'The campaign world is divided into zones. Your actions can move the party to new areas with different environments, encounters, and story threads. The narrator announces zone changes.',
  },
  campaign_solo_mode: {
    title: '🚶 Solo Exploration',
    summary: 'You can explore independently by describing your character going off on their own. While solo, you act freely without waiting for the group. Describe finding or returning to the party to rejoin.',
  },
  campaign_power_reset: {
    title: '⚡ Power Reset',
    summary: 'In campaigns, characters start at Campaign Level 1 regardless of their base tier. You unlock higher-tier abilities as you level up. This keeps the adventure balanced and gives a sense of progression.',
  },
  campaign_character_swap: {
    title: '🔄 Character Swap',
    summary: 'You can swap to another of your characters mid-campaign. The swapped-out character\'s campaign data (HP, XP, level, items) is preserved. New characters start fresh; returning characters keep their progress.',
  },
};

const STORAGE_KEY = 'rok-mechanic-discoveries';

/** Get the set of already-seen mechanics for an account (userId) */
function getSeenMechanics(userId: string): Set<MechanicKey> {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-${userId}`);
    if (raw) return new Set(JSON.parse(raw) as MechanicKey[]);
  } catch { /* ignore */ }
  return new Set();
}

function markSeen(userId: string, key: MechanicKey) {
  const seen = getSeenMechanics(userId);
  seen.add(key);
  localStorage.setItem(`${STORAGE_KEY}-${userId}`, JSON.stringify([...seen]));
}

/**
 * Check if a mechanic is being encountered for the first time per account.
 * If so, marks it as seen and returns the explanation info.
 * Returns null if already seen.
 */
export function discoverMechanic(
  userId: string,
  key: MechanicKey,
): MechanicInfo | null {
  const seen = getSeenMechanics(userId);
  if (seen.has(key)) return null;
  markSeen(userId, key);
  // Also unlock in the Living Rulebook
  markRulebookDiscovered(key);
  return MECHANIC_EXPLANATIONS[key];
}
