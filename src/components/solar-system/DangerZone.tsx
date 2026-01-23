import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DangerZoneProps {
  sunRadius: number;
}

export default function DangerZone({ sunRadius }: DangerZoneProps) {
  const innerRingRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);
  const pulseRingRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Organic breathing animation using multiple sine waves
    const breathe = Math.sin(time * 0.8) * 0.3 + Math.sin(time * 1.3) * 0.2 + Math.sin(time * 0.5) * 0.1;
    const normalizedBreathe = (breathe + 0.6) / 1.2; // Normalize to 0-1 range
    
    if (innerRingRef.current) {
      const material = innerRingRef.current.material as THREE.MeshBasicMaterial;
      // Subtle opacity pulse between 0.08 and 0.18
      material.opacity = 0.08 + normalizedBreathe * 0.1;
    }
    
    if (outerRingRef.current) {
      const material = outerRingRef.current.material as THREE.MeshBasicMaterial;
      // Offset phase for layered effect
      const outerBreathe = Math.sin(time * 0.6 + 1) * 0.3 + Math.sin(time * 1.1 + 0.5) * 0.2;
      const normalizedOuter = (outerBreathe + 0.5) / 1.0;
      material.opacity = 0.04 + normalizedOuter * 0.06;
    }
    
    if (pulseRingRef.current) {
      // Slow expanding pulse wave
      const pulsePhase = (time * 0.3) % 1;
      const scale = 1 + pulsePhase * 0.15;
      pulseRingRef.current.scale.setScalar(scale);
      
      const material = pulseRingRef.current.material as THREE.MeshBasicMaterial;
      // Fade out as it expands
      material.opacity = (1 - pulsePhase) * 0.12;
    }
  });

  return (
    <group>
      {/* Inner danger zone - main ring */}
      <mesh 
        ref={innerRingRef}
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.1, 0]}
      >
        <ringGeometry args={[sunRadius * 0.85, sunRadius + 2, 64]} />
        <meshBasicMaterial
          color="#ef4444"
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Outer glow ring */}
      <mesh 
        ref={outerRingRef}
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.15, 0]}
      >
        <ringGeometry args={[sunRadius + 1, sunRadius + 3, 64]} />
        <meshBasicMaterial
          color="#f97316"
          transparent
          opacity={0.06}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Expanding pulse wave */}
      <mesh 
        ref={pulseRingRef}
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.05, 0]}
      >
        <ringGeometry args={[sunRadius + 1.5, sunRadius + 2, 64]} />
        <meshBasicMaterial
          color="#fbbf24"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
