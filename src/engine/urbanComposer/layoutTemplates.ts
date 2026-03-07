/**
 * Layout Templates — Step 2
 * 
 * Structured spatial layouts for urban environments.
 * Anchors define where architecture families are placed.
 */

import type { LayoutTemplate, LayoutType } from './types';

const TEMPLATES: LayoutTemplate[] = [
  // ── Skybridge ─────────────────────────────────────────────────
  {
    type: 'skybridge_layout', name: 'Skybridge',
    keywords: ['skybridge', 'skywalk', 'glass bridge', 'overpass', 'sky corridor'],
    layers: [
      { label: 'Ground Below', elevation: -1 },
      { label: 'Bridge Deck', elevation: 1.5 },
      { label: 'Cable Level', elevation: 3 },
    ],
    anchors: [
      { id: 'tower_a', label: 'Tower A', x: -5, z: 0, elevation: 0, familyId: 'building_anchor', scale: 1, rotation: 0 },
      { id: 'tower_b', label: 'Tower B', x: 5, z: 0, elevation: 0, familyId: 'building_anchor', scale: 1, rotation: Math.PI },
      { id: 'bridge_main', label: 'Main Bridge', x: 0, z: 0, elevation: 0, familyId: 'skybridge', scale: 1, rotation: 0 },
    ],
  },
  // ── Bridge ────────────────────────────────────────────────────
  {
    type: 'bridge_layout', name: 'Bridge',
    keywords: ['bridge', 'suspension', 'overpass', 'viaduct', 'crossing'],
    layers: [
      { label: 'Below', elevation: -1 },
      { label: 'Road Level', elevation: 0 },
      { label: 'Tower Top', elevation: 3 },
    ],
    anchors: [
      { id: 'anchor_a', label: 'Bridge Anchor A', x: -4.5, z: 0, elevation: 0, familyId: 'building_anchor', scale: 0.8, rotation: 0 },
      { id: 'anchor_b', label: 'Bridge Anchor B', x: 4.5, z: 0, elevation: 0, familyId: 'building_anchor', scale: 0.8, rotation: Math.PI },
      { id: 'bridge_span', label: 'Bridge Span', x: 0, z: 0, elevation: 0, familyId: 'skybridge', scale: 0.9, rotation: 0 },
      { id: 'lamp_1', label: 'Bridge Lamp', x: -2, z: 1, elevation: 0, familyId: 'street_lamp', scale: 0.6, rotation: 0 },
      { id: 'lamp_2', label: 'Bridge Lamp', x: 2, z: -1, elevation: 0, familyId: 'street_lamp', scale: 0.6, rotation: 0 },
    ],
  },
  // ── Rooftop ───────────────────────────────────────────────────
  {
    type: 'rooftop_layout', name: 'Rooftop',
    keywords: ['rooftop', 'roof', 'high-rise', 'highrise', 'tower top'],
    layers: [
      { label: 'Rooftop Surface', elevation: 0 },
      { label: 'Upper Equipment', elevation: 1.5 },
    ],
    anchors: [
      { id: 'equip_ne', label: 'NE Equipment', x: 2.5, z: -2.5, elevation: 0, familyId: 'rooftop_equipment', scale: 1, rotation: 0 },
      { id: 'equip_sw', label: 'SW Equipment', x: -3, z: 2, elevation: 0, familyId: 'rooftop_equipment', scale: 0.8, rotation: Math.PI / 2 },
      { id: 'billboard_1', label: 'Billboard', x: 3.5, z: 0, elevation: 0, familyId: 'billboard', scale: 1, rotation: -0.3 },
      { id: 'catwalk_1', label: 'Maintenance Walk', x: -1, z: -3, elevation: 0, familyId: 'catwalk', scale: 0.7, rotation: Math.PI / 4 },
    ],
  },
  // ── Factory Floor ─────────────────────────────────────────────
  {
    type: 'factory_floor_layout', name: 'Factory Floor',
    keywords: ['factory', 'plant', 'industrial', 'foundry', 'smelting', 'mill', 'assembly'],
    layers: [
      { label: 'Ground Level', elevation: 0 },
      { label: 'Catwalk Level', elevation: 1.5 },
    ],
    anchors: [
      { id: 'pipes_1', label: 'Pipe Bank A', x: -3, z: -2, elevation: 0, familyId: 'pipe_bank', scale: 1, rotation: 0 },
      { id: 'pipes_2', label: 'Pipe Bank B', x: 3, z: 2, elevation: 0, familyId: 'pipe_bank', scale: 0.8, rotation: Math.PI / 3 },
      { id: 'console_1', label: 'Control Station', x: 0, z: -3, elevation: 0, familyId: 'control_console', scale: 1, rotation: 0 },
      { id: 'tank_1', label: 'Storage Tank', x: -4, z: 1, elevation: 0, familyId: 'tank', scale: 1.2, rotation: 0 },
      { id: 'walk_1', label: 'Upper Catwalk', x: 1, z: 0, elevation: 0, familyId: 'catwalk', scale: 1, rotation: Math.PI / 6 },
    ],
  },
  // ── Industrial Platform ───────────────────────────────────────
  {
    type: 'industrial_platform_layout', name: 'Industrial Platform',
    keywords: ['platform', 'dam', 'turbine', 'generator', 'reactor', 'refinery', 'pump'],
    layers: [
      { label: 'Ground Level', elevation: 0 },
      { label: 'Platform Level', elevation: 1 },
      { label: 'Upper Deck', elevation: 2 },
    ],
    anchors: [
      { id: 'tank_main', label: 'Main Tank', x: 0, z: -2, elevation: 0, familyId: 'tank', scale: 1.5, rotation: 0 },
      { id: 'pipes', label: 'Pipe System', x: -3, z: 0, elevation: 0, familyId: 'pipe_bank', scale: 1, rotation: Math.PI / 4 },
      { id: 'walk_a', label: 'Catwalk A', x: 2, z: 1, elevation: 0, familyId: 'catwalk', scale: 1, rotation: -Math.PI / 6 },
      { id: 'console', label: 'Control Panel', x: 3, z: -2, elevation: 0, familyId: 'control_console', scale: 0.8, rotation: Math.PI / 2 },
    ],
  },
  // ── Street Block ──────────────────────────────────────────────
  {
    type: 'street_block_layout', name: 'Street Block',
    keywords: ['street', 'road', 'alley', 'avenue', 'downtown', 'district', 'city', 'urban', 'town', 'plaza'],
    layers: [
      { label: 'Street Level', elevation: 0 },
      { label: 'Sidewalk Level', elevation: 0.1 },
    ],
    anchors: [
      { id: 'road', label: 'Main Road', x: 0, z: 0, elevation: 0, familyId: 'road_segment', scale: 1, rotation: 0 },
      { id: 'bldg_a', label: 'Building A', x: -2, z: 3.5, elevation: 0, familyId: 'building_anchor', scale: 0.7, rotation: 0 },
      { id: 'bldg_b', label: 'Building B', x: 2, z: -3.5, elevation: 0, familyId: 'building_anchor', scale: 0.6, rotation: Math.PI },
      { id: 'lamp', label: 'Street Lamps', x: -3.5, z: 1, elevation: 0, familyId: 'street_lamp', scale: 0.8, rotation: 0 },
      { id: 'car', label: 'Parked Cars', x: 1.5, z: 2, elevation: 0, familyId: 'parked_car', scale: 1, rotation: Math.PI / 2 },
    ],
  },
  // ── Parking Garage ────────────────────────────────────────────
  {
    type: 'parking_garage_layout', name: 'Parking Garage',
    keywords: ['parking', 'garage'],
    layers: [
      { label: 'Level 1', elevation: 0 },
      { label: 'Level 2', elevation: 2.5 },
    ],
    anchors: [
      { id: 'pillar_1', label: 'Pillar Grid', x: -2.5, z: -2.5, elevation: 0, familyId: 'parking_pillar', scale: 1, rotation: 0 },
      { id: 'pillar_2', label: 'Pillar Grid', x: 2.5, z: 2.5, elevation: 0, familyId: 'parking_pillar', scale: 1, rotation: 0 },
      { id: 'car_1', label: 'Parked Cars', x: 0, z: -1, elevation: 0, familyId: 'parked_car', scale: 1, rotation: 0 },
      { id: 'car_2', label: 'Parked Cars', x: -1, z: 2, elevation: 0, familyId: 'parked_car', scale: 1, rotation: Math.PI / 3 },
      { id: 'lamp', label: 'Ceiling Light', x: 0, z: 0, elevation: 2.4, familyId: 'street_lamp', scale: 0.5, rotation: 0 },
    ],
  },
  // ── Mall ──────────────────────────────────────────────────────
  {
    type: 'mall_layout', name: 'Mall Interior',
    keywords: ['mall', 'shop', 'store', 'market', 'plaza', 'terminal', 'station'],
    layers: [
      { label: 'Ground Floor', elevation: 0 },
      { label: 'Upper Floor', elevation: 2.5 },
    ],
    anchors: [
      { id: 'store_a', label: 'Storefront A', x: -3, z: -2, elevation: 0, familyId: 'building_anchor', scale: 0.6, rotation: 0 },
      { id: 'store_b', label: 'Storefront B', x: 3, z: -2, elevation: 0, familyId: 'building_anchor', scale: 0.6, rotation: Math.PI },
      { id: 'sign', label: 'Neon Sign', x: 0, z: -3.5, elevation: 0, familyId: 'billboard', scale: 0.7, rotation: 0 },
      { id: 'walk', label: 'Upper Walkway', x: 0, z: 2, elevation: 0, familyId: 'catwalk', scale: 0.8, rotation: 0 },
      { id: 'lamp', label: 'Interior Lamps', x: 0, z: 0, elevation: 0, familyId: 'street_lamp', scale: 0.5, rotation: 0 },
    ],
  },
];

/** Detect the best layout from location text */
export function detectLayout(locationName?: string | null, tags?: string[]): LayoutTemplate {
  const text = ((locationName ?? '') + ' ' + (tags ?? []).join(' ')).toLowerCase();

  // Score each template by keyword matches
  let best = TEMPLATES[0];
  let bestScore = 0;

  for (const t of TEMPLATES) {
    let score = 0;
    for (const kw of t.keywords) {
      if (text.includes(kw)) score += kw.length; // longer match = better
    }
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }

  return best;
}

export function getLayoutByType(type: LayoutType): LayoutTemplate | undefined {
  return TEMPLATES.find(t => t.type === type);
}
