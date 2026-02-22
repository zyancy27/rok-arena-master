/**
 * Battlefield Effects Detection System
 * Detects environmental changes from battle messages and triggers visual effects
 */

export type BattlefieldEffectType = 
  | 'fire'      // lava, flames, burning, explosion
  | 'ice'       // freeze, frost, cold, chill
  | 'smoke'     // smoke, fog, mist, obscured
  | 'flash'     // blinding light, flash, radiant
  | 'storm'     // rain, lightning, thunder, wind
  | 'darkness'  // shadow, void, blackout
  | 'poison'    // toxic, acid, corrosive
  | 'electric'  // lightning, shock, electricity
  | 'sand'      // sandstorm, dust, desert
  | 'water'     // flood, wave, underwater
  | 'inferno'   // full battlefield fire with heat distortion
  | 'flooded'   // water at borders/edges
  | 'gravity'   // gravity distortion pulling inward
  | 'blackhole'; // spatial distortion / black hole

export interface ActiveBattlefieldEffect {
  type: BattlefieldEffectType;
  intensity: 'low' | 'medium' | 'high';
  duration: number; // milliseconds
  startTime: number;
  description: string;
}

interface EffectPattern {
  type: BattlefieldEffectType;
  patterns: RegExp[];
  intensity: 'low' | 'medium' | 'high';
  duration: number; // base duration in ms
}

const EFFECT_PATTERNS: EffectPattern[] = [
  // Fire effects
  {
    type: 'fire',
    patterns: [
      /\b(lava|magma|molten)\b/i,
      /\bfloor.{0,20}(is|turns?|becomes?).{0,10}(lava|fire|flames?)\b/i,
      /\b(engulf|cover|spread).{0,15}(flame|fire|lava)\b/i,
      /\b(explosion|explode|detonate|blast)\b/i,
      /\b(inferno|blaze|burn|incinerat)/i,
      /\bfire.{0,10}(everywhere|surrounds?|spreads?)\b/i,
      /\b(hellfire|flames?.{0,10}erupt)\b/i,
    ],
    intensity: 'high',
    duration: 15000,
  },
  {
    type: 'fire',
    patterns: [
      /\b(fire|flames?|burning|ignite)\b/i,
      /\b(heat|scorch|sear)\b/i,
    ],
    intensity: 'medium',
    duration: 10000,
  },
  
  // Ice effects
  {
    type: 'ice',
    patterns: [
      /\b(freeze|frozen|frost|ice).{0,15}(area|zone|field|ground|floor|everything)\b/i,
      /\b(absolute zero|flash freeze|deep freeze)\b/i,
      /\b(blizzard|snowstorm|ice storm)\b/i,
      /\b(encase|trap).{0,10}ice\b/i,
    ],
    intensity: 'high',
    duration: 12000,
  },
  {
    type: 'ice',
    patterns: [
      /\b(chill|cold|frost|freeze|frozen|ice|frigid)\b/i,
      /\btemperature.{0,15}(drop|plummet|fall)\b/i,
      /\b(snow|icicle|glacier)\b/i,
    ],
    intensity: 'medium',
    duration: 8000,
  },
  
  // Smoke effects
  {
    type: 'smoke',
    patterns: [
      /\b(smoke|fog|mist).{0,15}(fills?|covers?|blankets?|spreads?|everywhere)\b/i,
      /\b(visibility|vision).{0,15}(zero|obscured|blocked|reduced)\b/i,
      /\b(smoke ?screen|smokescreen)\b/i,
      /\bthick (smoke|fog|mist)\b/i,
    ],
    intensity: 'high',
    duration: 20000,
  },
  {
    type: 'smoke',
    patterns: [
      /\b(smoke|fog|mist|haze|smog)\b/i,
      /\b(obscur|cloud)\b/i,
    ],
    intensity: 'low',
    duration: 12000,
  },
  
  // Flash/blinding effects
  {
    type: 'flash',
    patterns: [
      /\b(flash ?bang|flashbang|stun grenade)\b/i,
      /\b(blinding|blinded).{0,10}(light|flash|radiance)\b/i,
      /\b(solar flare|supernova|brilliant flash)\b/i,
      /\blight.{0,10}(explosion|burst|erupts?)\b/i,
    ],
    intensity: 'high',
    duration: 3000,
  },
  {
    type: 'flash',
    patterns: [
      /\b(bright|radiant|glowing|luminous).{0,10}light\b/i,
      /\b(flash|flare|glare|dazzl)\b/i,
      /\b(holy|divine|sacred).{0,10}light\b/i,
    ],
    intensity: 'medium',
    duration: 2000,
  },
  
  // Storm/weather effects
  {
    type: 'storm',
    patterns: [
      /\b(hurricane|tornado|cyclone|typhoon)\b/i,
      /\b(thunder ?storm|lightning storm)\b/i,
      /\b(storm|tempest).{0,15}(rages?|forms?|erupts?)\b/i,
      /\bweather.{0,15}(changes?|shifts?|turns?)\b/i,
    ],
    intensity: 'high',
    duration: 18000,
  },
  {
    type: 'storm',
    patterns: [
      /\b(rain|raining|downpour|drizzle)\b/i,
      /\b(wind|gust|gale|breeze)\b/i,
      /\b(thunder|lightning)\b/i,
      /\b(storm|stormy)\b/i,
    ],
    intensity: 'medium',
    duration: 12000,
  },
  
  // Darkness effects
  {
    type: 'darkness',
    patterns: [
      /\b(void|abyss|blackout).{0,15}(consumes?|spreads?|covers?)\b/i,
      /\b(total|complete|absolute).{0,10}darkness\b/i,
      /\b(shadow|dark).{0,10}(realm|dimension|engulfs?)\b/i,
    ],
    intensity: 'high',
    duration: 15000,
  },
  {
    type: 'darkness',
    patterns: [
      /\b(dark|darkness|shadow|shadows|dim)\b/i,
      /\blight.{0,10}(fades?|dims?|vanish)\b/i,
    ],
    intensity: 'low',
    duration: 10000,
  },
  
  // Poison/toxic effects
  {
    type: 'poison',
    patterns: [
      /\b(toxic|poison).{0,15}(cloud|gas|mist|air)\b/i,
      /\b(acid|corrosive).{0,15}(rain|spray|spreads?)\b/i,
      /\b(miasma|blight|contamina)\b/i,
    ],
    intensity: 'high',
    duration: 15000,
  },
  {
    type: 'poison',
    patterns: [
      /\b(poison|toxic|venom|acid)\b/i,
    ],
    intensity: 'low',
    duration: 8000,
  },
  
  // Electric effects
  {
    type: 'electric',
    patterns: [
      /\b(electricity|electric).{0,15}(surges?|arcs?|everywhere)\b/i,
      /\b(lightning).{0,10}(strikes?|bolts?|storm)\b/i,
      /\b(electr|shock|volt|thunder)\b/i,
    ],
    intensity: 'medium',
    duration: 5000,
  },
  
  // Sand effects
  {
    type: 'sand',
    patterns: [
      /\b(sandstorm|sand storm|dust storm)\b/i,
      /\b(sand|dust).{0,15}(swirls?|everywhere|blinds?)\b/i,
      /\b(desert|dune).{0,10}(winds?|storm)\b/i,
    ],
    intensity: 'high',
    duration: 15000,
  },
  
  // Water effects
  {
    type: 'water',
    patterns: [
      /\b(flood|tsunami|tidal wave|deluge)\b/i,
      /\b(water).{0,15}(rises?|floods?|everywhere|surges?)\b/i,
      /\b(underwater|submerge|drown)\b/i,
    ],
    intensity: 'high',
    duration: 12000,
  },
  {
    type: 'water',
    patterns: [
      /\b(splash|wave|water|ocean|sea)\b/i,
    ],
    intensity: 'low',
    duration: 6000,
  },

  // === NEW FIELD-WIDE EFFECTS ===

  // Inferno - full battlefield engulfed in flames with heat distortion
  {
    type: 'inferno',
    patterns: [
      /\b(entire|whole|all).{0,15}(battlefield|arena|field).{0,15}(burns?|ablaze|fire|flames?)\b/i,
      /\b(inferno|hellscape|firestorm).{0,10}(engulfs?|covers?|consumes?)\b/i,
      /\b(sea|ocean|wall)\s+(of\s+)?(fire|flame|lava)\b/i,
    ],
    intensity: 'high',
    duration: 20000,
  },

  // Flooded - water at borders/edges
  {
    type: 'flooded',
    patterns: [
      /\b(battlefield|arena|field).{0,15}(floods?|submerge|underwater)\b/i,
      /\b(water|waves?).{0,15}(rising|rise|flood|surge).{0,10}(everywhere|around)\b/i,
      /\b(flooded|flooding|deluge|tsunami)\b/i,
    ],
    intensity: 'high',
    duration: 18000,
  },
  {
    type: 'flooded',
    patterns: [
      /\b(water\s+level|flood\s+waters?|rising\s+water)\b/i,
    ],
    intensity: 'medium',
    duration: 12000,
  },

  // Gravity Distortion - altered gravity
  {
    type: 'gravity',
    patterns: [
      /\b(gravity).{0,15}(shifts?|changes?|increases?|crushes?|intensif|distort|alter)\w*/i,
      /\b(gravitational).{0,10}(pull|force|anomaly|distortion)/i,
      /\b(heavy|crushing|intense).{0,10}gravity\b/i,
      /\b(zero.{0,3}gravity|weightless|anti.{0,3}gravity)\b/i,
    ],
    intensity: 'high',
    duration: 15000,
  },

  // Black Hole / Spatial Distortion
  {
    type: 'blackhole',
    patterns: [
      /\b(black\s*hole|singularity|event\s*horizon)\b/i,
      /\b(space|reality|dimension).{0,15}(tears?|rips?|warps?|distorts?|collapses?)\b/i,
      /\b(spatial|dimensional).{0,10}(rift|tear|anomaly|distortion)/i,
      /\b(vortex|maelstrom).{0,10}(opens?|forms?|appears?)\b/i,
    ],
    intensity: 'high',
    duration: 18000,
  },
];

/**
 * Effect priority for layering. Higher = renders on top / suppresses lower ones
 */
export const FIELD_EFFECT_PRIORITY: Record<BattlefieldEffectType, number> = {
  blackhole: 100,
  inferno: 90,
  gravity: 85,
  darkness: 80,
  storm: 70,
  flooded: 65,
  flash: 60,
  fire: 50,
  ice: 50,
  electric: 45,
  smoke: 40,
  poison: 35,
  sand: 30,
  water: 25,
};

/**
 * Suppression rules: when a global effect is active, these local effects are redundant
 */
export const SUPPRESSION_MAP: Partial<Record<BattlefieldEffectType, string[]>> = {
  inferno: ['burning'], // Global inferno suppresses individual burning status
  flooded: ['submerged'], // Global flood suppresses individual submerged
  darkness: ['blinded'], // Global darkness makes individual blinding redundant
};

/**
 * Check if a character status should be suppressed by active field effects
 */
export function shouldSuppressStatus(
  statusType: string,
  activeFieldEffects: ActiveBattlefieldEffect[]
): boolean {
  for (const fieldEffect of activeFieldEffects) {
    const suppressed = SUPPRESSION_MAP[fieldEffect.type];
    if (suppressed?.includes(statusType)) {
      return true;
    }
  }
  return false;
}

/**
 * Detect battlefield effects from a message
 */
export function detectBattlefieldEffects(message: string): ActiveBattlefieldEffect[] {
  const detectedEffects: ActiveBattlefieldEffect[] = [];
  const now = Date.now();
  
  const foundTypes = new Map<BattlefieldEffectType, 'low' | 'medium' | 'high'>();
  
  for (const pattern of EFFECT_PATTERNS) {
    const existingIntensity = foundTypes.get(pattern.type);
    if (existingIntensity) {
      const intensityOrder = { low: 1, medium: 2, high: 3 };
      if (intensityOrder[existingIntensity] >= intensityOrder[pattern.intensity]) {
        continue;
      }
    }
    
    for (const regex of pattern.patterns) {
      if (regex.test(message)) {
        const existingIndex = detectedEffects.findIndex(e => e.type === pattern.type);
        if (existingIndex !== -1) {
          detectedEffects.splice(existingIndex, 1);
        }
        
        detectedEffects.push({
          type: pattern.type,
          intensity: pattern.intensity,
          duration: pattern.duration,
          startTime: now,
          description: message.slice(0, 100),
        });
        
        foundTypes.set(pattern.type, pattern.intensity);
        break;
      }
    }
  }
  
  return detectedEffects;
}

/**
 * Check if an effect is still active based on its start time and duration
 */
export function isEffectActive(effect: ActiveBattlefieldEffect): boolean {
  return Date.now() - effect.startTime < effect.duration;
}

/**
 * Get the CSS class suffix for an effect type
 */
export function getEffectClassName(type: BattlefieldEffectType): string {
  return `battlefield-effect-${type}`;
}

/**
 * Merge new effects with existing ones, extending durations for repeated effects
 */
export function mergeEffects(
  existing: ActiveBattlefieldEffect[],
  newEffects: ActiveBattlefieldEffect[]
): ActiveBattlefieldEffect[] {
  const result = [...existing.filter(isEffectActive)];
  
  for (const newEffect of newEffects) {
    const existingIndex = result.findIndex(e => e.type === newEffect.type);
    
    if (existingIndex !== -1) {
      const existing = result[existingIndex];
      const intensityOrder = { low: 1, medium: 2, high: 3 };
      
      result[existingIndex] = {
        ...existing,
        intensity: intensityOrder[newEffect.intensity] > intensityOrder[existing.intensity]
          ? newEffect.intensity
          : existing.intensity,
        duration: Math.min(existing.duration + newEffect.duration / 2, 30000),
        description: newEffect.description,
      };
    } else {
      result.push(newEffect);
    }
  }
  
  // Sort by priority so higher-priority effects render on top
  result.sort((a, b) => (FIELD_EFFECT_PRIORITY[a.type] || 0) - (FIELD_EFFECT_PRIORITY[b.type] || 0));
  
  return result;
}
