/**
 * Enhanced Planet Surface Component
 * 
 * Creates highly detailed procedural terrain heavily influenced by planet lore/description:
 * - Multi-biome rendering based on description keywords
 * - Ocean depth with continental shelves
 * - Mountain ranges with ridges and valleys
 * - Volcanic features with lava glow
 * - Crystal formations with shine
 * - Ice caps and tundra
 * - Desert dunes and canyons
 * - Forest/jungle coloring
 * - Special features: fungal, magical, scarred terrain
 * - Animated cloud layers
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';
import { parseTerrainFromLore, generateTerrainVisuals, TerrainFeatures, TerrainVisuals } from '@/lib/planet-terrain';

interface PlanetSurfaceProps {
  size: number;
  color: string;
  description?: string;
  oceanCoverage?: number;
  hasMountains?: boolean;
  hasVolcanoes?: boolean;
  hasTundra?: boolean;
  hasDeserts?: boolean;
  hasForests?: boolean;
  isHovered?: boolean;
}

// Multi-octave noise for realistic terrain
function fbm(noise3D: ReturnType<typeof createNoise3D>, x: number, y: number, z: number, octaves: number = 6): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise3D(x * frequency, y * frequency, z * frequency);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

// Ridge noise for mountain ranges
function ridgeNoise(noise3D: ReturnType<typeof createNoise3D>, x: number, y: number, z: number): number {
  const n = noise3D(x, y, z);
  return 1 - Math.abs(n);
}

// Multi-octave ridge noise for sharper mountains
function ridgeFbm(noise3D: ReturnType<typeof createNoise3D>, x: number, y: number, z: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * ridgeNoise(noise3D, x * frequency, y * frequency, z * frequency);
    maxValue += amplitude;
    amplitude *= 0.45;
    frequency *= 2.2;
  }

  return value / maxValue;
}

// Crater noise for barren/scarred terrain
function craterNoise(noise3D: ReturnType<typeof createNoise3D>, x: number, y: number, z: number, count: number = 8): number {
  let minDist = 1;
  for (let i = 0; i < count; i++) {
    const cx = noise3D(i * 10, 0, 0);
    const cy = noise3D(0, i * 10, 0);
    const cz = noise3D(0, 0, i * 10);
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2);
    const craterSize = 0.3 + Math.abs(noise3D(i * 5, i * 5, i * 5)) * 0.3;
    if (dist < craterSize) {
      const depth = 1 - (dist / craterSize);
      minDist = Math.min(minDist, 1 - depth * 0.3);
    }
  }
  return minDist;
}

export default function PlanetSurface({
  size,
  color,
  description = '',
  oceanCoverage = 0.5,
  hasMountains = false,
  hasVolcanoes = false,
  hasTundra = false,
  hasDeserts = false,
  hasForests = false,
  isHovered = false,
}: PlanetSurfaceProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const oceanRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // Parse terrain from full description
  const terrainFeatures = useMemo(() => parseTerrainFromLore(description), [description]);
  const terrainVisuals = useMemo(
    () => generateTerrainVisuals(terrainFeatures, color),
    [terrainFeatures, color]
  );

  // Create procedural geometry with terrain heavily influenced by lore
  const { geometry, oceanGeometry, cloudGeometry } = useMemo(() => {
    // Seed from description for consistency
    let seed = 0;
    for (let i = 0; i < description.length; i++) {
      seed = description.charCodeAt(i) + ((seed << 5) - seed);
    }
    seed = Math.abs(seed) || 12345;

    const noise3D = createNoise3D(() => (seed % 10000) / 10000);
    const noise3D2 = createNoise3D(() => ((seed + 12345) % 10000) / 10000);
    const noise3D3 = createNoise3D(() => ((seed + 54321) % 10000) / 10000);
    
    // Higher resolution for detailed terrain - more segments for complex worlds
    const hasComplexTerrain = terrainFeatures.hasMountains || terrainFeatures.hasVolcanoes || terrainFeatures.hasCanyons;
    const segments = hasComplexTerrain ? 96 : 72;
    const geo = new THREE.SphereGeometry(size, segments, segments);
    const positions = geo.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    
    // Get terrain parameters from parsed features
    const { continentFrequency, mountainFrequency, detailLevel } = terrainVisuals;
    const mountainScale = getMountainScale(terrainFeatures.mountainScale);
    
    // Color palette based on biome
    const colors_palette = getColorPalette(terrainFeatures, terrainVisuals, color);
    
    // Calculate ocean level threshold based on coverage
    const effectiveOceanCoverage = terrainFeatures.oceanCoverage;
    const oceanThreshold = -0.05 + (1 - effectiveOceanCoverage) * 0.2;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      const length = Math.sqrt(x * x + y * y + z * z);
      const nx = x / length;
      const ny = y / length;
      const nz = z / length;
      
      // Latitude for biome distribution
      const latitude = Math.abs(ny);
      // Longitude for variation
      const longitude = Math.atan2(nz, nx) / Math.PI;
      
      // === CONTINENTAL SHAPES ===
      let continentNoise = fbm(noise3D, nx * continentFrequency, ny * continentFrequency, nz * continentFrequency, 5);
      
      // Adjust for continent type
      if (terrainFeatures.continentType === 'single') {
        // Concentrate land in one area
        const centerBias = Math.max(0, 1 - Math.sqrt(nx * nx + (nz - 0.5) ** 2) * 1.5);
        continentNoise = continentNoise * 0.4 + centerBias * 0.6;
      } else if (terrainFeatures.continentType === 'dual') {
        // Two distinct land masses
        const northern = Math.max(0, ny - 0.2);
        const southern = Math.max(0, -ny - 0.2);
        const dualBias = Math.max(northern, southern);
        continentNoise = continentNoise * 0.6 + dualBias * 0.4;
      } else if (terrainFeatures.continentType === 'archipelago') {
        // Many small islands
        continentNoise = continentNoise * 0.3 + noise3D(nx * 4, ny * 4, nz * 4) * 0.7;
      }
      
      // === MOUNTAIN RANGES ===
      let mountainNoise = ridgeFbm(noise3D2, nx * mountainFrequency, ny * mountainFrequency, nz * mountainFrequency, 6);
      
      // High gravity flattens terrain
      if (terrainFeatures.highGravity) {
        mountainNoise *= 0.4;
      }
      // Low gravity allows taller formations
      if (terrainFeatures.lowGravity) {
        mountainNoise *= 1.5;
      }
      
      // === DETAIL NOISE ===
      const detailNoise = fbm(noise3D, nx * 12 * detailLevel, ny * 12 * detailLevel, nz * 12 * detailLevel, 3) * 0.25;
      
      // === CRATER NOISE for barren/scarred worlds ===
      let craterEffect = 1;
      if (terrainFeatures.isBarren || terrainFeatures.hasScarredTerrain) {
        craterEffect = craterNoise(noise3D3, nx * 2, ny * 2, nz * 2, 12);
      }
      
      // === VOLCANIC RIDGES ===
      let volcanoNoise = 0;
      if (terrainFeatures.hasVolcanoes) {
        volcanoNoise = Math.pow(ridgeNoise(noise3D2, nx * 2, ny * 2, nz * 2), 3);
        if (terrainFeatures.volcanoIntensity === 'extreme') {
          volcanoNoise *= 1.5;
        }
      }
      
      // === COMBINE ELEVATION ===
      let elevation = continentNoise * 0.5;
      
      // Add terrain details on land only
      if (elevation > oceanThreshold) {
        elevation += mountainNoise * mountainScale;
        elevation += detailNoise * 0.02;
        elevation += volcanoNoise * 0.05;
      }
      
      // Apply crater depression
      elevation *= craterEffect;
      
      // Canyon effect
      if (terrainFeatures.hasCanyons && elevation > oceanThreshold) {
        const canyonNoise = noise3D(nx * 5, ny * 5, nz * 5);
        if (Math.abs(canyonNoise) < 0.08) {
          elevation -= 0.05;
        }
      }
      
      // === DISPLACEMENT - more dramatic based on terrain features ===
      // Higher displacement for more pronounced terrain visibility
      const baseDisplacement = terrainFeatures.hasMountains ? 0.35 : 0.2;
      const displacementMultiplier = terrainFeatures.highGravity ? baseDisplacement * 0.6 : 
                                     terrainFeatures.lowGravity ? baseDisplacement * 1.4 : baseDisplacement;
      const displacement = 1 + elevation * displacementMultiplier;
      positions.setXYZ(i, nx * size * displacement, ny * size * displacement, nz * size * displacement);
      
      // === COLOR BASED ON ELEVATION, BIOME, AND LORE ===
      const finalColor = calculateSurfaceColor(
        elevation,
        oceanThreshold,
        latitude,
        longitude,
        terrainFeatures,
        terrainVisuals,
        colors_palette,
        mountainNoise,
        volcanoNoise,
        noise3D,
        nx, ny, nz
      );
      
      colors[i * 3] = finalColor.r;
      colors[i * 3 + 1] = finalColor.g;
      colors[i * 3 + 2] = finalColor.b;
    }
    
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    
    // Ocean surface geometry
    const oceanGeo = new THREE.SphereGeometry(size * 1.001, 48, 48);
    
    // Cloud layer with variable density
    const cloudGeo = new THREE.SphereGeometry(size * 1.03, 40, 40);
    const cloudColors = new Float32Array(cloudGeo.attributes.position.count * 3);
    
    const cloudHue = new THREE.Color(terrainVisuals.cloudColor);
    
    for (let i = 0; i < cloudGeo.attributes.position.count; i++) {
      const x = cloudGeo.attributes.position.getX(i);
      const y = cloudGeo.attributes.position.getY(i);
      const z = cloudGeo.attributes.position.getZ(i);
      const len = Math.sqrt(x * x + y * y + z * z);
      
      const cloudNoise = fbm(noise3D2, x / len * 2, y / len * 2, z / len * 2, 4);
      const stormNoise = terrainFeatures.hasStorms ? fbm(noise3D3, x / len * 1, y / len * 1, z / len * 1, 2) : 0;
      
      const intensity = Math.max(0, (cloudNoise + stormNoise * 0.5) * terrainVisuals.cloudDensity);
      
      cloudColors[i * 3] = cloudHue.r * intensity + (1 - intensity);
      cloudColors[i * 3 + 1] = cloudHue.g * intensity + (1 - intensity);
      cloudColors[i * 3 + 2] = cloudHue.b * intensity + (1 - intensity);
    }
    
    cloudGeo.setAttribute('color', new THREE.BufferAttribute(cloudColors, 3));
    
    return { geometry: geo, oceanGeometry: oceanGeo, cloudGeometry: cloudGeo };
  }, [size, color, description, terrainFeatures, terrainVisuals]);

  // Animate clouds and special effects
  useFrame((_, delta) => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.015;
    }
    if (atmosphereRef.current && terrainFeatures.hasMagicAura) {
      atmosphereRef.current.rotation.y += delta * 0.03;
    }
  });

  const oceanColor = new THREE.Color(terrainVisuals.oceanColor);

  return (
    <group>
      {/* Main terrain */}
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          roughness={terrainVisuals.roughness}
          metalness={terrainVisuals.metalness}
          emissive={new THREE.Color(terrainVisuals.emissiveColor)}
          emissiveIntensity={terrainVisuals.emissiveIntensity}
        />
      </mesh>
      
      {/* Ocean layer with specular highlight */}
      {terrainFeatures.oceanCoverage > 0.05 && (
        <mesh ref={oceanRef} geometry={oceanGeometry}>
          <meshStandardMaterial
            color={oceanColor}
            transparent
            opacity={0.35}
            roughness={0.15}
            metalness={0.5}
          />
        </mesh>
      )}
      
      {/* Cloud layer */}
      {terrainVisuals.hasCloudLayer && terrainVisuals.cloudDensity > 0 && (
        <mesh ref={cloudsRef} geometry={cloudGeometry}>
          <meshBasicMaterial
            vertexColors
            transparent
            opacity={isHovered ? 0.18 : 0.12}
            depthWrite={false}
          />
        </mesh>
      )}
      
      {/* Magical/Crystal glow effect */}
      {(terrainVisuals.hasMagicGlow || terrainVisuals.hasCrystalShine) && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[size * 1.04, 24, 24]} />
          <meshBasicMaterial
            color={terrainFeatures.hasCrystals ? terrainFeatures.crystalColor : terrainFeatures.glowColor}
            transparent
            opacity={isHovered ? 0.25 : 0.12}
            side={THREE.BackSide}
          />
        </mesh>
      )}
      
      {/* Aurora effect for magical/polar worlds */}
      {terrainVisuals.hasAurorae && (
        <mesh ref={atmosphereRef}>
          <sphereGeometry args={[size * 1.08, 16, 16]} />
          <meshBasicMaterial
            color={terrainFeatures.hasMagicAura ? '#9370DB' : '#4ADE80'}
            transparent
            opacity={0.06}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}

// === HELPER FUNCTIONS ===

function getMountainScale(scale: TerrainFeatures['mountainScale']): number {
  // Increased values for more visible terrain differences
  switch (scale) {
    case 'small': return 0.04;
    case 'medium': return 0.08;
    case 'large': return 0.12;
    case 'massive': return 0.18;
    case 'colossal': return 0.25;
    default: return 0.08;
  }
}

interface ColorPalette {
  oceanDeep: THREE.Color;
  oceanShallow: THREE.Color;
  coastline: THREE.Color;
  lowland: THREE.Color;
  highland: THREE.Color;
  mountain: THREE.Color;
  peak: THREE.Color;
  snow: THREE.Color;
  desert: THREE.Color;
  tundra: THREE.Color;
  volcanic: THREE.Color;
  lava: THREE.Color;
  forest: THREE.Color;
  jungle: THREE.Color;
  darkForest: THREE.Color;
  crystal: THREE.Color;
  fungal: THREE.Color;
  alien: THREE.Color;
  swamp: THREE.Color;
  haunted: THREE.Color;
}

function getColorPalette(features: TerrainFeatures, visuals: TerrainVisuals, baseColor: string): ColorPalette {
  // Start with base color influence
  const base = new THREE.Color(baseColor);
  const primary = new THREE.Color(visuals.primaryColor);
  const secondary = new THREE.Color(visuals.secondaryColor);
  const accent = new THREE.Color(visuals.accentColor);
  
  return {
    oceanDeep: new THREE.Color(visuals.oceanColor).multiplyScalar(0.4),
    oceanShallow: new THREE.Color(visuals.oceanColor).lerp(new THREE.Color('#60A5FA'), 0.3),
    coastline: new THREE.Color('#c9a962').lerp(base, 0.2),
    lowland: new THREE.Color('#4a7c59').lerp(primary, 0.3),
    highland: new THREE.Color('#6b7f3c').lerp(secondary, 0.3),
    mountain: new THREE.Color('#8b7355').lerp(base, 0.2),
    peak: new THREE.Color('#d4d4d4'),
    snow: new THREE.Color('#f0f8ff'),
    desert: new THREE.Color('#d4a574').lerp(base, 0.3),
    tundra: new THREE.Color('#a8c0b0').lerp(accent, 0.2),
    volcanic: new THREE.Color('#3d2817'),
    lava: new THREE.Color('#ff4500'),
    forest: new THREE.Color('#228B22').lerp(primary, 0.2),
    jungle: new THREE.Color('#0B6623').lerp(primary, 0.2),
    darkForest: new THREE.Color('#1a1a1a').lerp(new THREE.Color('#2d2d2d'), 0.3),
    crystal: new THREE.Color(features.crystalColor),
    fungal: new THREE.Color('#9D174D').lerp(new THREE.Color('#F9A8D4'), 0.3),
    alien: new THREE.Color('#7C3AED').lerp(accent, 0.4),
    swamp: new THREE.Color('#365314').lerp(base, 0.2),
    haunted: new THREE.Color('#374151'),
  };
}

function calculateSurfaceColor(
  elevation: number,
  oceanThreshold: number,
  latitude: number,
  longitude: number,
  features: TerrainFeatures,
  visuals: TerrainVisuals,
  palette: ColorPalette,
  mountainNoise: number,
  volcanoNoise: number,
  noise3D: ReturnType<typeof createNoise3D>,
  nx: number, ny: number, nz: number
): THREE.Color {
  const finalColor = new THREE.Color();
  const biomeNoise = noise3D(nx * 4, ny * 4, nz * 4);
  
  // === OCEAN DEPTHS ===
  if (elevation < oceanThreshold - 0.1) {
    // Deep ocean
    finalColor.copy(palette.oceanDeep);
    const depthFactor = Math.min(1, (oceanThreshold - elevation) / 0.2);
    finalColor.lerp(new THREE.Color('#030810'), depthFactor * 0.6);
  } else if (elevation < oceanThreshold - 0.03) {
    // Mid ocean
    finalColor.lerpColors(palette.oceanShallow, palette.oceanDeep, (oceanThreshold - 0.03 - elevation) / 0.07);
  } else if (elevation < oceanThreshold) {
    // Shallow water / reef zone
    finalColor.lerpColors(palette.coastline, palette.oceanShallow, (oceanThreshold - elevation) / 0.03);
  } 
  // === LAND BIOMES ===
  else if (elevation < oceanThreshold + 0.015) {
    // Beach / coastline
    finalColor.copy(palette.coastline);
  } else if (elevation < oceanThreshold + 0.04) {
    // Lowlands - biome dependent
    finalColor.copy(getLowlandColor(features, palette, latitude, biomeNoise));
  } else if (elevation < oceanThreshold + 0.08) {
    // Midlands / hills
    const midlandColor = getMidlandColor(features, palette, latitude, biomeNoise, mountainNoise);
    const lowlandColor = getLowlandColor(features, palette, latitude, biomeNoise);
    finalColor.lerpColors(lowlandColor, midlandColor, (elevation - oceanThreshold - 0.04) / 0.04);
  } else if (elevation < oceanThreshold + 0.12) {
    // Highlands
    const highlandColor = getHighlandColor(features, palette, volcanoNoise);
    finalColor.lerpColors(getMidlandColor(features, palette, latitude, biomeNoise, mountainNoise), highlandColor, (elevation - oceanThreshold - 0.08) / 0.04);
  } else {
    // Peaks and summits
    const peakFactor = Math.min(1, (elevation - oceanThreshold - 0.12) / 0.05);
    const highlandColor = getHighlandColor(features, palette, volcanoNoise);
    finalColor.lerpColors(highlandColor, palette.peak, peakFactor);
    
    // Volcanic lava at peaks
    if (features.hasVolcanoes && volcanoNoise > 0.6) {
      const lavaFactor = (volcanoNoise - 0.6) * 2.5;
      if (features.volcanoIntensity === 'extreme') {
        finalColor.lerp(palette.lava, lavaFactor);
      } else if (features.volcanoIntensity === 'active') {
        finalColor.lerp(palette.lava, lavaFactor * 0.6);
      }
    }
  }
  
  // === POLAR ICE CAPS ===
  const polarStart = features.hasTundra ? 0.45 : 0.72;
  if (latitude > polarStart) {
    const iceFactor = Math.min(1, (latitude - polarStart) / 0.25);
    if (elevation >= oceanThreshold) {
      finalColor.lerp(palette.snow, iceFactor * 0.9);
    } else {
      // Sea ice
      finalColor.lerp(new THREE.Color('#b8d4e8'), iceFactor * 0.7);
    }
  }
  
  // === HIGH ALTITUDE SNOW ===
  if (elevation > oceanThreshold + 0.1 && !features.hasVolcanoes && features.hasMountains) {
    const snowLine = features.hasTundra ? 0.08 : 0.12;
    if (elevation > oceanThreshold + snowLine) {
      const snowFactor = Math.min(1, (elevation - oceanThreshold - snowLine) / 0.04);
      finalColor.lerp(palette.snow, snowFactor * 0.85);
    }
  }
  
  // === CRYSTAL SHINE ===
  if (features.hasCrystals && elevation > oceanThreshold) {
    const crystalChance = noise3D(nx * 8, ny * 8, nz * 8);
    if (crystalChance > 0.7) {
      finalColor.lerp(palette.crystal, (crystalChance - 0.7) * 3);
    }
  }
  
  // === MAGICAL GLOW ===
  if (features.hasMagicAura && elevation > oceanThreshold) {
    const magicNoise = noise3D(nx * 3, ny * 3, nz * 3);
    if (magicNoise > 0.5) {
      finalColor.lerp(new THREE.Color(features.glowColor), (magicNoise - 0.5) * 0.4);
    }
  }
  
  // === HAUNTED/DARK TERRAIN ===
  if (features.primaryBiome === 'haunted' && elevation > oceanThreshold) {
    finalColor.lerp(palette.haunted, 0.4);
    // Occasional ghostly patches
    const hauntNoise = noise3D(nx * 6, ny * 6, nz * 6);
    if (hauntNoise > 0.7) {
      finalColor.lerp(new THREE.Color('#6B7280'), 0.3);
    }
  }
  
  return finalColor;
}

function getLowlandColor(features: TerrainFeatures, palette: ColorPalette, latitude: number, biomeNoise: number): THREE.Color {
  const color = new THREE.Color();
  
  // Equatorial/tropical band
  if (latitude < 0.35) {
    if (features.hasDeserts && biomeNoise > 0.2) {
      color.copy(palette.desert);
    } else if (features.forestType === 'jungle') {
      color.copy(palette.jungle);
    } else if (features.forestType === 'dead' || features.forestType === 'dark') {
      color.copy(palette.darkForest);
    } else if (features.hasForests) {
      color.copy(palette.forest);
    } else if (features.hasSwamps) {
      color.copy(palette.swamp);
    } else if (features.hasFungal) {
      color.copy(palette.fungal);
    } else if (features.hasAlienVegetation) {
      color.copy(palette.alien);
    } else {
      color.copy(palette.lowland);
    }
  } 
  // Temperate band
  else if (latitude < 0.6) {
    if (features.hasDeserts && biomeNoise > 0.4) {
      color.copy(palette.desert);
    } else if (features.forestType === 'dead' || features.forestType === 'dark') {
      color.copy(palette.darkForest);
    } else if (features.hasForests || features.hasGrasslands) {
      color.lerpColors(palette.lowland, palette.forest, 0.5);
    } else {
      color.copy(palette.lowland);
    }
  } 
  // Higher latitudes
  else {
    if (features.hasTundra) {
      color.copy(palette.tundra);
    } else {
      color.lerpColors(palette.lowland, palette.tundra, (latitude - 0.6) / 0.15);
    }
  }
  
  return color;
}

function getMidlandColor(features: TerrainFeatures, palette: ColorPalette, latitude: number, biomeNoise: number, mountainNoise: number): THREE.Color {
  const color = new THREE.Color();
  
  if (features.hasVolcanoes && mountainNoise > 0.5) {
    color.copy(palette.volcanic);
  } else if (features.hasFungal) {
    color.lerpColors(palette.fungal, palette.highland, 0.4);
  } else if (features.hasAlienVegetation) {
    color.lerpColors(palette.alien, palette.highland, 0.4);
  } else if (features.forestType === 'dead' || features.forestType === 'dark') {
    color.copy(palette.darkForest);
  } else if (latitude > 0.5 && features.hasTundra) {
    color.lerpColors(palette.highland, palette.tundra, 0.5);
  } else {
    color.lerpColors(palette.lowland, palette.highland, 0.6);
  }
  
  return color;
}

function getHighlandColor(features: TerrainFeatures, palette: ColorPalette, volcanoNoise: number): THREE.Color {
  const color = new THREE.Color();
  
  if (features.hasVolcanoes) {
    color.lerpColors(palette.volcanic, palette.mountain, 0.4);
    if (volcanoNoise > 0.4) {
      color.lerp(palette.volcanic, volcanoNoise - 0.4);
    }
  } else {
    color.copy(palette.mountain);
  }
  
  return color;
}
