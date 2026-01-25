/**
 * Enhanced Planet Surface Component
 * 
 * Adds realistic procedural terrain details including:
 * - Ocean depth variation with continental shelves
 * - Mountain ranges with ridges and valleys
 * - Biome-based coloring with smooth transitions
 * - Ice caps and cloud patterns
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createNoise3D, createNoise2D } from 'simplex-noise';

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

  // Create procedural geometry with terrain
  const { geometry, oceanGeometry, cloudGeometry } = useMemo(() => {
    // Seed from description for consistency
    let seed = 0;
    for (let i = 0; i < description.length; i++) {
      seed = description.charCodeAt(i) + ((seed << 5) - seed);
    }
    seed = Math.abs(seed);

    const noise3D = createNoise3D(() => (seed % 10000) / 10000);
    const noise3D2 = createNoise3D(() => ((seed + 12345) % 10000) / 10000);
    
    // Higher resolution for detail
    const segments = 64;
    const geo = new THREE.SphereGeometry(size, segments, segments);
    const positions = geo.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    
    // Parse terrain hints from description
    const lowerDesc = description.toLowerCase();
    const mountainScale = hasMountains ? (lowerDesc.includes('massive') || lowerDesc.includes('towering') ? 0.08 : 0.05) : 0.02;
    const continentScale = 1.2;
    
    // Base colors
    const oceanDeep = new THREE.Color('#0c2d48');
    const oceanShallow = new THREE.Color('#1e5f8a');
    const coastline = new THREE.Color('#c9a962');
    const lowland = new THREE.Color('#4a7c59');
    const highland = new THREE.Color('#6b7f3c');
    const mountain = new THREE.Color('#8b7355');
    const peak = new THREE.Color('#d4d4d4');
    const snow = new THREE.Color('#f0f8ff');
    const desert = new THREE.Color('#d4a574');
    const tundra = new THREE.Color('#a8c0b0');
    const volcanic = new THREE.Color('#3d2817');
    const lava = new THREE.Color('#ff4500');
    
    // Calculate ocean level threshold based on coverage
    const oceanThreshold = -0.02 + (1 - oceanCoverage) * 0.15;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      const length = Math.sqrt(x * x + y * y + z * z);
      const nx = x / length;
      const ny = y / length;
      const nz = z / length;
      
      // Continental plates - large scale noise
      const continentNoise = fbm(noise3D, nx * continentScale, ny * continentScale, nz * continentScale, 4);
      
      // Mountain ranges - ridge noise for sharp peaks
      const mountainNoise = ridgeFbm(noise3D2, nx * 3, ny * 3, nz * 3, 5);
      
      // Fine detail noise
      const detailNoise = fbm(noise3D, nx * 8, ny * 8, nz * 8, 3) * 0.3;
      
      // Combine for elevation
      let elevation = continentNoise * 0.6;
      
      // Add mountains on land only
      if (elevation > oceanThreshold) {
        elevation += mountainNoise * mountainScale;
        elevation += detailNoise * 0.02;
      }
      
      // Apply displacement
      const displacement = 1 + elevation * 0.12;
      positions.setXYZ(i, nx * size * displacement, ny * size * displacement, nz * size * displacement);
      
      // Color based on elevation and biome
      let finalColor = new THREE.Color();
      const latitude = Math.abs(ny);
      
      if (elevation < oceanThreshold - 0.08) {
        // Deep ocean
        finalColor.copy(oceanDeep);
        const depthFactor = Math.min(1, (oceanThreshold - elevation) / 0.15);
        finalColor.lerp(new THREE.Color('#050d15'), depthFactor * 0.5);
      } else if (elevation < oceanThreshold - 0.02) {
        // Shallow ocean
        finalColor.lerpColors(oceanShallow, oceanDeep, (oceanThreshold - 0.02 - elevation) / 0.06);
      } else if (elevation < oceanThreshold) {
        // Very shallow / reef
        finalColor.lerpColors(coastline, oceanShallow, (oceanThreshold - elevation) / 0.02);
      } else if (elevation < oceanThreshold + 0.02) {
        // Beach / coastline
        finalColor.copy(coastline);
      } else if (elevation < oceanThreshold + 0.05) {
        // Lowlands
        if (hasDeserts && latitude < 0.4 && noise3D(nx * 4, ny * 4, nz * 4) > 0.2) {
          finalColor.copy(desert);
        } else if (hasForests) {
          finalColor.lerpColors(lowland, highland, (elevation - oceanThreshold - 0.02) / 0.03);
        } else {
          finalColor.copy(lowland);
        }
      } else if (elevation < oceanThreshold + 0.08) {
        // Highland / hills
        if (hasVolcanoes && mountainNoise > 0.7) {
          finalColor.copy(volcanic);
        } else {
          finalColor.lerpColors(highland, mountain, (elevation - oceanThreshold - 0.05) / 0.03);
        }
      } else {
        // Mountains and peaks
        const peakFactor = Math.min(1, (elevation - oceanThreshold - 0.08) / 0.04);
        finalColor.lerpColors(mountain, peak, peakFactor);
        
        // Volcanic glow
        if (hasVolcanoes && mountainNoise > 0.8) {
          finalColor.lerp(lava, (mountainNoise - 0.8) * 2);
        }
      }
      
      // Polar ice caps
      if (latitude > 0.75 || (hasTundra && latitude > 0.5)) {
        const iceFactor = Math.min(1, (latitude - (hasTundra ? 0.5 : 0.75)) / 0.2);
        if (elevation >= oceanThreshold) {
          finalColor.lerp(snow, iceFactor * 0.9);
        } else {
          // Sea ice
          finalColor.lerp(new THREE.Color('#b8d4e8'), iceFactor * 0.6);
        }
      }
      
      // High altitude snow
      if (elevation > oceanThreshold + 0.1 && !hasVolcanoes) {
        const snowLine = hasTundra ? 0.08 : 0.1;
        if (elevation > oceanThreshold + snowLine) {
          const snowFactor = Math.min(1, (elevation - oceanThreshold - snowLine) / 0.03);
          finalColor.lerp(snow, snowFactor * 0.8);
        }
      }
      
      colors[i * 3] = finalColor.r;
      colors[i * 3 + 1] = finalColor.g;
      colors[i * 3 + 2] = finalColor.b;
    }
    
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    
    // Ocean surface geometry (smooth sphere slightly above water level)
    const oceanGeo = new THREE.SphereGeometry(size * 1.001, 48, 48);
    
    // Cloud layer
    const cloudGeo = new THREE.SphereGeometry(size * 1.025, 32, 32);
    const cloudColors = new Float32Array(cloudGeo.attributes.position.count * 3);
    const cloudAlpha = new Float32Array(cloudGeo.attributes.position.count);
    
    for (let i = 0; i < cloudGeo.attributes.position.count; i++) {
      const x = cloudGeo.attributes.position.getX(i);
      const y = cloudGeo.attributes.position.getY(i);
      const z = cloudGeo.attributes.position.getZ(i);
      const len = Math.sqrt(x * x + y * y + z * z);
      
      const cloudNoise = fbm(noise3D2, x / len * 2, y / len * 2, z / len * 2, 4);
      const alpha = Math.max(0, cloudNoise * 0.8 + 0.1);
      
      cloudColors[i * 3] = 1;
      cloudColors[i * 3 + 1] = 1;
      cloudColors[i * 3 + 2] = 1;
      cloudAlpha[i] = alpha;
    }
    
    cloudGeo.setAttribute('color', new THREE.BufferAttribute(cloudColors, 3));
    
    return { geometry: geo, oceanGeometry: oceanGeo, cloudGeometry: cloudGeo };
  }, [size, color, description, oceanCoverage, hasMountains, hasVolcanoes, hasTundra, hasDeserts, hasForests]);

  // Animate clouds
  useFrame((_, delta) => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.02;
    }
  });

  return (
    <group>
      {/* Main terrain */}
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          roughness={0.75}
          metalness={0.1}
        />
      </mesh>
      
      {/* Ocean layer - adds specular highlight */}
      {oceanCoverage > 0.1 && (
        <mesh ref={oceanRef} geometry={oceanGeometry}>
          <meshStandardMaterial
            color="#1a4a6e"
            transparent
            opacity={0.3}
            roughness={0.1}
            metalness={0.4}
          />
        </mesh>
      )}
      
      {/* Cloud layer */}
      <mesh ref={cloudsRef} geometry={cloudGeometry}>
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={isHovered ? 0.12 : 0.08}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
