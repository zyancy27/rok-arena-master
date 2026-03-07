/**
 * Mutation Scene Updates
 *
 * Converts TerrainMutation records into SceneMutationInstructions
 * for the 3D renderer. Uses partial mesh ops instead of full rebuilds.
 */

import type {
  TerrainMutation,
  SceneMutationInstruction,
  MutationType,
} from './mutation-types';

// ── Scene Op Mapping ────────────────────────────────────────────

type OpGenerator = (m: TerrainMutation) => SceneMutationInstruction[];

const SCENE_OPS: Partial<Record<MutationType, OpGenerator>> = {
  terrain_crack: (m) => [
    { op: 'add_decal', target: m.targetZoneIds[0], params: { decalType: 'crack', color: '#1a1a1a', scale: m.magnitude } },
    { op: 'deform_mesh', target: m.targetZoneIds[0], params: { axis: 'y', amount: -m.magnitude * 0.3, noise: true } },
  ],
  terrain_collapse: (m) => [
    { op: 'deform_mesh', target: m.targetZoneIds[0], params: { axis: 'y', amount: -m.magnitude * 2, noise: true } },
    { op: 'add_debris', target: m.targetZoneIds[0], params: { count: Math.ceil(m.magnitude * 8), spread: 3 } },
    { op: 'tint_material', target: m.targetZoneIds[0], params: { color: '#3d3028', blend: 0.4 } },
  ],
  terrain_landslide: (m) => [
    { op: 'add_debris', target: m.targetZoneIds[0], params: { count: Math.ceil(m.magnitude * 10), spread: 5, type: 'rock' } },
    { op: 'deform_mesh', target: m.targetZoneIds[0], params: { axis: 'y', amount: -m.magnitude * 1.5, noise: true } },
  ],
  terrain_crater: (m) => [
    { op: 'deform_mesh', target: m.targetZoneIds[0], params: { axis: 'y', amount: -m.magnitude * 1.8, radial: true } },
    { op: 'add_decal', target: m.targetZoneIds[0], params: { decalType: 'scorch', color: '#2a1a0a', scale: m.magnitude * 1.5 } },
    { op: 'add_debris', target: m.targetZoneIds[0], params: { count: 4, spread: 2 } },
  ],
  terrain_frozen: (m) => [
    { op: 'tint_material', target: m.targetZoneIds[0], params: { color: '#c8e8ff', blend: m.magnitude * 0.5 } },
    { op: 'add_emissive', target: m.targetZoneIds[0], params: { color: '#aaddff', intensity: 0.15 } },
  ],
  terrain_broken_ground: (m) => [
    { op: 'add_decal', target: m.targetZoneIds[0], params: { decalType: 'crack', color: '#222', scale: m.magnitude * 1.2 } },
    { op: 'deform_mesh', target: m.targetZoneIds[0], params: { axis: 'y', amount: -m.magnitude * 0.6, noise: true } },
  ],

  structure_damage: (m) => [
    { op: 'add_decal', target: m.targetLabel ?? m.targetZoneIds[0], params: { decalType: 'crack', color: '#333', scale: m.magnitude } },
    { op: 'deform_mesh', target: m.targetLabel ?? m.targetZoneIds[0], params: { axis: 'y', amount: -m.magnitude * 0.2, noise: false } },
  ],
  structure_collapse: (m) => [
    { op: 'swap_mesh', target: m.targetLabel ?? m.targetZoneIds[0], params: { variant: 'collapsed', tilt: m.magnitude * 30 } },
    { op: 'add_debris', target: m.targetZoneIds[0], params: { count: Math.ceil(m.magnitude * 6), spread: 2 } },
  ],
  structure_shatter: (m) => [
    { op: 'remove_mesh', target: m.targetLabel ?? m.targetZoneIds[0], params: { fadeOut: true } },
    { op: 'add_debris', target: m.targetZoneIds[0], params: { count: Math.ceil(m.magnitude * 12), spread: 3, type: 'shard' } },
  ],
  structure_buckle: (m) => [
    { op: 'deform_mesh', target: m.targetLabel ?? m.targetZoneIds[0], params: { axis: 'y', amount: -m.magnitude * 0.8, noise: false } },
    { op: 'add_decal', target: m.targetLabel ?? m.targetZoneIds[0], params: { decalType: 'bend', color: '#444', scale: m.magnitude } },
  ],
  structure_explode: (m) => [
    { op: 'remove_mesh', target: m.targetLabel ?? m.targetZoneIds[0], params: { fadeOut: false } },
    { op: 'add_debris', target: m.targetZoneIds[0], params: { count: Math.ceil(m.magnitude * 15), spread: 5 } },
    { op: 'add_particles', target: m.targetZoneIds[0], params: { type: 'explosion', color: '#ff6622', duration: 2 } },
    { op: 'add_emissive', target: m.targetZoneIds[0], params: { color: '#ff4400', intensity: 0.6 } },
  ],
  structure_open: (m) => [
    { op: 'remove_mesh', target: m.targetLabel ?? m.targetZoneIds[0], params: { fadeOut: true } },
  ],

  surface_burn: (m) => [
    { op: 'tint_material', target: m.targetZoneIds[0], params: { color: '#2a1508', blend: m.magnitude * 0.4 } },
    { op: 'add_emissive', target: m.targetZoneIds[0], params: { color: '#ff5511', intensity: m.magnitude * 0.4 } },
    { op: 'add_particles', target: m.targetZoneIds[0], params: { type: 'ember', color: '#ff8833', duration: 8 } },
  ],
  surface_corruption: (m) => [
    { op: 'tint_material', target: m.targetZoneIds[0], params: { color: '#2a0833', blend: m.magnitude * 0.4 } },
    { op: 'add_emissive', target: m.targetZoneIds[0], params: { color: '#8b22aa', intensity: m.magnitude * 0.25 } },
  ],
  surface_mud_spread: (m) => [
    { op: 'tint_material', target: m.targetZoneIds[0], params: { color: '#4a3520', blend: m.magnitude * 0.3 } },
  ],

  flood_rise: (m) => [
    { op: 'raise_water', target: m.targetZoneIds[0], params: { height: m.magnitude * 0.8, color: '#2255aa' } },
  ],
  gas_spread: (m) => [
    { op: 'add_particles', target: m.targetZoneIds[0], params: { type: 'gas', color: '#44cc44', duration: 10 } },
  ],

  visibility_drop: (m) => [
    { op: 'add_particles', target: m.targetZoneIds[0], params: { type: 'fog', color: '#888888', duration: 15 } },
  ],
  visibility_improve: (m) => [
    { op: 'remove_mesh', target: `fog-${m.targetZoneIds[0]}`, params: { fadeOut: true } },
  ],

  electrical_surge: (m) => [
    { op: 'add_particles', target: m.targetZoneIds[0], params: { type: 'spark', color: '#44aaff', duration: 3 } },
    { op: 'add_emissive', target: m.targetZoneIds[0], params: { color: '#4488ff', intensity: m.magnitude * 0.5 } },
  ],

  debris_spawn: (m) => [
    { op: 'add_debris', target: m.targetZoneIds[0], params: { count: Math.ceil(m.magnitude * 6), spread: 3 } },
  ],

  path_blocked: (m) => [
    { op: 'add_debris', target: m.targetZoneIds[0], params: { count: 4, spread: 1.5, type: 'barricade' } },
  ],
  path_opened: (m) => [
    { op: 'remove_mesh', target: m.targetLabel ?? m.targetZoneIds[0], params: { fadeOut: true } },
  ],

  elevation_shift: (m) => [
    { op: 'deform_mesh', target: m.targetZoneIds[0], params: { axis: 'y', amount: m.magnitude * 1.5, noise: true } },
  ],
};

// ── Generate Scene Instructions ─────────────────────────────────

export function computeSceneInstructions(mutations: TerrainMutation[]): SceneMutationInstruction[] {
  const instructions: SceneMutationInstruction[] = [];

  for (const mutation of mutations) {
    const generator = SCENE_OPS[mutation.type];
    if (generator) {
      instructions.push(...generator(mutation));
    }
  }

  return instructions;
}
