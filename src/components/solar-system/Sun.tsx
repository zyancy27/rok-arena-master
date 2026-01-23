import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { getSunSizeFromTemperature } from './SunEditor';

interface SunProps {
  color?: string;
  temperature?: number;
  onClick?: () => void;
}

export default function Sun({ color = '#FDB813', temperature = 5778, onClick }: SunProps) {
  const sunRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Calculate size based on temperature (real astrophysics)
  const sizeMultiplier = getSunSizeFromTemperature(temperature);
  const baseSize = 2;
  const size = baseSize * sizeMultiplier;

  // Generate glow colors based on main color
  const mainColor = new THREE.Color(color);
  const innerGlowColor = mainColor.clone().offsetHSL(0, 0, -0.1);
  const outerGlowColor = mainColor.clone().offsetHSL(0, -0.2, 0.1);

  // Light intensity scales with temperature
  const lightIntensity = Math.min(2 + (temperature - 5778) / 10000, 5);

  useFrame((state, delta) => {
    if (sunRef.current) {
      sunRef.current.rotation.y += delta * 0.1;
    }
    if (glowRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      glowRef.current.scale.setScalar(scale);
    }
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onClick?.();
  };

  return (
    <group ref={groupRef} onClick={handleClick}>
      {/* Core sun */}
      <Sphere ref={sunRef} args={[size, 64, 64]}>
        <meshBasicMaterial color={color} />
      </Sphere>

      {/* Inner glow */}
      <Sphere args={[size * 1.1, 32, 32]}>
        <meshBasicMaterial
          color={innerGlowColor}
          transparent
          opacity={0.4}
        />
      </Sphere>

      {/* Outer glow */}
      <Sphere ref={glowRef} args={[size * 1.4, 32, 32]}>
        <meshBasicMaterial
          color={outerGlowColor}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Corona effect for hotter stars */}
      {temperature > 7500 && (
        <Sphere args={[size * 1.8, 32, 32]}>
          <meshBasicMaterial
            color={outerGlowColor}
            transparent
            opacity={0.08}
            side={THREE.BackSide}
          />
        </Sphere>
      )}

      {/* Point light */}
      <pointLight 
        intensity={lightIntensity} 
        distance={50 + size * 10} 
        decay={2} 
        color={color} 
      />
    </group>
  );
}
