/**
 * Moon Surface Component
 * 
 * Creates procedural terrain for moons with:
 * - Crater impacts (primary moon feature)
 * - Barren, rocky landscapes
 * - Optional ice/frozen features
 * - Volcanic activity based on description
 * - Low-poly silhouette for performance
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

interface MoonSurfaceProps {
  size: number;
  color: string;
  description?: string;
  isHovered?: boolean;
}

// Multi-octave noise for terrain detail
function fbm(noise3D: ReturnType<typeof createNoise3D>, x: number, y: number, z: number, octaves: number = 4): number {
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

// Crater noise - creates bowl-shaped depressions
function craterNoise(noise3D: ReturnType<typeof createNoise3D>, x: number, y: number, z: number, count: number = 15): number {
  let elevation = 0;
  
  for (let i = 0; i < count; i++) {
    // Pseudo-random crater positions based on index
    const cx = noise3D(i * 17.3, 0, 0);
    const cy = noise3D(0, i * 23.7, 0);
    const cz = noise3D(0, 0, i * 31.1);
    
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2);
    const craterSize = 0.15 + Math.abs(noise3D(i * 7, i * 11, i * 13)) * 0.35;
    
    if (dist < craterSize) {
      // Crater bowl shape
      const normalizedDist = dist / craterSize;
      const bowlDepth = Math.pow(normalizedDist, 2) - 1;
      // Rim around crater
      const rimHeight = Math.max(0, 1 - Math.pow((normalizedDist - 0.9) * 5, 2)) * 0.15;
      
      elevation = Math.min(elevation, bowlDepth * 0.08 * (1 - i / count)); // Larger craters are deeper
      elevation += rimHeight;
    }
  }
  
  return elevation;
}

// Parse moon description for terrain features
interface MoonTerrainFeatures {
  hasCraters: boolean;
  craterDensity: number;
  hasIce: boolean;
  hasVolcanoes: boolean;
  hasRidges: boolean;
  isBarren: boolean;
  hasDust: boolean;
  hasWater: boolean;
  primaryBiome: 'barren' | 'icy' | 'volcanic' | 'dusty' | 'rocky';
  glowColor: string | null;
}

function parseMoonDescription(description: string): MoonTerrainFeatures {
  const text = description.toLowerCase();
  
  const hasKeyword = (keywords: string[]) => keywords.some(k => text.includes(k));
  
  const hasCraters = hasKeyword(['crater', 'impact', 'bombardment', 'pocked', 'scarred']);
  const hasIce = hasKeyword(['ice', 'frozen', 'cold', 'frigid', 'glacier', 'snow', 'frost', 'arctic', 'polar']);
  const hasVolcanoes = hasKeyword(['volcano', 'volcanic', 'lava', 'magma', 'eruption', 'molten', 'active']);
  const hasRidges = hasKeyword(['ridge', 'mountain', 'peak', 'highland', 'cliff', 'canyon']);
  const isBarren = hasKeyword(['barren', 'desolate', 'lifeless', 'dead', 'empty', 'uninhabited']);
  const hasDust = hasKeyword(['dust', 'sand', 'ash', 'powder', 'regolith']);
  const hasWater = hasKeyword(['water', 'ocean', 'sea', 'lake', 'subsurface ocean']);
  
  // Crater density based on keywords
  let craterDensity = 0.5; // Default moderate
  if (hasKeyword(['heavily cratered', 'bombardment', 'many craters'])) craterDensity = 1;
  else if (hasKeyword(['few craters', 'smooth'])) craterDensity = 0.2;
  else if (hasCraters) craterDensity = 0.7;
  
  // Determine primary biome
  let primaryBiome: MoonTerrainFeatures['primaryBiome'] = 'barren';
  if (hasVolcanoes) primaryBiome = 'volcanic';
  else if (hasIce) primaryBiome = 'icy';
  else if (hasDust) primaryBiome = 'dusty';
  else if (hasRidges) primaryBiome = 'rocky';
  
  // Glow color for special features
  let glowColor: string | null = null;
  if (hasVolcanoes) glowColor = '#FF4500';
  else if (hasKeyword(['glow', 'luminous', 'radiant'])) {
    if (hasKeyword(['blue'])) glowColor = '#60A5FA';
    else if (hasKeyword(['green'])) glowColor = '#4ADE80';
    else if (hasKeyword(['purple'])) glowColor = '#A855F7';
    else glowColor = '#FCD34D';
  }
  
  return {
    hasCraters,
    craterDensity,
    hasIce,
    hasVolcanoes,
    hasRidges,
    isBarren,
    hasDust,
    hasWater,
    primaryBiome,
    glowColor,
  };
}

// Get colors based on moon biome
function getMoonColors(features: MoonTerrainFeatures, baseColor: string): { 
  primary: THREE.Color; 
  secondary: THREE.Color; 
  accent: THREE.Color;
  craterFloor: THREE.Color;
} {
  const base = new THREE.Color(baseColor);
  
  switch (features.primaryBiome) {
    case 'icy':
      return {
        primary: new THREE.Color('#E0F2FE'),
        secondary: new THREE.Color('#BAE6FD'),
        accent: new THREE.Color('#7DD3FC'),
        craterFloor: new THREE.Color('#0EA5E9'),
      };
    case 'volcanic':
      return {
        primary: new THREE.Color('#292524'),
        secondary: new THREE.Color('#44403C'),
        accent: new THREE.Color('#FF4500'),
        craterFloor: new THREE.Color('#7F1D1D'),
      };
    case 'dusty':
      return {
        primary: new THREE.Color('#A8A29E'),
        secondary: new THREE.Color('#78716C'),
        accent: new THREE.Color('#D6D3D1'),
        craterFloor: new THREE.Color('#57534E'),
      };
    case 'rocky':
      return {
        primary: new THREE.Color('#6B7280'),
        secondary: new THREE.Color('#4B5563'),
        accent: new THREE.Color('#9CA3AF'),
        craterFloor: new THREE.Color('#374151'),
      };
    case 'barren':
    default:
      // Use base color but desaturated for moon-like appearance
      const desaturated = base.clone();
      const hsl = { h: 0, s: 0, l: 0 };
      desaturated.getHSL(hsl);
      desaturated.setHSL(hsl.h, hsl.s * 0.3, hsl.l * 0.8);
      
      return {
        primary: desaturated,
        secondary: desaturated.clone().offsetHSL(0, 0, -0.1),
        accent: desaturated.clone().offsetHSL(0, 0, 0.1),
        craterFloor: desaturated.clone().offsetHSL(0, 0, -0.2),
      };
  }
}

export default function MoonSurface({
  size,
  color,
  description = '',
  isHovered = false,
}: MoonSurfaceProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // Parse terrain from description
  const features = useMemo(() => parseMoonDescription(description), [description]);
  const colors = useMemo(() => getMoonColors(features, color), [features, color]);

  // Create procedural geometry
  const geometry = useMemo(() => {
    // Seed from description for consistency
    let seed = 0;
    for (let i = 0; i < description.length; i++) {
      seed = description.charCodeAt(i) + ((seed << 5) - seed);
    }
    seed = Math.abs(seed) || 54321;

    const noise3D = createNoise3D(() => (seed % 10000) / 10000);
    const noise3D2 = createNoise3D(() => ((seed + 12345) % 10000) / 10000);
    
    // Lower resolution than planets for performance
    const segments = 32;
    const geo = new THREE.SphereGeometry(size, segments, segments);
    const positions = geo.attributes.position;
    const vertexColors = new Float32Array(positions.count * 3);
    
    const craterCount = Math.floor(10 + features.craterDensity * 20);
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      const length = Math.sqrt(x * x + y * y + z * z);
      const nx = x / length;
      const ny = y / length;
      const nz = z / length;
      
      // Latitude for polar features
      const latitude = Math.abs(ny);
      
      // Base terrain noise
      let elevation = fbm(noise3D, nx * 2, ny * 2, nz * 2, 4) * 0.03;
      
      // Add craters
      const craterElevation = craterNoise(noise3D2, nx, ny, nz, craterCount);
      elevation += craterElevation;
      
      // Add ridges if present
      if (features.hasRidges) {
        const ridgeNoise = Math.abs(noise3D(nx * 4, ny * 4, nz * 4));
        elevation += ridgeNoise * ridgeNoise * 0.04;
      }
      
      // Apply displacement
      const displacement = 1 + elevation;
      positions.setXYZ(i, nx * size * displacement, ny * size * displacement, nz * size * displacement);
      
      // Calculate color based on elevation and features
      let vertexColor: THREE.Color;
      
      if (craterElevation < -0.02) {
        // Crater floor
        vertexColor = colors.craterFloor.clone();
        // Add lava glow in volcanic craters
        if (features.hasVolcanoes && craterElevation < -0.04) {
          vertexColor = new THREE.Color('#FF4500');
        }
      } else if (craterElevation > 0.01) {
        // Crater rim - lighter
        vertexColor = colors.accent.clone();
      } else if (features.hasIce && latitude > 0.7) {
        // Polar ice caps
        const iceBlend = (latitude - 0.7) / 0.3;
        vertexColor = colors.primary.clone().lerp(new THREE.Color('#FFFFFF'), iceBlend * 0.5);
      } else {
        // Normal surface
        const heightBlend = (elevation + 0.05) / 0.1;
        vertexColor = colors.primary.clone().lerp(colors.secondary, Math.max(0, Math.min(1, heightBlend)));
      }
      
      // Add subtle noise variation
      const colorNoise = noise3D(nx * 8, ny * 8, nz * 8) * 0.1;
      vertexColor.offsetHSL(0, 0, colorNoise);
      
      vertexColors[i * 3] = vertexColor.r;
      vertexColors[i * 3 + 1] = vertexColor.g;
      vertexColors[i * 3 + 2] = vertexColor.b;
    }
    
    geo.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3));
    geo.computeVertexNormals();
    
    return geo;
  }, [size, description, features, colors]);

  // Animate glow for volcanic moons
  useFrame((state) => {
    if (glowRef.current && features.hasVolcanoes) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      glowRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group>
      {/* Main moon surface */}
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          roughness={0.95}
          metalness={0.05}
          emissive={features.hasVolcanoes ? '#FF4500' : '#000000'}
          emissiveIntensity={features.hasVolcanoes ? 0.1 : 0}
        />
      </mesh>
      
      {/* Glow for volcanic moons */}
      {features.glowColor && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[size * 1.05, 16, 16]} />
          <meshBasicMaterial
            color={features.glowColor}
            transparent
            opacity={0.15}
            side={THREE.BackSide}
          />
        </mesh>
      )}
      
      {/* Subtle atmosphere for icy moons */}
      {features.hasIce && (
        <mesh>
          <sphereGeometry args={[size * 1.02, 16, 16]} />
          <meshBasicMaterial
            color="#B0E0E6"
            transparent
            opacity={0.08}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}
