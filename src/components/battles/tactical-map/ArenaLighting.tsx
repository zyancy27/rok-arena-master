/**
 * ArenaLighting — Biome-aware procedural lighting director
 *
 * Adapts key, fill, rim, and accent lights to the detected biome
 * using the VisualIdentitySystem's lighting profiles.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import type { PointLight } from 'three';
import type { ArenaState } from '@/lib/living-arena';
import { getLightingProfile, detectBiomeForVisuals } from '@/lib/map/visual-identity';

interface ArenaLightingProps {
  arenaState?: ArenaState;
  locationName?: string | null;
  biomeId?: string;
}

export function ArenaLighting({ arenaState, locationName, biomeId }: ArenaLightingProps) {
  const hazardLightRef = useRef<PointLight>(null);

  const isCritical = arenaState?.isCritical ?? false;
  const hazardLevel = arenaState?.hazardLevel ?? 0;
  const hasFire = arenaState?.conditionTags?.includes('burning');
  const hasElectric = arenaState?.conditionTags?.includes('spatial_distortion');

  // Resolve biome and get lighting profile
  const resolvedBiome = biomeId ?? detectBiomeForVisuals(locationName);
  const profile = useMemo(() => getLightingProfile(resolvedBiome), [resolvedBiome]);

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

  // Override ambient in critical state
  const ambientColor = isCritical ? '#331111' : profile.ambientColor;
  const ambientIntensity = isCritical ? 1.0 : profile.ambientIntensity;
  const keyColor = isCritical ? '#ff8866' : profile.keyColor;

  return (
    <>
      {/* Main ambient — biome-tinted */}
      <ambientLight color={ambientColor} intensity={ambientIntensity} />

      {/* Key light — biome-directed */}
      <directionalLight
        position={profile.keyPosition}
        intensity={profile.keyIntensity}
        color={keyColor}
        castShadow={false}
      />

      {/* Fill light — biome-tinted */}
      <directionalLight
        position={[-3, 6, -4]}
        intensity={profile.fillIntensity}
        color={profile.fillColor}
      />

      {/* Rim light — biome-tinted for depth */}
      <directionalLight
        position={[-2, 4, -8]}
        intensity={profile.rimIntensity}
        color={profile.rimColor}
      />

      {/* Biome accent lights */}
      {profile.accents.map((accent, i) => (
        <pointLight
          key={`accent-${i}`}
          position={accent.position}
          color={accent.color}
          intensity={accent.intensity}
          distance={accent.distance}
          decay={2}
        />
      ))}

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
