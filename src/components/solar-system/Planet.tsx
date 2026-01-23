import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface PlanetProps {
  name: string;
  orbitRadius: number;
  planetSize: number;
  orbitSpeed: number;
  color: string;
  emissiveColor?: string;
  characterCount: number;
  onClick: () => void;
  isSelected: boolean;
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
      {/* Planet */}
      <Sphere
        ref={planetRef}
        args={[planetSize, 32, 32]}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
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

      {/* Atmosphere glow */}
      <Sphere args={[planetSize * 1.15, 32, 32]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={hovered ? 0.3 : 0.1}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Label */}
      <Html
        position={[0, planetSize + 0.5, 0]}
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
