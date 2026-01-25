/**
 * Surface Points of Interest (POIs) Component
 * 
 * Displays clickable markers on planet surfaces for cities, ruins, forests, etc.
 * Markers appear when the camera is zoomed in close enough.
 */

import { useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';
import { parseTerrainFromLore } from '@/lib/planet-terrain';
import { useIsMobile } from '@/hooks/use-mobile';

interface POI {
  id: string;
  type: 'city' | 'ruins' | 'forest' | 'mountain' | 'volcano' | 'crystal' | 'cave' | 'temple';
  name: string;
  position: THREE.Vector3;
  color: string;
  icon: string;
}

interface SurfacePOIsProps {
  size: number;
  description: string;
  planetName: string;
  onPOIClick?: (poi: POI) => void;
}

const POI_CONFIGS = {
  city: { icon: '🏙️', color: '#FFD700', names: ['Capital', 'Metropolis', 'Settlement', 'Outpost', 'Colony', 'Harbor'] },
  ruins: { icon: '🏛️', color: '#8B7355', names: ['Ancient Ruins', 'Lost Temple', 'Old Fortress', 'Forgotten City', 'Relic Site'] },
  forest: { icon: '🌲', color: '#228B22', names: ['Great Forest', 'Dense Jungle', 'Sacred Grove', 'Ancient Woods', 'Emerald Canopy'] },
  mountain: { icon: '⛰️', color: '#6B7280', names: ['High Peak', 'Mountain Range', 'Summit', 'Rocky Heights', 'Stone Giant'] },
  volcano: { icon: '🌋', color: '#FF4500', names: ['Active Volcano', 'Fire Mountain', 'Lava Fields', 'Ash Peak', 'Burning Caldera'] },
  crystal: { icon: '💎', color: '#8B5CF6', names: ['Crystal Cavern', 'Gem Deposits', 'Shimmering Fields', 'Crystal Spire'] },
  cave: { icon: '🕳️', color: '#374151', names: ['Deep Cavern', 'Underground Network', 'Dark Depths', 'Hidden Cave'] },
  temple: { icon: '⛩️', color: '#9333EA', names: ['Sacred Temple', 'Holy Sanctuary', 'Ancient Shrine', 'Mystic Monument'] },
};

export default function SurfacePOIs({ size, description, planetName, onPOIClick }: SurfacePOIsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const [visible, setVisible] = useState(false);
  const [hoveredPOI, setHoveredPOI] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Parse terrain to determine which POI types to generate
  const terrainFeatures = useMemo(() => parseTerrainFromLore(description), [description]);

  // Generate POIs based on terrain features
  const pois = useMemo(() => {
    const result: POI[] = [];
    
    // Create deterministic seed from planet name + description
    let seed = 0;
    const seedStr = planetName + description;
    for (let i = 0; i < seedStr.length; i++) {
      seed = seedStr.charCodeAt(i) + ((seed << 5) - seed);
    }
    seed = Math.abs(seed) || 12345;
    
    const noise3D = createNoise3D(() => (seed % 10000) / 10000);
    
    // Helper to generate position on sphere
    const generatePosition = (index: number): THREE.Vector3 => {
      // Use noise for pseudo-random but deterministic positions
      const theta = noise3D(index * 0.5, 0, seed * 0.001) * Math.PI * 2;
      const phi = Math.acos(2 * Math.abs(noise3D(0, index * 0.5, seed * 0.001)) - 1);
      
      // Avoid poles
      const clampedPhi = Math.max(0.4, Math.min(2.7, phi));
      
      const x = Math.sin(clampedPhi) * Math.cos(theta);
      const y = Math.cos(clampedPhi);
      const z = Math.sin(clampedPhi) * Math.sin(theta);
      
      return new THREE.Vector3(x, y, z).multiplyScalar(size * 1.02);
    };
    
    const getName = (type: POI['type'], index: number): string => {
      const names = POI_CONFIGS[type].names;
      return names[Math.abs(seed + index) % names.length];
    };
    
    let poiIndex = 0;
    
    // Add cities if present
    if (terrainFeatures.hasCities) {
      const cityCount = description.toLowerCase().includes('megacity') ? 3 : 
                       description.toLowerCase().includes('metropolis') ? 2 : 1;
      for (let i = 0; i < cityCount; i++) {
        result.push({
          id: `city-${i}`,
          type: 'city',
          name: getName('city', poiIndex),
          position: generatePosition(poiIndex++),
          color: POI_CONFIGS.city.color,
          icon: POI_CONFIGS.city.icon,
        });
      }
    }
    
    // Add ruins if present
    if (terrainFeatures.hasRuins) {
      const ruinCount = description.toLowerCase().includes('ancient') ? 2 : 1;
      for (let i = 0; i < ruinCount; i++) {
        result.push({
          id: `ruins-${i}`,
          type: 'ruins',
          name: getName('ruins', poiIndex),
          position: generatePosition(poiIndex++),
          color: POI_CONFIGS.ruins.color,
          icon: POI_CONFIGS.ruins.icon,
        });
      }
    }
    
    // Add temples for magical worlds
    if (terrainFeatures.hasMagicAura || description.toLowerCase().includes('temple')) {
      result.push({
        id: 'temple-0',
        type: 'temple',
        name: getName('temple', poiIndex),
        position: generatePosition(poiIndex++),
        color: POI_CONFIGS.temple.color,
        icon: POI_CONFIGS.temple.icon,
      });
    }
    
    // Add forests
    if (terrainFeatures.hasForests || terrainFeatures.forestType !== 'none') {
      const forestCount = terrainFeatures.forestType === 'jungle' ? 2 : 1;
      for (let i = 0; i < forestCount; i++) {
        result.push({
          id: `forest-${i}`,
          type: 'forest',
          name: getName('forest', poiIndex),
          position: generatePosition(poiIndex++),
          color: POI_CONFIGS.forest.color,
          icon: POI_CONFIGS.forest.icon,
        });
      }
    }
    
    // Add mountains
    if (terrainFeatures.hasMountains) {
      result.push({
        id: 'mountain-0',
        type: 'mountain',
        name: getName('mountain', poiIndex),
        position: generatePosition(poiIndex++),
        color: POI_CONFIGS.mountain.color,
        icon: POI_CONFIGS.mountain.icon,
      });
    }
    
    // Add volcanoes
    if (terrainFeatures.hasVolcanoes) {
      result.push({
        id: 'volcano-0',
        type: 'volcano',
        name: getName('volcano', poiIndex),
        position: generatePosition(poiIndex++),
        color: POI_CONFIGS.volcano.color,
        icon: POI_CONFIGS.volcano.icon,
      });
    }
    
    // Add crystals
    if (terrainFeatures.hasCrystals) {
      result.push({
        id: 'crystal-0',
        type: 'crystal',
        name: getName('crystal', poiIndex),
        position: generatePosition(poiIndex++),
        color: terrainFeatures.crystalColor || POI_CONFIGS.crystal.color,
        icon: POI_CONFIGS.crystal.icon,
      });
    }
    
    // Add caves
    if (terrainFeatures.hasCaves) {
      result.push({
        id: 'cave-0',
        type: 'cave',
        name: getName('cave', poiIndex),
        position: generatePosition(poiIndex++),
        color: POI_CONFIGS.cave.color,
        icon: POI_CONFIGS.cave.icon,
      });
    }
    
    return result;
  }, [description, planetName, size, terrainFeatures]);

  // Check camera distance to show/hide POIs
  useFrame(() => {
    if (!groupRef.current) return;
    
    const worldPos = new THREE.Vector3();
    groupRef.current.getWorldPosition(worldPos);
    
    const distance = camera.position.distanceTo(worldPos);
    const relativeDistance = distance / size;
    
    // Show POIs when zoomed in close (within 6x planet radius)
    setVisible(relativeDistance < 6);
  });

  if (!visible || pois.length === 0) return null;

  return (
    <group ref={groupRef}>
      {pois.map((poi) => (
        <group key={poi.id} position={poi.position}>
          {/* POI marker sphere */}
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              onPOIClick?.(poi);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredPOI(poi.id);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHoveredPOI(null);
              document.body.style.cursor = 'auto';
            }}
          >
            <sphereGeometry args={[size * 0.03, 8, 8]} />
            <meshBasicMaterial
              color={poi.color}
              transparent
              opacity={hoveredPOI === poi.id ? 0.9 : 0.7}
            />
          </mesh>
          
          {/* Glow effect */}
          <mesh>
            <sphereGeometry args={[size * 0.05, 8, 8]} />
            <meshBasicMaterial
              color={poi.color}
              transparent
              opacity={hoveredPOI === poi.id ? 0.4 : 0.2}
            />
          </mesh>
          
          {/* Pulsing ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[size * 0.04, size * 0.06, 16]} />
            <meshBasicMaterial
              color={poi.color}
              transparent
              opacity={hoveredPOI === poi.id ? 0.6 : 0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
          
          {/* Label */}
          <Html
            position={[0, size * 0.08, 0]}
            center
            distanceFactor={isMobile ? 10 : 8}
            style={{
              pointerEvents: 'none',
              opacity: hoveredPOI === poi.id ? 1 : 0.8,
              transition: 'opacity 0.2s',
            }}
          >
            <div 
              className="flex flex-col items-center whitespace-nowrap"
              style={{ transform: isMobile ? 'scale(0.75)' : 'none' }}
            >
              <span className="text-lg">{poi.icon}</span>
              <span 
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ 
                  backgroundColor: `${poi.color}40`,
                  color: '#FFFFFF',
                  textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                }}
              >
                {poi.name}
              </span>
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}
