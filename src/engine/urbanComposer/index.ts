/**
 * UrbanStructureComposer — Public API
 */

export { composeUrbanScene, isUrbanScene } from './urbanComposer';
export type { UrbanComposerInput } from './urbanComposer';
export type { UrbanScenePlan, UrbanPlacedPiece, UrbanMaterialPalette, DamageState, LayoutType } from './types';
export { getUrbanPalette } from './materialPalettes';
export { detectLayout } from './layoutTemplates';
export { detectDamageState } from './damageStates';
export { URBAN_FAMILIES } from './architectureFamilies';
