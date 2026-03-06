/**
 * ArenaStructures3D — Procedural low-poly structures from zone data
 * 
 * Generates walls, platforms, pillars, bridges, trees etc
 * based on zone tactical properties and terrain tags.
 */

import { useMemo } from 'react';
import type { BattlefieldZone } from '@/lib/tactical-zones';
import type { ArenaState } from '@/lib/living-arena';

interface ArenaStructures3DProps {
  zones: BattlefieldZone[];
  features: Array<{ id: string; label: string; type: string; x: number; y: number; width: number; height: number }>;
  terrainTags: string[];
  arenaState?: ArenaState;
}

interface StructureDef {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  type: 'box' | 'cylinder' | 'cone';
  rotation?: [number, number, number];
  damaged?: boolean;
}

function toWorld(x: number, y: number): [number, number] {
  return [(x - 50) * 0.2, (y - 50) * 0.2];
}

function getElevationY(elev: string): number {
  switch (elev) {
    case 'high': return 2;
    case 'elevated': return 1;
    case 'underground': return -1;
    default: return 0;
  }
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export function ArenaStructures3D({ zones, features, arenaState }: ArenaStructures3DProps) {
  const structures = useMemo(() => {
    const defs: StructureDef[] = [];
    const stability = arenaState?.stability ?? 100;
    const damaged = stability < 50;

    zones.forEach((zone, zi) => {
      const [wx, wz] = toWorld(zone.x, zone.y);
      const ey = getElevationY(zone.elevation) * 0.8;

      // Elevated zones get platform edges
      if (zone.elevation === 'elevated' || zone.elevation === 'high') {
        const w = zone.width * 0.09;
        const h = zone.height * 0.09;
        // Platform base
        defs.push({
          position: [wx, ey - 0.3, wz],
          scale: [w * 2, 0.15, h * 2],
          color: '#3f3f5e',
          type: 'box',
        });
        // Edge walls
        defs.push({
          position: [wx - w, ey + 0.15, wz],
          scale: [0.08, 0.6, h * 1.8],
          color: '#4a4a6e',
          type: 'box',
          damaged,
        });
        defs.push({
          position: [wx + w, ey + 0.15, wz],
          scale: [0.08, 0.6, h * 1.8],
          color: '#4a4a6e',
          type: 'box',
          damaged,
        });
      }

      // Cover zones get low walls/barriers
      if (zone.tactical.hasCover) {
        const seed = zi * 17 + 3;
        const count = 1 + Math.floor(seededRandom(seed) * 2);
        for (let i = 0; i < count; i++) {
          const ox = (seededRandom(seed + i * 31) - 0.5) * zone.width * 0.12;
          const oz = (seededRandom(seed + i * 47) - 0.5) * zone.height * 0.12;
          defs.push({
            position: [wx + ox, ey + 0.25, wz + oz],
            scale: [0.6 + seededRandom(seed + i * 13) * 0.4, 0.5, 0.12],
            color: '#555577',
            type: 'box',
            rotation: [0, seededRandom(seed + i * 7) * Math.PI, 0],
            damaged: damaged && seededRandom(seed + i) > 0.5,
          });
        }
      }

      // Destructible terrain gets rubble
      if (zone.tactical.destructibleTerrain && damaged) {
        const seed = zi * 23 + 7;
        for (let i = 0; i < 3; i++) {
          const ox = (seededRandom(seed + i * 19) - 0.5) * zone.width * 0.1;
          const oz = (seededRandom(seed + i * 29) - 0.5) * zone.height * 0.1;
          defs.push({
            position: [wx + ox, ey + 0.08, wz + oz],
            scale: [0.15 + seededRandom(seed + i) * 0.2, 0.15, 0.15 + seededRandom(seed + i + 5) * 0.2],
            color: '#4a4a5a',
            type: 'box',
            rotation: [seededRandom(seed + i * 3) * 0.3, seededRandom(seed + i * 5) * Math.PI, 0],
          });
        }
      }

      // Narrow movement zones get corridor walls
      if (zone.tactical.narrowMovement) {
        const h = zone.height * 0.09;
        defs.push({
          position: [wx - zone.width * 0.08, ey + 0.5, wz],
          scale: [0.1, 1, h * 1.6],
          color: '#3a3a55',
          type: 'box',
        });
        defs.push({
          position: [wx + zone.width * 0.08, ey + 0.5, wz],
          scale: [0.1, 1, h * 1.6],
          color: '#3a3a55',
          type: 'box',
        });
      }

      // Underground zones get ceiling hints
      if (zone.elevation === 'underground') {
        defs.push({
          position: [wx, ey + 1.2, wz],
          scale: [zone.width * 0.15, 0.05, zone.height * 0.15],
          color: '#2a2a3e',
          type: 'box',
        });
      }
    });

    // Legacy features as 3D objects
    features.forEach((f, fi) => {
      const [wx, wz] = toWorld(f.x, f.y);
      const w = f.width * 0.08;
      const h = f.height * 0.08;

      if (f.type === 'structure' || f.type === 'cover') {
        defs.push({
          position: [wx, 0.4, wz],
          scale: [w, 0.8, h],
          color: f.type === 'cover' ? '#4b5563' : '#374151',
          type: 'box',
          damaged: damaged && fi % 2 === 0,
        });
      } else if (f.type === 'vegetation') {
        defs.push({
          position: [wx, 0.5, wz],
          scale: [0.3, 1, 0.3],
          color: '#2d5016',
          type: 'cone',
        });
      } else if (f.type === 'vehicle') {
        defs.push({
          position: [wx, 0.2, wz],
          scale: [w, 0.4, h],
          color: '#555566',
          type: 'box',
        });
      } else if (f.type === 'platform') {
        defs.push({
          position: [wx, 0.6, wz],
          scale: [w, 0.1, h],
          color: '#44446a',
          type: 'box',
        });
      }
    });

    return defs;
  }, [zones, features, arenaState?.stability]);

  return (
    <group>
      {structures.map((s, i) => (
        <mesh
          key={`struct-${i}`}
          position={s.position}
          scale={s.scale}
          rotation={s.rotation as any}
        >
          {s.type === 'box' ? (
            <boxGeometry args={[1, 1, 1]} />
          ) : s.type === 'cylinder' ? (
            <cylinderGeometry args={[0.5, 0.5, 1, 6]} />
          ) : (
            <coneGeometry args={[0.5, 1, 5]} />
          )}
          <meshStandardMaterial
            color={s.color}
            roughness={0.8}
            metalness={0.1}
            transparent={s.damaged}
            opacity={s.damaged ? 0.7 : 1}
          />
        </mesh>
      ))}
    </group>
  );
}
