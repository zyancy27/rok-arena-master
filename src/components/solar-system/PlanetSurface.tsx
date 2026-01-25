/**
 * Enhanced Planet Surface Component with LOD (Level of Detail)
 * 
 * Creates highly detailed procedural terrain heavily influenced by planet lore/description:
 * - Dynamic LOD based on camera distance for smooth zoom experience
 * - Multi-biome rendering based on description keywords
 * - Ocean depth with continental shelves
 * - Mountain ranges with ridges and valleys
 * - Volcanic features with lava glow
 * - Crystal formations with shine
 * - Ice caps and tundra
 * - Desert dunes and canyons
 * - Forest/jungle coloring with tree-level detail when zoomed
 * - Special features: fungal, magical, scarred terrain
 * - Animated cloud layers
 */

import { useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';
import { parseTerrainFromLore, generateTerrainVisuals, TerrainFeatures, TerrainVisuals } from '@/lib/planet-terrain';
import CityLights from './CityLights';
import SurfacePOIs from './SurfacePOIs';

// LOD thresholds based on camera distance relative to planet size
const LOD_LEVELS = {
  ULTRA: 0,    // Camera very close (< 2x planet size)
  HIGH: 1,     // Close zoom (< 4x planet size)
  MEDIUM: 2,   // Normal view (< 8x planet size)
  LOW: 3,      // Far view (> 8x planet size)
};

interface PlanetSurfaceProps {
  size: number;
  color: string;
  description?: string;
  planetName?: string;
  oceanCoverage?: number;
  hasMountains?: boolean;
  hasVolcanoes?: boolean;
  hasTundra?: boolean;
  hasDeserts?: boolean;
  hasForests?: boolean;
  isHovered?: boolean;
  onPOIClick?: (poi: { id: string; type: string; name: string }) => void;
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
  planetName = 'Unknown',
  oceanCoverage = 0.5,
  hasMountains = false,
  hasVolcanoes = false,
  hasTundra = false,
  hasDeserts = false,
  hasForests = false,
  isHovered = false,
  onPOIClick,
}: PlanetSurfaceProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const oceanRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  const { camera } = useThree();
  const [lodLevel, setLodLevel] = useState(LOD_LEVELS.MEDIUM);

  // Parse terrain from full description
  const terrainFeatures = useMemo(() => parseTerrainFromLore(description), [description]);
  const terrainVisuals = useMemo(
    () => generateTerrainVisuals(terrainFeatures, color),
    [terrainFeatures, color]
  );

  // Calculate LOD level based on camera distance
  useFrame(() => {
    if (!groupRef.current) return;
    
    // Get world position of the planet
    const planetWorldPos = new THREE.Vector3();
    groupRef.current.getWorldPosition(planetWorldPos);
    
    const distance = camera.position.distanceTo(planetWorldPos);
    const relativeDistance = distance / size;
    
    let newLod: number;
    if (relativeDistance < 2.5) {
      newLod = LOD_LEVELS.ULTRA;
    } else if (relativeDistance < 5) {
      newLod = LOD_LEVELS.HIGH;
    } else if (relativeDistance < 10) {
      newLod = LOD_LEVELS.MEDIUM;
    } else {
      newLod = LOD_LEVELS.LOW;
    }
    
    if (newLod !== lodLevel) {
      setLodLevel(newLod);
    }
  });

  // Create procedural geometry with terrain heavily influenced by lore and LOD
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
    const noise3D4 = createNoise3D(() => ((seed + 98765) % 10000) / 10000); // Extra noise for micro-detail
    
    // Dynamic segment count based on LOD level
    const hasComplexTerrain = terrainFeatures.hasMountains || terrainFeatures.hasVolcanoes || terrainFeatures.hasCanyons;
    const hasHighDetail = terrainFeatures.hasCrystals || terrainFeatures.hasForests || terrainFeatures.hasFungal;
    
    // LOD-based segment scaling
    let baseSegments: number;
    switch (lodLevel) {
      case LOD_LEVELS.ULTRA:
        baseSegments = 192; // Maximum detail when very close
        break;
      case LOD_LEVELS.HIGH:
        baseSegments = 160; // High detail for close viewing
        break;
      case LOD_LEVELS.MEDIUM:
        baseSegments = hasComplexTerrain ? 128 : hasHighDetail ? 112 : 96;
        break;
      default:
        baseSegments = 64; // Low detail for far viewing
    }
    
    const segments = baseSegments;
    const geo = new THREE.SphereGeometry(size, segments, segments);
    const positions = geo.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    
    // LOD-based noise octaves for detail
    const continentOctaves = lodLevel === LOD_LEVELS.ULTRA ? 8 : lodLevel === LOD_LEVELS.HIGH ? 7 : 5;
    const mountainOctaves = lodLevel === LOD_LEVELS.ULTRA ? 8 : lodLevel === LOD_LEVELS.HIGH ? 7 : 6;
    const microDetailOctaves = lodLevel === LOD_LEVELS.ULTRA ? 6 : lodLevel === LOD_LEVELS.HIGH ? 4 : 2;
    
    // Get terrain parameters from parsed features
    const { continentFrequency, mountainFrequency, detailLevel } = terrainVisuals;
    const mountainScale = getMountainScale(terrainFeatures.mountainScale);
    
    // Enhanced detail frequency based on LOD
    const lodDetailMultiplier = lodLevel === LOD_LEVELS.ULTRA ? 4 : lodLevel === LOD_LEVELS.HIGH ? 2.5 : 1;
    
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
      let continentNoise = fbm(noise3D, nx * continentFrequency, ny * continentFrequency, nz * continentFrequency, continentOctaves);
      
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
      let mountainNoise = ridgeFbm(noise3D2, nx * mountainFrequency, ny * mountainFrequency, nz * mountainFrequency, mountainOctaves);
      
      // High gravity flattens terrain
      if (terrainFeatures.highGravity) {
        mountainNoise *= 0.4;
      }
      // Low gravity allows taller formations
      if (terrainFeatures.lowGravity) {
        mountainNoise *= 1.5;
      }
      
      // === DETAIL NOISE with LOD-based frequency ===
      const detailFreq = 12 * detailLevel * lodDetailMultiplier;
      const detailNoise = fbm(noise3D, nx * detailFreq, ny * detailFreq, nz * detailFreq, microDetailOctaves) * 0.25;
      
      // === MICRO-DETAIL for close-up viewing (forests, rocks, dunes) ===
      let microDetail = 0;
      const biomeNoiseForDetail = noise3D(nx * 4, ny * 4, nz * 4); // Pre-calculate for micro-detail
      
      if (lodLevel <= LOD_LEVELS.HIGH) {
        // High frequency detail that appears when zoomed in
        const microFreq = 30 * lodDetailMultiplier;
        microDetail = fbm(noise3D4, nx * microFreq, ny * microFreq, nz * microFreq, microDetailOctaves) * 0.008;
        
        // Add extra bump for forest areas
        if (terrainFeatures.hasForests || terrainFeatures.forestType !== 'none') {
          const forestNoise = fbm(noise3D4, nx * 50, ny * 50, nz * 50, 4);
          if (forestNoise > 0.3 && latitude < 0.6 && latitude > 0.1) {
            microDetail += forestNoise * 0.015; // Tree canopy bumps
          }
        }
        
        // Rocky terrain detail
        if (terrainFeatures.hasMountains && mountainNoise > 0.3) {
          const rockNoise = fbm(noise3D4, nx * 80, ny * 80, nz * 80, 3);
          microDetail += rockNoise * 0.01;
        }
        
        // Sand dune ripples for desert
        if (terrainFeatures.hasDeserts) {
          const duneNoise = noise3D4(nx * 100, ny * 100, nz * 100);
          if (biomeNoiseForDetail > 0.2 && latitude < 0.5) {
            microDetail += Math.abs(duneNoise) * 0.006;
          }
        }
      }
      
      // === VOLCANIC RIDGES (declare before ultra-detail) ===
      let volcanoNoise = 0;
      if (terrainFeatures.hasVolcanoes) {
        volcanoNoise = Math.pow(ridgeNoise(noise3D2, nx * 2, ny * 2, nz * 2), 3);
        if (terrainFeatures.volcanoIntensity === 'extreme') {
          volcanoNoise *= 1.5;
        }
      }
      
      // === ULTRA-DETAIL for extreme close-up ===
      let ultraDetail = 0;
      if (lodLevel === LOD_LEVELS.ULTRA) {
        // Individual tree/vegetation bumps
        const treeFreq = 150;
        const treeNoise = noise3D4(nx * treeFreq, ny * treeFreq, nz * treeFreq);
        
        if (terrainFeatures.hasForests && latitude < 0.55 && latitude > 0.15) {
          // Create tree-like bumps in forest areas
          if (treeNoise > 0.4) {
            ultraDetail += (treeNoise - 0.4) * 0.02;
          }
        }
        
        // Crystal formations
        if (terrainFeatures.hasCrystals) {
          const crystalNoise = noise3D4(nx * 200, ny * 200, nz * 200);
          if (crystalNoise > 0.6) {
            ultraDetail += (crystalNoise - 0.6) * 0.025;
          }
        }
        
        // Volcanic rock detail
        if (terrainFeatures.hasVolcanoes && volcanoNoise > 0.4) {
          const lavaRockNoise = fbm(noise3D4, nx * 120, ny * 120, nz * 120, 3);
          ultraDetail += lavaRockNoise * 0.008;
        }
      }
      
      // === CRATER NOISE for barren/scarred worlds ===
      let craterEffect = 1;
      if (terrainFeatures.isBarren || terrainFeatures.hasScarredTerrain) {
        craterEffect = craterNoise(noise3D3, nx * 2, ny * 2, nz * 2, 12);
      }
      
      // === COMBINE ELEVATION ===
      let elevation = continentNoise * 0.5;
      
      // Add terrain details on land only
      if (elevation > oceanThreshold) {
        elevation += mountainNoise * mountainScale;
        elevation += detailNoise * 0.02;
        elevation += volcanoNoise * 0.05;
        
        // Add LOD-based micro and ultra detail
        elevation += microDetail;
        elevation += ultraDetail;
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
      
      // === DISPLACEMENT - more dramatic based on terrain features and LOD ===
      // Higher displacement for more pronounced terrain visibility
      const baseDisplacement = terrainFeatures.hasMountains ? 0.35 : 0.2;
      const lodDisplacementBoost = lodLevel === LOD_LEVELS.ULTRA ? 1.15 : lodLevel === LOD_LEVELS.HIGH ? 1.08 : 1.0;
      const displacementMultiplier = (terrainFeatures.highGravity ? baseDisplacement * 0.6 : 
                                     terrainFeatures.lowGravity ? baseDisplacement * 1.4 : baseDisplacement) * lodDisplacementBoost;
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
    
    // Ocean surface geometry with wave displacement
    const oceanSegments = lodLevel === LOD_LEVELS.ULTRA ? 96 : lodLevel === LOD_LEVELS.HIGH ? 72 : 48;
    const oceanGeo = new THREE.SphereGeometry(size * 1.002, oceanSegments, oceanSegments);
    const oceanPositions = oceanGeo.attributes.position;
    const oceanColors = new Float32Array(oceanPositions.count * 3);
    
    // Get ocean base colors
    const oceanBaseColor = new THREE.Color(terrainVisuals.oceanColor);
    const oceanDeepColor = new THREE.Color(terrainVisuals.oceanColor).multiplyScalar(0.3);
    const oceanShallowColor = new THREE.Color(terrainVisuals.oceanColor).lerp(new THREE.Color('#60C8FA'), 0.4);
    const oceanFoamColor = new THREE.Color('#E8F4F8');
    
    for (let i = 0; i < oceanPositions.count; i++) {
      const x = oceanPositions.getX(i);
      const y = oceanPositions.getY(i);
      const z = oceanPositions.getZ(i);
      const length = Math.sqrt(x * x + y * y + z * z);
      const nx = x / length;
      const ny = y / length;
      const nz = z / length;
      
      // Wave patterns using multiple noise layers
      const waveFreq1 = 8;
      const waveFreq2 = 16;
      const waveFreq3 = 32;
      
      // Large ocean swells
      const largeWave = noise3D(nx * waveFreq1, ny * waveFreq1, nz * waveFreq1) * 0.004;
      // Medium waves
      const mediumWave = noise3D2(nx * waveFreq2, ny * waveFreq2, nz * waveFreq2) * 0.002;
      // Small ripples (only visible when close)
      const smallWave = lodLevel <= LOD_LEVELS.HIGH 
        ? noise3D3(nx * waveFreq3, ny * waveFreq3, nz * waveFreq3) * 0.001 
        : 0;
      
      const totalWave = largeWave + mediumWave + smallWave;
      
      // Apply wave displacement
      const waveDisplacement = 1 + totalWave;
      oceanPositions.setXYZ(i, 
        nx * size * 1.002 * waveDisplacement, 
        ny * size * 1.002 * waveDisplacement, 
        nz * size * 1.002 * waveDisplacement
      );
      
      // Color variation based on wave height and depth patterns
      const depthNoise = fbm(noise3D, nx * 3, ny * 3, nz * 3, 3);
      const latitude = Math.abs(ny);
      
      // Create depth zones
      let oceanVertexColor = new THREE.Color();
      
      if (depthNoise < -0.2) {
        // Deep ocean trenches
        oceanVertexColor.copy(oceanDeepColor);
      } else if (depthNoise < 0.1) {
        // Normal ocean depth
        const t = (depthNoise + 0.2) / 0.3;
        oceanVertexColor.lerpColors(oceanDeepColor, oceanBaseColor, t);
      } else if (depthNoise < 0.3) {
        // Shallow waters near land
        const t = (depthNoise - 0.1) / 0.2;
        oceanVertexColor.lerpColors(oceanBaseColor, oceanShallowColor, t);
      } else {
        // Very shallow / reef areas
        oceanVertexColor.copy(oceanShallowColor);
        // Add foam-like highlights
        if (totalWave > 0.003) {
          oceanVertexColor.lerp(oceanFoamColor, (totalWave - 0.003) * 50);
        }
      }
      
      // Polar ice edge effect
      if (latitude > 0.7) {
        const iceFactor = (latitude - 0.7) / 0.3;
        oceanVertexColor.lerp(new THREE.Color('#B8D4E8'), iceFactor * 0.5);
      }
      
      // Wave crest highlights
      if (totalWave > 0.004) {
        oceanVertexColor.lerp(oceanFoamColor, (totalWave - 0.004) * 30);
      }
      
      oceanColors[i * 3] = oceanVertexColor.r;
      oceanColors[i * 3 + 1] = oceanVertexColor.g;
      oceanColors[i * 3 + 2] = oceanVertexColor.b;
    }
    
    oceanGeo.setAttribute('color', new THREE.BufferAttribute(oceanColors, 3));
    oceanGeo.computeVertexNormals();
    
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
  }, [size, color, description, terrainFeatures, terrainVisuals, lodLevel]);

  // Animate clouds, ocean, and special effects
  const oceanTimeRef = useRef(0);
  
  useFrame((_, delta) => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.015;
    }
    if (atmosphereRef.current && terrainFeatures.hasMagicAura) {
      atmosphereRef.current.rotation.y += delta * 0.03;
    }
    // Subtle ocean rotation for wave animation effect
    if (oceanRef.current) {
      oceanTimeRef.current += delta;
      oceanRef.current.rotation.y += delta * 0.008;
    }
  });

  return (
    <group ref={groupRef}>
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
      
      {/* Ocean layer with waves, depth, and specular highlight */}
      {terrainFeatures.oceanCoverage > 0.05 && (
        <>
          {/* Deep ocean base layer */}
          <mesh>
            <sphereGeometry args={[size * 0.999, 32, 32]} />
            <meshStandardMaterial
              color={new THREE.Color(terrainVisuals.oceanColor).multiplyScalar(0.25)}
              roughness={0.9}
              metalness={0.1}
            />
          </mesh>
          
          {/* Main ocean surface with waves */}
          <mesh ref={oceanRef} geometry={oceanGeometry}>
            <meshStandardMaterial
              vertexColors
              transparent
              opacity={isHovered ? 0.75 : 0.65}
              roughness={0.1}
              metalness={0.6}
              envMapIntensity={1.2}
            />
          </mesh>
          
          {/* Ocean specular highlight layer */}
          <mesh>
            <sphereGeometry args={[size * 1.003, 24, 24]} />
            <meshBasicMaterial
              color="#FFFFFF"
              transparent
              opacity={isHovered ? 0.08 : 0.04}
              depthWrite={false}
            />
          </mesh>
        </>
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
      
      {/* City lights on the night side */}
      {terrainFeatures.hasCities && (
        <CityLights 
          size={size} 
          description={description}
          intensity={isHovered ? 1.5 : 1.0}
          color="#FFD080"
        />
      )}
      
      {/* Surface Points of Interest - visible when zoomed in */}
      <SurfacePOIs
        size={size}
        description={description}
        planetName={planetName}
        onPOIClick={onPOIClick}
      />
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
