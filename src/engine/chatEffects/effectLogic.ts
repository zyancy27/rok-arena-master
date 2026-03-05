/**
 * Effect Logic
 *
 * Rules for deriving visual chat effects from environment state,
 * player actions, and damage types. Replaces fixed pattern lists
 * with reasoning-based effect selection.
 */

// ── Effect Building Blocks ──────────────────────────────────────

export interface ChatEffect {
  /** Effect identifier */
  id: string;
  /** Human-readable label */
  label: string;
  /** CSS class(es) to apply */
  cssClass: string;
  /** Categories this effect belongs to */
  categories: string[];
  /** Variation parameters */
  intensity: number;   // 0-1
  speed: number;       // 0.5-2.0 multiplier
  opacity: number;     // 0-1
}

/** Master catalog of available chat effects */
export const EFFECT_CATALOG: ChatEffect[] = [
  // Fire family
  { id: 'embers', label: 'Floating Embers', cssClass: 'env-embers', categories: ['fire', 'heat', 'explosion'], intensity: 0.7, speed: 1.0, opacity: 0.8 },
  { id: 'heat-shimmer', label: 'Heat Distortion', cssClass: 'env-heat-shimmer', categories: ['fire', 'heat', 'lava', 'desert'], intensity: 0.5, speed: 0.8, opacity: 0.4 },
  { id: 'sparks', label: 'Flying Sparks', cssClass: 'env-sparks', categories: ['fire', 'electric', 'metal', 'explosion'], intensity: 0.8, speed: 1.5, opacity: 0.9 },
  { id: 'smoke-wisps', label: 'Smoke Wisps', cssClass: 'env-smoke', categories: ['fire', 'smoke', 'industrial', 'toxic'], intensity: 0.4, speed: 0.6, opacity: 0.5 },

  // Water family
  { id: 'bubbles', label: 'Rising Bubbles', cssClass: 'env-bubbles', categories: ['water', 'underwater', 'flooding'], intensity: 0.5, speed: 0.7, opacity: 0.6 },
  { id: 'light-refraction', label: 'Light Refraction', cssClass: 'env-caustics', categories: ['water', 'underwater', 'crystal'], intensity: 0.3, speed: 0.5, opacity: 0.3 },
  { id: 'water-distortion', label: 'Water Distortion', cssClass: 'env-water-distort', categories: ['water', 'flooding', 'rain'], intensity: 0.6, speed: 0.8, opacity: 0.5 },
  { id: 'floating-debris', label: 'Floating Debris', cssClass: 'env-debris-float', categories: ['water', 'flooding', 'destruction'], intensity: 0.4, speed: 0.4, opacity: 0.7 },

  // Ice family
  { id: 'frost-edge', label: 'Frost Edge', cssClass: 'env-frost', categories: ['ice', 'cold', 'blizzard'], intensity: 0.5, speed: 0.3, opacity: 0.6 },
  { id: 'snowfall', label: 'Snowfall', cssClass: 'env-snow', categories: ['ice', 'blizzard', 'cold'], intensity: 0.6, speed: 0.5, opacity: 0.5 },
  { id: 'breath-mist', label: 'Cold Breath', cssClass: 'env-breath', categories: ['ice', 'cold'], intensity: 0.3, speed: 0.4, opacity: 0.3 },

  // Electric family
  { id: 'energy-sparks', label: 'Energy Sparks', cssClass: 'env-electric-sparks', categories: ['electric', 'energy', 'reactor'], intensity: 0.9, speed: 2.0, opacity: 0.9 },
  { id: 'screen-flicker', label: 'Screen Flicker', cssClass: 'env-flicker', categories: ['electric', 'malfunction', 'digital', 'reactor'], intensity: 0.7, speed: 1.8, opacity: 0.6 },
  { id: 'static-noise', label: 'Static', cssClass: 'env-static', categories: ['electric', 'interference', 'digital'], intensity: 0.4, speed: 1.2, opacity: 0.3 },

  // Destruction family
  { id: 'screen-shake', label: 'Impact Shake', cssClass: 'env-shake', categories: ['destruction', 'explosion', 'seismic', 'collapse'], intensity: 0.8, speed: 1.5, opacity: 1.0 },
  { id: 'dust-particles', label: 'Dust Cloud', cssClass: 'env-dust', categories: ['destruction', 'collapse', 'earth', 'rubble'], intensity: 0.5, speed: 0.6, opacity: 0.5 },
  { id: 'alarm-flash', label: 'Alarm Lights', cssClass: 'env-alarm', categories: ['emergency', 'reactor', 'malfunction', 'alert'], intensity: 0.7, speed: 1.0, opacity: 0.6 },
  { id: 'vibration', label: 'Vibration', cssClass: 'env-vibrate', categories: ['destruction', 'seismic', 'collision', 'explosion'], intensity: 0.6, speed: 1.3, opacity: 0.8 },

  // Atmospheric family
  { id: 'fog-drift', label: 'Drifting Fog', cssClass: 'env-fog', categories: ['fog', 'mist', 'cold', 'swamp', 'haunted'], intensity: 0.4, speed: 0.3, opacity: 0.4 },
  { id: 'rain-streaks', label: 'Rain Streaks', cssClass: 'env-rain', categories: ['rain', 'storm', 'weather'], intensity: 0.6, speed: 1.2, opacity: 0.5 },
  { id: 'wind-lines', label: 'Wind Lines', cssClass: 'env-wind', categories: ['wind', 'storm', 'speed', 'flying'], intensity: 0.5, speed: 1.5, opacity: 0.3 },
  { id: 'sand-sweep', label: 'Sand Sweep', cssClass: 'env-sand', categories: ['desert', 'sand', 'wind', 'dust'], intensity: 0.6, speed: 0.8, opacity: 0.5 },

  // Exotic family
  { id: 'gravity-warp', label: 'Gravity Warp', cssClass: 'env-gravity', categories: ['gravity', 'space', 'anomaly'], intensity: 0.7, speed: 0.6, opacity: 0.5 },
  { id: 'void-tendrils', label: 'Void Tendrils', cssClass: 'env-void', categories: ['void', 'darkness', 'blackhole', 'cosmic'], intensity: 0.6, speed: 0.4, opacity: 0.7 },
  { id: 'crystal-glint', label: 'Crystal Glint', cssClass: 'env-crystal-glint', categories: ['crystal', 'light', 'celestial', 'holy'], intensity: 0.5, speed: 0.7, opacity: 0.4 },
  { id: 'spore-drift', label: 'Spore Drift', cssClass: 'env-spores', categories: ['plant', 'toxic', 'biological', 'alien'], intensity: 0.4, speed: 0.5, opacity: 0.4 },
  { id: 'neon-pulse', label: 'Neon Pulse', cssClass: 'env-neon-pulse', categories: ['neon', 'cyberpunk', 'digital', 'electric'], intensity: 0.6, speed: 1.0, opacity: 0.5 },
];

// ── Action → Category Mapping ───────────────────────────────────

/** Keywords in player actions that map to effect categories */
const ACTION_CATEGORY_MAP: Array<{ pattern: RegExp; categories: string[] }> = [
  { pattern: /\b(slash|cut|slice|sever|blade|sword|cleave)\b/i, categories: ['sparks', 'metal'] },
  { pattern: /\b(punch|slam|smash|crush|impact|hit|strike|pound)\b/i, categories: ['destruction', 'seismic'] },
  { pattern: /\b(explod|blast|detonat|bomb|grenade|missil)\b/i, categories: ['explosion', 'destruction', 'fire'] },
  { pattern: /\b(fire|flame|burn|ignit|incinerat|pyro)\b/i, categories: ['fire', 'heat'] },
  { pattern: /\b(ice|freeze|frost|cold|cryo|blizzard)\b/i, categories: ['ice', 'cold'] },
  { pattern: /\b(electric|shock|lightning|thunder|volt|zap)\b/i, categories: ['electric', 'energy'] },
  { pattern: /\b(water|flood|wave|tsunami|splash|drown)\b/i, categories: ['water', 'flooding'] },
  { pattern: /\b(wind|gust|tornado|hurricane|cyclone)\b/i, categories: ['wind', 'storm'] },
  { pattern: /\b(dark|shadow|void|abyss|nether)\b/i, categories: ['darkness', 'void'] },
  { pattern: /\b(light|holy|radiant|divine|celestial|sacred)\b/i, categories: ['celestial', 'light'] },
  { pattern: /\b(poison|toxic|acid|venom|corrode)\b/i, categories: ['toxic', 'biological'] },
  { pattern: /\b(energy|beam|laser|plasma|ray|cannon)\b/i, categories: ['energy', 'reactor'] },
  { pattern: /\b(gravity|pull|crush|compress|singularity)\b/i, categories: ['gravity', 'anomaly'] },
  { pattern: /\b(psychic|mind|telekin|mental|psi)\b/i, categories: ['anomaly', 'interference'] },
  { pattern: /\b(earth|ground|rock|stone|boulder|seismic)\b/i, categories: ['earth', 'seismic', 'destruction'] },
  { pattern: /\b(speed|dash|rush|sprint|blur|sonic)\b/i, categories: ['speed', 'wind'] },
  { pattern: /\b(fly|soar|hover|aerial|airborne)\b/i, categories: ['flying', 'wind'] },
  { pattern: /\b(reactor|core|meltdown|overload|critical)\b/i, categories: ['reactor', 'emergency', 'malfunction'] },
  { pattern: /\b(collapse|crumbl|cave.*in|structur)\b/i, categories: ['collapse', 'destruction', 'rubble'] },
  { pattern: /\b(plant|vine|root|thorn|nature|overgrown)\b/i, categories: ['plant', 'biological'] },
];

/**
 * Detect effect categories from player action text.
 */
export function detectActionCategories(actionText: string): string[] {
  const categories = new Set<string>();
  for (const rule of ACTION_CATEGORY_MAP) {
    if (rule.pattern.test(actionText)) {
      for (const cat of rule.categories) {
        categories.add(cat);
      }
    }
  }
  return Array.from(categories);
}

/**
 * Find effects matching a set of categories.
 * Returns effects sorted by relevance (number of matching categories).
 */
export function findMatchingEffects(
  categories: string[],
  maxResults: number = 4,
): ChatEffect[] {
  if (categories.length === 0) return [];

  const scored = EFFECT_CATALOG.map((effect) => {
    const matchCount = effect.categories.filter((c) => categories.includes(c)).length;
    return { effect, matchCount };
  })
    .filter((s) => s.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount);

  return scored.slice(0, maxResults).map((s) => s.effect);
}

/**
 * Get effects for an environment tag set (from theme engine).
 */
export function getEnvironmentEffects(tags: string[]): ChatEffect[] {
  return findMatchingEffects(tags, 3);
}
