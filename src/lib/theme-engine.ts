/**
 * Modular Environment & Chat Theme Engine
 * 
 * A composable, data-driven system that dynamically generates environment visuals
 * and chat box themes from reusable building blocks — no hardcoded themes needed.
 * 
 * Architecture:
 *   1. Keyword Analyzer: extracts environmental tags from location strings
 *   2. Building Blocks: modular visual components (backgrounds, overlays, lighting, etc.)
 *   3. Composer: assembles blocks into a complete ThemeComposition
 *   4. Cache: memoizes composed themes for performance
 *   5. Snapshot: serializable snapshots for per-message historical persistence
 */

// ── Types ───────────────────────────────────────────────────────

/** A single gradient layer */
export interface BackgroundLayer {
  type: 'linear' | 'radial' | 'conic';
  /** CSS gradient string (colors + positions) */
  gradient: string;
}

/** A CSS overlay effect class */
export interface OverlayModule {
  /** Unique identifier / CSS class name */
  className: string;
  /** Priority for layering order (lower = further back) */
  zOrder: number;
}

/** Chat box styling that inherits from environment */
export interface ChatBoxStyle {
  /** Border CSS class or inline style */
  borderStyle: string;
  /** Optional text-shadow for glow */
  textGlow?: string;
  /** Background texture CSS */
  backgroundTexture?: string;
  /** Urgency animation class (shake, pulse, flicker) */
  urgencyAnimation?: string;
  /** Font weight/style hint */
  fontHint?: 'normal' | 'bold' | 'italic';
}

/** Complete composed theme */
export interface ThemeComposition {
  /** Unique key for caching */
  cacheKey: string;
  /** Stacked background gradient layers */
  backgrounds: BackgroundLayer[];
  /** CSS overlay effect modules (particles, caustics, fog, etc.) */
  overlays: OverlayModule[];
  /** Inset box-shadow for ambient glow */
  ambientGlow?: string;
  /** Overall animation intensity */
  animationIntensity: 'low' | 'medium' | 'high';
  /** Chat box styling derived from environment */
  chatBox: ChatBoxStyle;
  /** Tags extracted from analysis (for display/saving) */
  tags: string[];
}

/** Serializable theme preset for saving */
export interface SavedThemePreset {
  name: string;
  tags: string[];
  composition: ThemeComposition;
}

// ── Theme Snapshot (serializable, per-message) ──────────────────

/**
 * A lightweight, JSON-serializable snapshot of the visual theme at a point in time.
 * Stored in battle_messages.theme_snapshot for historical message rendering.
 */
export interface ThemeSnapshot {
  /** Location string at send-time */
  location: string | null;
  /** Final computed environment tags (location + modifiers) */
  tags: EnvironmentTag[];
  /** Status/effect tags active on the character at send-time */
  statusTags: EnvironmentTag[];
  /** Overlay classNames (pre-resolved for rendering) */
  overlays: string[];
  /** Animation intensity at send-time */
  animationIntensity: 'low' | 'medium' | 'high';
  /** Chat box style fields */
  chatBox: ChatBoxStyle;
  /** Ambient glow string */
  ambientGlow?: string;
  /** Background layers (pre-resolved) */
  backgrounds: BackgroundLayer[];
}

// ── Tag Taxonomy ────────────────────────────────────────────────

/** Environmental tag categories */
export type EnvironmentTag =
  // Biomes
  | 'lava' | 'underwater' | 'sky' | 'space' | 'blizzard' | 'forest'
  | 'desert' | 'crystal' | 'void' | 'storm' | 'ruins' | 'toxic'
  // Urbane / Tech
  | 'cyberpunk' | 'mech' | 'digital'
  // Supernatural
  | 'haunted' | 'celestial' | 'inferno' | 'bloodmoon' | 'dreamscape'
  // Dimensional
  | 'timerift' | 'mirror' | 'blackhole'
  // Compound
  | 'underwater-volcano' | 'floating-islands'
  // Modifiers
  | 'emergency' | 'fire' | 'ice' | 'electric' | 'radiation'
  | 'wind' | 'rain' | 'fog' | 'darkness' | 'holy' | 'neon'
  | 'cosmic' | 'acid' | 'gravity' | 'tremor';

/** Status effect type → EnvironmentTag mapping for visual theming */
const STATUS_EFFECT_TAG_MAP: Record<string, EnvironmentTag> = {
  poisoned: 'toxic',
  burning: 'fire',
  frozen: 'ice',
  electrified: 'electric',
  irradiated: 'radiation',
  blinded: 'darkness',
  panicked: 'emergency',
  cursed: 'haunted',
  blessed: 'celestial',
  corroded: 'acid',
  paralyzed: 'electric',
  chilled: 'ice',
  overheated: 'fire',
  suffocating: 'void',
  drowning: 'underwater',
  gravityCrushed: 'gravity',
  windSwept: 'wind',
  fogBlinded: 'fog',
};

/**
 * Convert status effect types to environment tags for theming.
 */
export function statusEffectsToTags(statusTypes: string[]): EnvironmentTag[] {
  const tags: EnvironmentTag[] = [];
  for (const st of statusTypes) {
    const tag = STATUS_EFFECT_TAG_MAP[st];
    if (tag && !tags.includes(tag)) {
      tags.push(tag);
    }
  }
  return tags;
}

/** Keyword → tag mapping rules */
const TAG_RULES: Array<{ pattern: RegExp; tag: EnvironmentTag }> = [
  // Compound first (more specific)
  { pattern: /underwat.*volcan|hydrothermal|deep.*vent|submar.*volcan|ocean.*erupt/, tag: 'underwater-volcano' },
  { pattern: /float.*island|sky.*island|drift.*land|levitat.*rock|air.*island|cloud.*island/, tag: 'floating-islands' },
  // Biomes
  { pattern: /lava|magma|molten|caldera/, tag: 'lava' },
  { pattern: /volcano|volcanic|eruption/, tag: 'lava' },
  { pattern: /underwat|ocean|sea\b|trench|hull.*breach|aquatic|coral|abyss.*water|submar/, tag: 'underwater' },
  { pattern: /sky\b|free.?fall|fall.*from|30.*000|plane\b|airborne|cloud|stratosphere/, tag: 'sky' },
  { pattern: /nuclear|reactor|radiation|melt.*down|chernobyl|power.*plant|radioactive/, tag: 'radiation' },
  { pattern: /space|orbit|station|vacuum|asteroid|star.*ship|cosmos|galaxy|re.?entry|warp/, tag: 'space' },
  { pattern: /blizzard|snow|ice.*storm|arctic|frozen.*waste|tundra|frost|glacier|polar/, tag: 'blizzard' },
  { pattern: /forest|jungle|swamp|marsh|grove|canopy|woodland/, tag: 'forest' },
  { pattern: /desert|sand\b|dune|oasis|arid|sahara|wasteland/, tag: 'desert' },
  { pattern: /crystal|cave|cavern|gem|mine\b|underground|grotto/, tag: 'crystal' },
  { pattern: /void|dimension.*tear|collaps|rift(?!.*time)|dark.*realm|shadow.*realm|nether/, tag: 'void' },
  { pattern: /storm|thunder|lightning|hurricane|tornado|cyclone|tempest/, tag: 'storm' },
  { pattern: /ruin|temple|ancient|colosseum|arena|fortress|castle|citadel/, tag: 'ruins' },
  { pattern: /toxic|chem|acid|sewer|waste.*dump|pollut|contamin|biohazard|sludge/, tag: 'toxic' },
  { pattern: /cyber|neon|city|urban|street|downtown|metro|punk|hacker|digital/, tag: 'cyberpunk' },
  { pattern: /mech\b|hangar|factory|industrial|warehouse|steel.*mill/, tag: 'mech' },
  { pattern: /haunt|ghost|spirit|phantom|graveyard|cemetery|crypt|spectral|wraith/, tag: 'haunted' },
  { pattern: /celest|heaven|divine|holy|ethereal|angel|paradise|sacred|empyrean/, tag: 'celestial' },
  { pattern: /time.*rift|temporal|chrono|warp.*zone|dimension.*shift|paradox|flux/, tag: 'timerift' },
  { pattern: /mirror.*dim|reflect.*realm|looking.*glass|mirror.*world|shatter.*reality|kaleidoscope/, tag: 'mirror' },
  { pattern: /blood.*moon|crimson.*moon|red.*moon|lunar.*eclipse|harvest.*moon/, tag: 'bloodmoon' },
  { pattern: /inferno|hell\b|purg|burn.*world|fire.*realm|scorch|blaze|furnace/, tag: 'inferno' },
  { pattern: /black.*hole|singularity|event.*horizon/, tag: 'blackhole' },
  { pattern: /dream|subconscious|illusion|phantasm|nightmare/, tag: 'dreamscape' },
  // Modifiers
  { pattern: /fire|flame|burn|ember/, tag: 'fire' },
  { pattern: /ice|frozen|cold|frigid/, tag: 'ice' },
  { pattern: /electric|shock|volt|tesla|plasma/, tag: 'electric' },
  { pattern: /wind|gust|gale|breeze/, tag: 'wind' },
  { pattern: /rain|downpour|drizzle|monsoon/, tag: 'rain' },
  { pattern: /fog|mist|haze|murk/, tag: 'fog' },
  { pattern: /dark|shadow|abyss|pitch.*black/, tag: 'darkness' },
  { pattern: /neon|glow|luminesc|phosphor/, tag: 'neon' },
  { pattern: /cosmic|nebula|stellar|astral/, tag: 'cosmic' },
  { pattern: /gravity|g-force|crush|compress/, tag: 'gravity' },
  { pattern: /tremor|earthquake|quake|seismic/, tag: 'tremor' },
  { pattern: /emergency|alarm|critical|meltdown|evacuate|countdown/, tag: 'emergency' },
];

/**
 * Extract environment tags from a location string.
 */
export function analyzeLocation(location: string | null | undefined): EnvironmentTag[] {
  if (!location) return [];
  const l = location.toLowerCase();
  const tags: Set<EnvironmentTag> = new Set();

  for (const rule of TAG_RULES) {
    if (rule.pattern.test(l)) {
      tags.add(rule.tag);
    }
  }

  return Array.from(tags);
}

// ── Building Blocks ─────────────────────────────────────────────

/** Background gradient presets mapped by tag */
const BACKGROUND_BLOCKS: Partial<Record<EnvironmentTag, BackgroundLayer[]>> = {
  lava: [
    { type: 'linear', gradient: 'to top, hsl(15 90% 25% / 0.35) 0%, hsl(30 80% 30% / 0.2) 40%, hsl(0 60% 15% / 0.1) 100%' },
  ],
  underwater: [
    { type: 'linear', gradient: 'to bottom, hsl(200 70% 30% / 0.3) 0%, hsl(210 60% 25% / 0.25) 50%, hsl(220 50% 20% / 0.3) 100%' },
  ],
  sky: [
    { type: 'linear', gradient: 'to bottom, hsl(210 50% 50% / 0.15) 0%, hsl(200 40% 60% / 0.1) 50%, transparent 100%' },
  ],
  space: [
    { type: 'radial', gradient: 'ellipse at center, hsl(240 20% 5% / 0.5) 0%, hsl(260 15% 3% / 0.6) 100%' },
  ],
  blizzard: [
    { type: 'linear', gradient: 'to bottom, hsl(200 30% 70% / 0.15) 0%, hsl(210 20% 80% / 0.1) 50%, hsl(200 40% 90% / 0.08) 100%' },
  ],
  forest: [
    { type: 'linear', gradient: 'to top, hsl(120 30% 15% / 0.25) 0%, hsl(140 25% 20% / 0.15) 50%, transparent 100%' },
  ],
  desert: [
    { type: 'linear', gradient: 'to bottom, hsl(35 50% 50% / 0.12) 0%, hsl(40 40% 55% / 0.08) 50%, hsl(30 30% 40% / 0.15) 100%' },
  ],
  crystal: [
    { type: 'radial', gradient: 'ellipse at 30% 40%, hsl(280 40% 50% / 0.1) 0%, transparent 50%' },
    { type: 'radial', gradient: 'ellipse at 70% 60%, hsl(200 50% 60% / 0.08) 0%, transparent 50%' },
  ],
  void: [
    { type: 'radial', gradient: 'circle at center, hsl(270 30% 5% / 0.6) 0%, hsl(0 0% 0% / 0.7) 100%' },
  ],
  storm: [
    { type: 'linear', gradient: 'to bottom, hsl(220 30% 20% / 0.3) 0%, hsl(230 20% 15% / 0.2) 100%' },
  ],
  ruins: [
    { type: 'linear', gradient: 'to top, hsl(30 15% 15% / 0.2) 0%, hsl(25 10% 20% / 0.1) 50%, transparent 100%' },
  ],
  toxic: [
    { type: 'linear', gradient: 'to top, hsl(90 60% 20% / 0.35) 0%, hsl(100 40% 15% / 0.2) 40%, hsl(80 30% 10% / 0.1) 100%' },
  ],
  cyberpunk: [
    { type: 'linear', gradient: 'to bottom, hsl(260 40% 10% / 0.4) 0%, hsl(300 30% 8% / 0.3) 50%, hsl(180 50% 10% / 0.35) 100%' },
  ],
  mech: [
    { type: 'linear', gradient: 'to bottom, hsl(210 10% 12% / 0.4) 0%, hsl(200 8% 8% / 0.35) 50%, hsl(220 12% 6% / 0.4) 100%' },
  ],
  haunted: [
    { type: 'radial', gradient: 'ellipse at 50% 80%, hsl(260 20% 15% / 0.4) 0%, hsl(240 15% 5% / 0.5) 60%, hsl(0 0% 0% / 0.6) 100%' },
  ],
  celestial: [
    { type: 'radial', gradient: 'ellipse at center, hsl(45 60% 70% / 0.1) 0%, hsl(30 40% 50% / 0.06) 40%, hsl(220 20% 10% / 0.15) 100%' },
  ],
  timerift: [
    { type: 'conic', gradient: 'from 0deg at 50% 50%, hsl(270 50% 20% / 0.2) 0%, hsl(180 40% 25% / 0.15) 25%, hsl(50 40% 20% / 0.1) 50%, hsl(330 40% 20% / 0.15) 75%, hsl(270 50% 20% / 0.2) 100%' },
  ],
  mirror: [
    { type: 'conic', gradient: 'from 45deg at 50% 50%, hsl(200 30% 30% / 0.15) 0%, hsl(280 25% 35% / 0.12) 25%, hsl(0 0% 40% / 0.1) 50%, hsl(180 30% 30% / 0.12) 75%, hsl(200 30% 30% / 0.15) 100%' },
  ],
  inferno: [
    { type: 'radial', gradient: 'ellipse at 50% 100%, hsl(10 90% 30% / 0.4) 0%, hsl(20 80% 25% / 0.25) 30%, hsl(0 70% 15% / 0.15) 60%, hsl(350 50% 8% / 0.3) 100%' },
  ],
  bloodmoon: [
    { type: 'radial', gradient: 'ellipse at 70% 20%, hsl(0 70% 35% / 0.25) 0%, transparent 45%' },
    { type: 'radial', gradient: 'ellipse at center, hsl(0 30% 8% / 0.5) 0%, hsl(350 20% 5% / 0.6) 100%' },
  ],
  'underwater-volcano': [
    { type: 'linear', gradient: 'to top, hsl(15 80% 25% / 0.35) 0%, hsl(200 50% 25% / 0.3) 40%, hsl(210 60% 20% / 0.35) 100%' },
  ],
  'floating-islands': [
    { type: 'linear', gradient: 'to top, hsl(200 50% 70% / 0.08) 0%, hsl(210 60% 75% / 0.15) 30%, hsl(190 40% 80% / 0.1) 60%, hsl(260 30% 60% / 0.08) 100%' },
  ],
  blackhole: [
    { type: 'radial', gradient: 'circle at center, hsl(270 50% 5% / 0.7) 0%, hsl(0 0% 0% / 0.8) 60%, hsl(280 30% 3% / 0.9) 100%' },
  ],
  dreamscape: [
    { type: 'radial', gradient: 'ellipse at 40% 50%, hsl(280 50% 40% / 0.15) 0%, transparent 50%' },
    { type: 'radial', gradient: 'ellipse at 70% 40%, hsl(200 60% 50% / 0.1) 0%, transparent 40%' },
  ],
  // Modifiers contribute additional layers
  fire: [
    { type: 'linear', gradient: 'to top, hsl(20 90% 35% / 0.15) 0%, transparent 50%' },
  ],
  ice: [
    { type: 'linear', gradient: 'to bottom, hsl(200 60% 80% / 0.1) 0%, transparent 60%' },
  ],
  radiation: [
    { type: 'radial', gradient: 'ellipse at center, hsl(60 80% 50% / 0.08) 0%, hsl(120 40% 30% / 0.12) 50%, hsl(80 30% 15% / 0.15) 100%' },
  ],
  darkness: [
    { type: 'radial', gradient: 'circle at center, hsl(0 0% 0% / 0.4) 0%, hsl(0 0% 0% / 0.6) 100%' },
  ],
  emergency: [
    { type: 'linear', gradient: 'to bottom, hsl(0 70% 30% / 0.12) 0%, transparent 40%' },
  ],
};

/** Overlay CSS class modules mapped by tag */
const OVERLAY_BLOCKS: Partial<Record<EnvironmentTag, OverlayModule[]>> = {
  lava: [{ className: 'env-lava-glow', zOrder: 1 }],
  underwater: [
    { className: 'env-underwater-caustics', zOrder: 1 },
    { className: 'env-underwater-ripple', zOrder: 2 },
    { className: 'env-underwater-bubbles', zOrder: 3 },
  ],
  sky: [{ className: 'env-wind-streaks', zOrder: 1 }],
  space: [{ className: 'env-stars', zOrder: 1 }],
  blizzard: [
    { className: 'env-frost-overlay', zOrder: 1 },
    { className: 'env-snow-particles', zOrder: 2 },
  ],
  desert: [{ className: 'env-heat-shimmer', zOrder: 1 }],
  crystal: [{ className: 'env-crystal-glint', zOrder: 1 }],
  void: [{ className: 'env-void-distortion', zOrder: 1 }],
  storm: [
    { className: 'env-storm-rain', zOrder: 1 },
    { className: 'env-storm-lightning-flash', zOrder: 2 },
    { className: 'env-storm-fog', zOrder: 3 },
  ],
  cyberpunk: [
    { className: 'env-neon-flicker', zOrder: 1 },
    { className: 'env-scan-lines', zOrder: 2 },
  ],
  mech: [
    { className: 'env-scan-lines', zOrder: 1 },
  ],
  haunted: [{ className: 'env-ghost-fog', zOrder: 1 }],
  celestial: [
    { className: 'env-divine-rays', zOrder: 1 },
    { className: 'env-stars', zOrder: 2 },
  ],
  timerift: [{ className: 'env-time-glitch', zOrder: 1 }],
  mirror: [
    { className: 'env-mirror-fracture', zOrder: 1 },
    { className: 'env-mirror-reflect', zOrder: 2 },
  ],
  toxic: [{ className: 'env-toxic-bubbles', zOrder: 1 }],
  inferno: [
    { className: 'env-lava-glow', zOrder: 1 },
    { className: 'env-inferno-embers', zOrder: 2 },
  ],
  forest: [
    { className: 'env-forest-leaves', zOrder: 1 },
    { className: 'env-forest-branches', zOrder: 2 },
    { className: 'env-forest-pollen', zOrder: 3 },
  ],
  ruins: [
    { className: 'env-ruins-dust', zOrder: 1 },
    { className: 'env-ruins-flicker', zOrder: 2 },
  ],
  'underwater-volcano': [
    { className: 'env-underwater-caustics', zOrder: 1 },
    { className: 'env-deep-vent-glow', zOrder: 2 },
  ],
  'floating-islands': [
    { className: 'env-floating-drift', zOrder: 1 },
    { className: 'env-wind-streaks', zOrder: 2 },
  ],
  bloodmoon: [
    { className: 'env-blood-pulse', zOrder: 1 },
    { className: 'env-stars', zOrder: 2 },
  ],
  blackhole: [
    { className: 'env-void-distortion', zOrder: 1 },
    { className: 'env-blackhole-pull', zOrder: 2 },
  ],
  dreamscape: [
    { className: 'env-dream-float', zOrder: 1 },
    { className: 'env-dream-particles', zOrder: 2 },
  ],
  radiation: [{ className: 'env-radiation-flicker', zOrder: 1 }],
  fire: [{ className: 'env-inferno-embers', zOrder: 2 }],
  ice: [{ className: 'env-frost-overlay', zOrder: 1 }],
  electric: [{ className: 'env-electric-crackle', zOrder: 1 }],
  fog: [{ className: 'env-ghost-fog', zOrder: 1 }],
  rain: [{ className: 'env-storm-rain', zOrder: 1 }],
  wind: [{ className: 'env-wind-streaks', zOrder: 1 }],
  neon: [{ className: 'env-neon-flicker', zOrder: 1 }],
  cosmic: [{ className: 'env-stars', zOrder: 1 }],
  emergency: [{ className: 'env-emergency-pulse', zOrder: 3 }],
  tremor: [
    { className: 'env-tremor-shake', zOrder: 3 },
    { className: 'env-ruins-dust', zOrder: 2 },
  ],
};

/** Ambient glow (box-shadow) per tag */
const GLOW_BLOCKS: Partial<Record<EnvironmentTag, string>> = {
  lava: 'inset 0 -40px 60px -20px hsl(15 100% 40% / 0.25)',
  underwater: 'inset 0 0 80px hsl(200 60% 40% / 0.15)',
  radiation: 'inset 0 0 40px hsl(100 70% 40% / 0.12)',
  cyberpunk: 'inset 0 0 40px hsl(300 80% 50% / 0.1), inset 0 0 80px hsl(180 80% 50% / 0.08)',
  haunted: 'inset 0 0 60px hsl(260 30% 30% / 0.15)',
  celestial: 'inset 0 -30px 60px -10px hsl(45 70% 65% / 0.1)',
  timerift: 'inset 0 0 50px hsl(270 60% 50% / 0.1)',
  toxic: 'inset 0 -30px 50px -10px hsl(90 70% 35% / 0.2)',
  inferno: 'inset 0 -50px 80px -20px hsl(10 100% 45% / 0.25), inset 0 0 30px hsl(0 80% 30% / 0.15)',
  'underwater-volcano': 'inset 0 -50px 70px -20px hsl(15 100% 40% / 0.25), inset 0 0 60px hsl(200 60% 40% / 0.12)',
  'floating-islands': 'inset 0 40px 80px -30px hsl(210 50% 80% / 0.15)',
  mirror: 'inset 0 0 60px hsl(0 0% 80% / 0.08)',
  bloodmoon: 'inset 0 0 80px hsl(0 60% 25% / 0.15), inset 0 -30px 60px -10px hsl(350 50% 15% / 0.2)',
  blackhole: 'inset 0 0 100px hsl(270 50% 20% / 0.3)',
  dreamscape: 'inset 0 0 60px hsl(280 40% 50% / 0.12)',
  forest: 'inset 0 40px 60px -20px hsl(120 20% 10% / 0.3)',
  ruins: 'inset 0 0 60px hsl(30 20% 10% / 0.2)',
  fire: 'inset 0 -30px 40px -10px hsl(20 100% 50% / 0.15)',
  emergency: 'inset 0 0 40px hsl(0 80% 40% / 0.15)',
};

/** Animation intensity by tag */
const INTENSITY_MAP: Partial<Record<EnvironmentTag, 'low' | 'medium' | 'high'>> = {
  lava: 'medium', inferno: 'high', storm: 'high', emergency: 'high',
  blizzard: 'medium', cyberpunk: 'medium', timerift: 'high', blackhole: 'high',
  forest: 'low', ruins: 'low', desert: 'low', celestial: 'low',
  crystal: 'low', dreamscape: 'low', 'floating-islands': 'low',
  haunted: 'medium', toxic: 'medium', bloodmoon: 'medium',
  space: 'low', underwater: 'low', mirror: 'medium',
  tremor: 'high', fire: 'medium', electric: 'high',
};

/** Chat box style presets per tag */
const CHATBOX_BLOCKS: Partial<Record<EnvironmentTag, Partial<ChatBoxStyle>>> = {
  lava: { borderStyle: 'border-orange-500/30', textGlow: '0 0 6px hsl(20 100% 60% / 0.3)' },
  underwater: { borderStyle: 'border-cyan-500/25', textGlow: '0 0 4px hsl(200 80% 60% / 0.2)' },
  space: { borderStyle: 'border-indigo-400/20', backgroundTexture: 'bg-gradient-to-b from-transparent to-indigo-950/10' },
  cyberpunk: { borderStyle: 'border-pink-500/30', textGlow: '0 0 6px hsl(300 100% 60% / 0.3)', fontHint: 'bold' },
  mech: { borderStyle: 'border-slate-400/30', backgroundTexture: 'bg-gradient-to-b from-slate-900/10 to-transparent' },
  haunted: { borderStyle: 'border-purple-400/20', textGlow: '0 0 8px hsl(260 60% 50% / 0.2)' },
  celestial: { borderStyle: 'border-amber-300/25', textGlow: '0 0 6px hsl(45 80% 65% / 0.25)' },
  inferno: { borderStyle: 'border-red-500/35', textGlow: '0 0 8px hsl(0 100% 50% / 0.3)', urgencyAnimation: 'env-urgency-flicker' },
  emergency: { borderStyle: 'border-red-600/40', urgencyAnimation: 'env-urgency-pulse', fontHint: 'bold' },
  storm: { borderStyle: 'border-slate-400/25', urgencyAnimation: 'env-urgency-shake' },
  toxic: { borderStyle: 'border-green-500/30', textGlow: '0 0 5px hsl(90 80% 45% / 0.25)' },
  blizzard: { borderStyle: 'border-sky-300/20', backgroundTexture: 'bg-gradient-to-b from-sky-950/10 to-transparent' },
  bloodmoon: { borderStyle: 'border-red-700/30', textGlow: '0 0 6px hsl(0 70% 40% / 0.25)' },
  timerift: { borderStyle: 'border-violet-400/25', urgencyAnimation: 'env-urgency-glitch' },
  mirror: { borderStyle: 'border-white/15', backgroundTexture: 'bg-gradient-to-br from-white/5 to-transparent' },
  void: { borderStyle: 'border-purple-900/30', textGlow: '0 0 10px hsl(270 50% 30% / 0.3)' },
  blackhole: { borderStyle: 'border-violet-900/40', textGlow: '0 0 12px hsl(280 60% 30% / 0.4)' },
  dreamscape: { borderStyle: 'border-pink-300/20', textGlow: '0 0 6px hsl(280 60% 60% / 0.2)' },
  forest: { borderStyle: 'border-green-700/20' },
  desert: { borderStyle: 'border-amber-600/20' },
  crystal: { borderStyle: 'border-violet-300/20', textGlow: '0 0 4px hsl(280 60% 70% / 0.2)' },
  ruins: { borderStyle: 'border-stone-500/20' },
  fire: { borderStyle: 'border-orange-400/25' },
  ice: { borderStyle: 'border-cyan-300/20' },
  radiation: { borderStyle: 'border-lime-400/30', textGlow: '0 0 5px hsl(80 100% 50% / 0.2)' },
  neon: { textGlow: '0 0 8px hsl(300 100% 60% / 0.3)' },
  electric: { borderStyle: 'border-blue-400/30', urgencyAnimation: 'env-urgency-flicker' },
};

// ── Theme Composer ──────────────────────────────────────────────

/** In-memory cache for composed themes */
const themeCache = new Map<string, ThemeComposition>();

/**
 * Compose a complete theme from environment tags.
 * Merges building blocks from all matched tags.
 */
export function composeTheme(tags: EnvironmentTag[]): ThemeComposition {
  const cacheKey = tags.sort().join('+') || 'neutral';

  const cached = themeCache.get(cacheKey);
  if (cached) return cached;

  const backgrounds: BackgroundLayer[] = [];
  const overlayMap = new Map<string, OverlayModule>();
  const glows: string[] = [];
  let maxIntensity: 'low' | 'medium' | 'high' = 'low';
  const chatBox: ChatBoxStyle = {
    borderStyle: 'border-border',
    fontHint: 'normal',
  };

  for (const tag of tags) {
    // Backgrounds
    const bgs = BACKGROUND_BLOCKS[tag];
    if (bgs) backgrounds.push(...bgs);

    // Overlays (deduplicate by className)
    const ovs = OVERLAY_BLOCKS[tag];
    if (ovs) {
      for (const ov of ovs) {
        if (!overlayMap.has(ov.className)) {
          overlayMap.set(ov.className, ov);
        }
      }
    }

    // Glows
    const glow = GLOW_BLOCKS[tag];
    if (glow) glows.push(glow);

    // Intensity (take highest)
    const intensity = INTENSITY_MAP[tag];
    if (intensity) {
      const order = { low: 0, medium: 1, high: 2 };
      if (order[intensity] > order[maxIntensity]) {
        maxIntensity = intensity;
      }
    }

    // Chat box (merge, later tags override)
    const cb = CHATBOX_BLOCKS[tag];
    if (cb) {
      if (cb.borderStyle) chatBox.borderStyle = cb.borderStyle;
      if (cb.textGlow) chatBox.textGlow = cb.textGlow;
      if (cb.backgroundTexture) chatBox.backgroundTexture = cb.backgroundTexture;
      if (cb.urgencyAnimation) chatBox.urgencyAnimation = cb.urgencyAnimation;
      if (cb.fontHint) chatBox.fontHint = cb.fontHint;
    }
  }

  const overlays = Array.from(overlayMap.values()).sort((a, b) => a.zOrder - b.zOrder);

  const composition: ThemeComposition = {
    cacheKey,
    backgrounds,
    overlays,
    ambientGlow: glows.length > 0 ? glows.join(', ') : undefined,
    animationIntensity: maxIntensity,
    chatBox,
    tags,
  };

  // Cache it
  themeCache.set(cacheKey, composition);

  return composition;
}

/**
 * Main entry point: analyze a location string and compose a theme.
 */
export function buildThemeFromLocation(location: string | null | undefined): ThemeComposition {
  const tags = analyzeLocation(location);
  return composeTheme(tags);
}

/**
 * Build a theme from explicit tags (for saved presets or custom combos).
 */
export function buildThemeFromTags(tags: EnvironmentTag[]): ThemeComposition {
  return composeTheme(tags);
}

/**
 * Convert a ThemeComposition background layer to a CSS gradient string.
 */
export function backgroundLayerToCSS(layer: BackgroundLayer): string {
  switch (layer.type) {
    case 'linear':
      return `linear-gradient(${layer.gradient})`;
    case 'radial':
      return `radial-gradient(${layer.gradient})`;
    case 'conic':
      return `conic-gradient(${layer.gradient})`;
  }
}

/**
 * Check if a composition is effectively empty (no visual content).
 */
export function isNeutralTheme(composition: ThemeComposition): boolean {
  return composition.backgrounds.length === 0 && composition.overlays.length === 0;
}

/**
 * Clear the theme cache (useful when hot-reloading or testing).
 */
export function clearThemeCache(): void {
  themeCache.clear();
}

// ── Snapshot System ─────────────────────────────────────────────

export interface SnapshotInput {
  /** Player's current scene location (per-player, not global) */
  location: string | null;
  /** Extra location tags (from scene_tags) */
  locationTags?: EnvironmentTag[];
  /** Active status effect types on the character (e.g. ['poisoned','burning']) */
  activeStatusEffects?: string[];
}

/**
 * Build a serializable ThemeSnapshot from the player's current state.
 * This captures the visual theme at a moment in time for message persistence.
 */
export function buildSnapshotFromState(input: SnapshotInput): ThemeSnapshot {
  // Location-derived tags
  const locationTags = input.locationTags && input.locationTags.length > 0
    ? input.locationTags
    : analyzeLocation(input.location);

  // Status effect tags
  const statusTags = input.activeStatusEffects
    ? statusEffectsToTags(input.activeStatusEffects)
    : [];

  // Merge all tags for composition
  const allTags = deduplicateTags([...locationTags, ...statusTags]);

  // Compose full theme
  const composition = composeTheme(allTags);

  return {
    location: input.location,
    tags: locationTags,
    statusTags,
    overlays: composition.overlays.map(o => o.className),
    animationIntensity: composition.animationIntensity,
    chatBox: composition.chatBox,
    ambientGlow: composition.ambientGlow,
    backgrounds: composition.backgrounds,
  };
}

/**
 * Reconstruct a full ThemeComposition from a stored ThemeSnapshot.
 * Used when rendering historical message bubbles.
 */
export function buildCompositionFromSnapshot(snapshot: ThemeSnapshot): ThemeComposition {
  const allTags = deduplicateTags([...snapshot.tags, ...snapshot.statusTags]);

  return {
    cacheKey: `snap:${allTags.sort().join('+')}`,
    backgrounds: snapshot.backgrounds,
    overlays: snapshot.overlays.map((cn, i) => ({ className: cn, zOrder: i })),
    ambientGlow: snapshot.ambientGlow,
    animationIntensity: snapshot.animationIntensity,
    chatBox: snapshot.chatBox,
    tags: allTags,
  };
}

/**
 * Generate CSS custom properties from a composition for variable-driven rendering.
 */
export function compositionToCssVars(composition: ThemeComposition): Record<string, string> {
  const intensityScale = { low: '0.6', medium: '1', high: '1.4' };
  const speedScale = { low: '1.5', medium: '1', high: '0.7' };

  return {
    '--env-intensity': intensityScale[composition.animationIntensity],
    '--env-speed': speedScale[composition.animationIntensity],
  };
}

/** Deduplicate tags preserving order */
function deduplicateTags(tags: EnvironmentTag[]): EnvironmentTag[] {
  return Array.from(new Set(tags));
}
