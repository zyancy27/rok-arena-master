/**
 * HazardEffects3D — Visual hazard indicators in 3D space
 * Fire, flood, electric, collapse zones etc.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import type { BattlefieldZone } from '@/lib/tactical-zones';
import type { ArenaState } from '@/lib/living-arena';

interface HazardDef {
  id: string;
  label: string;
  type: 'fire' | 'electric' | 'flood' | 'collapse' | 'debris' | 'ice' | 'generic';
  x: number;
  y: number;
  radius: number;
}

interface HazardEffects3DProps {
  hazards: HazardDef[];
  zones?: BattlefieldZone[];
  arenaState?: ArenaState;
}

const HAZARD_3D_COLORS: Record<string, string> = {
  fire: '#ef4444',
  electric: '#facc15',
  flood: '#3b82f6',
  collapse: '#a16207',
  debris: '#78716c',
  ice: '#67e8f9',
  generic: '#f97316',
};

function HazardGlow({ position, color, radius, type }: {
  position: [number, number, number];
  color: string;
  radius: number;
  type: string;
}) {
  const meshRef = useRef<Mesh>(null);
  const particleRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const pulse = Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.15 + 0.85;
    meshRef.current.scale.set(pulse, 1, pulse);

    if (particleRef.current) {
      const bob = Math.sin(state.clock.elapsedTime * 3 + position[2] * 5) * 0.2;
      particleRef.current.position.y = 0.5 + bob;
      particleRef.current.rotation.y += 0.02;
    }
  });

  return (
    <group position={position}>
      {/* Ground hazard disc */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <circleGeometry args={[radius, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>

      {/* Hazard border ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
        <ringGeometry args={[radius * 0.9, radius, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>

      {/* Floating hazard particle */}
      <mesh ref={particleRef} position={[0, 0.5, 0]}>
        {type === 'fire' ? (
          <coneGeometry args={[0.08, 0.2, 4]} />
        ) : type === 'electric' ? (
          <octahedronGeometry args={[0.08, 0]} />
        ) : (
          <sphereGeometry args={[0.08, 6, 6]} />
        )}
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

export function HazardEffects3D({ hazards, zones, arenaState }: HazardEffects3DProps) {
  // Also generate hazards from zone tactical properties
  const zoneHazards = (zones ?? []).flatMap(zone => {
    const results: Array<{ position: [number, number, number]; color: string; radius: number; type: string }> = [];
    const wx = (zone.x - 50) * 0.2;
    const wz = (zone.y - 50) * 0.2;
    const ey = zone.elevation === 'elevated' ? 0.8 : zone.elevation === 'high' ? 1.6 : zone.elevation === 'underground' ? -0.8 : 0;
    const r = Math.min(zone.width, zone.height) * 0.06;

    if (zone.tactical.fireSpread) {
      results.push({ position: [wx, ey, wz], color: '#ef4444', radius: r, type: 'fire' });
    }
    if (zone.tactical.electricHazard) {
      results.push({ position: [wx, ey, wz], color: '#facc15', radius: r, type: 'electric' });
    }
    if (zone.tactical.flooding) {
      results.push({ position: [wx, ey, wz], color: '#3b82f6', radius: r, type: 'flood' });
    }
    if (zone.tactical.toxicGas) {
      results.push({ position: [wx, ey, wz], color: '#84cc16', radius: r, type: 'generic' });
    }
    return results;
  });

  return (
    <group>
      {/* Map hazards */}
      {hazards.map(h => (
        <HazardGlow
          key={h.id}
          position={[(h.x - 50) * 0.2, 0, (h.y - 50) * 0.2]}
          color={HAZARD_3D_COLORS[h.type] || '#f97316'}
          radius={h.radius * 0.12}
          type={h.type}
        />
      ))}

      {/* Zone-based hazards */}
      {zoneHazards.map((zh, i) => (
        <HazardGlow
          key={`zone-hazard-${i}`}
          position={zh.position}
          color={zh.color}
          radius={zh.radius}
          type={zh.type}
        />
      ))}
    </group>
  );
}
