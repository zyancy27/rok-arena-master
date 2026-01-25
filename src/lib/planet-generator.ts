/**
 * Planet Generator
 * 
 * Creates 3D planets and moons with procedural geometry based on text descriptions.
 * Optimized for mobile performance with vertex colors and no heavy textures.
 */

import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

export interface PlanetParams {
  seed: number;
  radius: number;
  oceanLevel: number;        // 0-1, how much water coverage
  mountainHeight: number;    // 0-1, how prominent mountains are
  vegetation: number;        // 0-1, greenery amount
  shapeType: 'sphere' | 'cone' | 'oblong' | 'flat';
  noiseScale: number;
  subdivisions: number;
  primaryColor: string;
  secondaryColor: string;
  hasAtmosphere: boolean;
  atmosphereColor: string;
  hasRings: boolean;
}

export interface MoonParams extends Omit<PlanetParams, 'hasRings'> {
  orbitRadius: number;
  orbitSpeed: number;
  orbitPhase: number;
  orbitInclination: number;
}

// Shape distortion keywords
const SHAPE_KEYWORDS = {
  cone: ['cone', 'cone-shaped', 'pyramid', 'pointed', 'tapered'],
  oblong: ['oblong', 'egg', 'elliptical', 'oval', 'elongated', 'stretched'],
  flat: ['flat', 'flattened', 'squished', 'disc', 'pancake', 'compressed poles'],
};

// Color palettes based on biome
const COLOR_PALETTES = {
  oceanic: { primary: '#1E40AF', secondary: '#60A5FA' },
  desert: { primary: '#D97706', secondary: '#FCD34D' },
  forest: { primary: '#166534', secondary: '#4ADE80' },
  arctic: { primary: '#E0F2FE', secondary: '#7DD3FC' },
  volcanic: { primary: '#991B1B', secondary: '#F97316' },
  barren: { primary: '#78716C', secondary: '#A8A29E' },
  toxic: { primary: '#65A30D', secondary: '#BEF264' },
  temperate: { primary: '#3B82F6', secondary: '#22C55E' },
};

/**
 * Parse a text description into planet parameters
 */
export function parsePlanetDescription(text: string, overrideSeed?: number): PlanetParams {
  const lowerText = text.toLowerCase();
  
  // Generate seed from text or use override
  const seed = overrideSeed ?? hashString(text);
  
  // Detect shape type
  let shapeType: PlanetParams['shapeType'] = 'sphere';
  if (SHAPE_KEYWORDS.cone.some(k => lowerText.includes(k))) shapeType = 'cone';
  else if (SHAPE_KEYWORDS.oblong.some(k => lowerText.includes(k))) shapeType = 'oblong';
  else if (SHAPE_KEYWORDS.flat.some(k => lowerText.includes(k))) shapeType = 'flat';
  
  // Detect ocean level
  let oceanLevel = 0.3;
  if (lowerText.includes('water world') || lowerText.includes('oceanic')) oceanLevel = 0.9;
  else if (lowerText.includes('vast ocean') || lowerText.includes('large ocean')) oceanLevel = 0.7;
  else if (lowerText.includes('ocean') || lowerText.includes('sea')) oceanLevel = 0.5;
  else if (lowerText.includes('desert') || lowerText.includes('arid') || lowerText.includes('barren')) oceanLevel = 0.05;
  else if (lowerText.includes('dry') || lowerText.includes('wasteland')) oceanLevel = 0.1;
  
  // Detect mountain height
  let mountainHeight = 0.3;
  if (lowerText.includes('massive mountain') || lowerText.includes('towering peaks') || lowerText.includes('enormous')) mountainHeight = 0.9;
  else if (lowerText.includes('mountain') || lowerText.includes('peaks') || lowerText.includes('highland')) mountainHeight = 0.6;
  else if (lowerText.includes('hills') || lowerText.includes('rolling')) mountainHeight = 0.3;
  else if (lowerText.includes('flat') || lowerText.includes('plains')) mountainHeight = 0.1;
  
  // Detect vegetation
  let vegetation = 0.4;
  if (lowerText.includes('lush') || lowerText.includes('jungle') || lowerText.includes('verdant')) vegetation = 0.9;
  else if (lowerText.includes('forest') || lowerText.includes('woodland') || lowerText.includes('green')) vegetation = 0.7;
  else if (lowerText.includes('sparse') || lowerText.includes('scrub')) vegetation = 0.3;
  else if (lowerText.includes('barren') || lowerText.includes('lifeless') || lowerText.includes('dead')) vegetation = 0;
  else if (lowerText.includes('desert') || lowerText.includes('ice') || lowerText.includes('frozen')) vegetation = 0.1;
  
  // Determine color palette
  let palette = COLOR_PALETTES.temperate;
  if (oceanLevel > 0.7) palette = COLOR_PALETTES.oceanic;
  else if (lowerText.includes('volcanic') || lowerText.includes('lava') || lowerText.includes('magma')) palette = COLOR_PALETTES.volcanic;
  else if (lowerText.includes('desert') || lowerText.includes('sand') || lowerText.includes('dunes')) palette = COLOR_PALETTES.desert;
  else if (lowerText.includes('ice') || lowerText.includes('frozen') || lowerText.includes('arctic') || lowerText.includes('tundra')) palette = COLOR_PALETTES.arctic;
  else if (lowerText.includes('toxic') || lowerText.includes('poisonous') || lowerText.includes('acid')) palette = COLOR_PALETTES.toxic;
  else if (lowerText.includes('barren') || lowerText.includes('dead') || lowerText.includes('lifeless')) palette = COLOR_PALETTES.barren;
  else if (vegetation > 0.5) palette = COLOR_PALETTES.forest;
  
  // Atmosphere
  const hasAtmosphere = !lowerText.includes('no atmosphere') && !lowerText.includes('airless') && !lowerText.includes('vacuum');
  let atmosphereColor = '#87CEEB';
  if (lowerText.includes('toxic') || lowerText.includes('poisonous')) atmosphereColor = '#ADFF2F';
  else if (lowerText.includes('volcanic')) atmosphereColor = '#FF6B35';
  else if (lowerText.includes('ice') || lowerText.includes('frozen')) atmosphereColor = '#E0FFFF';
  
  // Rings
  const hasRings = lowerText.includes('ring') || lowerText.includes('saturn');
  
  return {
    seed,
    radius: 1.0,
    oceanLevel,
    mountainHeight,
    vegetation,
    shapeType,
    noiseScale: 2.0 + (seed % 100) / 50,
    subdivisions: 3,
    primaryColor: palette.primary,
    secondaryColor: palette.secondary,
    hasAtmosphere,
    atmosphereColor,
    hasRings,
  };
}

/**
 * Simple hash function for generating seeds from strings
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Seeded random number generator
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Create planet geometry with shape distortion
 */
function createPlanetGeometry(params: PlanetParams): THREE.BufferGeometry {
  const { radius, shapeType, subdivisions, seed, mountainHeight, noiseScale } = params;
  
  // Base sphere geometry with proper subdivision
  const detail = Math.max(2, Math.min(4, subdivisions));
  const widthSegments = 16 * detail;
  const heightSegments = 12 * detail;
  
  const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  const positions = geometry.attributes.position;
  const noise3D = createNoise3D(() => (seed % 1000) / 1000);
  
  // Apply shape distortion and noise
  for (let i = 0; i < positions.count; i++) {
    let x = positions.getX(i);
    let y = positions.getY(i);
    let z = positions.getZ(i);
    
    // Normalize to get direction
    const length = Math.sqrt(x * x + y * y + z * z);
    const nx = x / length;
    const ny = y / length;
    const nz = z / length;
    
    // Shape distortion
    let shapeFactor = 1;
    switch (shapeType) {
      case 'cone':
        // Taper towards bottom (negative y)
        shapeFactor = 0.5 + (ny + 1) * 0.5; // 0.5 at bottom, 1.5 at top
        break;
      case 'oblong':
        // Stretch along y-axis
        shapeFactor = 1 + Math.abs(ny) * 0.4;
        break;
      case 'flat':
        // Compress y-axis
        shapeFactor = 1 - Math.abs(ny) * 0.4;
        break;
    }
    
    // Apply noise for terrain
    const noiseValue = noise3D(nx * noiseScale, ny * noiseScale, nz * noiseScale);
    const displacement = 1 + noiseValue * mountainHeight * 0.15;
    
    // Final position
    const finalRadius = radius * shapeFactor * displacement;
    positions.setXYZ(i, nx * finalRadius, ny * finalRadius * (shapeType === 'flat' ? 0.7 : 1), nz * finalRadius);
  }
  
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Apply vertex colors based on elevation and parameters
 */
function applyVertexColors(geometry: THREE.BufferGeometry, params: PlanetParams): void {
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  
  const { seed, oceanLevel, vegetation, primaryColor, secondaryColor } = params;
  const noise3D = createNoise3D(() => (seed % 1000) / 1000);
  const random = seededRandom(seed);
  
  // Parse colors
  const primary = new THREE.Color(primaryColor);
  const secondary = new THREE.Color(secondaryColor);
  const oceanColor = new THREE.Color('#1E3A5F');
  const landColor = new THREE.Color('#8B7355');
  const vegetationColor = new THREE.Color('#2D5A27');
  const snowColor = new THREE.Color('#FFFFFF');
  
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    
    // Calculate elevation (distance from center relative to average)
    const dist = Math.sqrt(x * x + y * y + z * z);
    const avgRadius = params.radius;
    const elevation = (dist - avgRadius) / avgRadius;
    
    // Normalize position for noise sampling
    const nx = x / dist;
    const ny = y / dist;
    const nz = z / dist;
    
    // Determine color based on elevation and noise
    const noiseValue = noise3D(nx * 3, ny * 3, nz * 3);
    let color = new THREE.Color();
    
    // Ocean check (lower elevations)
    if (elevation < -0.02 + (1 - oceanLevel) * 0.1) {
      color.copy(oceanColor);
      // Add some variation
      color.lerp(secondary, noiseValue * 0.3 + 0.2);
    }
    // Land
    else {
      // Base land color
      color.copy(landColor);
      
      // Add vegetation
      if (vegetation > 0 && noiseValue > 0.3 - vegetation * 0.5) {
        color.lerp(vegetationColor, vegetation * (0.5 + noiseValue * 0.5));
      }
      
      // Snow caps at high latitudes and elevations
      if (Math.abs(ny) > 0.7 || elevation > 0.08) {
        color.lerp(snowColor, Math.min(1, (Math.abs(ny) - 0.6) * 2 + elevation * 5));
      }
      
      // Blend with primary/secondary colors
      color.lerp(primary, 0.2);
    }
    
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/**
 * Create a planet mesh and add it to the scene
 */
export function createPlanet(scene: THREE.Scene, params: PlanetParams): THREE.Mesh {
  const geometry = createPlanetGeometry(params);
  applyVertexColors(geometry, params);
  
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.8,
    metalness: 0.1,
    flatShading: false,
  });
  
  const planet = new THREE.Mesh(geometry, material);
  planet.name = 'planet';
  scene.add(planet);
  
  // Add atmosphere if enabled
  if (params.hasAtmosphere) {
    const atmosphereGeometry = new THREE.SphereGeometry(params.radius * 1.08, 32, 32);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: params.atmosphereColor,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    atmosphere.name = 'atmosphere';
    planet.add(atmosphere);
  }
  
  // Add rings if enabled
  if (params.hasRings) {
    const ringGeometry = new THREE.RingGeometry(params.radius * 1.4, params.radius * 2.2, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: '#C4A484',
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const rings = new THREE.Mesh(ringGeometry, ringMaterial);
    rings.rotation.x = Math.PI / 2.5;
    rings.name = 'rings';
    planet.add(rings);
  }
  
  return planet;
}

/**
 * Create a moon mesh with orbit parameters
 */
export function createMoon(scene: THREE.Scene, params: MoonParams): THREE.Mesh {
  // Moons are simpler - no atmosphere, smaller, less vegetation
  const moonParams: PlanetParams = {
    ...params,
    radius: params.radius * 0.3 + 0.1,
    vegetation: 0,
    hasAtmosphere: false,
    hasRings: false,
    mountainHeight: params.mountainHeight * 0.5,
    subdivisions: Math.max(2, params.subdivisions - 1),
  };
  
  const geometry = createPlanetGeometry(moonParams);
  applyVertexColors(geometry, moonParams);
  
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: false,
  });
  
  const moon = new THREE.Mesh(geometry, material);
  moon.name = 'moon';
  
  // Store orbit data as userData
  moon.userData = {
    orbitRadius: params.orbitRadius,
    orbitSpeed: params.orbitSpeed,
    orbitPhase: params.orbitPhase,
    orbitInclination: params.orbitInclination,
    angle: params.orbitPhase,
  };
  
  // Initial position
  moon.position.set(
    Math.cos(params.orbitPhase) * params.orbitRadius,
    Math.sin(params.orbitInclination) * params.orbitRadius * 0.1,
    Math.sin(params.orbitPhase) * params.orbitRadius
  );
  
  scene.add(moon);
  return moon;
}

/**
 * Update moon orbit position
 */
export function updateMoonOrbit(moon: THREE.Mesh, deltaTime: number): void {
  const { orbitRadius, orbitSpeed, orbitInclination } = moon.userData;
  moon.userData.angle += deltaTime * orbitSpeed;
  
  const angle = moon.userData.angle;
  moon.position.set(
    Math.cos(angle) * orbitRadius,
    Math.sin(orbitInclination) * Math.sin(angle * 0.5) * orbitRadius * 0.15,
    Math.sin(angle) * orbitRadius
  );
}

/**
 * Generate moon parameters from description
 */
export function parseMoonDescription(text: string, index: number, overrideSeed?: number): MoonParams {
  const baseParams = parsePlanetDescription(text, overrideSeed);
  const random = seededRandom(baseParams.seed + index);
  
  return {
    ...baseParams,
    radius: 0.25 + random() * 0.15, // 0.25 - 0.4
    vegetation: 0, // Moons have no vegetation
    orbitRadius: 2.0 + random() * 2.0, // 2.0 - 4.0
    orbitSpeed: 0.1 + random() * 0.25, // 0.1 - 0.35
    orbitPhase: random() * Math.PI * 2,
    orbitInclination: (random() - 0.5) * 0.5, // Slight inclination variation
    hasAtmosphere: false,
  };
}

/**
 * Clear all generated objects from scene
 */
export function clearGeneratedObjects(scene: THREE.Scene): void {
  const toRemove: THREE.Object3D[] = [];
  scene.traverse((obj) => {
    if (obj.name === 'planet' || obj.name === 'moon') {
      toRemove.push(obj);
    }
  });
  toRemove.forEach((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
    scene.remove(obj);
  });
}
