/**
 * UrbanStructureComposer Types
 * 
 * Types for coherent urban/industrial environment generation.
 */

// ── Damage States ───────────────────────────────────────────────

export type DamageState = 'intact' | 'cracked' | 'buckling' | 'collapsed' | 'destroyed';

// ── Materials ───────────────────────────────────────────────────

export interface UrbanMaterial {
  color: string;
  roughness: number;
  metalness: number;
  emissive?: boolean;
  emissiveColor?: string;
  opacity?: number;
  label: string;
}

export interface UrbanMaterialPalette {
  primary: UrbanMaterial;
  secondary: UrbanMaterial;
  accent: UrbanMaterial;
  detail: UrbanMaterial;
  damage: UrbanMaterial;
  /** Ambient color grading hint */
  ambientTint: string;
  /** Descriptive tags for narrator */
  descriptors: string[];
}

// ── Architecture Pieces ─────────────────────────────────────────

export type UrbanGeom = 'box' | 'cylinder' | 'cone' | 'sphere' | 'torus';

export interface ArchPiece {
  id: string;
  label: string;
  geom: UrbanGeom;
  /** Base dims [x, y, z] */
  baseScale: [number, number, number];
  material: 'primary' | 'secondary' | 'accent' | 'detail' | 'damage';
  /** Placement offset from parent anchor */
  offset: [number, number, number];
  /** Whether piece should repeat along an axis */
  repeat?: { axis: 'x' | 'z'; count: number; spacing: number };
  /** Whether piece is tall/vertical */
  tall?: boolean;
  /** Optional cap on top */
  cap?: {
    geom: UrbanGeom;
    material: 'primary' | 'secondary' | 'accent' | 'detail';
    offset: [number, number, number];
    scale: [number, number, number];
  };
}

export interface ArchFamily {
  id: string;
  name: string;
  /** Ordered pieces that make up this architectural unit */
  pieces: ArchPiece[];
  /** How many instances to place */
  instanceCount: number;
  /** Spread radius for placement */
  spreadRadius: number;
}

// ── Layout Templates ────────────────────────────────────────────

export type LayoutType =
  | 'bridge_layout'
  | 'rooftop_layout'
  | 'street_block_layout'
  | 'factory_floor_layout'
  | 'mall_layout'
  | 'industrial_platform_layout'
  | 'parking_garage_layout'
  | 'skybridge_layout';

export interface LayoutAnchor {
  id: string;
  label: string;
  /** World position */
  x: number;
  z: number;
  /** Elevation layer */
  elevation: number;
  /** Which family to place here */
  familyId: string;
  /** Scale multiplier */
  scale: number;
  /** Rotation (radians) */
  rotation: number;
}

export interface LayoutTemplate {
  type: LayoutType;
  name: string;
  /** Ordered anchors that form the layout skeleton */
  anchors: LayoutAnchor[];
  /** Vertical layers present */
  layers: Array<{ label: string; elevation: number }>;
  /** Keywords that trigger this layout */
  keywords: string[];
}

// ── Urban Scene Plan ────────────────────────────────────────────

export interface UrbanPlacedPiece {
  id: string;
  label: string;
  geom: UrbanGeom;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  color: string;
  roughness: number;
  metalness: number;
  emissive?: boolean;
  emissiveColor?: string;
  opacity: number;
  damageState: DamageState;
  cap?: {
    geom: UrbanGeom;
    color: string;
    offset: [number, number, number];
    scale: [number, number, number];
  };
  category: 'structure' | 'prop' | 'landmark' | 'hazard-visual' | 'terrain';
}

export interface UrbanScenePlan {
  layout: LayoutType;
  pieces: UrbanPlacedPiece[];
  palette: UrbanMaterialPalette;
  layers: Array<{ label: string; elevation: number }>;
  damageLevel: DamageState;
}
