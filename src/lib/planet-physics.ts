/**
 * Planet Physics Engine
 * 
 * Implements real-world astrophysics for orbital mechanics and gravitational effects.
 * Uses Kepler's laws for orbital positioning and calculates stat modifiers based on gravity.
 */

// Earth baseline values
export const EARTH_GRAVITY = 9.8; // m/s²
export const EARTH_RADIUS = 6371; // km
export const AU_TO_ORBIT_SCALE = 5; // 1 AU = 5 units in our 3D space

export interface PlanetPhysics {
  gravity: number;      // Relative to Earth (1.0 = 9.8 m/s²)
  radius: number;       // Relative to Earth
  orbitalDistance: number; // AU from sun
}

export interface GravityStatModifiers {
  strength: number;
  durability: number;
  speed: number;
  stamina: number;
  description: string;
}

/**
 * Calculate orbital radius from AU distance
 * Uses Kepler's third law for orbital velocity
 */
export function calculateOrbitRadius(auDistance: number): number {
  return auDistance * AU_TO_ORBIT_SCALE;
}

/**
 * Calculate orbital speed using Kepler's third law
 * T² ∝ a³ (orbital period squared proportional to semi-major axis cubed)
 * Faster orbits for closer planets
 */
export function calculateOrbitSpeed(auDistance: number): number {
  // Base speed at 1 AU, decreases with distance
  const baseSpeed = 0.08;
  return baseSpeed / Math.pow(auDistance, 0.5);
}

/**
 * Calculate surface gravity from mass and radius
 * g = GM/r² → For same density: g ∝ r
 * For realistic planets, we use empirical relationships
 */
export function calculateGravityFromRadius(radius: number): number {
  // Approximation: larger rocky planets tend to have higher gravity
  // Uses a sub-linear relationship (not quite g ∝ r due to compression)
  if (radius < 0.5) return 0.4 * radius; // Small moons/asteroids
  if (radius < 1.5) return 0.8 + 0.4 * (radius - 0.5); // Earth-like
  if (radius < 4) return 1.2 + 0.3 * (radius - 1.5); // Super-Earths
  return 2.0 + 0.1 * (radius - 4); // Gas giant cores
}

/**
 * Get gravity classification and description
 */
export function getGravityClass(gravity: number): { 
  name: string; 
  color: string; 
  description: string 
} {
  if (gravity < 0.3) {
    return {
      name: 'Micro-Gravity',
      color: '#A78BFA', // violet
      description: 'Near-weightless environment. Inhabitants develop elongated forms.'
    };
  }
  if (gravity < 0.7) {
    return {
      name: 'Low Gravity',
      color: '#60A5FA', // blue
      description: 'Light gravity allows for greater agility but weaker musculature.'
    };
  }
  if (gravity < 1.3) {
    return {
      name: 'Earth-like',
      color: '#34D399', // green
      description: 'Standard gravity conditions. Balanced physical development.'
    };
  }
  if (gravity < 2.5) {
    return {
      name: 'High Gravity',
      color: '#FBBF24', // amber
      description: 'Dense atmosphere. Inhabitants develop powerful muscles and denser bones.'
    };
  }
  return {
    name: 'Crushing Gravity',
    color: '#EF4444', // red
    description: 'Extreme gravitational forces. Only the strongest life forms survive.'
  };
}

/**
 * Calculate character stat modifiers based on home planet gravity
 * High gravity worlds → stronger, more durable characters
 * Low gravity worlds → faster, more agile characters
 */
export function calculateGravityStatModifiers(gravity: number): GravityStatModifiers {
  const gravityClass = getGravityClass(gravity);
  
  if (gravity < 0.3) {
    // Micro-gravity: Very fast, fragile
    return {
      strength: -15,
      durability: -10,
      speed: +20,
      stamina: -5,
      description: `${gravityClass.name}: +20 Speed, -15 Strength, -10 Durability`
    };
  }
  
  if (gravity < 0.7) {
    // Low gravity: Fast, slightly weaker
    return {
      strength: -5,
      durability: -5,
      speed: +10,
      stamina: 0,
      description: `${gravityClass.name}: +10 Speed, -5 Strength`
    };
  }
  
  if (gravity < 1.3) {
    // Earth-like: No modifiers
    return {
      strength: 0,
      durability: 0,
      speed: 0,
      stamina: 0,
      description: `${gravityClass.name}: No stat modifiers`
    };
  }
  
  if (gravity < 2.5) {
    // High gravity: Strong, durable, slower
    return {
      strength: +10,
      durability: +10,
      speed: -5,
      stamina: +5,
      description: `${gravityClass.name}: +10 Strength/Durability, -5 Speed`
    };
  }
  
  // Crushing gravity: Very strong, very slow
  return {
    strength: +20,
    durability: +15,
    speed: -15,
    stamina: +10,
    description: `${gravityClass.name}: +20 Strength, +15 Durability, -15 Speed`
  };
}

/**
 * Apply gravity modifiers to stats (clamped 0-100)
 */
export function applyGravityModifiers(
  stats: Record<string, number>,
  gravity: number
): Record<string, number> {
  const modifiers = calculateGravityStatModifiers(gravity);
  
  return {
    ...stats,
    stat_strength: Math.max(0, Math.min(100, (stats.stat_strength || 50) + modifiers.strength)),
    stat_durability: Math.max(0, Math.min(100, (stats.stat_durability || 50) + modifiers.durability)),
    stat_speed: Math.max(0, Math.min(100, (stats.stat_speed || 50) + modifiers.speed)),
    stat_stamina: Math.max(0, Math.min(100, (stats.stat_stamina || 50) + modifiers.stamina)),
  };
}

/**
 * Planet presets based on real solar system bodies
 */
export const PLANET_PRESETS: Record<string, PlanetPhysics> = {
  'Mercury-like': { gravity: 0.38, radius: 0.38, orbitalDistance: 0.4 },
  'Venus-like': { gravity: 0.91, radius: 0.95, orbitalDistance: 0.7 },
  'Earth-like': { gravity: 1.0, radius: 1.0, orbitalDistance: 1.0 },
  'Mars-like': { gravity: 0.38, radius: 0.53, orbitalDistance: 1.5 },
  'Super-Earth': { gravity: 1.5, radius: 1.5, orbitalDistance: 1.2 },
  'Gas Giant Moon': { gravity: 0.14, radius: 0.27, orbitalDistance: 5.2 },
  'High-Gravity World': { gravity: 2.5, radius: 2.0, orbitalDistance: 0.8 },
  'Asteroid Colony': { gravity: 0.1, radius: 0.1, orbitalDistance: 2.8 },
};
