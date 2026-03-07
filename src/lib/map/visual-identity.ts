/**
 * VisualIdentitySystem — Material Library & Assignment
 *
 * Ensures every structure, terrain feature, and hazard in the
 * TacticalBattleMap has a visually recognizable material with
 * proper color, roughness, metalness, and optional emissive glow.
 *
 * Provides:
 * - Biome-specific material libraries
 * - Structure-type → material mapping
 * - Color variation to prevent tiling
 * - Landmark/hazard highlighting rules
 * - Biome lighting profiles for the procedural lighting director
 */

import { seeded } from '@/engine/biomeComposer/utils';

// ── Material Definition ─────────────────────────────────────────

export interface VisualMaterial {
  color: string;
  roughness: number;
  metalness: number;
  opacity?: number;
  emissive?: boolean;
  emissiveColor?: string;
  emissiveIntensity?: number;
}

export interface BiomeMaterialSet {
  /** Ground / terrain base */
  ground: VisualMaterial;
  groundAccent: VisualMaterial;
  /** Primary structural material */
  structure: VisualMaterial;
  structureAccent: VisualMaterial;
  /** Foliage / organic cover */
  foliage: VisualMaterial;
  foliageAccent: VisualMaterial;
  /** Stone / rock / ruin */
  stone: VisualMaterial;
  /** Metal / manufactured */
  metal: VisualMaterial;
  /** Water / liquid */
  liquid: VisualMaterial;
  /** Hazard glow */
  hazard: VisualMaterial;
  /** Landmark highlight */
  landmark: VisualMaterial;
}

export interface LightingProfile {
  ambientColor: string;
  ambientIntensity: number;
  keyColor: string;
  keyIntensity: number;
  keyPosition: [number, number, number];
  fillColor: string;
  fillIntensity: number;
  rimColor: string;
  rimIntensity: number;
  /** Optional accent point lights */
  accents: Array<{
    color: string;
    intensity: number;
    position: [number, number, number];
    distance: number;
  }>;
  /** Fog / atmosphere tint */
  fogTint: string;
}

// ── Material Libraries ──────────────────────────────────────────

const BIOME_MATERIALS: Record<string, BiomeMaterialSet> = {
  forest: {
    ground:         { color: '#2d4a1e', roughness: 0.98, metalness: 0 },
    groundAccent:   { color: '#3a5525', roughness: 0.95, metalness: 0 },
    structure:      { color: '#5a3e2a', roughness: 0.92, metalness: 0 },
    structureAccent:{ color: '#4e342e', roughness: 0.9, metalness: 0 },
    foliage:        { color: '#2e7d32', roughness: 0.85, metalness: 0 },
    foliageAccent:  { color: '#388e3c', roughness: 0.88, metalness: 0 },
    stone:          { color: '#6a6a65', roughness: 0.95, metalness: 0.02 },
    metal:          { color: '#5a5a55', roughness: 0.7, metalness: 0.3 },
    liquid:         { color: '#1a4a3a', roughness: 0.15, metalness: 0.1, opacity: 0.7 },
    hazard:         { color: '#7aff3a', roughness: 0.5, metalness: 0, emissive: true, emissiveColor: '#3aff6a', emissiveIntensity: 0.8 },
    landmark:       { color: '#5a5550', roughness: 0.88, metalness: 0.05, emissive: true, emissiveColor: '#88aa66', emissiveIntensity: 0.3 },
  },
  jungle: {
    ground:         { color: '#1a3a12', roughness: 0.98, metalness: 0 },
    groundAccent:   { color: '#254a1a', roughness: 0.95, metalness: 0 },
    structure:      { color: '#4a3520', roughness: 0.92, metalness: 0 },
    structureAccent:{ color: '#3a2a18', roughness: 0.9, metalness: 0 },
    foliage:        { color: '#1b5e20', roughness: 0.82, metalness: 0 },
    foliageAccent:  { color: '#2e7d32', roughness: 0.85, metalness: 0 },
    stone:          { color: '#5a5a50', roughness: 0.95, metalness: 0.02 },
    metal:          { color: '#4a4a40', roughness: 0.75, metalness: 0.25 },
    liquid:         { color: '#0a3a2a', roughness: 0.1, metalness: 0.1, opacity: 0.6 },
    hazard:         { color: '#44ff88', roughness: 0.5, metalness: 0, emissive: true, emissiveColor: '#44ff88', emissiveIntensity: 0.9 },
    landmark:       { color: '#4a4a3a', roughness: 0.88, metalness: 0.05, emissive: true, emissiveColor: '#66aa44', emissiveIntensity: 0.35 },
  },
  swamp: {
    ground:         { color: '#1e2a10', roughness: 0.98, metalness: 0 },
    groundAccent:   { color: '#2a3518', roughness: 0.96, metalness: 0 },
    structure:      { color: '#3a3020', roughness: 0.95, metalness: 0 },
    structureAccent:{ color: '#302a18', roughness: 0.93, metalness: 0 },
    foliage:        { color: '#4a6a3a', roughness: 0.88, metalness: 0 },
    foliageAccent:  { color: '#3a5a2a', roughness: 0.9, metalness: 0 },
    stone:          { color: '#4a4a3a', roughness: 0.95, metalness: 0 },
    metal:          { color: '#3a3a30', roughness: 0.85, metalness: 0.15 },
    liquid:         { color: '#2a3a10', roughness: 0.2, metalness: 0, opacity: 0.5 },
    hazard:         { color: '#88cc44', roughness: 0.5, metalness: 0, emissive: true, emissiveColor: '#88cc44', emissiveIntensity: 0.7 },
    landmark:       { color: '#4a4530', roughness: 0.9, metalness: 0, emissive: true, emissiveColor: '#aacc55', emissiveIntensity: 0.25 },
  },
  holy_ruins: {
    ground:         { color: '#2a2a35', roughness: 0.95, metalness: 0.02 },
    groundAccent:   { color: '#353540', roughness: 0.93, metalness: 0.02 },
    structure:      { color: '#7a7a85', roughness: 0.8, metalness: 0.05 },
    structureAccent:{ color: '#6a6a75', roughness: 0.82, metalness: 0.05 },
    foliage:        { color: '#4a5a4a', roughness: 0.88, metalness: 0 },
    foliageAccent:  { color: '#5a6a5a', roughness: 0.85, metalness: 0 },
    stone:          { color: '#8a8a90', roughness: 0.75, metalness: 0.08 },
    metal:          { color: '#aaaabc', roughness: 0.3, metalness: 0.6 },
    liquid:         { color: '#3a3a5a', roughness: 0.15, metalness: 0.1, opacity: 0.7 },
    hazard:         { color: '#6666aa', roughness: 0.4, metalness: 0.1, emissive: true, emissiveColor: '#8888dd', emissiveIntensity: 0.9 },
    landmark:       { color: '#9a9aa5', roughness: 0.7, metalness: 0.1, emissive: true, emissiveColor: '#ccccff', emissiveIntensity: 0.4 },
  },
  industrial: {
    ground:         { color: '#2a2a2e', roughness: 0.92, metalness: 0.05 },
    groundAccent:   { color: '#353538', roughness: 0.9, metalness: 0.05 },
    structure:      { color: '#5a5a62', roughness: 0.6, metalness: 0.45 },
    structureAccent:{ color: '#4a4a52', roughness: 0.65, metalness: 0.4 },
    foliage:        { color: '#3a4a3a', roughness: 0.9, metalness: 0 },
    foliageAccent:  { color: '#4a5a4a', roughness: 0.88, metalness: 0 },
    stone:          { color: '#6a6a6e', roughness: 0.85, metalness: 0.1 },
    metal:          { color: '#7a7a82', roughness: 0.35, metalness: 0.7 },
    liquid:         { color: '#1a2a3a', roughness: 0.1, metalness: 0.15, opacity: 0.6 },
    hazard:         { color: '#ccaa22', roughness: 0.5, metalness: 0.2, emissive: true, emissiveColor: '#ffcc33', emissiveIntensity: 0.85 },
    landmark:       { color: '#6a6a72', roughness: 0.5, metalness: 0.5, emissive: true, emissiveColor: '#00ff44', emissiveIntensity: 0.35 },
  },
  dam: {
    ground:         { color: '#2a2e35', roughness: 0.9, metalness: 0.05 },
    groundAccent:   { color: '#353a40', roughness: 0.88, metalness: 0.05 },
    structure:      { color: '#4a4a55', roughness: 0.55, metalness: 0.5 },
    structureAccent:{ color: '#3a3a45', roughness: 0.6, metalness: 0.45 },
    foliage:        { color: '#3a5a4a', roughness: 0.9, metalness: 0 },
    foliageAccent:  { color: '#4a6a5a', roughness: 0.88, metalness: 0 },
    stone:          { color: '#6a6a72', roughness: 0.85, metalness: 0.1 },
    metal:          { color: '#8a8a95', roughness: 0.3, metalness: 0.65 },
    liquid:         { color: '#1a3a5a', roughness: 0.08, metalness: 0.1, opacity: 0.65 },
    hazard:         { color: '#00aaff', roughness: 0.3, metalness: 0.2, emissive: true, emissiveColor: '#00bbff', emissiveIntensity: 0.8 },
    landmark:       { color: '#5a5a65', roughness: 0.5, metalness: 0.5, emissive: true, emissiveColor: '#44aaff', emissiveIntensity: 0.4 },
  },
  city_rooftop: {
    ground:         { color: '#303035', roughness: 0.92, metalness: 0.05 },
    groundAccent:   { color: '#3a3a40', roughness: 0.9, metalness: 0.05 },
    structure:      { color: '#5a5a62', roughness: 0.7, metalness: 0.35 },
    structureAccent:{ color: '#4a4a52', roughness: 0.75, metalness: 0.3 },
    foliage:        { color: '#3a4a3a', roughness: 0.9, metalness: 0 },
    foliageAccent:  { color: '#4a5a4a', roughness: 0.88, metalness: 0 },
    stone:          { color: '#7a7a80', roughness: 0.88, metalness: 0.05 },
    metal:          { color: '#8a8a92', roughness: 0.3, metalness: 0.65 },
    liquid:         { color: '#1a2a4a', roughness: 0.1, metalness: 0.1, opacity: 0.5 },
    hazard:         { color: '#ff6644', roughness: 0.5, metalness: 0.1, emissive: true, emissiveColor: '#ff4422', emissiveIntensity: 0.9 },
    landmark:       { color: '#6a6a72', roughness: 0.6, metalness: 0.4, emissive: true, emissiveColor: '#ffaa44', emissiveIntensity: 0.4 },
  },
  urban_interior: {
    ground:         { color: '#2e2e32', roughness: 0.9, metalness: 0.02 },
    groundAccent:   { color: '#38383e', roughness: 0.88, metalness: 0.02 },
    structure:      { color: '#5a5a60', roughness: 0.8, metalness: 0.2 },
    structureAccent:{ color: '#4a4a50', roughness: 0.82, metalness: 0.18 },
    foliage:        { color: '#3a4a35', roughness: 0.9, metalness: 0 },
    foliageAccent:  { color: '#4a5a45', roughness: 0.88, metalness: 0 },
    stone:          { color: '#7a7a7e', roughness: 0.9, metalness: 0.05 },
    metal:          { color: '#6a6a72', roughness: 0.4, metalness: 0.55 },
    liquid:         { color: '#1a2530', roughness: 0.15, metalness: 0.1, opacity: 0.5 },
    hazard:         { color: '#ffcc44', roughness: 0.5, metalness: 0.1, emissive: true, emissiveColor: '#ffcc44', emissiveIntensity: 0.8 },
    landmark:       { color: '#6a6a6e', roughness: 0.7, metalness: 0.3, emissive: true, emissiveColor: '#ccaa66', emissiveIntensity: 0.35 },
  },
  bridge: {
    ground:         { color: '#35353d', roughness: 0.9, metalness: 0.08 },
    groundAccent:   { color: '#404048', roughness: 0.88, metalness: 0.08 },
    structure:      { color: '#5a5a65', roughness: 0.5, metalness: 0.55 },
    structureAccent:{ color: '#4a4a55', roughness: 0.55, metalness: 0.5 },
    foliage:        { color: '#3a5040', roughness: 0.9, metalness: 0 },
    foliageAccent:  { color: '#4a6050', roughness: 0.88, metalness: 0 },
    stone:          { color: '#6a6a72', roughness: 0.85, metalness: 0.08 },
    metal:          { color: '#9a9aa5', roughness: 0.25, metalness: 0.75 },
    liquid:         { color: '#1a3050', roughness: 0.08, metalness: 0.12, opacity: 0.6 },
    hazard:         { color: '#ffaa00', roughness: 0.4, metalness: 0.15, emissive: true, emissiveColor: '#ffaa00', emissiveIntensity: 0.85 },
    landmark:       { color: '#7a7a85', roughness: 0.45, metalness: 0.55, emissive: true, emissiveColor: '#aabbcc', emissiveIntensity: 0.35 },
  },
  cave: {
    ground:         { color: '#1e1a15', roughness: 0.98, metalness: 0 },
    groundAccent:   { color: '#2a2520', roughness: 0.96, metalness: 0 },
    structure:      { color: '#3a3530', roughness: 0.92, metalness: 0.02 },
    structureAccent:{ color: '#302a25', roughness: 0.94, metalness: 0.02 },
    foliage:        { color: '#2a3a2a', roughness: 0.9, metalness: 0 },
    foliageAccent:  { color: '#3a4a3a', roughness: 0.88, metalness: 0 },
    stone:          { color: '#5a5550', roughness: 0.9, metalness: 0.05 },
    metal:          { color: '#4a4a55', roughness: 0.5, metalness: 0.4 },
    liquid:         { color: '#0a1a2a', roughness: 0.1, metalness: 0.1, opacity: 0.55 },
    hazard:         { color: '#4488cc', roughness: 0.3, metalness: 0.1, emissive: true, emissiveColor: '#4488cc', emissiveIntensity: 1.0 },
    landmark:       { color: '#4a4a55', roughness: 0.8, metalness: 0.1, emissive: true, emissiveColor: '#6699cc', emissiveIntensity: 0.5 },
  },
  volcanic: {
    ground:         { color: '#1a1210', roughness: 0.95, metalness: 0.02 },
    groundAccent:   { color: '#251a12', roughness: 0.93, metalness: 0.02 },
    structure:      { color: '#1a1518', roughness: 0.88, metalness: 0.05 },
    structureAccent:{ color: '#2a1a15', roughness: 0.9, metalness: 0.05 },
    foliage:        { color: '#2a2a1a', roughness: 0.92, metalness: 0 },
    foliageAccent:  { color: '#3a3a2a', roughness: 0.9, metalness: 0 },
    stone:          { color: '#2a2025', roughness: 0.85, metalness: 0.08 },
    metal:          { color: '#3a3035', roughness: 0.6, metalness: 0.35 },
    liquid:         { color: '#ff4400', roughness: 0.3, metalness: 0.05, opacity: 0.8, emissive: true, emissiveColor: '#ff4400', emissiveIntensity: 1.2 },
    hazard:         { color: '#ff6600', roughness: 0.4, metalness: 0.05, emissive: true, emissiveColor: '#ff4400', emissiveIntensity: 1.0 },
    landmark:       { color: '#2a2028', roughness: 0.8, metalness: 0.1, emissive: true, emissiveColor: '#ff6633', emissiveIntensity: 0.5 },
  },
  underwater: {
    ground:         { color: '#0a1a2a', roughness: 0.85, metalness: 0.05 },
    groundAccent:   { color: '#0a2030', roughness: 0.83, metalness: 0.05 },
    structure:      { color: '#2a3a4a', roughness: 0.7, metalness: 0.15 },
    structureAccent:{ color: '#3a4a5a', roughness: 0.72, metalness: 0.12 },
    foliage:        { color: '#1a4a3a', roughness: 0.8, metalness: 0 },
    foliageAccent:  { color: '#2a5a4a', roughness: 0.78, metalness: 0 },
    stone:          { color: '#3a4a55', roughness: 0.85, metalness: 0.08 },
    metal:          { color: '#4a5a6a', roughness: 0.5, metalness: 0.4 },
    liquid:         { color: '#0a2a4a', roughness: 0.05, metalness: 0.1, opacity: 0.4 },
    hazard:         { color: '#22ccaa', roughness: 0.3, metalness: 0.1, emissive: true, emissiveColor: '#22ccaa', emissiveIntensity: 0.9 },
    landmark:       { color: '#3a4a5a', roughness: 0.6, metalness: 0.2, emissive: true, emissiveColor: '#44aacc', emissiveIntensity: 0.45 },
  },
  alien_biome: {
    ground:         { color: '#1a0a20', roughness: 0.9, metalness: 0.05 },
    groundAccent:   { color: '#2a1530', roughness: 0.88, metalness: 0.05 },
    structure:      { color: '#3a2a4a', roughness: 0.7, metalness: 0.2 },
    structureAccent:{ color: '#4a3a5a', roughness: 0.72, metalness: 0.18 },
    foliage:        { color: '#4a2a5a', roughness: 0.82, metalness: 0 },
    foliageAccent:  { color: '#5a3a6a', roughness: 0.8, metalness: 0 },
    stone:          { color: '#3a3a5a', roughness: 0.85, metalness: 0.1 },
    metal:          { color: '#6a4a8a', roughness: 0.4, metalness: 0.5 },
    liquid:         { color: '#2a1a4a', roughness: 0.1, metalness: 0.1, opacity: 0.6, emissive: true, emissiveColor: '#6644aa', emissiveIntensity: 0.5 },
    hazard:         { color: '#aa44ff', roughness: 0.3, metalness: 0.1, emissive: true, emissiveColor: '#aa44ff', emissiveIntensity: 1.0 },
    landmark:       { color: '#4a3a5a', roughness: 0.6, metalness: 0.2, emissive: true, emissiveColor: '#cc66ff', emissiveIntensity: 0.5 },
  },
  snowfield: {
    ground:         { color: '#4a5a6a', roughness: 0.85, metalness: 0.02 },
    groundAccent:   { color: '#5a6a7a', roughness: 0.83, metalness: 0.02 },
    structure:      { color: '#6a7a8a', roughness: 0.75, metalness: 0.1 },
    structureAccent:{ color: '#5a6a7a', roughness: 0.78, metalness: 0.08 },
    foliage:        { color: '#4a6a5a', roughness: 0.88, metalness: 0 },
    foliageAccent:  { color: '#5a7a6a', roughness: 0.86, metalness: 0 },
    stone:          { color: '#7a8a95', roughness: 0.82, metalness: 0.05 },
    metal:          { color: '#8a9aa8', roughness: 0.3, metalness: 0.6 },
    liquid:         { color: '#3a5a7a', roughness: 0.08, metalness: 0.1, opacity: 0.7 },
    hazard:         { color: '#88ccee', roughness: 0.3, metalness: 0.1, emissive: true, emissiveColor: '#88ccee', emissiveIntensity: 0.8 },
    landmark:       { color: '#7a8a9a', roughness: 0.7, metalness: 0.1, emissive: true, emissiveColor: '#aaccee', emissiveIntensity: 0.35 },
  },
  airship: {
    ground:         { color: '#2a2a32', roughness: 0.85, metalness: 0.1 },
    groundAccent:   { color: '#35353d', roughness: 0.83, metalness: 0.1 },
    structure:      { color: '#4a4a55', roughness: 0.6, metalness: 0.45 },
    structureAccent:{ color: '#3a3a45', roughness: 0.65, metalness: 0.4 },
    foliage:        { color: '#3a4a3a', roughness: 0.9, metalness: 0 },
    foliageAccent:  { color: '#4a5a4a', roughness: 0.88, metalness: 0 },
    stone:          { color: '#5a5a60', roughness: 0.85, metalness: 0.08 },
    metal:          { color: '#8a8a95', roughness: 0.25, metalness: 0.7 },
    liquid:         { color: '#1a3050', roughness: 0.1, metalness: 0.1, opacity: 0.5 },
    hazard:         { color: '#ffaa44', roughness: 0.4, metalness: 0.1, emissive: true, emissiveColor: '#ffaa44', emissiveIntensity: 0.85 },
    landmark:       { color: '#5a5a65', roughness: 0.5, metalness: 0.5, emissive: true, emissiveColor: '#ccaa55', emissiveIntensity: 0.4 },
  },
  reactor_facility: {
    ground:         { color: '#1a1a22', roughness: 0.9, metalness: 0.08 },
    groundAccent:   { color: '#22222a', roughness: 0.88, metalness: 0.08 },
    structure:      { color: '#4a4a55', roughness: 0.55, metalness: 0.55 },
    structureAccent:{ color: '#3a3a45', roughness: 0.6, metalness: 0.5 },
    foliage:        { color: '#2a3a2a', roughness: 0.9, metalness: 0 },
    foliageAccent:  { color: '#3a4a3a', roughness: 0.88, metalness: 0 },
    stone:          { color: '#5a5a62', roughness: 0.82, metalness: 0.12 },
    metal:          { color: '#7a7a88', roughness: 0.3, metalness: 0.7 },
    liquid:         { color: '#0a2a4a', roughness: 0.08, metalness: 0.12, opacity: 0.6, emissive: true, emissiveColor: '#00aaff', emissiveIntensity: 0.4 },
    hazard:         { color: '#00aaff', roughness: 0.3, metalness: 0.15, emissive: true, emissiveColor: '#00bbff', emissiveIntensity: 1.0 },
    landmark:       { color: '#5a5a65', roughness: 0.5, metalness: 0.5, emissive: true, emissiveColor: '#00ccff', emissiveIntensity: 0.5 },
  },
  canyon: {
    ground:         { color: '#3a2a18', roughness: 0.96, metalness: 0 },
    groundAccent:   { color: '#4a351e', roughness: 0.94, metalness: 0 },
    structure:      { color: '#5a4530', roughness: 0.9, metalness: 0.02 },
    structureAccent:{ color: '#6a5540', roughness: 0.88, metalness: 0.02 },
    foliage:        { color: '#4a5a3a', roughness: 0.9, metalness: 0 },
    foliageAccent:  { color: '#5a6a4a', roughness: 0.88, metalness: 0 },
    stone:          { color: '#7a6a55', roughness: 0.88, metalness: 0.03 },
    metal:          { color: '#5a5a55', roughness: 0.6, metalness: 0.3 },
    liquid:         { color: '#2a3a4a', roughness: 0.1, metalness: 0.08, opacity: 0.6 },
    hazard:         { color: '#ffaa44', roughness: 0.4, metalness: 0.05, emissive: true, emissiveColor: '#ffaa44', emissiveIntensity: 0.8 },
    landmark:       { color: '#6a5a45', roughness: 0.85, metalness: 0.05, emissive: true, emissiveColor: '#cc9944', emissiveIntensity: 0.3 },
  },
  mountain: {
    ground:         { color: '#3a3a42', roughness: 0.95, metalness: 0.02 },
    groundAccent:   { color: '#4a4a50', roughness: 0.93, metalness: 0.02 },
    structure:      { color: '#5a5a65', roughness: 0.85, metalness: 0.08 },
    structureAccent:{ color: '#6a6a72', roughness: 0.83, metalness: 0.08 },
    foliage:        { color: '#3a5a3a', roughness: 0.9, metalness: 0 },
    foliageAccent:  { color: '#4a6a4a', roughness: 0.88, metalness: 0 },
    stone:          { color: '#6a6a72', roughness: 0.88, metalness: 0.05 },
    metal:          { color: '#5a5a65', roughness: 0.5, metalness: 0.4 },
    liquid:         { color: '#2a3a5a', roughness: 0.1, metalness: 0.1, opacity: 0.65 },
    hazard:         { color: '#aaccff', roughness: 0.3, metalness: 0.1, emissive: true, emissiveColor: '#aaccff', emissiveIntensity: 0.7 },
    landmark:       { color: '#7a7a85', roughness: 0.8, metalness: 0.1, emissive: true, emissiveColor: '#99bbdd', emissiveIntensity: 0.35 },
  },
  desert: {
    ground:         { color: '#4a3a20', roughness: 0.96, metalness: 0 },
    groundAccent:   { color: '#5a4a2a', roughness: 0.94, metalness: 0 },
    structure:      { color: '#6a5a40', roughness: 0.9, metalness: 0.02 },
    structureAccent:{ color: '#7a6a50', roughness: 0.88, metalness: 0.02 },
    foliage:        { color: '#5a6a3a', roughness: 0.9, metalness: 0 },
    foliageAccent:  { color: '#6a7a4a', roughness: 0.88, metalness: 0 },
    stone:          { color: '#8a7a60', roughness: 0.88, metalness: 0.02 },
    metal:          { color: '#6a6a5a', roughness: 0.6, metalness: 0.3 },
    liquid:         { color: '#3a4a5a', roughness: 0.1, metalness: 0.08, opacity: 0.5 },
    hazard:         { color: '#ffcc44', roughness: 0.4, metalness: 0.05, emissive: true, emissiveColor: '#ffcc44', emissiveIntensity: 0.8 },
    landmark:       { color: '#7a6a50', roughness: 0.85, metalness: 0.03, emissive: true, emissiveColor: '#ddaa55', emissiveIntensity: 0.3 },
  },
  ruins: {
    ground:         { color: '#2a2520', roughness: 0.96, metalness: 0 },
    groundAccent:   { color: '#353028', roughness: 0.94, metalness: 0 },
    structure:      { color: '#5a5550', roughness: 0.88, metalness: 0.05 },
    structureAccent:{ color: '#4a4540', roughness: 0.9, metalness: 0.05 },
    foliage:        { color: '#3a5040', roughness: 0.9, metalness: 0 },
    foliageAccent:  { color: '#4a6050', roughness: 0.88, metalness: 0 },
    stone:          { color: '#6a6560', roughness: 0.9, metalness: 0.03 },
    metal:          { color: '#5a5a55', roughness: 0.6, metalness: 0.3 },
    liquid:         { color: '#1a2a2a', roughness: 0.12, metalness: 0.08, opacity: 0.6 },
    hazard:         { color: '#aaccff', roughness: 0.4, metalness: 0.05, emissive: true, emissiveColor: '#aaccff', emissiveIntensity: 0.7 },
    landmark:       { color: '#6a6560', roughness: 0.82, metalness: 0.08, emissive: true, emissiveColor: '#bbaa88', emissiveIntensity: 0.3 },
  },
};

// ── Material Assignment ─────────────────────────────────────────

/** Keywords that map structure labels/families to material slots */
const MATERIAL_KEYWORDS: Array<{ slot: keyof BiomeMaterialSet; keywords: string[] }> = [
  { slot: 'metal', keywords: ['pipe', 'beam', 'steel', 'metal', 'railing', 'cable', 'grating', 'catwalk', 'support', 'suspension', 'iron', 'bolt', 'crane', 'turbine', 'machinery'] },
  { slot: 'stone', keywords: ['stone', 'rock', 'pillar', 'altar', 'ruins', 'rubble', 'concrete', 'wall', 'column', 'tomb', 'slab', 'boulder', 'cliff'] },
  { slot: 'foliage', keywords: ['tree', 'leaf', 'vine', 'moss', 'canopy', 'bush', 'fern', 'branch', 'root', 'flower', 'grass', 'fungal', 'fungus', 'spore', 'coral', 'kelp'] },
  { slot: 'liquid', keywords: ['water', 'pool', 'lake', 'river', 'flood', 'liquid', 'toxic_pool', 'lava'] },
  { slot: 'hazard', keywords: ['hazard', 'fire', 'flame', 'electric', 'arc', 'corruption', 'toxic', 'acid', 'ember', 'smoke'] },
  { slot: 'ground', keywords: ['ground', 'floor', 'mud', 'dirt', 'sand', 'soil', 'terrain', 'earth', 'gravel'] },
  { slot: 'landmark', keywords: ['landmark'] },
];

/**
 * Get the appropriate material for a structure based on its label,
 * category, and the active biome.
 */
export function assignMaterial(
  biome: string,
  label: string,
  category: string,
  structureSeed: number,
): VisualMaterial {
  const materials = BIOME_MATERIALS[biome] ?? BIOME_MATERIALS.ruins;
  const lowerLabel = label.toLowerCase();

  // Category-based overrides
  if (category === 'hazard-visual') return materials.hazard;
  if (category === 'landmark') return applyVariation(materials.landmark, structureSeed);
  if (category === 'terrain') return applyVariation(materials.ground, structureSeed);

  // Keyword-based matching
  for (const { slot, keywords } of MATERIAL_KEYWORDS) {
    if (keywords.some(kw => lowerLabel.includes(kw))) {
      return applyVariation(materials[slot], structureSeed);
    }
  }

  // Default: use structure or structureAccent based on seed
  return applyVariation(
    seeded(structureSeed) > 0.5 ? materials.structure : materials.structureAccent,
    structureSeed
  );
}

/**
 * Get the full material set for a biome.
 */
export function getBiomeMaterialSet(biome: string): BiomeMaterialSet {
  return BIOME_MATERIALS[biome] ?? BIOME_MATERIALS.ruins;
}

// ── Color Variation ─────────────────────────────────────────────

/**
 * Apply subtle random variation to a material's color to prevent
 * identical-looking surfaces. Shifts hue/brightness ±5%.
 */
function applyVariation(mat: VisualMaterial, seed: number): VisualMaterial {
  const r = seeded(seed + 100);
  const g = seeded(seed + 200);

  // Parse hex color and apply small variation
  const base = parseHex(mat.color);
  const varied = {
    r: clamp(base.r + Math.floor((r - 0.5) * 20), 0, 255),
    g: clamp(base.g + Math.floor((g - 0.5) * 20), 0, 255),
    b: clamp(base.b + Math.floor((seeded(seed + 300) - 0.5) * 20), 0, 255),
  };

  return {
    ...mat,
    color: toHex(varied.r, varied.g, varied.b),
    // Slight roughness variation for surface wear
    roughness: clamp(mat.roughness + (r - 0.5) * 0.08, 0, 1),
  };
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ── Lighting Profiles ───────────────────────────────────────────

const LIGHTING_PROFILES: Record<string, LightingProfile> = {
  forest: {
    ambientColor: '#1a2a1a', ambientIntensity: 1.2,
    keyColor: '#aacc88', keyIntensity: 1.4, keyPosition: [4, 12, 3],
    fillColor: '#4a6a4a', fillIntensity: 0.5,
    rimColor: '#88aa66', rimIntensity: 0.3,
    accents: [
      { color: '#88ff66', intensity: 0.4, position: [3, 1, 2], distance: 8 },
    ],
    fogTint: '#2a4a2a',
  },
  jungle: {
    ambientColor: '#0a1a0a', ambientIntensity: 1.0,
    keyColor: '#88aa55', keyIntensity: 1.2, keyPosition: [3, 14, 2],
    fillColor: '#3a5a3a', fillIntensity: 0.4,
    rimColor: '#66aa44', rimIntensity: 0.25,
    accents: [
      { color: '#44ff88', intensity: 0.5, position: [-3, 0.5, -2], distance: 6 },
    ],
    fogTint: '#1a3a1a',
  },
  swamp: {
    ambientColor: '#1a2a15', ambientIntensity: 1.0,
    keyColor: '#889966', keyIntensity: 1.1, keyPosition: [4, 10, 3],
    fillColor: '#3a4a2a', fillIntensity: 0.4,
    rimColor: '#667744', rimIntensity: 0.2,
    accents: [
      { color: '#88cc44', intensity: 0.5, position: [0, 0.3, 0], distance: 10 },
    ],
    fogTint: '#2a3a1a',
  },
  holy_ruins: {
    ambientColor: '#1a1a2e', ambientIntensity: 1.3,
    keyColor: '#ccccee', keyIntensity: 1.5, keyPosition: [2, 15, 1],
    fillColor: '#6a6a8a', fillIntensity: 0.6,
    rimColor: '#8888cc', rimIntensity: 0.4,
    accents: [
      { color: '#8888dd', intensity: 0.6, position: [0, 2, 0], distance: 12 },
      { color: '#ccccff', intensity: 0.3, position: [-4, 1, 3], distance: 8 },
    ],
    fogTint: '#2a2a3a',
  },
  industrial: {
    ambientColor: '#1a1a20', ambientIntensity: 1.1,
    keyColor: '#ccbb99', keyIntensity: 1.3, keyPosition: [5, 10, 4],
    fillColor: '#5a5a55', fillIntensity: 0.5,
    rimColor: '#889988', rimIntensity: 0.3,
    accents: [
      { color: '#ffcc33', intensity: 0.5, position: [3, 1.5, -2], distance: 8 },
      { color: '#00ff44', intensity: 0.3, position: [-3, 0.5, 2], distance: 6 },
    ],
    fogTint: '#2a2a30',
  },
  dam: {
    ambientColor: '#1a2030', ambientIntensity: 1.2,
    keyColor: '#aabbcc', keyIntensity: 1.4, keyPosition: [4, 12, 3],
    fillColor: '#5a6a7a', fillIntensity: 0.5,
    rimColor: '#7788aa', rimIntensity: 0.35,
    accents: [
      { color: '#44aaff', intensity: 0.6, position: [0, 0.5, -3], distance: 10 },
    ],
    fogTint: '#2a3040',
  },
  city_rooftop: {
    ambientColor: '#15152a', ambientIntensity: 1.0,
    keyColor: '#8899bb', keyIntensity: 1.0, keyPosition: [5, 8, 5],
    fillColor: '#3a3a55', fillIntensity: 0.4,
    rimColor: '#6677aa', rimIntensity: 0.3,
    accents: [
      { color: '#ffaa44', intensity: 0.6, position: [4, 1, -3], distance: 8 },
      { color: '#ff4422', intensity: 0.4, position: [-3, 0.8, 4], distance: 6 },
    ],
    fogTint: '#2a2a35',
  },
  cave: {
    ambientColor: '#0a0a0a', ambientIntensity: 0.8,
    keyColor: '#887755', keyIntensity: 0.8, keyPosition: [2, 6, 2],
    fillColor: '#3a3530', fillIntensity: 0.3,
    rimColor: '#554433', rimIntensity: 0.2,
    accents: [
      { color: '#4488cc', intensity: 0.7, position: [-2, 1, -2], distance: 8 },
      { color: '#887744', intensity: 0.5, position: [3, 0.5, 1], distance: 6 },
    ],
    fogTint: '#1a1815',
  },
  volcanic: {
    ambientColor: '#1a0a05', ambientIntensity: 0.9,
    keyColor: '#ff8844', keyIntensity: 1.2, keyPosition: [3, 8, 2],
    fillColor: '#4a2010', fillIntensity: 0.5,
    rimColor: '#cc4422', rimIntensity: 0.4,
    accents: [
      { color: '#ff4400', intensity: 1.0, position: [0, 0.3, 0], distance: 15 },
      { color: '#ff6600', intensity: 0.6, position: [-4, 0.5, -3], distance: 8 },
    ],
    fogTint: '#3a2015',
  },
  underwater: {
    ambientColor: '#0a1530', ambientIntensity: 1.1,
    keyColor: '#44aacc', keyIntensity: 1.0, keyPosition: [0, 15, 0],
    fillColor: '#2a4a6a', fillIntensity: 0.5,
    rimColor: '#3388aa', rimIntensity: 0.3,
    accents: [
      { color: '#22ccaa', intensity: 0.6, position: [3, 2, -2], distance: 10 },
    ],
    fogTint: '#0a2a4a',
  },
  alien_biome: {
    ambientColor: '#0a0520', ambientIntensity: 1.0,
    keyColor: '#8855cc', keyIntensity: 1.2, keyPosition: [3, 10, 3],
    fillColor: '#3a2a5a', fillIntensity: 0.5,
    rimColor: '#6644aa', rimIntensity: 0.35,
    accents: [
      { color: '#aa44ff', intensity: 0.8, position: [0, 1, 0], distance: 12 },
      { color: '#ff44aa', intensity: 0.4, position: [-3, 0.5, 3], distance: 6 },
    ],
    fogTint: '#2a1a3a',
  },
  snowfield: {
    ambientColor: '#3a4a5a', ambientIntensity: 1.6,
    keyColor: '#ddeeff', keyIntensity: 1.5, keyPosition: [5, 12, 3],
    fillColor: '#8a9aaa', fillIntensity: 0.7,
    rimColor: '#aabbcc', rimIntensity: 0.4,
    accents: [],
    fogTint: '#4a5a6a',
  },
  airship: {
    ambientColor: '#1a2535', ambientIntensity: 1.3,
    keyColor: '#ccddee', keyIntensity: 1.4, keyPosition: [5, 10, 4],
    fillColor: '#6a7a8a', fillIntensity: 0.5,
    rimColor: '#8899aa', rimIntensity: 0.35,
    accents: [
      { color: '#ffaa44', intensity: 0.5, position: [0, 0.5, 0], distance: 8 },
    ],
    fogTint: '#3a4050',
  },
};

// Default profile for biomes not in the map
const DEFAULT_LIGHTING: LightingProfile = {
  ambientColor: '#1a1a2e', ambientIntensity: 1.4,
  keyColor: '#ccd4ee', keyIntensity: 1.2, keyPosition: [5, 10, 3],
  fillColor: '#8899bb', fillIntensity: 0.6,
  rimColor: '#99aacc', rimIntensity: 0.35,
  accents: [],
  fogTint: '#2a2a35',
};

/**
 * Get the lighting profile for a given biome.
 */
export function getLightingProfile(biome: string): LightingProfile {
  return LIGHTING_PROFILES[biome] ?? DEFAULT_LIGHTING;
}

/**
 * Detect biome from location name + terrain tags (lightweight version
 * for components that don't run the full BiomeComposer).
 */
export function detectBiomeForVisuals(locationName?: string | null, terrainTags?: string[]): string {
  const text = ((locationName ?? '') + ' ' + (terrainTags ?? []).join(' ')).toLowerCase();

  const checks: Array<[string, string[]]> = [
    ['volcanic', ['volcanic', 'lava', 'magma', 'caldera', 'volcano']],
    ['underwater', ['underwater', 'ocean', 'deep sea', 'aquatic', 'coral', 'submerged']],
    ['snowfield', ['snow', 'ice', 'frost', 'frozen', 'arctic', 'tundra', 'glacier']],
    ['cave', ['cave', 'cavern', 'canyon', 'tunnel', 'mine', 'underground', 'sewer']],
    ['swamp', ['swamp', 'bog', 'marsh', 'wetland', 'bayou']],
    ['jungle', ['jungle', 'tropical', 'rainforest']],
    ['dam', ['dam', 'turbine', 'floodgate', 'reservoir']],
    ['reactor_facility', ['reactor', 'nuclear', 'meltdown', 'containment']],
    ['airship', ['airship', 'zeppelin', 'frigate', 'aircraft', 'vessel']],
    ['bridge', ['bridge', 'skybridge', 'skywalk', 'overpass', 'viaduct']],
    ['city_rooftop', ['rooftop', 'roof']],
    ['urban_interior', ['interior', 'mall', 'store', 'shop', 'office']],
    ['industrial', ['factory', 'warehouse', 'industrial', 'plant', 'refinery', 'foundry']],
    ['holy_ruins', ['holy', 'sacred', 'temple', 'cathedral', 'shrine', 'blessed']],
    ['alien_biome', ['alien', 'void', 'cosmic', 'otherworldly', 'extraterrestrial']],
    ['desert', ['desert', 'dune', 'arid', 'wasteland']],
    ['canyon', ['canyon', 'gorge', 'ravine', 'mesa']],
    ['mountain', ['mountain', 'peak', 'summit', 'alpine', 'cliff']],
    ['ruins', ['ruins', 'ancient', 'crumbl', 'collapsed', 'derelict', 'abandoned']],
    ['forest', ['forest', 'woods', 'grove', 'treeline', 'canopy', 'wilderness']],
  ];

  for (const [biome, keywords] of checks) {
    if (keywords.some(kw => text.includes(kw))) return biome;
  }

  return 'ruins'; // safe fallback
}
