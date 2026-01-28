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
  | 'water';    // flood, wave, underwater

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
];

/**
 * Detect battlefield effects from a message
 */
export function detectBattlefieldEffects(message: string): ActiveBattlefieldEffect[] {
  const detectedEffects: ActiveBattlefieldEffect[] = [];
  const now = Date.now();
  
  // Track which effect types we've already found at higher intensities
  const foundTypes = new Map<BattlefieldEffectType, 'low' | 'medium' | 'high'>();
  
  for (const pattern of EFFECT_PATTERNS) {
    // Skip if we already found this type at a higher or equal intensity
    const existingIntensity = foundTypes.get(pattern.type);
    if (existingIntensity) {
      const intensityOrder = { low: 1, medium: 2, high: 3 };
      if (intensityOrder[existingIntensity] >= intensityOrder[pattern.intensity]) {
        continue;
      }
    }
    
    for (const regex of pattern.patterns) {
      if (regex.test(message)) {
        // Remove lower intensity version if exists
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
        break; // Found a match for this pattern group
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
      // Extend duration and possibly upgrade intensity
      const existing = result[existingIndex];
      const intensityOrder = { low: 1, medium: 2, high: 3 };
      
      result[existingIndex] = {
        ...existing,
        intensity: intensityOrder[newEffect.intensity] > intensityOrder[existing.intensity]
          ? newEffect.intensity
          : existing.intensity,
        duration: Math.min(existing.duration + newEffect.duration / 2, 30000), // Cap at 30s
        description: newEffect.description,
      };
    } else {
      result.push(newEffect);
    }
  }
  
  return result;
}
