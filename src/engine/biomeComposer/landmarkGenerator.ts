/**
 * Landmark Generator — Step 4
 * 
 * Generates 2-5 meaningful landmarks per scene based on biome.
 */

import type { BiomeBase, BiomeModifier, Landmark, DensityProfile } from './types';
import { seeded } from './utils';

interface LandmarkTemplate {
  name: string;
  narratorTag: string;
  scaleRange: [number, number];
}

const BIOME_LANDMARKS: Record<string, LandmarkTemplate[]> = {
  forest: [
    { name: 'Ancient Oak', narratorTag: 'a massive ancient oak dominates the clearing', scaleRange: [1.2, 1.8] },
    { name: 'Moss Boulder', narratorTag: 'a moss-covered boulder marks the path', scaleRange: [0.8, 1.2] },
    { name: 'Hollow Stump', narratorTag: 'a rotting hollow stump stands at the edge', scaleRange: [0.7, 1.0] },
    { name: 'Stream Crossing', narratorTag: 'a narrow stream cuts through the forest floor', scaleRange: [0.6, 0.9] },
    { name: 'Fallen Giant', narratorTag: 'a massive fallen tree blocks the path', scaleRange: [1.0, 1.5] },
  ],
  jungle: [
    { name: 'Vine Canopy', narratorTag: 'thick vines form a natural ceiling', scaleRange: [1.3, 1.8] },
    { name: 'Root Arch', narratorTag: 'enormous roots form a natural archway', scaleRange: [1.0, 1.5] },
    { name: 'Flower Cluster', narratorTag: 'bioluminescent flowers illuminate the darkness', scaleRange: [0.6, 0.9] },
    { name: 'Serpent Tree', narratorTag: 'a twisted tree coils like a serpent', scaleRange: [1.2, 1.6] },
  ],
  swamp: [
    { name: 'Dead Cypress', narratorTag: 'a skeletal cypress rises from the murk', scaleRange: [1.0, 1.5] },
    { name: 'Toxic Pool', narratorTag: 'a bubbling toxic pool releases foul gas', scaleRange: [0.8, 1.2] },
    { name: 'Fungus Mound', narratorTag: 'a towering mound of fungal growth', scaleRange: [0.7, 1.1] },
    { name: 'Sunken Ruin', narratorTag: 'partially submerged stone ruins', scaleRange: [0.9, 1.3] },
  ],
  holy_ruins: [
    { name: 'Broken Altar', narratorTag: 'a shattered altar still pulses with faint light', scaleRange: [0.8, 1.2] },
    { name: 'Ruined Gate', narratorTag: 'a crumbling stone gate marks a sacred boundary', scaleRange: [1.0, 1.5] },
    { name: 'Statue Fragment', narratorTag: 'the upper half of a divine statue lies on its side', scaleRange: [0.9, 1.3] },
    { name: 'Sacred Pool', narratorTag: 'a still pool reflects ethereal light', scaleRange: [0.7, 1.0] },
    { name: 'Bell Tower Base', narratorTag: 'the foundation of a collapsed bell tower', scaleRange: [1.0, 1.4] },
  ],
  industrial: [
    { name: 'Turbine Core', narratorTag: 'a massive turbine hums with residual power', scaleRange: [1.2, 1.6] },
    { name: 'Pipe Bank', narratorTag: 'a wall of pipes leaks steam into the air', scaleRange: [1.0, 1.4] },
    { name: 'Control Console', narratorTag: 'a damaged control console sparks intermittently', scaleRange: [0.6, 0.9] },
    { name: 'Crane Arm', narratorTag: 'a broken crane arm hangs overhead', scaleRange: [1.3, 1.8] },
  ],
  dam: [
    { name: 'Floodgate', narratorTag: 'a massive floodgate strains against the water', scaleRange: [1.3, 1.8] },
    { name: 'Turbine Hall', narratorTag: 'the central turbine hall echoes with machinery', scaleRange: [1.2, 1.6] },
    { name: 'Spillway Edge', narratorTag: 'the concrete spillway drops into churning water', scaleRange: [1.0, 1.4] },
    { name: 'Observation Post', narratorTag: 'a small observation post overlooks the dam', scaleRange: [0.7, 1.0] },
  ],
  city_rooftop: [
    { name: 'Billboard Frame', narratorTag: 'a massive billboard frame provides cover', scaleRange: [1.0, 1.5] },
    { name: 'Broken Skylight', narratorTag: 'a shattered skylight reveals floors below', scaleRange: [0.8, 1.1] },
    { name: 'Vent Cluster', narratorTag: 'a cluster of industrial vents hisses steam', scaleRange: [0.7, 1.0] },
    { name: 'Elevator Housing', narratorTag: 'the concrete elevator housing provides solid cover', scaleRange: [1.0, 1.3] },
  ],
  urban_interior: [
    { name: 'Escalator Ruins', narratorTag: 'the frozen escalators mark the central atrium', scaleRange: [1.0, 1.4] },
    { name: 'Vehicle Wreck', narratorTag: 'a crashed vehicle blocks the intersection', scaleRange: [0.8, 1.2] },
    { name: 'Fountain Base', narratorTag: 'a dry fountain in the plaza center', scaleRange: [0.8, 1.1] },
    { name: 'Collapsed Awning', narratorTag: 'a collapsed awning creates shelter', scaleRange: [0.7, 1.0] },
  ],
  bridge: [
    { name: 'Tower Pylon', narratorTag: 'a massive bridge pylon anchors the structure', scaleRange: [1.3, 1.8] },
    { name: 'Collapsed Section', narratorTag: 'a gap in the bridge reveals the water below', scaleRange: [1.0, 1.4] },
    { name: 'Vehicle Pileup', narratorTag: 'a pileup of vehicles blocks the roadway', scaleRange: [0.9, 1.3] },
  ],
  cave: [
    { name: 'Crystal Cluster', narratorTag: 'a formation of glowing crystals illuminates the chamber', scaleRange: [0.8, 1.2] },
    { name: 'Cavern Pillar', narratorTag: 'a natural stone pillar supports the ceiling', scaleRange: [1.0, 1.5] },
    { name: 'Underground Pool', narratorTag: 'a still underground pool reflects dim light', scaleRange: [0.7, 1.0] },
    { name: 'Mushroom Grove', narratorTag: 'enormous mushrooms grow in the damp darkness', scaleRange: [0.8, 1.2] },
  ],
  canyon: [
    { name: 'Rock Arch', narratorTag: 'a natural rock arch spans the canyon', scaleRange: [1.2, 1.7] },
    { name: 'Cliff Face', narratorTag: 'a sheer cliff face rises to one side', scaleRange: [1.3, 1.8] },
    { name: 'Dry Riverbed', narratorTag: 'an ancient riverbed winds through the canyon floor', scaleRange: [0.8, 1.2] },
  ],
  mountain: [
    { name: 'Rocky Outcrop', narratorTag: 'a jagged rocky outcrop provides elevation', scaleRange: [1.0, 1.5] },
    { name: 'Mountain Pass', narratorTag: 'a narrow pass cuts between the peaks', scaleRange: [0.8, 1.2] },
    { name: 'Wind-Carved Stone', narratorTag: 'wind-carved stone formations stand like sentinels', scaleRange: [0.9, 1.3] },
  ],
  snowfield: [
    { name: 'Ice Formation', narratorTag: 'a jagged ice formation catches the light', scaleRange: [0.8, 1.3] },
    { name: 'Frozen Waterfall', narratorTag: 'a frozen waterfall hangs in suspended animation', scaleRange: [1.0, 1.5] },
    { name: 'Snow Drift', narratorTag: 'a massive snow drift provides natural cover', scaleRange: [0.9, 1.2] },
  ],
  volcanic: [
    { name: 'Lava Pool', narratorTag: 'a pool of molten lava glows with intense heat', scaleRange: [0.8, 1.2] },
    { name: 'Basalt Column', narratorTag: 'hexagonal basalt columns rise from the ground', scaleRange: [1.0, 1.5] },
    { name: 'Caldera Edge', narratorTag: 'the crumbling edge of a volcanic caldera', scaleRange: [1.2, 1.6] },
    { name: 'Vent Field', narratorTag: 'a cluster of vents spews superheated gas', scaleRange: [0.7, 1.0] },
  ],
  underwater: [
    { name: 'Coral Tower', narratorTag: 'a towering coral formation sways in the current', scaleRange: [1.0, 1.5] },
    { name: 'Sunken Wreck', narratorTag: 'the remains of a sunken vessel lie on the seabed', scaleRange: [1.2, 1.6] },
    { name: 'Thermal Vent', narratorTag: 'a deep-sea thermal vent releases mineral-rich water', scaleRange: [0.7, 1.0] },
  ],
  alien_biome: [
    { name: 'Spire', narratorTag: 'an alien spire pulses with unknown energy', scaleRange: [1.2, 1.8] },
    { name: 'Organic Mass', narratorTag: 'a pulsating organic mass of unknown origin', scaleRange: [0.8, 1.3] },
    { name: 'Rift', narratorTag: 'a dimensional rift crackles with energy', scaleRange: [0.9, 1.2] },
  ],
  airship: [
    { name: 'Helm', narratorTag: 'the ship\'s helm overlooks the battlefield', scaleRange: [0.7, 1.0] },
    { name: 'Balloon Anchor', narratorTag: 'the main balloon anchor point rises above', scaleRange: [1.2, 1.6] },
    { name: 'Engine Bay', narratorTag: 'the exposed engine bay rumbles with power', scaleRange: [1.0, 1.4] },
  ],
  reactor_facility: [
    { name: 'Main Reactor', narratorTag: 'the central reactor core hums ominously', scaleRange: [1.3, 1.8] },
    { name: 'Containment Ring', narratorTag: 'a containment ring surrounds the reactor', scaleRange: [1.0, 1.4] },
    { name: 'Cooling Stack', narratorTag: 'a cooling stack vents into the atmosphere', scaleRange: [1.2, 1.6] },
  ],
  desert: [
    { name: 'Rock Formation', narratorTag: 'a wind-sculpted rock formation rises from the sand', scaleRange: [1.0, 1.5] },
    { name: 'Oasis Ruins', narratorTag: 'the remains of a dried-up oasis', scaleRange: [0.8, 1.1] },
    { name: 'Sand Dune', narratorTag: 'a towering sand dune dominates the horizon', scaleRange: [1.2, 1.7] },
  ],
  ruins: [
    { name: 'Broken Arch', narratorTag: 'a crumbling stone arch marks the entrance', scaleRange: [1.0, 1.4] },
    { name: 'Rubble Mound', narratorTag: 'a mound of rubble from collapsed structures', scaleRange: [0.8, 1.2] },
    { name: 'Pillar Row', narratorTag: 'a row of fractured pillars lines the path', scaleRange: [1.0, 1.5] },
  ],
};

export function generateLandmarks(
  biome: BiomeBase,
  modifiers: BiomeModifier[],
  density: DensityProfile,
  seed: number,
): Landmark[] {
  const templates = BIOME_LANDMARKS[biome] ?? BIOME_LANDMARKS.ruins;
  // 2-5 landmarks, fewer if sparse
  const maxCount = Math.max(2, Math.min(5, Math.floor(2 + density.structureMultiplier * 3)));
  const count = Math.min(maxCount, templates.length);

  // Shuffle templates deterministically
  const shuffled = [...templates].sort((a, b) => seeded(seed + a.name.length) - seeded(seed + b.name.length));

  const landmarks: Landmark[] = [];
  for (let i = 0; i < count; i++) {
    const t = shuffled[i];
    const s = seed + i * 113;
    const angle = (i / count) * Math.PI * 2 + seeded(s) * 0.5;
    const dist = 2 + seeded(s + 1) * 5;
    const [sMin, sMax] = t.scaleRange;

    landmarks.push({
      id: `lm-${i}`,
      name: t.name,
      narratorTag: t.narratorTag,
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist,
      scale: sMin + seeded(s + 2) * (sMax - sMin),
      zoneAnchorId: `zone-lm-${i}`,
    });
  }

  // Modifier-based bonus landmarks
  if (modifiers.includes('infested') && landmarks.length < 5) {
    landmarks.push({
      id: `lm-infested`,
      name: 'Corruption Node',
      narratorTag: 'a pulsing node of corruption spreads tendrils outward',
      x: (seeded(seed + 999) - 0.5) * 6,
      z: (seeded(seed + 998) - 0.5) * 6,
      scale: 0.9,
      zoneAnchorId: 'zone-lm-infested',
    });
  }

  return landmarks;
}
