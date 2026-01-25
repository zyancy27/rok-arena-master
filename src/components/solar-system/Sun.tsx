import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Ring } from '@react-three/drei';
import * as THREE from 'three';
import { getSunSizeFromTemperature, getSunLuminosityFromTemperature } from './SunEditor';

interface SunProps {
  color?: string;
  temperature?: number;
  onClick?: () => void;
  habitableZoneEmphasis?: boolean; // Make habitable zone more visible when mentioned in lore
}

// Calculate habitable zone based on stellar luminosity (real astrophysics)
// Inner edge: ~0.95 * sqrt(L) AU, Outer edge: ~1.37 * sqrt(L) AU
export function getHabitableZone(temperature: number): { inner: number; outer: number } {
  const luminosity = getSunLuminosityFromTemperature(temperature);
  const sqrtL = Math.sqrt(luminosity);
  return {
    inner: 0.95 * sqrtL * 5, // Scale for our solar system (5 = base orbit unit)
    outer: 1.37 * sqrtL * 5,
  };
}

export default function Sun({ color = '#FDB813', temperature = 5778, onClick, habitableZoneEmphasis = false }: SunProps) {
  const sunRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const habitableRingRef = useRef<THREE.Mesh>(null);

  // Calculate size based on temperature (real astrophysics)
  const sizeMultiplier = getSunSizeFromTemperature(temperature);
  const baseSize = 2;
  const size = baseSize * sizeMultiplier;

  // Luminosity affects light reach and intensity
  const luminosity = getSunLuminosityFromTemperature(temperature);
  const habitableZone = getHabitableZone(temperature);

  // Generate glow colors based on main color
  const mainColor = new THREE.Color(color);
  const innerGlowColor = mainColor.clone().offsetHSL(0, 0, -0.1);
  const outerGlowColor = mainColor.clone().offsetHSL(0, -0.2, 0.1);

  // Light intensity scales with luminosity (capped for visual comfort)
  const lightIntensity = Math.min(1.5 + Math.log10(luminosity + 1) * 1.5, 6);
  const lightDistance = 30 + luminosity * 15;

  useFrame((state, delta) => {
    if (sunRef.current) {
      sunRef.current.rotation.y += delta * 0.1;
    }
    if (glowRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      glowRef.current.scale.setScalar(scale);
    }
    // Animate habitable zone ring
    if (habitableRingRef.current) {
      habitableRingRef.current.rotation.z += delta * 0.02;
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

      {/* Outer glow - scales with luminosity */}
      <Sphere ref={glowRef} args={[size * (1.3 + luminosity * 0.05), 32, 32]}>
        <meshBasicMaterial
          color={outerGlowColor}
          transparent
          opacity={Math.min(0.15 + luminosity * 0.02, 0.35)}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Corona effect for hotter stars - larger for more luminous stars */}
      {temperature > 7500 && (
        <Sphere args={[size * (1.6 + luminosity * 0.1), 32, 32]}>
          <meshBasicMaterial
            color={outerGlowColor}
            transparent
            opacity={0.08}
            side={THREE.BackSide}
          />
        </Sphere>
      )}

      {/* Habitable Zone indicator ring - more visible when mentioned in lore */}
      <Ring
        ref={habitableRingRef}
        args={[habitableZone.inner, habitableZone.outer, 64]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <meshBasicMaterial
          color="#22C55E"
          transparent
          opacity={habitableZoneEmphasis ? 0.25 : 0.08}
          side={THREE.DoubleSide}
        />
      </Ring>

      {/* Point light - intensity and distance scale with luminosity */}
      <pointLight 
        intensity={lightIntensity} 
        distance={lightDistance} 
        decay={2} 
        color={color} 
      />

      {/* Secondary fill light for cooler stars (they need more ambient) */}
      {temperature < 4500 && (
        <pointLight 
          intensity={0.3} 
          distance={20} 
          decay={2} 
          color="#FFE4C4" 
        />
      )}
    </group>
  );
}
