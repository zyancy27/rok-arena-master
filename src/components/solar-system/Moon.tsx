import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface MoonProps {
  orbitRadius: number;
  moonSize: number;
  orbitSpeed: number;
  color: string;
  startAngle?: number;
}

export default function Moon({
  orbitRadius,
  moonSize,
  orbitSpeed,
  color,
  startAngle = 0,
}: MoonProps) {
  const moonRef = useRef<THREE.Group>(null);
  const angleRef = useRef(startAngle);

  useFrame((state, delta) => {
    if (moonRef.current) {
      angleRef.current += orbitSpeed * delta;
      const x = Math.cos(angleRef.current) * orbitRadius;
      const z = Math.sin(angleRef.current) * orbitRadius;
      moonRef.current.position.x = x;
      moonRef.current.position.z = z;
    }
  });

  return (
    <group ref={moonRef}>
      <Sphere args={[moonSize, 16, 16]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.1}
          roughness={0.9}
          metalness={0.1}
        />
      </Sphere>
    </group>
  );
}
