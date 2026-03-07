/**
 * Urban Material Palettes — Step 3 & 6
 * 
 * Color and material identity for human-made environments.
 * No structure defaults to pure black.
 */

import type { UrbanMaterialPalette } from './types';

const PALETTES: Record<string, UrbanMaterialPalette> = {
  glass_bridge: {
    primary:   { color: '#7fbfff', roughness: 0.1, metalness: 0.6, opacity: 0.7, label: 'glass panel' },
    secondary: { color: '#505050', roughness: 0.4, metalness: 0.7, label: 'steel frame' },
    accent:    { color: '#9aa3a7', roughness: 0.3, metalness: 0.8, label: 'support beam' },
    detail:    { color: '#666666', roughness: 0.5, metalness: 0.5, label: 'railing' },
    damage:    { color: '#ccddee', roughness: 0.2, metalness: 0.1, emissive: true, emissiveColor: '#aaccee', label: 'cracked glass' },
    ambientTint: '#3a5570',
    descriptors: ['glass blue', 'steel gray', 'metallic silver', 'fracture white'],
  },
  concrete_building: {
    primary:   { color: '#8f8f8f', roughness: 0.95, metalness: 0.0, label: 'concrete wall' },
    secondary: { color: '#6ba6ff', roughness: 0.15, metalness: 0.5, opacity: 0.8, label: 'window' },
    accent:    { color: '#444444', roughness: 0.5, metalness: 0.6, label: 'metal frame' },
    detail:    { color: '#707070', roughness: 0.85, metalness: 0.0, label: 'ledge' },
    damage:    { color: '#9a9080', roughness: 0.95, metalness: 0.0, label: 'crumbled concrete' },
    ambientTint: '#4a5060',
    descriptors: ['concrete gray', 'reflective blue', 'dark metal', 'dust white'],
  },
  industrial: {
    primary:   { color: '#9c4b30', roughness: 0.75, metalness: 0.4, label: 'rusted pipe' },
    secondary: { color: '#777777', roughness: 0.5, metalness: 0.6, label: 'steel floor' },
    accent:    { color: '#ccaa22', roughness: 0.6, metalness: 0.3, emissive: true, emissiveColor: '#ccaa22', label: 'hazard marking' },
    detail:    { color: '#555555', roughness: 0.6, metalness: 0.5, label: 'grating' },
    damage:    { color: '#6a3a20', roughness: 0.9, metalness: 0.2, label: 'corroded metal' },
    ambientTint: '#5a3a20',
    descriptors: ['rust orange', 'dull metal', 'hazard yellow', 'oil dark'],
  },
  rooftop: {
    primary:   { color: '#606060', roughness: 0.9, metalness: 0.0, label: 'rooftop surface' },
    secondary: { color: '#4a4a55', roughness: 0.7, metalness: 0.5, label: 'metal housing' },
    accent:    { color: '#888888', roughness: 0.6, metalness: 0.4, label: 'vent' },
    detail:    { color: '#333333', roughness: 0.5, metalness: 0.6, label: 'pipe' },
    damage:    { color: '#707060', roughness: 0.95, metalness: 0.0, label: 'cracked surface' },
    ambientTint: '#303848',
    descriptors: ['flat gray', 'metal dark', 'vent silver', 'tar black'],
  },
  parking_garage: {
    primary:   { color: '#7a7a7a', roughness: 0.92, metalness: 0.0, label: 'concrete pillar' },
    secondary: { color: '#505050', roughness: 0.85, metalness: 0.0, label: 'ramp surface' },
    accent:    { color: '#cccc44', roughness: 0.6, metalness: 0.1, emissive: true, emissiveColor: '#aaaa33', label: 'marking stripe' },
    detail:    { color: '#3a3a45', roughness: 0.5, metalness: 0.5, label: 'car body' },
    damage:    { color: '#686858', roughness: 0.95, metalness: 0.0, label: 'broken concrete' },
    ambientTint: '#404040',
    descriptors: ['concrete', 'parking yellow', 'car dark', 'fluorescent'],
  },
  street: {
    primary:   { color: '#3a3a40', roughness: 0.9, metalness: 0.0, label: 'asphalt' },
    secondary: { color: '#6a6a70', roughness: 0.85, metalness: 0.0, label: 'sidewalk' },
    accent:    { color: '#cccc55', roughness: 0.5, metalness: 0.1, emissive: true, emissiveColor: '#aaaa33', label: 'road marking' },
    detail:    { color: '#505050', roughness: 0.6, metalness: 0.5, label: 'street furniture' },
    damage:    { color: '#555550', roughness: 0.95, metalness: 0.0, label: 'broken asphalt' },
    ambientTint: '#2a3040',
    descriptors: ['road gray', 'sidewalk', 'marking yellow', 'lamplight'],
  },
  mall: {
    primary:   { color: '#8a8a8a', roughness: 0.3, metalness: 0.2, label: 'tile floor' },
    secondary: { color: '#6ba6ff', roughness: 0.1, metalness: 0.5, opacity: 0.6, label: 'storefront glass' },
    accent:    { color: '#ff6644', roughness: 0.5, metalness: 0.1, emissive: true, emissiveColor: '#ff4422', label: 'neon sign' },
    detail:    { color: '#555555', roughness: 0.6, metalness: 0.4, label: 'railing' },
    damage:    { color: '#7a7570', roughness: 0.9, metalness: 0.0, label: 'debris' },
    ambientTint: '#404060',
    descriptors: ['tile white', 'neon glow', 'glass blue', 'chrome'],
  },
};

/** Detect which palette to use from location text */
export function getUrbanPalette(locationName?: string | null, tags?: string[]): UrbanMaterialPalette {
  const text = (locationName ?? '').toLowerCase() + ' ' + (tags ?? []).join(' ');

  if (text.includes('glass') || text.includes('skybridge') || text.includes('skywalk'))
    return PALETTES.glass_bridge;
  if (text.includes('parking') || text.includes('garage'))
    return PALETTES.parking_garage;
  if (text.includes('mall') || text.includes('shop') || text.includes('store') || text.includes('market'))
    return PALETTES.mall;
  if (text.includes('rooftop') || text.includes('roof'))
    return PALETTES.rooftop;
  if (text.includes('factory') || text.includes('industrial') || text.includes('plant') || text.includes('refinery') || text.includes('foundry') || text.includes('reactor') || text.includes('turbine') || text.includes('dam'))
    return PALETTES.industrial;
  if (text.includes('street') || text.includes('road') || text.includes('alley') || text.includes('avenue') || text.includes('plaza'))
    return PALETTES.street;
  if (text.includes('building') || text.includes('tower') || text.includes('high-rise') || text.includes('highrise') || text.includes('apartment') || text.includes('office'))
    return PALETTES.concrete_building;

  return PALETTES.concrete_building;
}
