/**
 * Procedural Structure Generator
 *
 * Takes a BiomePreset + zone layout and generates a list of
 * PlacedStructure definitions ready for the 3D renderer.
 */

import type { BiomePreset, StructurePreset, StructureGeom } from './arena-structure-presets';
import type { BattlefieldZone } from '@/lib/tactical-zones';
import type { ArenaState } from '@/lib/living-arena';

// ── Output Types ────────────────────────────────────────────────

export interface PlacedStructure {
  id: string;
  label: string;
  geom: StructureGeom;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  color: string;
  emissive?: boolean;
  emissiveColor?: string;
  opacity: number;
  /** Optional cap piece on top */
  cap?: {
    geom: StructureGeom;
    color: string;
    offset: [number, number, number];
    scale: [number, number, number];
  };
  /** Category for filtering */
  category: 'structure' | 'prop' | 'landmark' | 'hazard-visual';
}

export interface ProceduralScene {
  structures: PlacedStructure[];
  groundColor: string;
  fogColor: string;
  fogDensity: number;
  ambientColor: string;
  ambientIntensity: number;
}

// ── Seeded Random ───────────────────────────────────────────────

function seeded(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function vary(base: number, range: number, seed: number): number {
  return base * (1 + (seeded(seed) - 0.5) * range);
}

/** Convert grid coords (0-100) to world coords (-10 to 10) */
function toWorld(gx: number, gy: number): [number, number] {
  return [(gx - 50) * 0.2, (gy - 50) * 0.2];
}

function elevY(elev?: string): number {
  switch (elev) {
    case 'aerial': return 3;
    case 'high': return 2;
    case 'elevated': return 1;
    case 'underground': return -0.5;
    default: return 0;
  }
}

// ── Core Generator ──────────────────────────────────────────────

export function generateProceduralScene(
  biome: BiomePreset,
  zones: BattlefieldZone[],
  arenaState?: ArenaState,
  locationSeed?: string,
): ProceduralScene {
  const placed: PlacedStructure[] = [];
  const baseSeed = hashString(locationSeed ?? 'default');
  const stability = arenaState?.stability ?? 100;
  const isDamaged = stability < 50;
  let idCounter = 0;

  const nextId = (prefix: string) => `${prefix}-${idCounter++}`;

  // ── 1. Zone landmarks ─────────────────────────────────────────
  zones.forEach((zone, zi) => {
    if (!zone.discovered) return;
    const landmark = biome.landmarks[zi % biome.landmarks.length];
    const [wx, wz] = toWorld(zone.x, zone.y);
    const ey = elevY(zone.elevation) * 0.8;
    const s = baseSeed + zi * 97;

    placed.push(placePreset(
      nextId('lm'), landmark, 'landmark',
      [wx + (seeded(s) - 0.5) * 0.8, ey, wz + (seeded(s + 1) - 0.5) * 0.8],
      s, isDamaged && zone.tactical.isUnstable ? 0.7 : 1.0,
    ));
  });

  // ── 2. Scatter structures around zones ────────────────────────
  zones.forEach((zone, zi) => {
    if (!zone.discovered) return;
    const [wx, wz] = toWorld(zone.x, zone.y);
    const ey = elevY(zone.elevation) * 0.8;
    const zoneRadius = Math.min(zone.width, zone.height) * 0.08;

    // Structure count: 3-6 per zone
    const structCount = 3 + Math.floor(seeded(baseSeed + zi * 31) * 4);
    for (let i = 0; i < structCount; i++) {
      const s = baseSeed + zi * 200 + i * 17;
      const preset = biome.structures[Math.floor(seeded(s) * biome.structures.length)];
      const angle = seeded(s + 1) * Math.PI * 2;
      const dist = 0.5 + seeded(s + 2) * zoneRadius * 1.5;
      const px = wx + Math.cos(angle) * dist;
      const pz = wz + Math.sin(angle) * dist;

      // Skip if too close to zone center (keep combat lane)
      if (Math.abs(px - wx) < 0.4 && Math.abs(pz - wz) < 0.4) continue;

      const elevBias = (preset.elevationBias ?? 0) * 0.5;
      placed.push(placePreset(
        nextId('st'), preset, 'structure',
        [px, ey + elevBias, pz],
        s, isDamaged ? 0.75 : 1.0,
      ));
    }

    // Props: 4-8 per zone
    const propCount = 4 + Math.floor(seeded(baseSeed + zi * 43) * 5);
    for (let i = 0; i < propCount; i++) {
      const s = baseSeed + zi * 300 + i * 23;
      const preset = biome.props[Math.floor(seeded(s) * biome.props.length)];
      const angle = seeded(s + 1) * Math.PI * 2;
      const dist = 0.3 + seeded(s + 2) * zoneRadius * 2;
      const px = wx + Math.cos(angle) * dist;
      const pz = wz + Math.sin(angle) * dist;

      placed.push(placePreset(
        nextId('pr'), preset, 'prop',
        [px, ey, pz],
        s, 1.0,
      ));
    }
  });

  // ── 3. Border fill (structures between zones, arena edges) ────
  const edgeCount = 8 + Math.floor(seeded(baseSeed + 777) * 8);
  for (let i = 0; i < edgeCount; i++) {
    const s = baseSeed + 1000 + i * 37;
    const preset = biome.structures[Math.floor(seeded(s) * biome.structures.length)];
    // Place around the arena perimeter
    const angle = seeded(s + 1) * Math.PI * 2;
    const dist = 6 + seeded(s + 2) * 4;
    const px = Math.cos(angle) * dist;
    const pz = Math.sin(angle) * dist;

    placed.push(placePreset(
      nextId('edge'), preset, 'structure',
      [px, 0, pz], s, 1.0,
    ));
  }

  // ── 4. Hazard visuals from arena state ────────────────────────
  if (arenaState) {
    const conditions = arenaState.conditionTags ?? [];
    if (conditions.includes('burning')) {
      // Place ember/glow props near damaged zones
      zones.filter(z => z.tactical.fireSpread || z.tactical.destructibleTerrain).forEach((zone, fi) => {
        const [wx, wz] = toWorld(zone.x, zone.y);
        for (let i = 0; i < 3; i++) {
          const s = baseSeed + 2000 + fi * 50 + i;
          placed.push({
            id: nextId('fire'),
            label: 'Flames',
            geom: 'cone',
            position: [wx + (seeded(s) - 0.5) * 1.5, 0.15, wz + (seeded(s + 1) - 0.5) * 1.5],
            scale: [vary(0.12, 0.5, s + 2), vary(0.35, 0.4, s + 3), vary(0.12, 0.5, s + 4)],
            rotation: [0, seeded(s + 5) * Math.PI * 2, 0],
            color: '#ff4400',
            emissive: true,
            emissiveColor: '#ff6600',
            opacity: 0.8,
            category: 'hazard-visual',
          });
        }
      });
    }

    if (conditions.includes('flooding')) {
      zones.filter(z => z.tactical.flooding || z.elevation === 'underground').forEach((zone, fi) => {
        const [wx, wz] = toWorld(zone.x, zone.y);
        placed.push({
          id: nextId('water'),
          label: 'Water',
          geom: 'cylinder',
          position: [wx, elevY(zone.elevation) * 0.8 - 0.1, wz],
          scale: [zone.width * 0.08, 0.04, zone.height * 0.08],
          rotation: [0, 0, 0],
          color: '#1a4060',
          emissive: true,
          emissiveColor: '#1a3050',
          opacity: 0.6,
          category: 'hazard-visual',
        });
      });
    }
  }

  return {
    structures: placed,
    groundColor: biome.groundColor,
    fogColor: biome.fogColor,
    fogDensity: biome.fogDensity,
    ambientColor: biome.ambientColor,
    ambientIntensity: biome.ambientIntensity,
  };
}

// ── Helpers ─────────────────────────────────────────────────────

function placePreset(
  id: string,
  preset: StructurePreset,
  category: PlacedStructure['category'],
  position: [number, number, number],
  seed: number,
  opacity: number,
): PlacedStructure {
  const scaleVar = 0.3;
  return {
    id,
    label: preset.label,
    geom: preset.geom,
    position,
    scale: [
      vary(preset.baseScale[0], scaleVar, seed + 10),
      vary(preset.baseScale[1], scaleVar, seed + 11),
      vary(preset.baseScale[2], scaleVar, seed + 12),
    ],
    rotation: [0, seeded(seed + 20) * Math.PI * 2, preset.tall ? 0 : (seeded(seed + 21) - 0.5) * 0.15],
    color: preset.color,
    emissive: preset.emissive,
    emissiveColor: preset.emissiveColor,
    opacity,
    cap: preset.cap,
    category,
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
