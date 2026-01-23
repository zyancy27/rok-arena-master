import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

export default function Sun() {
  const sunRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (sunRef.current) {
      sunRef.current.rotation.y += delta * 0.1;
    }
    if (glowRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      glowRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group>
      {/* Core sun */}
      <Sphere ref={sunRef} args={[2, 64, 64]}>
        <meshBasicMaterial color="#FDB813" />
      </Sphere>

      {/* Inner glow */}
      <Sphere args={[2.2, 32, 32]}>
        <meshBasicMaterial
          color="#FF8C00"
          transparent
          opacity={0.4}
        />
      </Sphere>

      {/* Outer glow */}
      <Sphere ref={glowRef} args={[2.8, 32, 32]}>
        <meshBasicMaterial
          color="#FFD700"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Point light */}
      <pointLight intensity={2} distance={50} decay={2} color="#FDB813" />
    </group>
  );
}
