/**
 * FogOfAwareness3D — Fog planes that obscure unseen areas
 */

import { useMemo } from 'react';
import type { BattlefieldZone } from '@/lib/tactical-zones';
import type { AwarenessLevel } from '@/lib/fog-of-awareness';

interface FogOfAwareness3DProps {
  playerPosition: [number, number, number];
  awarenessRadius: number;
  zoneAwareness: Record<string, AwarenessLevel>;
  zones: BattlefieldZone[];
}

export function FogOfAwareness3D({ playerPosition, awarenessRadius, zoneAwareness, zones }: FogOfAwareness3DProps) {
  const fogPlanes = useMemo(() => {
    return zones
      .filter(z => zoneAwareness[z.id] === 'hidden' || zoneAwareness[z.id] === 'partial')
      .map(z => {
        const wx = (z.x - 50) * 0.2;
        const wz = (z.y - 50) * 0.2;
        const w = z.width * 0.18;
        const h = z.height * 0.18;
        const isHidden = zoneAwareness[z.id] === 'hidden';
        return { id: z.id, wx, wz, w, h, opacity: isHidden ? 0.85 : 0.4 };
      });
  }, [zones, zoneAwareness]);

  return (
    <group>
      {fogPlanes.map(fp => (
        <mesh
          key={`fog-${fp.id}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[fp.wx, 0.5, fp.wz]}
        >
          <planeGeometry args={[fp.w + 0.5, fp.h + 0.5]} />
          <meshBasicMaterial color="#0a0a1a" transparent opacity={fp.opacity} />
        </mesh>
      ))}

      {/* Awareness radius ring on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[playerPosition[0], 0.03, playerPosition[2]]}>
        <ringGeometry args={[awarenessRadius - 0.1, awarenessRadius, 32]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}
