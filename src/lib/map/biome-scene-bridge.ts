/**
 * BiomeScene Renderer Bridge
 * 
 * Converts a BiomeScenePlan into a ProceduralScene that the
 * existing ArenaStructures3D component can render.
 * 
 * Urban biomes are handled by UrbanStructureComposer for
 * coherent architectural environments.
 */

import type { BiomeScenePlan, StructureFamily, StructureFamilyMember } from '@/engine/biomeComposer/types';
import type { PlacedStructure, ProceduralScene } from './procedural-structures';
import { seeded, vary } from '@/engine/biomeComposer/utils';
import { isUrbanScene, composeUrbanScene } from '@/engine/urbanComposer';
import type { UrbanPlacedPiece } from '@/engine/urbanComposer';
import { assignMaterial } from './visual-identity';

/**
 * Convert a BiomeScenePlan to a ProceduralScene for the 3D renderer.
 * Urban biomes are routed through UrbanStructureComposer.
 */
export function biomeSceneToProceduralScene(
  plan: BiomeScenePlan,
  baseSeed: number,
  locationName?: string | null,
  terrainTags?: string[],
  arenaStability?: number,
): ProceduralScene {
  const placed: PlacedStructure[] = [];
  let idCounter = 0;
  const nextId = (prefix: string) => `${prefix}-${idCounter++}`;

  // ── Check if urban scene → use UrbanStructureComposer ────────
  if (isUrbanScene(locationName, terrainTags)) {
    const urbanPlan = composeUrbanScene({
      locationName,
      terrainTags,
      arenaStability,
      seed: locationName ?? terrainTags?.join('-') ?? 'urban',
    });

    // Convert urban pieces to PlacedStructure
    const urbanStructures: PlacedStructure[] = urbanPlan.pieces.map(p => urbanPieceToPlaced(p));

    // Still use biome atmosphere/terrain from BiomeComposer
    const terrainBumps = plan.terrainFeatures.map(f => ({
      x: f.x, z: f.z,
      height: Math.abs(f.elevation) * 0.5, // less bumpy for urban
      radius: f.radius,
      color: f.color,
    }));

    return {
      structures: urbanStructures,
      groundColor: plan.palette.ground,
      fogColor: plan.atmosphere.fogColor,
      fogDensity: plan.atmosphere.fogDensity,
      ambientColor: urbanPlan.palette.ambientTint,
      ambientIntensity: plan.atmosphere.ambientIntensity,
      terrainBumps,
      biomeId: plan.biome.primary,
    };
  }

  const biomeId = plan.biome.primary;

  // ── Terrain bumps from terrain features ───────────────────────
  const terrainBumps = plan.terrainFeatures.map(f => ({
    x: f.x,
    z: f.z,
    height: Math.abs(f.elevation) * 0.8,
    radius: f.radius,
    color: f.color,
  }));

  // ── Structure families → placed structures ────────────────────
  for (const family of plan.structureFamilies) {
    placeFamily(family, placed, nextId, baseSeed + idCounter * 7, biomeId);
  }

  // ── Landmarks → placed landmark structures ────────────────────
  for (const lm of plan.landmarks) {
    const s = baseSeed + 8000 + lm.id.charCodeAt(lm.id.length - 1) * 37;
    // Use the first structure family's primary member style, or default
    const family = plan.structureFamilies[0];
    const member = family?.members.find(m => m.role === 'primary') ?? family?.members[0];

    if (member) {
      const lmMat = assignMaterial(biomeId, lm.name, 'landmark', s + 700);
      placed.push({
        id: nextId('lm'),
        label: lm.name,
        geom: member.geom,
        position: [lm.x, 0, lm.z],
        scale: [
          member.baseScale[0] * lm.scale * 1.3,
          member.baseScale[1] * lm.scale * 1.3,
          member.baseScale[2] * lm.scale * 1.3,
        ],
        rotation: [0, seeded(s) * Math.PI * 2, 0],
        color: lmMat.color,
        emissive: lmMat.emissive ?? member.emissive,
        emissiveColor: lmMat.emissiveColor ?? member.emissiveColor ?? plan.palette.emissive,
        opacity: 1,
        roughness: lmMat.roughness,
        metalness: lmMat.metalness,
        cap: member.cap,
        category: 'landmark',
      });
    }
  }

  // ── Hazard sources → placed hazard visuals ────────────────────
  for (const hazard of plan.hazardSources) {
    const s = baseSeed + 9000 + idCounter * 13;
    const geomMap: Record<string, PlacedStructure['geom']> = {
      pit: 'cylinder', vent: 'cylinder', pool: 'cylinder',
      crack: 'box', arc: 'cone', ember_zone: 'sphere',
      flood_line: 'box', spore_cloud: 'sphere',
    };

    placed.push({
      id: nextId('hz'),
      label: hazard.label,
      geom: geomMap[hazard.sourceType] ?? 'cylinder',
      position: [hazard.x, hazard.sourceType === 'arc' ? 0.5 : 0.02, hazard.z],
      scale: hazard.sourceType === 'pool' || hazard.sourceType === 'pit'
        ? [hazard.radius, 0.04, hazard.radius]
        : [hazard.radius * 0.5, hazard.radius * 0.8, hazard.radius * 0.5],
      rotation: [0, seeded(s) * Math.PI * 2, 0],
      color: hazard.color,
      emissive: !!hazard.emissiveColor,
      emissiveColor: hazard.emissiveColor,
      opacity: 0.8,
      roughness: 0.9,
      metalness: 0,
      category: 'hazard-visual',
    });
  }

  return {
    structures: placed,
    groundColor: plan.palette.ground,
    fogColor: plan.atmosphere.fogColor,
    fogDensity: plan.atmosphere.fogDensity,
    ambientColor: plan.atmosphere.ambientColor,
    ambientIntensity: plan.atmosphere.ambientIntensity,
    terrainBumps,
    biomeId: plan.biome.primary,
  };
}

/** Place a structure family as clustered groups */
function placeFamily(
  family: StructureFamily,
  placed: PlacedStructure[],
  nextId: (prefix: string) => string,
  seed: number,
  biomeId?: string,
): void {
  for (let c = 0; c < family.clusterCount; c++) {
    const cs = seed + c * 200;
    // Cluster center position
    const clusterAngle = (c / family.clusterCount) * Math.PI * 2 + seeded(cs) * 0.8;
    const clusterDist = 2 + seeded(cs + 1) * 6;
    const cx = Math.cos(clusterAngle) * clusterDist;
    const cz = Math.sin(clusterAngle) * clusterDist;

    for (let i = 0; i < family.itemsPerCluster; i++) {
      const is = cs + 50 + i * 31;
      // Pick member based on role distribution
      const member = pickMember(family.members, i, is);

      const angle = seeded(is) * Math.PI * 2;
      const dist = seeded(is + 1) * family.spreadRadius;
      const px = cx + Math.cos(angle) * dist;
      const pz = cz + Math.sin(angle) * dist;
      const elevBias = member.tall ? 0 : 0;

      // Apply VisualIdentitySystem material
      const viMat = biomeId
        ? assignMaterial(biomeId, family.name + ' ' + member.role, i === 0 ? 'structure' : 'prop', is + 500)
        : null;

      placed.push({
        id: nextId('sf'),
        label: family.name,
        geom: member.geom,
        position: [px, elevBias, pz],
        scale: [
          vary(member.baseScale[0], 0.35, is + 10),
          vary(member.baseScale[1], 0.35, is + 11),
          vary(member.baseScale[2], 0.35, is + 12),
        ],
        rotation: [
          0,
          seeded(is + 20) * Math.PI * 2,
          member.tall ? 0 : (seeded(is + 21) - 0.5) * 0.1,
        ],
        color: viMat?.color ?? member.color,
        emissive: viMat?.emissive ?? member.emissive,
        emissiveColor: viMat?.emissiveColor ?? member.emissiveColor,
        opacity: viMat?.opacity ?? 1,
        roughness: viMat?.roughness ?? (member.geom === 'sphere' ? 0.95 : 0.85),
        metalness: viMat?.metalness ?? 0.02,
        cap: member.cap,
        category: i === 0 ? 'structure' : 'prop',
      });
    }
  }
}

/** Pick a family member based on index — primary first, then secondary, then scatter */
function pickMember(members: StructureFamilyMember[], index: number, seed: number): StructureFamilyMember {
  if (index === 0) return members.find(m => m.role === 'primary') ?? members[0];
  if (index === 1) return members.find(m => m.role === 'secondary') ?? members[0];
  if (index === 2 && members.find(m => m.role === 'accent')) return members.find(m => m.role === 'accent')!;

  // For scatter, pick randomly from scatter or secondary
  const scatterMembers = members.filter(m => m.role === 'scatter' || m.role === 'secondary');
  if (scatterMembers.length > 0) {
    return scatterMembers[Math.floor(seeded(seed) * scatterMembers.length)];
  }
  return members[Math.floor(seeded(seed) * members.length)];
}

/** Convert UrbanPlacedPiece → PlacedStructure for the renderer */
function urbanPieceToPlaced(p: UrbanPlacedPiece): PlacedStructure {
  return {
    id: p.id,
    label: p.label,
    geom: p.geom,
    position: p.position,
    scale: p.scale,
    rotation: p.rotation,
    color: p.color,
    roughness: p.roughness,
    metalness: p.metalness,
    emissive: p.emissive,
    emissiveColor: p.emissiveColor,
    opacity: p.opacity,
    cap: p.cap,
    category: p.category,
  };
}