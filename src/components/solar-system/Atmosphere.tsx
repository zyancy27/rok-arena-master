import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface AtmosphereProps {
  planetSize: number;
  color: string;
  intensity?: number;
  animated?: boolean;
}

export default function Atmosphere({
  planetSize,
  color,
  intensity = 1,
  animated = true,
}: AtmosphereProps) {
  const innerRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (animated && pulseRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.03;
      pulseRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group>
      {/* Inner atmosphere glow */}
      <Sphere ref={innerRef} args={[planetSize * 1.08, 32, 32]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15 * intensity}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Middle atmosphere layer */}
      <Sphere args={[planetSize * 1.15, 32, 32]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.1 * intensity}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Outer atmosphere haze */}
      <Sphere ref={outerRef} args={[planetSize * 1.25, 32, 32]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.05 * intensity}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Pulsing corona effect */}
      <Sphere ref={pulseRef} args={[planetSize * 1.35, 24, 24]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.02 * intensity}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
}
