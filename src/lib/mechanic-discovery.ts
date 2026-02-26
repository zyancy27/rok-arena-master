/**
 * Mechanic Discovery System
 * Tracks which battle mechanics a player has encountered for the first time.
 * When a new mechanic triggers, it queues a narrator explanation message.
 */

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
  | 'overcharge';

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
};

const STORAGE_KEY = 'rok-mechanic-discoveries';

/** Get the set of already-seen mechanics for a battle */
function getSeenMechanics(battleId: string): Set<MechanicKey> {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-${battleId}`);
    if (raw) return new Set(JSON.parse(raw) as MechanicKey[]);
  } catch { /* ignore */ }
  return new Set();
}

function markSeen(battleId: string, key: MechanicKey) {
  const seen = getSeenMechanics(battleId);
  seen.add(key);
  localStorage.setItem(`${STORAGE_KEY}-${battleId}`, JSON.stringify([...seen]));
}

/**
 * Check if a mechanic is being encountered for the first time.
 * If so, marks it as seen and returns the explanation info.
 * Returns null if already seen.
 */
export function discoverMechanic(
  battleId: string,
  key: MechanicKey,
): MechanicInfo | null {
  const seen = getSeenMechanics(battleId);
  if (seen.has(key)) return null;
  markSeen(battleId, key);
  return MECHANIC_EXPLANATIONS[key];
}
