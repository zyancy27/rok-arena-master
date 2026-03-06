/**
 * Battlefield Layer Composer
 *
 * Builds a layered visual stack for the battlefield image system.
 * Layers are composited as CSS gradient/overlay stacks for performance.
 */

import type { ArenaState } from '@/lib/living-arena';
import type { ThreatLevel } from '@/lib/tactical-zones';

// ── Layer Types ─────────────────────────────────────────────────

export type LayerType = 'terrain' | 'structure' | 'weather' | 'hazard' | 'damage' | 'event';

export interface BattlefieldLayer {
  id: string;
  type: LayerType;
  label: string;
  /** CSS background value (gradient, color, pattern) */
  cssBackground: string;
  /** Opacity 0-1 */
  opacity: number;
  /** Z-order (lower = behind) */
  zIndex: number;
  /** Whether this layer is currently active */
  active: boolean;
  /** Optional animation class */
  animation?: string;
}

export interface BattlefieldImageStack {
  layers: BattlefieldLayer[];
  /** Overall atmosphere label */
  atmosphere: string;
  /** CSS filter for the whole stack */
  filter?: string;
}

// ── Terrain Palettes ────────────────────────────────────────────

const TERRAIN_LAYERS: Record<string, Pick<BattlefieldLayer, 'cssBackground' | 'label'>> = {
  urban: { label: 'Urban', cssBackground: 'linear-gradient(180deg, hsla(220,15%,18%,1) 0%, hsla(220,10%,25%,1) 100%)' },
  forest: { label: 'Forest', cssBackground: 'linear-gradient(180deg, hsla(140,30%,12%,1) 0%, hsla(120,25%,20%,1) 100%)' },
  water: { label: 'Aquatic', cssBackground: 'linear-gradient(180deg, hsla(200,50%,15%,1) 0%, hsla(210,60%,25%,1) 100%)' },
  volcanic: { label: 'Volcanic', cssBackground: 'linear-gradient(180deg, hsla(15,40%,12%,1) 0%, hsla(10,50%,20%,1) 100%)' },
  desert: { label: 'Desert', cssBackground: 'linear-gradient(180deg, hsla(35,40%,25%,1) 0%, hsla(40,35%,35%,1) 100%)' },
  arctic: { label: 'Arctic', cssBackground: 'linear-gradient(180deg, hsla(200,20%,30%,1) 0%, hsla(210,30%,45%,1) 100%)' },
  space: { label: 'Space', cssBackground: 'linear-gradient(180deg, hsla(260,30%,5%,1) 0%, hsla(240,20%,12%,1) 100%)' },
  industrial: { label: 'Industrial', cssBackground: 'linear-gradient(180deg, hsla(30,10%,15%,1) 0%, hsla(25,15%,22%,1) 100%)' },
  default: { label: 'Battlefield', cssBackground: 'linear-gradient(180deg, hsla(220,15%,12%,1) 0%, hsla(220,10%,20%,1) 100%)' },
};

const WEATHER_LAYERS: Record<string, Pick<BattlefieldLayer, 'cssBackground' | 'label' | 'animation'>> = {
  storm: { label: 'Storm', cssBackground: 'linear-gradient(180deg, hsla(220,40%,15%,0.6) 0%, hsla(240,30%,20%,0.4) 100%)', animation: 'pulse' },
  rain: { label: 'Rain', cssBackground: 'linear-gradient(180deg, hsla(210,30%,20%,0.3) 0%, hsla(200,40%,25%,0.2) 100%)' },
  fog: { label: 'Fog', cssBackground: 'radial-gradient(ellipse at 50% 80%, hsla(0,0%,70%,0.25) 0%, transparent 70%)' },
  ash: { label: 'Ash', cssBackground: 'radial-gradient(ellipse at 50% 30%, hsla(20,30%,30%,0.3) 0%, transparent 80%)', animation: 'pulse' },
  blizzard: { label: 'Blizzard', cssBackground: 'linear-gradient(180deg, hsla(200,40%,60%,0.3) 0%, hsla(210,50%,70%,0.2) 100%)', animation: 'pulse' },
  dust: { label: 'Dust', cssBackground: 'radial-gradient(ellipse at 50% 60%, hsla(35,40%,35%,0.25) 0%, transparent 70%)' },
};

const HAZARD_LAYER_STYLES: Record<string, Pick<BattlefieldLayer, 'cssBackground' | 'label' | 'animation'>> = {
  fire: { label: 'Fire', cssBackground: 'radial-gradient(ellipse at 50% 70%, hsla(15,90%,50%,0.25) 0%, transparent 60%)', animation: 'pulse' },
  electric: { label: 'Electrical', cssBackground: 'radial-gradient(ellipse at 50% 50%, hsla(50,90%,60%,0.15) 0%, transparent 50%)' },
  flood: { label: 'Flood', cssBackground: 'linear-gradient(0deg, hsla(200,70%,40%,0.3) 0%, transparent 40%)' },
  collapse: { label: 'Structural Collapse', cssBackground: 'radial-gradient(ellipse at 50% 50%, hsla(30,40%,25%,0.2) 0%, transparent 60%)', animation: 'pulse' },
  toxic: { label: 'Toxic Gas', cssBackground: 'radial-gradient(ellipse at 40% 60%, hsla(100,50%,30%,0.2) 0%, transparent 55%)' },
  ice: { label: 'Ice', cssBackground: 'linear-gradient(0deg, hsla(195,70%,65%,0.2) 0%, transparent 35%)' },
};

// ── Layer Composer ──────────────────────────────────────────────

function detectTerrain(tags: string[], locationName?: string | null): string {
  const text = [...tags, locationName || ''].join(' ').toLowerCase();
  if (/forest|tree|jungle|woods/.test(text)) return 'forest';
  if (/water|ocean|lake|river|underwater|aqua/.test(text)) return 'water';
  if (/volcan|lava|magma|volcanic/.test(text)) return 'volcanic';
  if (/desert|sand|dune/.test(text)) return 'desert';
  if (/arctic|ice|frozen|snow|tundra/.test(text)) return 'arctic';
  if (/space|void|asteroid|orbit/.test(text)) return 'space';
  if (/factory|reactor|industrial|refinery/.test(text)) return 'industrial';
  if (/city|urban|building|street|bridge/.test(text)) return 'urban';
  return 'default';
}

function detectWeather(tags: string[], conditionTags: string[]): string | null {
  const text = [...tags, ...conditionTags].join(' ').toLowerCase();
  if (/storm|thunder|lightning/.test(text)) return 'storm';
  if (/rain|downpour/.test(text)) return 'rain';
  if (/fog|mist|haze/.test(text)) return 'fog';
  if (/ash|smoke|ember/.test(text)) return 'ash';
  if (/blizzard|snowstorm/.test(text)) return 'blizzard';
  if (/dust|sandstorm/.test(text)) return 'dust';
  return null;
}

function detectHazards(conditionTags: string[]): string[] {
  const hazards: string[] = [];
  const text = conditionTags.join(' ').toLowerCase();
  if (/burn|fire|blaze|inciner/.test(text)) hazards.push('fire');
  if (/electr|shock|arc/.test(text)) hazards.push('electric');
  if (/flood|water|submer/.test(text)) hazards.push('flood');
  if (/collaps|structur|crack|seismic/.test(text)) hazards.push('collapse');
  if (/toxic|gas|poison/.test(text)) hazards.push('toxic');
  if (/frozen|ice|frost/.test(text)) hazards.push('ice');
  return hazards;
}

export interface ComposeLayersOptions {
  terrainTags: string[];
  locationName?: string | null;
  arenaState?: ArenaState;
  battlePhase?: 'early' | 'mid' | 'late' | 'critical';
}

export function composeBattlefieldLayers(opts: ComposeLayersOptions): BattlefieldImageStack {
  const layers: BattlefieldLayer[] = [];
  let zIdx = 0;

  // 1. Base terrain layer
  const terrain = detectTerrain(opts.terrainTags, opts.locationName);
  const terrainDef = TERRAIN_LAYERS[terrain] || TERRAIN_LAYERS.default;
  layers.push({
    id: 'terrain-base', type: 'terrain', label: terrainDef.label,
    cssBackground: terrainDef.cssBackground, opacity: 1, zIndex: zIdx++, active: true,
  });

  // 2. Structure layer (subtle pattern overlay)
  if (['urban', 'industrial'].includes(terrain)) {
    layers.push({
      id: 'structure-overlay', type: 'structure', label: 'Structures',
      cssBackground: 'repeating-linear-gradient(90deg, hsla(0,0%,100%,0.02) 0px, transparent 2px, transparent 20px)',
      opacity: 0.5, zIndex: zIdx++, active: true,
    });
  }

  // 3. Weather layer
  const conditionTags = opts.arenaState?.conditionTags || [];
  const weather = detectWeather(opts.terrainTags, conditionTags);
  if (weather) {
    const wDef = WEATHER_LAYERS[weather];
    layers.push({
      id: 'weather', type: 'weather', label: wDef.label,
      cssBackground: wDef.cssBackground, opacity: 0.8, zIndex: zIdx++,
      active: true, animation: wDef.animation,
    });
  }

  // 4. Hazard layers
  const hazards = detectHazards(conditionTags);
  for (const h of hazards) {
    const hDef = HAZARD_LAYER_STYLES[h];
    if (hDef) {
      layers.push({
        id: `hazard-${h}`, type: 'hazard', label: hDef.label,
        cssBackground: hDef.cssBackground,
        opacity: opts.battlePhase === 'critical' ? 0.9 : 0.7,
        zIndex: zIdx++, active: true, animation: hDef.animation,
      });
    }
  }

  // 5. Damage layer (based on arena stability)
  if (opts.arenaState && opts.arenaState.stability < 70) {
    const intensity = (100 - opts.arenaState.stability) / 100;
    layers.push({
      id: 'damage-overlay', type: 'damage', label: 'Battle Damage',
      cssBackground: `radial-gradient(ellipse at ${30 + Math.random() * 40}% ${30 + Math.random() * 40}%, hsla(20,40%,20%,${intensity * 0.3}) 0%, transparent 50%)`,
      opacity: intensity, zIndex: zIdx++, active: true,
    });
  }

  // 6. Event layer (critical moments)
  if (opts.arenaState?.isCritical) {
    layers.push({
      id: 'event-critical', type: 'event', label: 'Critical Event',
      cssBackground: 'radial-gradient(ellipse at 50% 50%, hsla(0,70%,40%,0.15) 0%, transparent 70%)',
      opacity: 0.8, zIndex: zIdx++, active: true, animation: 'pulse',
    });
  }

  // Determine filter
  let filter: string | undefined;
  if (opts.arenaState?.isCritical) filter = 'contrast(1.1) saturate(1.2)';
  else if (opts.battlePhase === 'late') filter = 'contrast(1.05)';

  return {
    layers,
    atmosphere: terrainDef.label + (weather ? ` — ${WEATHER_LAYERS[weather].label}` : ''),
    filter,
  };
}

// ── Threat-to-Layer Mapping ─────────────────────────────────────

export function getThreatColor(threat: ThreatLevel): string {
  const colors: Record<ThreatLevel, string> = {
    safe: 'hsla(140,50%,40%,0.15)',
    caution: 'hsla(45,70%,50%,0.15)',
    unsafe: 'hsla(25,70%,45%,0.2)',
    critical: 'hsla(0,70%,45%,0.25)',
    imminent: 'hsla(0,80%,40%,0.35)',
  };
  return colors[threat];
}
