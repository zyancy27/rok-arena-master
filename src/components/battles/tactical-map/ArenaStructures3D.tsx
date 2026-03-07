/**
 * ArenaStructures3D — Procedural 3D arena from biome presets
 *
 * Replaces the old basic-box approach with rich, biome-aware
 * procedural geometry driven by arena-scene-builder.
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import type { BattlefieldZone } from '@/lib/tactical-zones';
import type { ArenaState } from '@/lib/living-arena';
import { buildArenaScene } from '@/lib/map/arena-scene-builder';
import type { PlacedStructure, ProceduralScene } from '@/lib/map/procedural-structures';
import type { StructureGeom } from '@/lib/map/arena-structure-presets';

interface ArenaStructures3DProps {
  zones: BattlefieldZone[];
  features: Array<{ id: string; label: string; type: string; x: number; y: number; width: number; height: number }>;
  terrainTags: string[];
  arenaState?: ArenaState;
  locationName?: string | null;
}

/** Single structure mesh */
function StructureMesh({ s, index }: { s: PlacedStructure; index: number }) {
  const meshRef = useRef<Mesh>(null);
  const isEmissive = s.emissive && s.emissiveColor;

  // Subtle animation for emissive objects
  useFrame((state) => {
    if (!meshRef.current || !isEmissive) return;
    const pulse = Math.sin(state.clock.elapsedTime * 2 + index * 0.5) * 0.15 + 0.85;
    (meshRef.current.material as any).emissiveIntensity = pulse;
  });

  return (
    <group position={s.position} rotation={s.rotation as any}>
      <mesh ref={meshRef} scale={s.scale}>
        <GeometryForType type={s.geom} />
        <meshStandardMaterial
          color={s.color}
          roughness={0.85}
          metalness={0.05}
          transparent={s.opacity < 1}
          opacity={s.opacity}
          emissive={isEmissive ? s.emissiveColor : undefined}
          emissiveIntensity={isEmissive ? 0.8 : 0}
        />
      </mesh>

      {/* Cap piece (e.g. tree canopy on trunk) */}
      {s.cap && (
        <mesh
          position={s.cap.offset as any}
          scale={s.cap.scale as any}
        >
          <GeometryForType type={s.cap.geom} />
          <meshStandardMaterial
            color={s.cap.color}
            roughness={0.9}
            metalness={0}
          />
        </mesh>
      )}
    </group>
  );
}

/** Map geometry type to R3F geometry */
function GeometryForType({ type }: { type: StructureGeom }) {
  switch (type) {
    case 'cylinder': return <cylinderGeometry args={[0.5, 0.5, 1, 6]} />;
    case 'cone': return <coneGeometry args={[0.5, 1, 5]} />;
    case 'sphere': return <sphereGeometry args={[0.5, 6, 5]} />;
    case 'torus': return <torusGeometry args={[0.5, 0.15, 6, 8]} />;
    case 'box':
    default: return <boxGeometry args={[1, 1, 1]} />;
  }
}

/** Fog planes at arena edges */
function FogPlanes({ color, density }: { color: string; density: number }) {
  if (density < 0.1) return null;
  const opacity = Math.min(density * 0.6, 0.5);

  return (
    <>
      {/* Ground-level fog */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <planeGeometry args={[22, 22]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.3} />
      </mesh>
      {/* Edge fog walls */}
      {[
        [0, 1, -10] as const,
        [0, 1, 10] as const,
        [-10, 1, 0] as const,
        [10, 1, 0] as const,
      ].map(([x, y, z], i) => (
        <mesh
          key={`fog-${i}`}
          position={[x, y, z]}
          rotation={[0, i >= 2 ? Math.PI / 2 : 0, 0]}
        >
          <planeGeometry args={[20, 3]} />
          <meshBasicMaterial color={color} transparent opacity={opacity} side={2} />
        </mesh>
      ))}
    </>
  );
}

export function ArenaStructures3D({ zones, features, terrainTags, arenaState, locationName }: ArenaStructures3DProps) {
  const scene: ProceduralScene = useMemo(() => {
    return buildArenaScene({
      locationName,
      terrainTags,
      zones,
      arenaState,
    });
  }, [locationName, terrainTags, zones, arenaState?.stability, arenaState?.hazardLevel]);

  return (
    <group>
      {/* Tinted ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[22, 22]} />
        <meshStandardMaterial color={scene.groundColor} roughness={0.95} />
      </mesh>

      {/* All procedural structures */}
      {scene.structures.map((s, i) => (
        <StructureMesh key={s.id} s={s} index={i} />
      ))}

      {/* Atmospheric fog */}
      <FogPlanes color={scene.fogColor} density={scene.fogDensity} />
    </group>
  );
}
