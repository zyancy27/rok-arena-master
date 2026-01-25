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
      {/* Inner atmosphere glow - more transparent */}
      <Sphere ref={innerRef} args={[planetSize * 1.06, 32, 32]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.08 * intensity}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Middle atmosphere layer - more transparent */}
      <Sphere args={[planetSize * 1.12, 32, 32]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.05 * intensity}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Outer atmosphere haze - very subtle */}
      <Sphere ref={outerRef} args={[planetSize * 1.2, 32, 32]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.025 * intensity}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Pulsing corona effect - barely visible */}
      <Sphere ref={pulseRef} args={[planetSize * 1.3, 24, 24]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.01 * intensity}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
}
