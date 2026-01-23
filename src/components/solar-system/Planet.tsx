import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import Atmosphere from './Atmosphere';
import PlanetRings from './PlanetRings';
import Moon from './Moon';

interface PlanetProps {
  name: string;
  orbitRadius: number;
  planetSize: number;
  orbitSpeed: number;
  color: string;
  emissiveColor?: string;
  characterCount: number;
  onClick: (position: { x: number; y: number; z: number }) => void;
  isSelected: boolean;
}

// Determine planet features based on name hash for consistency
function getPlanetFeatures(name: string, size: number) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hasRings = Math.abs(hash % 3) === 0; // ~33% of planets have rings
  const moonCount = size > 0.8 ? Math.abs(hash % 3) + 1 : size > 0.6 ? Math.abs(hash % 2) : 0;
  const atmosphereIntensity = 0.5 + (Math.abs(hash % 100) / 100) * 1.5;
  
  return { hasRings, moonCount, atmosphereIntensity };
}

// Generate moon colors based on planet
function getMoonColors(planetColor: string, count: number): string[] {
  const colors = ['#9CA3AF', '#D1D5DB', '#6B7280', '#E5E7EB', '#A1A1AA'];
  return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
}

export default function Planet({
  name,
  orbitRadius,
  planetSize,
  orbitSpeed,
  color,
  emissiveColor,
  characterCount,
  onClick,
  isSelected,
}: PlanetProps) {
  const groupRef = useRef<THREE.Group>(null);
  const planetRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const angleRef = useRef(Math.random() * Math.PI * 2);

  const features = useMemo(() => getPlanetFeatures(name, planetSize), [name, planetSize]);
  const moonColors = useMemo(() => getMoonColors(color, features.moonCount), [color, features.moonCount]);

  useFrame((state, delta) => {
    if (groupRef.current && !isSelected) {
      angleRef.current += orbitSpeed * delta;
      const x = Math.cos(angleRef.current) * orbitRadius;
      const z = Math.sin(angleRef.current) * orbitRadius;
      groupRef.current.position.x = x;
      groupRef.current.position.z = z;
    }

    if (planetRef.current) {
      planetRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Planet core */}
      <Sphere
        ref={planetRef}
        args={[planetSize, 32, 32]}
        onClick={(e) => {
          e.stopPropagation();
          if (groupRef.current) {
            onClick({
              x: groupRef.current.position.x,
              y: groupRef.current.position.y,
              z: groupRef.current.position.z,
            });
          }
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
        <meshStandardMaterial
          color={color}
          emissive={emissiveColor || color}
          emissiveIntensity={hovered ? 0.8 : 0.3}
          roughness={0.7}
          metalness={0.3}
        />
      </Sphere>

      {/* Layered atmosphere */}
      <Atmosphere
        planetSize={planetSize}
        color={color}
        intensity={hovered ? features.atmosphereIntensity * 1.5 : features.atmosphereIntensity}
        animated
      />

      {/* Planetary rings (for some planets) */}
      {features.hasRings && (
        <PlanetRings
          innerRadius={planetSize * 1.4}
          outerRadius={planetSize * 2.2}
          color={color}
          opacity={hovered ? 0.7 : 0.5}
        />
      )}

      {/* Moons (for larger planets) */}
      {Array.from({ length: features.moonCount }).map((_, index) => (
        <Moon
          key={index}
          orbitRadius={planetSize * (1.8 + index * 0.6)}
          moonSize={planetSize * (0.15 - index * 0.03)}
          orbitSpeed={2 + index * 0.5}
          color={moonColors[index]}
          startAngle={(index * Math.PI * 2) / features.moonCount}
        />
      ))}

      {/* Label */}
      <Html
        position={[0, planetSize + (features.hasRings ? 1.2 : 0.5), 0]}
        center
        style={{
          pointerEvents: 'none',
          opacity: hovered || isSelected ? 1 : 0.7,
          transition: 'opacity 0.3s',
        }}
      >
        <div className="text-center whitespace-nowrap">
          <div className="text-sm font-bold text-white drop-shadow-lg">
            {name}
          </div>
          <div className="text-xs text-muted-foreground">
            {characterCount} character{characterCount !== 1 ? 's' : ''}
          </div>
        </div>
      </Html>
    </group>
  );
}
