/**
 * UrbanStructureComposer — Main Composer
 * 
 * Generates coherent urban/industrial environments using
 * layout templates, architecture families, material palettes,
 * damage states, and verticality layers.
 */

import type { UrbanPlacedPiece, UrbanScenePlan, UrbanMaterialPalette, ArchFamily, DamageState, UrbanGeom } from './types';
import { detectLayout } from './layoutTemplates';
import { getFamiliesForLayout, URBAN_FAMILIES } from './architectureFamilies';
import { getUrbanPalette } from './materialPalettes';
import { detectDamageState, applyDamage, generateDebris } from './damageStates';
import { seeded, vary, hashString } from '@/engine/biomeComposer/utils';

export interface UrbanComposerInput {
  locationName?: string | null;
  narratorDescription?: string | null;
  terrainTags?: string[];
  arenaStability?: number;
  seed?: string;
}

/** Check if a location should use the urban composer */
export function isUrbanScene(locationName?: string | null, tags?: string[]): boolean {
  const text = ((locationName ?? '') + ' ' + (tags ?? []).join(' ')).toLowerCase();
  const urbanKeywords = [
    'bridge', 'skybridge', 'overpass', 'viaduct',
    'rooftop', 'roof', 'high-rise', 'highrise', 'tower', 'skyscraper',
    'street', 'road', 'alley', 'avenue', 'downtown', 'city', 'urban',
    'factory', 'industrial', 'plant', 'refinery', 'foundry', 'mill',
    'parking', 'garage', 'mall', 'shop', 'store', 'market',
    'dam', 'turbine', 'generator', 'reactor', 'platform',
    'terminal', 'station', 'plaza', 'office', 'apartment',
    'building', 'catwalk', 'warehouse', 'complex',
  ];
  return urbanKeywords.some(kw => text.includes(kw));
}

/** Main composition function */
export function composeUrbanScene(input: UrbanComposerInput): UrbanScenePlan {
  const baseSeed = hashString(input.seed ?? input.locationName ?? 'urban-default');
  const allText = [input.locationName, input.narratorDescription].filter(Boolean).join(' ');
  const tags = input.terrainTags ?? [];

  // 1. Detect layout
  const layout = detectLayout(input.locationName, tags);

  // 2. Get palette
  const palette = getUrbanPalette(input.locationName, tags);

  // 3. Detect damage
  const damageLevel = detectDamageState(allText, input.arenaStability);

  // 4. Build pieces from layout anchors + families
  let pieces: UrbanPlacedPiece[] = [];
  let idCounter = 0;

  for (const anchor of layout.anchors) {
    const family = URBAN_FAMILIES[anchor.familyId];
    if (!family) continue;

    const anchorSeed = baseSeed + hashString(anchor.id);

    // Place family instances around anchor
    for (let inst = 0; inst < family.instanceCount; inst++) {
      const instSeed = anchorSeed + inst * 500;
      const instAngle = family.instanceCount > 1
        ? (inst / family.instanceCount) * Math.PI * 2 + seeded(instSeed) * 0.4
        : 0;
      const instDist = family.instanceCount > 1
        ? family.spreadRadius * (0.5 + seeded(instSeed + 1) * 0.5)
        : 0;

      const baseX = anchor.x + Math.cos(instAngle) * instDist;
      const baseZ = anchor.z + Math.sin(instAngle) * instDist;
      const baseY = anchor.elevation;

      // Place each piece in the family
      for (const piece of family.pieces) {
        const placePieces = expandRepeats(piece, instSeed);
        for (const pp of placePieces) {
          const mat = palette[pp.material];
          const pieceSeed = instSeed + idCounter * 13;

          pieces.push({
            id: `urban-${idCounter++}`,
            label: pp.label,
            geom: pp.geom,
            position: [
              baseX + pp.offset[0] * anchor.scale,
              baseY + pp.offset[1] * anchor.scale,
              baseZ + pp.offset[2] * anchor.scale,
            ],
            scale: [
              pp.baseScale[0] * anchor.scale * vary(1, 0.1, pieceSeed),
              pp.baseScale[1] * anchor.scale * vary(1, 0.1, pieceSeed + 1),
              pp.baseScale[2] * anchor.scale * vary(1, 0.1, pieceSeed + 2),
            ],
            rotation: [0, anchor.rotation + (seeded(pieceSeed + 3) - 0.5) * 0.05, 0],
            color: mat.color,
            roughness: mat.roughness,
            metalness: mat.metalness,
            emissive: mat.emissive,
            emissiveColor: mat.emissiveColor,
            opacity: mat.opacity ?? 1,
            damageState: 'intact',
            cap: pp.cap ? {
              geom: pp.cap.geom,
              color: palette[pp.cap.material].color,
              offset: pp.cap.offset,
              scale: pp.cap.scale,
            } : undefined,
            category: piece.id.includes('main') || piece.id.includes('body') || piece.id.includes('wall') ? 'structure' : 'prop',
          });
        }
      }
    }
  }

  // 5. Apply damage
  pieces = applyDamage(pieces, damageLevel, baseSeed + 9000);

  // 6. Add debris if damaged
  if (damageLevel !== 'intact' && damageLevel !== 'cracked') {
    const debris = generateDebris(damageLevel, 0, 0, baseSeed + 8000, palette.damage.color);
    pieces.push(...debris);
  }

  return {
    layout: layout.type,
    pieces,
    palette,
    layers: layout.layers,
    damageLevel,
  };
}

// ── Helpers ─────────────────────────────────────────────────────

interface ExpandedPiece {
  label: string;
  geom: UrbanGeom;
  baseScale: [number, number, number];
  material: 'primary' | 'secondary' | 'accent' | 'detail' | 'damage';
  offset: [number, number, number];
  cap?: {
    geom: UrbanGeom;
    material: 'primary' | 'secondary' | 'accent' | 'detail';
    offset: [number, number, number];
    scale: [number, number, number];
  };
}

/** Expand repeat directives into individual pieces */
function expandRepeats(piece: ArchFamily['pieces'][0], seed: number): ExpandedPiece[] {
  if (!piece.repeat) {
    return [{
      label: piece.label,
      geom: piece.geom,
      baseScale: piece.baseScale,
      material: piece.material,
      offset: piece.offset,
      cap: piece.cap,
    }];
  }

  const results: ExpandedPiece[] = [];
  const { axis, count, spacing } = piece.repeat;

  for (let i = 0; i < count; i++) {
    const axisOffset = i * spacing;
    const offset: [number, number, number] = [...piece.offset];
    if (axis === 'x') offset[0] += axisOffset;
    else offset[2] += axisOffset;

    results.push({
      label: piece.label,
      geom: piece.geom,
      baseScale: piece.baseScale,
      material: piece.material,
      offset,
      cap: piece.cap,
    });
  }

  return results;
}
