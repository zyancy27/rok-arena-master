/**
 * Structure Families — Step 5
 * 
 * Creates coherent structure families instead of random prop placement.
 * Each family has primary, secondary, accent, and scatter members
 * that are placed together in clusters.
 */

import type { BiomeBase, BiomeModifier, StructureFamily, StructureFamilyMember, DensityProfile, BiomePalette } from './types';
import { seeded } from './utils';

interface FamilyTemplate {
  id: string;
  name: string;
  members: StructureFamilyMember[];
  baseClusterCount: number;
  baseItemsPerCluster: number;
  spreadRadius: number;
}

const FAMILY_TEMPLATES: Record<string, FamilyTemplate[]> = {
  forest: [
    {
      id: 'twisted_trees', name: 'Twisted Trees', baseClusterCount: 3, baseItemsPerCluster: 4, spreadRadius: 2,
      members: [
        { role: 'primary', geom: 'cylinder', color: '#4e342e', baseScale: [0.15, 1.6, 0.15], tall: true, cap: { geom: 'sphere', color: '#2e7d32', offset: [0, 1.1, 0], scale: [0.7, 0.9, 0.7] } },
        { role: 'secondary', geom: 'cylinder', color: '#3a2a1e', baseScale: [0.1, 1.0, 0.1], tall: true },
        { role: 'accent', geom: 'torus', color: '#4e342e', baseScale: [0.4, 0.1, 0.4] },
        { role: 'scatter', geom: 'sphere', color: '#2e7d32', baseScale: [0.25, 0.18, 0.25] },
      ],
    },
    {
      id: 'fallen_logs', name: 'Fallen Logs', baseClusterCount: 2, baseItemsPerCluster: 3, spreadRadius: 2.5,
      members: [
        { role: 'primary', geom: 'cylinder', color: '#3e2a15', baseScale: [0.12, 1.4, 0.12] },
        { role: 'secondary', geom: 'sphere', color: '#3e8f55', baseScale: [0.2, 0.12, 0.2] },
        { role: 'scatter', geom: 'cone', color: '#388e3c', baseScale: [0.12, 0.08, 0.12] },
      ],
    },
  ],
  holy_ruins: [
    {
      id: 'pillar_fragments', name: 'Pillar Fragments', baseClusterCount: 2, baseItemsPerCluster: 4, spreadRadius: 1.8,
      members: [
        { role: 'primary', geom: 'cylinder', color: '#6a6a75', baseScale: [0.18, 1.4, 0.18], tall: true },
        { role: 'secondary', geom: 'box', color: '#5a5a65', baseScale: [0.6, 0.15, 0.12] },
        { role: 'accent', geom: 'sphere', color: '#8888cc', baseScale: [0.1, 0.1, 0.1], emissive: true, emissiveColor: '#6666aa' },
        { role: 'scatter', geom: 'box', color: '#5a5560', baseScale: [0.15, 0.08, 0.12] },
      ],
    },
    {
      id: 'broken_altar_stones', name: 'Broken Altar Stones', baseClusterCount: 1, baseItemsPerCluster: 3, spreadRadius: 1.5,
      members: [
        { role: 'primary', geom: 'box', color: '#6a6a75', baseScale: [0.5, 0.3, 0.4] },
        { role: 'secondary', geom: 'cylinder', color: '#ccc8a0', baseScale: [0.03, 0.12, 0.03], emissive: true, emissiveColor: '#ffcc44' },
        { role: 'scatter', geom: 'box', color: '#5a5a65', baseScale: [0.1, 0.12, 0.06] },
      ],
    },
  ],
  industrial: [
    {
      id: 'pipe_bundles', name: 'Pipe Bundles', baseClusterCount: 3, baseItemsPerCluster: 5, spreadRadius: 1.5,
      members: [
        { role: 'primary', geom: 'cylinder', color: '#4a4a55', baseScale: [0.08, 1.8, 0.08], tall: true },
        { role: 'secondary', geom: 'cylinder', color: '#3a3a45', baseScale: [0.06, 1.2, 0.06], tall: true },
        { role: 'accent', geom: 'box', color: '#2a2a35', baseScale: [0.3, 0.5, 0.12], emissive: true, emissiveColor: '#00ff44' },
        { role: 'scatter', geom: 'cylinder', color: '#4a3a2a', baseScale: [0.1, 0.2, 0.1] },
      ],
    },
    {
      id: 'catwalk_sections', name: 'Catwalk Sections', baseClusterCount: 2, baseItemsPerCluster: 4, spreadRadius: 2.5,
      members: [
        { role: 'primary', geom: 'box', color: '#3a3a45', baseScale: [1.2, 0.04, 0.25] },
        { role: 'secondary', geom: 'box', color: '#4a4a50', baseScale: [0.04, 0.4, 0.04], tall: true },
        { role: 'accent', geom: 'box', color: '#3d3825', baseScale: [0.3, 0.25, 0.3] },
      ],
    },
  ],
  dam: [
    {
      id: 'turbine_machinery', name: 'Turbine Machinery', baseClusterCount: 2, baseItemsPerCluster: 4, spreadRadius: 2,
      members: [
        { role: 'primary', geom: 'cylinder', color: '#3a3a45', baseScale: [0.4, 1.0, 0.4], emissive: true, emissiveColor: '#00aaff' },
        { role: 'secondary', geom: 'cylinder', color: '#4a4a55', baseScale: [0.08, 1.5, 0.08], tall: true },
        { role: 'accent', geom: 'box', color: '#3a3a42', baseScale: [0.3, 0.4, 0.12] },
        { role: 'scatter', geom: 'box', color: '#3a3a3a', baseScale: [0.12, 0.06, 0.1] },
      ],
    },
  ],
  cave: [
    {
      id: 'stalagmite_fields', name: 'Stalagmite Fields', baseClusterCount: 3, baseItemsPerCluster: 5, spreadRadius: 2,
      members: [
        { role: 'primary', geom: 'cone', color: '#3a3530', baseScale: [0.2, 1.0, 0.2], tall: true },
        { role: 'secondary', geom: 'cone', color: '#3a3530', baseScale: [0.12, 0.6, 0.12], tall: true },
        { role: 'accent', geom: 'cone', color: '#4a5a6a', baseScale: [0.06, 0.2, 0.06], emissive: true, emissiveColor: '#4488cc' },
        { role: 'scatter', geom: 'sphere', color: '#3a3530', baseScale: [0.08, 0.06, 0.08] },
      ],
    },
  ],
  volcanic: [
    {
      id: 'lava_vents', name: 'Lava Vents', baseClusterCount: 2, baseItemsPerCluster: 4, spreadRadius: 1.8,
      members: [
        { role: 'primary', geom: 'cylinder', color: '#2a1a12', baseScale: [0.25, 0.3, 0.25], emissive: true, emissiveColor: '#ff4400' },
        { role: 'secondary', geom: 'cone', color: '#1a1518', baseScale: [0.15, 0.8, 0.15], tall: true },
        { role: 'accent', geom: 'sphere', color: '#ff4400', baseScale: [0.04, 0.04, 0.04], emissive: true, emissiveColor: '#ff4400' },
        { role: 'scatter', geom: 'box', color: '#2a2520', baseScale: [0.15, 0.04, 0.15] },
      ],
    },
    {
      id: 'obsidian_formations', name: 'Obsidian Formations', baseClusterCount: 2, baseItemsPerCluster: 3, spreadRadius: 1.5,
      members: [
        { role: 'primary', geom: 'cone', color: '#1a1518', baseScale: [0.18, 1.2, 0.18], tall: true },
        { role: 'secondary', geom: 'sphere', color: '#2a1a15', baseScale: [0.4, 0.3, 0.35] },
        { role: 'scatter', geom: 'box', color: '#1a1210', baseScale: [0.2, 0.06, 0.15] },
      ],
    },
  ],
  underwater: [
    {
      id: 'coral_gardens', name: 'Coral Gardens', baseClusterCount: 3, baseItemsPerCluster: 4, spreadRadius: 2,
      members: [
        { role: 'primary', geom: 'sphere', color: '#5a3040', baseScale: [0.3, 0.45, 0.3] },
        { role: 'secondary', geom: 'cylinder', color: '#1a4a2a', baseScale: [0.04, 1.2, 0.04], tall: true },
        { role: 'accent', geom: 'sphere', color: '#4488cc', baseScale: [0.05, 0.05, 0.05], emissive: true, emissiveColor: '#4488cc' },
        { role: 'scatter', geom: 'sphere', color: '#6a6a5a', baseScale: [0.06, 0.04, 0.08] },
      ],
    },
  ],
  airship: [
    {
      id: 'deck_fixtures', name: 'Deck Fixtures', baseClusterCount: 2, baseItemsPerCluster: 4, spreadRadius: 2,
      members: [
        { role: 'primary', geom: 'box', color: '#3a3a42', baseScale: [1.0, 0.05, 0.5] },
        { role: 'secondary', geom: 'box', color: '#5a5a65', baseScale: [0.8, 0.3, 0.03] },
        { role: 'accent', geom: 'sphere', color: '#ffaa44', baseScale: [0.05, 0.05, 0.05], emissive: true, emissiveColor: '#ffaa44' },
        { role: 'scatter', geom: 'torus', color: '#4a3a2a', baseScale: [0.1, 0.03, 0.1] },
      ],
    },
  ],
  city_rooftop: [
    {
      id: 'rooftop_equipment', name: 'Rooftop Equipment', baseClusterCount: 2, baseItemsPerCluster: 4, spreadRadius: 2,
      members: [
        { role: 'primary', geom: 'box', color: '#4a4a50', baseScale: [0.3, 0.25, 0.3] },
        { role: 'secondary', geom: 'box', color: '#3a3a42', baseScale: [0.8, 0.5, 0.05], tall: true },
        { role: 'accent', geom: 'cylinder', color: '#6a6a70', baseScale: [0.03, 1.5, 0.03], tall: true },
        { role: 'scatter', geom: 'box', color: '#3a3535', baseScale: [0.08, 0.04, 0.08] },
      ],
    },
  ],
  urban_interior: [
    {
      id: 'debris_piles', name: 'Debris Piles', baseClusterCount: 3, baseItemsPerCluster: 4, spreadRadius: 2,
      members: [
        { role: 'primary', geom: 'box', color: '#3a3a42', baseScale: [0.6, 0.3, 0.4] },
        { role: 'secondary', geom: 'box', color: '#4a4a50', baseScale: [0.2, 0.15, 0.2] },
        { role: 'scatter', geom: 'box', color: '#3a3535', baseScale: [0.1, 0.06, 0.1] },
      ],
    },
  ],
  bridge: [
    {
      id: 'suspension_cables', name: 'Suspension Cables', baseClusterCount: 2, baseItemsPerCluster: 4, spreadRadius: 2.5,
      members: [
        { role: 'primary', geom: 'cylinder', color: '#5a5a65', baseScale: [0.03, 2.5, 0.03], tall: true },
        { role: 'secondary', geom: 'box', color: '#4a4a50', baseScale: [1.0, 0.25, 0.03] },
        { role: 'scatter', geom: 'box', color: '#4a4040', baseScale: [0.3, 0.15, 0.2] },
      ],
    },
  ],
  // Fallback families for biomes not explicitly defined
  ruins: [
    {
      id: 'rubble_clusters', name: 'Rubble Clusters', baseClusterCount: 3, baseItemsPerCluster: 4, spreadRadius: 2,
      members: [
        { role: 'primary', geom: 'box', color: '#4a4540', baseScale: [0.5, 0.2, 0.4] },
        { role: 'secondary', geom: 'cylinder', color: '#5a5550', baseScale: [0.18, 1.0, 0.18], tall: true },
        { role: 'accent', geom: 'box', color: '#3a3835', baseScale: [0.25, 0.03, 0.25] },
        { role: 'scatter', geom: 'box', color: '#4a4540', baseScale: [0.15, 0.08, 0.12] },
      ],
    },
  ],
};

// Infested overlay family
const INFESTED_FAMILY: FamilyTemplate = {
  id: 'corruption_growth', name: 'Corruption Growth', baseClusterCount: 2, baseItemsPerCluster: 4, spreadRadius: 2,
  members: [
    { role: 'primary', geom: 'cone', color: '#3a1f3a', baseScale: [0.2, 0.8, 0.2], tall: true },
    { role: 'secondary', geom: 'sphere', color: '#5a3050', baseScale: [0.2, 0.15, 0.2], emissive: true, emissiveColor: '#7a3a5a' },
    { role: 'accent', geom: 'cylinder', color: '#3a1a2a', baseScale: [0.05, 0.8, 0.05], tall: true },
    { role: 'scatter', geom: 'sphere', color: '#6aff9e', baseScale: [0.04, 0.04, 0.04], emissive: true, emissiveColor: '#6aff9e' },
  ],
};

export function buildStructureFamilies(
  biome: BiomeBase,
  modifiers: BiomeModifier[],
  density: DensityProfile,
  seed: number,
): StructureFamily[] {
  const templates = FAMILY_TEMPLATES[biome] ?? FAMILY_TEMPLATES.ruins;

  const families: StructureFamily[] = templates.map((t, i) => ({
    id: t.id,
    name: t.name,
    members: t.members,
    clusterCount: Math.max(1, Math.round(t.baseClusterCount * density.structureMultiplier)),
    itemsPerCluster: Math.max(2, Math.round(t.baseItemsPerCluster * density.propMultiplier)),
    spreadRadius: t.spreadRadius,
  }));

  // Add modifier overlay families
  if (modifiers.includes('infested') || modifiers.includes('corrupted')) {
    families.push({
      ...INFESTED_FAMILY,
      clusterCount: Math.max(1, Math.round(INFESTED_FAMILY.baseClusterCount * density.structureMultiplier)),
      itemsPerCluster: Math.max(2, Math.round(INFESTED_FAMILY.baseItemsPerCluster * density.propMultiplier)),
      spreadRadius: INFESTED_FAMILY.spreadRadius,
    });
  }

  return families;
}
