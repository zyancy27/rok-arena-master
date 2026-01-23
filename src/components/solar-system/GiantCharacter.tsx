import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Sphere, Cylinder, Box } from '@react-three/drei';
import * as THREE from 'three';

interface GiantCharacterProps {
  name: string;
  orbitRadius: number;
  orbitSpeed: number;
  size: number;
  color: string;
  isMale: boolean;
  level: number;
  onClick?: () => void;
}

// Simple humanoid figure using basic shapes
export default function GiantCharacter({
  name,
  orbitRadius,
  orbitSpeed,
  size,
  color,
  isMale,
  level,
  onClick,
}: GiantCharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const figureRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  // Random starting angle based on name
  const startAngle = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return (hash % 360) * (Math.PI / 180);
  }, [name]);

  // Body proportions based on size
  const headRadius = size * 0.15;
  const torsoHeight = size * 0.35;
  const torsoWidth = size * 0.25;
  const legHeight = size * 0.35;
  const legWidth = size * 0.08;
  const armHeight = size * 0.3;
  const armWidth = size * 0.06;

  // Skin and clothing colors derived from main color
  const skinColor = useMemo(() => {
    // Parse the hex color and lighten it for skin
    return new THREE.Color(color).lerp(new THREE.Color('#FFE4C4'), 0.6);
  }, [color]);

  const clothingColor = useMemo(() => {
    return new THREE.Color(color);
  }, [color]);

  // Glow intensity based on power tier
  const glowIntensity = useMemo(() => {
    if (level >= 6) return 0.8;
    if (level >= 5) return 0.5;
    if (level >= 4) return 0.3;
    return 0.15;
  }, [level]);

  // Animate orbit and gentle floating
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();
      const angle = startAngle + time * orbitSpeed;
      
      groupRef.current.position.x = Math.cos(angle) * orbitRadius;
      groupRef.current.position.z = Math.sin(angle) * orbitRadius;
      
      // Gentle floating bob
      groupRef.current.position.y = Math.sin(time * 0.5) * 0.3;
    }
    
    if (figureRef.current) {
      // Slow rotation to face orbital direction with some variation
      const time = state.clock.getElapsedTime();
      figureRef.current.rotation.y = startAngle + time * orbitSpeed + Math.PI / 2;
      
      // Subtle breathing/idle animation
      figureRef.current.scale.y = 1 + Math.sin(time * 1.5) * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      <group 
        ref={figureRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        {/* Energy aura for high-tier characters */}
        <Sphere args={[size * 0.6, 16, 16]}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={hovered ? glowIntensity * 1.5 : glowIntensity * 0.5}
            side={THREE.BackSide}
          />
        </Sphere>

        {/* Head */}
        <Sphere 
          args={[headRadius, 16, 16]} 
          position={[0, torsoHeight / 2 + headRadius + 0.05, 0]}
        >
          <meshStandardMaterial 
            color={skinColor} 
            roughness={0.6}
            emissive={color}
            emissiveIntensity={hovered ? 0.3 : 0.1}
          />
        </Sphere>

        {/* Hair (simple cap) */}
        <Sphere 
          args={[headRadius * 1.1, 16, 8]} 
          position={[0, torsoHeight / 2 + headRadius + 0.1, 0]}
          scale={[1, 0.4, 1]}
        >
          <meshStandardMaterial 
            color={isMale ? '#2D1810' : '#4A2C2A'}
            roughness={0.8}
          />
        </Sphere>

        {/* Torso */}
        <Box 
          args={[torsoWidth, torsoHeight, torsoWidth * 0.6]} 
          position={[0, 0, 0]}
        >
          <meshStandardMaterial 
            color={clothingColor}
            roughness={0.4}
            metalness={0.1}
            emissive={color}
            emissiveIntensity={hovered ? 0.2 : 0.05}
          />
        </Box>

        {/* Chest detail for differentiation */}
        {!isMale && (
          <Box 
            args={[torsoWidth * 0.8, torsoHeight * 0.3, torsoWidth * 0.3]} 
            position={[0, torsoHeight * 0.15, torsoWidth * 0.2]}
          >
            <meshStandardMaterial 
              color={clothingColor.clone().multiplyScalar(0.8)}
              roughness={0.4}
            />
          </Box>
        )}

        {/* Left Arm */}
        <Cylinder 
          args={[armWidth, armWidth, armHeight, 8]} 
          position={[-(torsoWidth / 2 + armWidth), 0, 0]}
          rotation={[0, 0, Math.PI * 0.1]}
        >
          <meshStandardMaterial 
            color={skinColor}
            roughness={0.6}
            emissive={color}
            emissiveIntensity={0.05}
          />
        </Cylinder>

        {/* Right Arm */}
        <Cylinder 
          args={[armWidth, armWidth, armHeight, 8]} 
          position={[(torsoWidth / 2 + armWidth), 0, 0]}
          rotation={[0, 0, -Math.PI * 0.1]}
        >
          <meshStandardMaterial 
            color={skinColor}
            roughness={0.6}
            emissive={color}
            emissiveIntensity={0.05}
          />
        </Cylinder>

        {/* Left Leg */}
        <Cylinder 
          args={[legWidth, legWidth * 0.9, legHeight, 8]} 
          position={[-(torsoWidth / 4), -(torsoHeight / 2 + legHeight / 2), 0]}
        >
          <meshStandardMaterial 
            color={clothingColor.clone().multiplyScalar(0.7)}
            roughness={0.5}
          />
        </Cylinder>

        {/* Right Leg */}
        <Cylinder 
          args={[legWidth, legWidth * 0.9, legHeight, 8]} 
          position={[(torsoWidth / 4), -(torsoHeight / 2 + legHeight / 2), 0]}
        >
          <meshStandardMaterial 
            color={clothingColor.clone().multiplyScalar(0.7)}
            roughness={0.5}
          />
        </Cylinder>

        {/* Floating energy particles for tier 5+ */}
        {level >= 5 && (
          <>
            <Sphere args={[size * 0.03, 8, 8]} position={[size * 0.4, size * 0.2, 0]}>
              <meshBasicMaterial color={color} />
            </Sphere>
            <Sphere args={[size * 0.025, 8, 8]} position={[-size * 0.35, size * 0.3, size * 0.1]}>
              <meshBasicMaterial color={color} />
            </Sphere>
            <Sphere args={[size * 0.02, 8, 8]} position={[size * 0.2, -size * 0.3, -size * 0.2]}>
              <meshBasicMaterial color={color} />
            </Sphere>
          </>
        )}

        {/* Label */}
        <Html
          position={[0, size * 0.5 + 0.5, 0]}
          center
          distanceFactor={15}
          style={{
            transition: 'opacity 0.2s',
            opacity: hovered ? 1 : 0.7,
          }}
        >
          <div className="text-center pointer-events-none">
            <div 
              className="text-sm font-bold px-2 py-1 rounded-full whitespace-nowrap"
              style={{
                backgroundColor: `${color}40`,
                color: 'white',
                textShadow: `0 0 10px ${color}`,
                border: `1px solid ${color}60`,
              }}
            >
              {name}
            </div>
            <div className="text-xs text-white/70 mt-1">
              Tier {level} • Planet-Sized
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
}

// Helper to determine if a character should be rendered as planet-sized
export function isPlanetSizedCharacter(character: {
  level: number;
  lore?: string | null;
  powers?: string | null;
  race?: string | null;
}): boolean {
  // Tier 4+ characters are cosmic/god-like entities
  if (character.level >= 4) return true;
  
  // Check lore and powers for size-related keywords
  const text = `${character.lore || ''} ${character.powers || ''} ${character.race || ''}`.toLowerCase();
  
  const sizeKeywords = [
    'planet-sized', 'planet sized', 'planetary', 'colossal', 'titanic',
    'cosmic giant', 'world-sized', 'celestial body', 'living planet',
    'star-sized', 'moon-sized', 'continental', 'kaiju', 'behemoth',
    'cosmic entity', 'eldritch', 'primordial titan', 'world eater',
    'galactic', 'universe-sized', 'dimension-spanning'
  ];
  
  return sizeKeywords.some(keyword => text.includes(keyword));
}

// Determine gender presentation from character data
export function getCharacterGender(character: {
  name: string;
  lore?: string | null;
  race?: string | null;
}): 'male' | 'female' {
  const text = `${character.lore || ''} ${character.race || ''}`.toLowerCase();
  
  const femaleIndicators = ['she', 'her', 'female', 'woman', 'girl', 'goddess', 'queen', 'empress', 'matriarch', 'lady', 'maiden'];
  const maleIndicators = ['he', 'his', 'male', 'man', 'boy', 'god', 'king', 'emperor', 'patriarch', 'lord'];
  
  let femaleScore = 0;
  let maleScore = 0;
  
  femaleIndicators.forEach(indicator => {
    if (text.includes(indicator)) femaleScore++;
  });
  
  maleIndicators.forEach(indicator => {
    if (text.includes(indicator)) maleScore++;
  });
  
  // Use name as fallback hint
  if (femaleScore === maleScore) {
    // Common feminine name endings
    const name = character.name.toLowerCase();
    if (name.endsWith('a') || name.endsWith('ia') || name.endsWith('elle') || name.endsWith('ina')) {
      return 'female';
    }
  }
  
  return femaleScore > maleScore ? 'female' : 'male';
}

// Get a cosmic color based on character level
export function getCosmicColor(level: number, baseColor?: string): string {
  if (baseColor) return baseColor;
  
  const cosmicColors = {
    4: '#9333EA', // Purple for gods
    5: '#EC4899', // Pink for titans  
    6: '#F59E0B', // Gold for logic benders
    7: '#FFFFFF', // White for paradox tier
  };
  
  return cosmicColors[level as keyof typeof cosmicColors] || '#7C3AED';
}
