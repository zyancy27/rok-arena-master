/**
 * Hazard Types
 *
 * Modular hazard definitions that can trigger during battle.
 */

export interface HazardType {
  id: string;
  name: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe';
  /** Which location tags this hazard is compatible with */
  compatibleTags: string[];
  /** Combat modifier description */
  combatEffect: string;
  /** Duration in narrator turns (0 = instant) */
  duration: number;
}

export const HAZARD_TYPES: HazardType[] = [
  // ─── Universal hazards ────────────────────────────────────────
  {
    id: 'seismic_tremor',
    name: 'Seismic Tremor',
    description: 'The ground shakes violently beneath both fighters, making stable footing nearly impossible!',
    severity: 'moderate',
    compatibleTags: ['outdoor', 'underground', 'volcanic', 'desert'],
    combatEffect: 'Both fighters suffer reduced accuracy. Melee attacks may miss due to shifting ground.',
    duration: 1,
  },
  {
    id: 'meteor_strike',
    name: 'Meteor Strike',
    description: 'A small meteor crashes nearby, creating a shockwave that staggers both combatants!',
    severity: 'severe',
    compatibleTags: ['outdoor', 'floating', 'void'],
    combatEffect: 'Shockwave forces both fighters to brace. Creates new crater terrain.',
    duration: 0,
  },
  {
    id: 'energy_surge',
    name: 'Energy Surge',
    description: 'A strange energy pulse ripples through the battlefield, disrupting powers momentarily!',
    severity: 'moderate',
    compatibleTags: ['void', 'crystal', 'cosmic'],
    combatEffect: 'Power-based abilities are weakened for one turn.',
    duration: 1,
  },

  // ─── Volcanic hazards ─────────────────────────────────────────
  {
    id: 'lava_eruption',
    name: 'Lava Eruption',
    description: 'A fissure cracks open, spewing molten lava across the battlefield!',
    severity: 'severe',
    compatibleTags: ['volcanic'],
    combatEffect: 'New lava zone created. Fighters near the fissure must reposition.',
    duration: 3,
  },
  {
    id: 'ground_collapse',
    name: 'Ground Collapse',
    description: 'Unstable volcanic rock crumbles, creating a chasm between fighters!',
    severity: 'moderate',
    compatibleTags: ['volcanic', 'underground'],
    combatEffect: 'Distance forced to increase. Melee fighters must find a way across.',
    duration: 2,
  },
  {
    id: 'ash_cloud',
    name: 'Ash Cloud',
    description: 'A thick cloud of volcanic ash reduces visibility for both combatants!',
    severity: 'minor',
    compatibleTags: ['volcanic'],
    combatEffect: 'Ranged accuracy reduced. Stealth opportunities increase.',
    duration: 2,
  },
  {
    id: 'heat_wave',
    name: 'Heat Wave',
    description: 'Superheated air blasts across the arena, forcing both fighters to shield themselves!',
    severity: 'moderate',
    compatibleTags: ['volcanic', 'desert'],
    combatEffect: 'Stamina drain increased. Metal equipment becomes burning hot.',
    duration: 1,
  },

  // ─── Ice/Tundra hazards ───────────────────────────────────────
  {
    id: 'ice_crack',
    name: 'Ice Crack',
    description: 'The frozen ground splits with a thunderous crack! The surface becomes treacherously unstable.',
    severity: 'severe',
    compatibleTags: ['tundra'],
    combatEffect: 'Movement becomes dangerous. Heavy impacts may shatter the surface.',
    duration: 3,
  },
  {
    id: 'blizzard_surge',
    name: 'Blizzard Surge',
    description: 'A whiteout blizzard sweeps across the battlefield, visibility drops to zero!',
    severity: 'moderate',
    compatibleTags: ['tundra'],
    combatEffect: 'Visibility near zero. All ranged attacks suffer major penalties.',
    duration: 2,
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    description: 'Snow and ice cascade down! Both combatants must scramble to avoid burial.',
    severity: 'severe',
    compatibleTags: ['tundra', 'elevated'],
    combatEffect: 'Forced repositioning. Buried fighters cannot act next turn.',
    duration: 1,
  },

  // ─── Storm hazards ────────────────────────────────────────────
  {
    id: 'lightning_strike',
    name: 'Lightning Strike',
    description: 'A bolt of lightning crashes between the fighters!',
    severity: 'severe',
    compatibleTags: ['storm', 'outdoor', 'elevated'],
    combatEffect: 'Metal-wielding fighters are at risk. Creates electrified zone.',
    duration: 1,
  },
  {
    id: 'wind_gust',
    name: 'Powerful Wind Gust',
    description: 'A tremendous gust sweeps across the arena, pushing fighters and disrupting projectiles!',
    severity: 'minor',
    compatibleTags: ['storm', 'elevated', 'bridge', 'floating'],
    combatEffect: 'Ranged attacks deflected. Light fighters may be pushed.',
    duration: 1,
  },

  // ─── Structural hazards ───────────────────────────────────────
  {
    id: 'structural_collapse',
    name: 'Structural Collapse',
    description: 'A nearby structure groans and collapses, sending debris flying!',
    severity: 'severe',
    compatibleTags: ['urban', 'bridge', 'underground'],
    combatEffect: 'Debris field created. Cover opportunities. Falling damage risk.',
    duration: 0,
  },
  {
    id: 'cable_snap',
    name: 'Cable Snap',
    description: 'A support cable snaps with a deafening crack, the structure lurches!',
    severity: 'moderate',
    compatibleTags: ['bridge'],
    combatEffect: 'Platform tilts. Balance checks required.',
    duration: 1,
  },

  // ─── Crystal hazards ──────────────────────────────────────────
  {
    id: 'crystal_shatter',
    name: 'Crystal Shatter',
    description: 'A massive crystal formation explodes, sending razor-sharp shards everywhere!',
    severity: 'severe',
    compatibleTags: ['crystal'],
    combatEffect: 'Shrapnel damage to both fighters. Reflective surfaces destroyed.',
    duration: 0,
  },
  {
    id: 'resonance_wave',
    name: 'Resonance Wave',
    description: 'Crystals vibrate at a disorienting frequency, affecting balance and concentration!',
    severity: 'moderate',
    compatibleTags: ['crystal'],
    combatEffect: 'Concentration checks harder. Charge attacks may be disrupted.',
    duration: 2,
  },

  // ─── Void/cosmic hazards ──────────────────────────────────────
  {
    id: 'reality_tear',
    name: 'Reality Tear',
    description: 'A rift opens in the fabric of space — reality bleeds at the edges!',
    severity: 'severe',
    compatibleTags: ['void', 'cosmic', 'reality_bending'],
    combatEffect: 'Physics become unreliable near the rift. Powers may behave unpredictably.',
    duration: 3,
  },
  {
    id: 'gravity_inversion',
    name: 'Gravity Inversion',
    description: 'Gravity suddenly reverses! Everything not anchored flies upward!',
    severity: 'severe',
    compatibleTags: ['void', 'floating', 'cosmic'],
    combatEffect: 'All positioning resets. Aerial combat forced.',
    duration: 1,
  },
];

/**
 * Get hazards compatible with given location tags
 */
export function getCompatibleHazards(locationTags: string[]): HazardType[] {
  return HAZARD_TYPES.filter(h =>
    h.compatibleTags.some(tag => locationTags.includes(tag))
  );
}

/**
 * Pick a random hazard from compatible ones
 */
export function pickRandomHazard(locationTags: string[]): HazardType | null {
  const compatible = getCompatibleHazards(locationTags);
  if (compatible.length === 0) return null;
  return compatible[Math.floor(Math.random() * compatible.length)];
}
