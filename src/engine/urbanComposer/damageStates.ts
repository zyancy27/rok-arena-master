/**
 * Structural Damage System — Step 4
 * 
 * Urban environments support damage states that modify
 * piece placement, scale, rotation, and material.
 */

import type { DamageState, UrbanPlacedPiece } from './types';
import { seeded } from '@/engine/biomeComposer/utils';

/** Detect damage level from narrator text and arena state */
export function detectDamageState(
  locationName?: string | null,
  stability?: number,
): DamageState {
  const text = (locationName ?? '').toLowerCase();

  if (text.includes('destroyed') || text.includes('devastat')) return 'destroyed';
  if (text.includes('collaps') || text.includes('crumbl')) return 'collapsed';
  if (text.includes('buckl') || text.includes('fractur') || text.includes('cracking')) return 'buckling';
  if (text.includes('crack') || text.includes('damage') || text.includes('broken') || text.includes('shatter')) return 'cracked';

  // Arena stability overrides
  if (stability !== undefined) {
    if (stability < 15) return 'destroyed';
    if (stability < 30) return 'collapsed';
    if (stability < 50) return 'buckling';
    if (stability < 75) return 'cracked';
  }

  return 'intact';
}

/** Apply damage modifications to placed pieces */
export function applyDamage(
  pieces: UrbanPlacedPiece[],
  damageState: DamageState,
  seed: number,
): UrbanPlacedPiece[] {
  if (damageState === 'intact') return pieces;

  return pieces.map((p, i) => {
    const s = seed + i * 37;
    const roll = seeded(s);

    switch (damageState) {
      case 'cracked':
        // 30% of pieces get slight tilt + damage material swap
        if (roll < 0.3) {
          return {
            ...p,
            rotation: [p.rotation[0] + (seeded(s + 1) - 0.5) * 0.08, p.rotation[1], p.rotation[2] + (seeded(s + 2) - 0.5) * 0.06],
            damageState: 'cracked',
          };
        }
        return p;

      case 'buckling':
        // 50% tilt, 20% scale shrink (partial collapse)
        if (roll < 0.5) {
          const tiltAmt = 0.15;
          return {
            ...p,
            rotation: [p.rotation[0] + (seeded(s + 1) - 0.5) * tiltAmt, p.rotation[1], p.rotation[2] + (seeded(s + 2) - 0.5) * tiltAmt],
            scale: roll < 0.2 ? [p.scale[0] * 0.7, p.scale[1] * 0.6, p.scale[2] * 0.7] : p.scale,
            damageState: 'buckling',
          };
        }
        return p;

      case 'collapsed':
        // 40% flattened, 20% removed (opacity 0), 20% heavily tilted
        if (roll < 0.2) {
          return { ...p, opacity: 0, damageState: 'destroyed' }; // effectively removed
        }
        if (roll < 0.4) {
          return {
            ...p,
            scale: [p.scale[0] * 1.3, p.scale[1] * 0.15, p.scale[2] * 1.3],
            position: [p.position[0], 0.05, p.position[2]],
            rotation: [0, p.rotation[1], 0],
            damageState: 'collapsed',
          };
        }
        if (roll < 0.6) {
          return {
            ...p,
            rotation: [(seeded(s + 1) - 0.5) * 0.5, p.rotation[1], (seeded(s + 2) - 0.5) * 0.5],
            position: [p.position[0] + (seeded(s + 3) - 0.5) * 0.3, p.position[1] * 0.5, p.position[2] + (seeded(s + 4) - 0.5) * 0.3],
            damageState: 'collapsed',
          };
        }
        return { ...p, damageState: 'cracked' };

      case 'destroyed':
        // 50% removed, rest flattened to debris
        if (roll < 0.5) {
          return { ...p, opacity: 0, damageState: 'destroyed' };
        }
        return {
          ...p,
          scale: [p.scale[0] * (0.5 + seeded(s + 5) * 0.8), p.scale[1] * 0.1, p.scale[2] * (0.5 + seeded(s + 6) * 0.8)],
          position: [p.position[0] + (seeded(s + 3) - 0.5) * 0.6, 0.03, p.position[2] + (seeded(s + 4) - 0.5) * 0.6],
          rotation: [seeded(s + 1) * 0.3, seeded(s + 7) * Math.PI * 2, seeded(s + 2) * 0.3],
          damageState: 'destroyed',
        };

      default:
        return p;
    }
  }).filter(p => p.opacity > 0);
}

/** Generate debris pieces from damage state */
export function generateDebris(
  damageState: DamageState,
  centerX: number,
  centerZ: number,
  seed: number,
  damageColor: string,
): UrbanPlacedPiece[] {
  if (damageState === 'intact' || damageState === 'cracked') return [];

  const count = damageState === 'destroyed' ? 12 : damageState === 'collapsed' ? 8 : 4;
  const debris: UrbanPlacedPiece[] = [];

  for (let i = 0; i < count; i++) {
    const s = seed + 5000 + i * 19;
    const angle = seeded(s) * Math.PI * 2;
    const dist = seeded(s + 1) * 4;
    debris.push({
      id: `debris-${seed}-${i}`,
      label: 'Debris',
      geom: seeded(s + 2) > 0.5 ? 'box' : 'cylinder',
      position: [centerX + Math.cos(angle) * dist, 0.03, centerZ + Math.sin(angle) * dist],
      scale: [0.08 + seeded(s + 3) * 0.25, 0.03 + seeded(s + 4) * 0.08, 0.08 + seeded(s + 5) * 0.2],
      rotation: [seeded(s + 6) * 0.4, seeded(s + 7) * Math.PI * 2, seeded(s + 8) * 0.3],
      color: damageColor,
      roughness: 0.95,
      metalness: 0,
      opacity: 1,
      damageState,
      category: 'prop',
    });
  }

  return debris;
}
