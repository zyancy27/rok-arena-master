/**
 * Architecture Families — Step 1 & 5
 * 
 * Coherent grouped architectural pieces instead of random props.
 */

import type { ArchFamily } from './types';

// ── Skybridge Family ────────────────────────────────────────────

const SKYBRIDGE: ArchFamily = {
  id: 'skybridge', name: 'Skybridge',
  instanceCount: 1, spreadRadius: 0,
  pieces: [
    // Main walkway deck
    { id: 'deck', label: 'Glass Walkway', geom: 'box', baseScale: [6, 0.06, 1.4], material: 'primary', offset: [0, 1.5, 0] },
    // Floor panels (repeat)
    { id: 'panels', label: 'Floor Panel', geom: 'box', baseScale: [0.9, 0.04, 1.3], material: 'secondary', offset: [-2.5, 1.48, 0], repeat: { axis: 'x', count: 6, spacing: 1 } },
    // Left railing
    { id: 'rail_l', label: 'Railing', geom: 'box', baseScale: [6, 0.4, 0.03], material: 'detail', offset: [0, 1.7, 0.65] },
    // Right railing
    { id: 'rail_r', label: 'Railing', geom: 'box', baseScale: [6, 0.4, 0.03], material: 'detail', offset: [0, 1.7, -0.65] },
    // Support beams (repeat)
    { id: 'beam', label: 'Support Beam', geom: 'cylinder', baseScale: [0.06, 1.6, 0.06], material: 'accent', offset: [-2.5, 0.75, 0], tall: true, repeat: { axis: 'x', count: 4, spacing: 1.6 } },
    // Suspension cables
    { id: 'cable_l', label: 'Suspension Cable', geom: 'cylinder', baseScale: [0.02, 2.5, 0.02], material: 'accent', offset: [-1.5, 2.5, 0.6], tall: true },
    { id: 'cable_r', label: 'Suspension Cable', geom: 'cylinder', baseScale: [0.02, 2.5, 0.02], material: 'accent', offset: [1.5, 2.5, -0.6], tall: true },
  ],
};

// ── Tower / Building Anchor ─────────────────────────────────────

const BUILDING_ANCHOR: ArchFamily = {
  id: 'building_anchor', name: 'Building Anchor',
  instanceCount: 2, spreadRadius: 0,
  pieces: [
    { id: 'wall_main', label: 'Building Wall', geom: 'box', baseScale: [2.0, 3.0, 1.8], material: 'primary', offset: [0, 1.5, 0] },
    { id: 'window_row', label: 'Window', geom: 'box', baseScale: [0.4, 0.5, 0.02], material: 'secondary', offset: [-0.5, 2.0, 0.9], repeat: { axis: 'x', count: 3, spacing: 0.6 } },
    { id: 'ledge', label: 'Ledge', geom: 'box', baseScale: [2.2, 0.06, 1.9], material: 'detail', offset: [0, 3.0, 0] },
    { id: 'door', label: 'Entrance', geom: 'box', baseScale: [0.5, 0.8, 0.04], material: 'accent', offset: [0, 0.4, 0.9] },
  ],
};

// ── Rooftop Equipment ───────────────────────────────────────────

const ROOFTOP_EQUIPMENT: ArchFamily = {
  id: 'rooftop_equipment', name: 'Rooftop Equipment',
  instanceCount: 3, spreadRadius: 2.5,
  pieces: [
    { id: 'ac_unit', label: 'AC Unit', geom: 'box', baseScale: [0.5, 0.35, 0.4], material: 'secondary', offset: [0, 0.17, 0] },
    { id: 'vent_pipe', label: 'Vent Pipe', geom: 'cylinder', baseScale: [0.1, 0.8, 0.1], material: 'detail', offset: [0.6, 0.4, 0], tall: true },
    { id: 'vent_cap', label: 'Vent Cap', geom: 'cone', baseScale: [0.15, 0.08, 0.15], material: 'accent', offset: [0.6, 0.85, 0] },
    { id: 'shed', label: 'Maintenance Shed', geom: 'box', baseScale: [0.7, 0.6, 0.5], material: 'primary', offset: [-0.8, 0.3, 0.5],
      cap: { geom: 'box', material: 'detail', offset: [0, 0.35, 0], scale: [0.75, 0.06, 0.55] } },
  ],
};

// ── Billboard Frame ─────────────────────────────────────────────

const BILLBOARD: ArchFamily = {
  id: 'billboard', name: 'Billboard Frame',
  instanceCount: 1, spreadRadius: 0,
  pieces: [
    { id: 'post_l', label: 'Billboard Post', geom: 'cylinder', baseScale: [0.06, 2.5, 0.06], material: 'accent', offset: [-0.8, 1.25, 0], tall: true },
    { id: 'post_r', label: 'Billboard Post', geom: 'cylinder', baseScale: [0.06, 2.5, 0.06], material: 'accent', offset: [0.8, 1.25, 0], tall: true },
    { id: 'face', label: 'Billboard Face', geom: 'box', baseScale: [2.0, 1.0, 0.05], material: 'primary', offset: [0, 2.5, 0] },
  ],
};

// ── Industrial Pipe Bank ────────────────────────────────────────

const PIPE_BANK: ArchFamily = {
  id: 'pipe_bank', name: 'Pipe Bank',
  instanceCount: 2, spreadRadius: 1.5,
  pieces: [
    { id: 'main_pipe', label: 'Main Pipe', geom: 'cylinder', baseScale: [0.15, 2.0, 0.15], material: 'primary', offset: [0, 1, 0], tall: true },
    { id: 'side_pipe_1', label: 'Side Pipe', geom: 'cylinder', baseScale: [0.08, 1.5, 0.08], material: 'primary', offset: [0.3, 0.75, 0], tall: true },
    { id: 'side_pipe_2', label: 'Side Pipe', geom: 'cylinder', baseScale: [0.08, 1.8, 0.08], material: 'primary', offset: [-0.25, 0.9, 0.15], tall: true },
    { id: 'valve', label: 'Valve', geom: 'torus', baseScale: [0.12, 0.04, 0.12], material: 'accent', offset: [0, 1.2, 0.16] },
    { id: 'bracket', label: 'Bracket', geom: 'box', baseScale: [0.5, 0.06, 0.06], material: 'detail', offset: [0, 0.6, 0] },
  ],
};

// ── Control Console ─────────────────────────────────────────────

const CONTROL_CONSOLE: ArchFamily = {
  id: 'control_console', name: 'Control Console',
  instanceCount: 2, spreadRadius: 2,
  pieces: [
    { id: 'body', label: 'Console Body', geom: 'box', baseScale: [0.6, 0.8, 0.3], material: 'secondary', offset: [0, 0.4, 0] },
    { id: 'screen', label: 'Screen', geom: 'box', baseScale: [0.4, 0.25, 0.02], material: 'accent', offset: [0, 0.7, 0.16] },
    { id: 'base', label: 'Console Base', geom: 'box', baseScale: [0.65, 0.06, 0.35], material: 'detail', offset: [0, 0.03, 0] },
  ],
};

// ── Industrial Tank ─────────────────────────────────────────────

const TANK: ArchFamily = {
  id: 'tank', name: 'Storage Tank',
  instanceCount: 1, spreadRadius: 0,
  pieces: [
    { id: 'body', label: 'Tank Body', geom: 'cylinder', baseScale: [0.5, 1.2, 0.5], material: 'primary', offset: [0, 0.6, 0], tall: true },
    { id: 'top', label: 'Tank Cap', geom: 'sphere', baseScale: [0.52, 0.2, 0.52], material: 'secondary', offset: [0, 1.2, 0] },
    { id: 'pipe_out', label: 'Outlet Pipe', geom: 'cylinder', baseScale: [0.06, 0.6, 0.06], material: 'detail', offset: [0.5, 0.5, 0] },
    { id: 'ladder', label: 'Ladder', geom: 'box', baseScale: [0.1, 1.2, 0.04], material: 'accent', offset: [-0.48, 0.6, 0], tall: true },
  ],
};

// ── Catwalk System ──────────────────────────────────────────────

const CATWALK: ArchFamily = {
  id: 'catwalk', name: 'Catwalk System',
  instanceCount: 2, spreadRadius: 2,
  pieces: [
    { id: 'grating', label: 'Grating Platform', geom: 'box', baseScale: [2.5, 0.04, 0.6], material: 'secondary', offset: [0, 1.0, 0] },
    { id: 'support_l', label: 'Support', geom: 'cylinder', baseScale: [0.04, 1.0, 0.04], material: 'accent', offset: [-1.0, 0.5, 0.25], tall: true },
    { id: 'support_r', label: 'Support', geom: 'cylinder', baseScale: [0.04, 1.0, 0.04], material: 'accent', offset: [1.0, 0.5, 0.25], tall: true },
    { id: 'rail', label: 'Guard Rail', geom: 'box', baseScale: [2.5, 0.3, 0.02], material: 'detail', offset: [0, 1.2, 0.3] },
  ],
};

// ── Parking Elements ────────────────────────────────────────────

const PARKING_PILLAR: ArchFamily = {
  id: 'parking_pillar', name: 'Parking Pillar',
  instanceCount: 4, spreadRadius: 3,
  pieces: [
    { id: 'pillar', label: 'Concrete Pillar', geom: 'box', baseScale: [0.3, 2.5, 0.3], material: 'primary', offset: [0, 1.25, 0], tall: true },
    { id: 'cap', label: 'Pillar Cap', geom: 'box', baseScale: [0.4, 0.08, 0.4], material: 'detail', offset: [0, 2.5, 0] },
  ],
};

const PARKED_CAR: ArchFamily = {
  id: 'parked_car', name: 'Parked Car',
  instanceCount: 3, spreadRadius: 2.5,
  pieces: [
    { id: 'body', label: 'Car Body', geom: 'box', baseScale: [0.8, 0.3, 0.35], material: 'detail', offset: [0, 0.2, 0] },
    { id: 'cabin', label: 'Car Cabin', geom: 'box', baseScale: [0.4, 0.2, 0.32], material: 'secondary', offset: [0.05, 0.4, 0] },
    { id: 'wheel_fl', label: 'Wheel', geom: 'cylinder', baseScale: [0.08, 0.05, 0.08], material: 'accent', offset: [0.25, 0.08, 0.18] },
    { id: 'wheel_fr', label: 'Wheel', geom: 'cylinder', baseScale: [0.08, 0.05, 0.08], material: 'accent', offset: [0.25, 0.08, -0.18] },
  ],
};

// ── Street Furniture ────────────────────────────────────────────

const STREET_LAMP: ArchFamily = {
  id: 'street_lamp', name: 'Street Lamp',
  instanceCount: 3, spreadRadius: 3,
  pieces: [
    { id: 'pole', label: 'Lamp Pole', geom: 'cylinder', baseScale: [0.04, 1.8, 0.04], material: 'detail', offset: [0, 0.9, 0], tall: true },
    { id: 'light', label: 'Lamp Light', geom: 'sphere', baseScale: [0.1, 0.1, 0.1], material: 'accent', offset: [0, 1.85, 0] },
  ],
};

// ── Plaza / Road ────────────────────────────────────────────────

const ROAD_SEGMENT: ArchFamily = {
  id: 'road_segment', name: 'Road Segment',
  instanceCount: 1, spreadRadius: 0,
  pieces: [
    { id: 'road', label: 'Road Surface', geom: 'box', baseScale: [8, 0.04, 2.5], material: 'primary', offset: [0, 0.02, 0] },
    { id: 'curb_l', label: 'Curb', geom: 'box', baseScale: [8, 0.1, 0.1], material: 'detail', offset: [0, 0.05, 1.3] },
    { id: 'curb_r', label: 'Curb', geom: 'box', baseScale: [8, 0.1, 0.1], material: 'detail', offset: [0, 0.05, -1.3] },
    { id: 'marking', label: 'Road Marking', geom: 'box', baseScale: [1.0, 0.005, 0.08], material: 'accent', offset: [-2, 0.045, 0], repeat: { axis: 'x', count: 5, spacing: 2 } },
  ],
};

// ── Family Registry ─────────────────────────────────────────────

export const URBAN_FAMILIES: Record<string, ArchFamily> = {
  skybridge: SKYBRIDGE,
  building_anchor: BUILDING_ANCHOR,
  rooftop_equipment: ROOFTOP_EQUIPMENT,
  billboard: BILLBOARD,
  pipe_bank: PIPE_BANK,
  control_console: CONTROL_CONSOLE,
  tank: TANK,
  catwalk: CATWALK,
  parking_pillar: PARKING_PILLAR,
  parked_car: PARKED_CAR,
  street_lamp: STREET_LAMP,
  road_segment: ROAD_SEGMENT,
};

/** Get families for a given layout type */
export function getFamiliesForLayout(layoutType: string): ArchFamily[] {
  const map: Record<string, string[]> = {
    skybridge_layout:          ['skybridge', 'building_anchor'],
    bridge_layout:             ['skybridge', 'building_anchor', 'street_lamp'],
    rooftop_layout:            ['rooftop_equipment', 'billboard', 'catwalk'],
    factory_floor_layout:      ['pipe_bank', 'control_console', 'tank', 'catwalk'],
    industrial_platform_layout:['pipe_bank', 'tank', 'catwalk', 'control_console'],
    street_block_layout:       ['road_segment', 'street_lamp', 'building_anchor', 'parked_car'],
    parking_garage_layout:     ['parking_pillar', 'parked_car', 'street_lamp'],
    mall_layout:               ['building_anchor', 'billboard', 'street_lamp', 'catwalk'],
  };
  const ids = map[layoutType] ?? ['building_anchor', 'rooftop_equipment'];
  return ids.map(id => URBAN_FAMILIES[id]).filter(Boolean);
}
