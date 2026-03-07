/**
 * ArenaLighting — Dynamic lighting that responds to arena state
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { PointLight } from 'three';
import type { ArenaState } from '@/lib/living-arena';

interface ArenaLightingProps {
  arenaState?: ArenaState;
}

export function ArenaLighting({ arenaState }: ArenaLightingProps) {
  const hazardLightRef = useRef<PointLight>(null);

  const isCritical = arenaState?.isCritical ?? false;
  const hazardLevel = arenaState?.hazardLevel ?? 0;
  const hasFire = arenaState?.conditionTags?.includes('burning');
  const hasElectric = arenaState?.conditionTags?.includes('spatial_distortion');

  // Flickering hazard light
  useFrame((state) => {
    if (!hazardLightRef.current) return;
    if (isCritical || hazardLevel > 40) {
      const flicker = Math.sin(state.clock.elapsedTime * 8) * 0.3 + 0.7;
      hazardLightRef.current.intensity = (hazardLevel / 100) * 2 * flicker;
    } else {
      hazardLightRef.current.intensity = 0;
    }
  });

  // Base ambient color shifts with arena state
  const ambientColor = isCritical ? '#331111' 
    : hazardLevel > 60 ? '#2a1a0a'
    : '#1a1a2e';

  const ambientIntensity = isCritical ? 1.0 : 1.4;

  return (
    <>
      {/* Main ambient */}
      <ambientLight color={ambientColor} intensity={ambientIntensity} />

      {/* Key light (slightly warm) */}
      <directionalLight
        position={[5, 10, 3]}
        intensity={1.2}
        color={isCritical ? '#ff8866' : '#ccd4ee'}
        castShadow={false}
      />

      {/* Fill light */}
      <directionalLight
        position={[-3, 6, -4]}
        intensity={0.6}
        color="#8899bb"
      />

      {/* Rim light from behind for depth */}
      <directionalLight
        position={[-2, 4, -8]}
        intensity={0.35}
        color="#99aacc"
      />

      {/* Hazard warning light */}
      <pointLight
        ref={hazardLightRef}
        position={[0, 3, 0]}
        color={hasFire ? '#ff4400' : hasElectric ? '#ffee00' : '#ff6600'}
        intensity={0}
        distance={15}
        decay={2}
      />

      {/* Critical red pulse light */}
      {isCritical && (
        <pointLight
          position={[0, 1, 0]}
          color="#ff0000"
          intensity={0.5}
          distance={20}
          decay={2}
        />
      )}
    </>
  );
}
