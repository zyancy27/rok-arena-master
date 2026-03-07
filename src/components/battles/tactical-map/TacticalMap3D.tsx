/**
 * TacticalMap3D — React Three Fiber battlefield renderer
 *
 * Procedurally generates a 3D arena from zone data, terrain tags,
 * and arena state. Lightweight low-poly aesthetic.
 */

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { TacticalMapData } from '@/components/battles/TacticalBattleMap';
import { ZonePlate3D } from './ZonePlate3D';
import { Entity3D } from './Entity3D';
import { ArenaStructures3D } from './ArenaStructures3D';
import { HazardEffects3D } from './HazardEffects3D';
import { FogOfAwareness3D } from './FogOfAwareness3D';
import { ArenaLighting } from './ArenaLighting';

interface TacticalMap3DProps {
  data: TacticalMapData;
  selectedEntityId?: string | null;
  selectedZoneId?: string | null;
  focusMode?: boolean;
  onEntityTap?: (entityId: string) => void;
  onZoneTap?: (zoneId: string) => void;
}

/** Convert 0-100 grid coords to 3D world coords (-10 to 10) */
function toWorld(gridX: number, gridY: number): [number, number, number] {
  return [(gridX - 50) * 0.2, 0, (gridY - 50) * 0.2];
}

/** Get elevation Y offset from zone elevation */
function getElevationY(elevation?: string): number {
  switch (elevation) {
    case 'aerial': return 3;
    case 'high': return 2;
    case 'elevated': return 1;
    case 'underground': return -1;
    default: return 0;
  }
}

export function TacticalMap3D({
  data,
  selectedEntityId,
  selectedZoneId,
  focusMode,
  onEntityTap,
  onZoneTap,
}: TacticalMap3DProps) {
  const hasZones = data.zones && data.zones.length > 0;

  // Build entity positions with elevation
  const entityPositions = useMemo(() => {
    return data.entities.map(e => {
      const zone = data.zones?.find(z => z.id === e.zoneId);
      const [wx, , wz] = toWorld(e.x, e.y);
      const wy = getElevationY(zone?.elevation);
      return { ...e, wx, wy, wz };
    });
  }, [data.entities, data.zones]);

  const playerEntity = data.entities.find(e => e.type === 'player');
  const awarenessRadius = data.awareness?.awarenessRadius
    ? (data.awareness.awarenessRadius * 0.2)
    : undefined;

  // Extract terrain tags from arenaName for the structure layer
  const terrainTags = useMemo(() => {
    // Collect tags from zones, arena name, and image stack
    const tags: string[] = [];
    if (data.arenaName) tags.push(data.arenaName);
    return tags;
  }, [data.arenaName]);

  return (
    <div className="w-full h-full relative" style={{ touchAction: 'none' }}>
      {/* Soft edge fade overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none" style={{
        boxShadow: 'inset 0 0 40px 20px hsl(var(--background))',
      }} />
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: 'low-power' }}
        style={{ background: '#0a0a12' }}
      >
        <Suspense fallback={null}>
          {/* Camera */}
          <PerspectiveCamera makeDefault position={[0, 14, 10]} fov={50} />
          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            maxPolarAngle={Math.PI / 2.2}
            minPolarAngle={Math.PI / 6}
            minDistance={5}
            maxDistance={25}
            target={[0, 0, 0]}
          />

          {/* Lighting — driven by arena state */}
          <ArenaLighting arenaState={data.arenaState} />

          {/* ═══ Procedural Arena Structures ═══ */}
          <ArenaStructures3D
            zones={data.zones ?? []}
            features={data.features}
            terrainTags={terrainTags}
            arenaState={data.arenaState}
            locationName={data.arenaName}
          />

          {/* Subtle grid overlay (faint, under structures) */}
          <gridHelper args={[20, 20, '#1a1a2a', '#12121e']} position={[0, 0.01, 0]} material-opacity={0.05} material-transparent={true} />

          {/* Zones */}
          {hasZones && data.zones!.map(zone => (
            <ZonePlate3D
              key={zone.id}
              zone={zone}
              isSelected={selectedZoneId === zone.id}
              isFocused={focusMode && selectedZoneId === zone.id}
              awareness={data.awareness?.zoneAwareness?.[zone.id]}
              onClick={() => onZoneTap?.(zone.id)}
            />
          ))}

          {/* Hazard effects */}
          <HazardEffects3D
            hazards={data.hazards}
            zones={data.zones}
            arenaState={data.arenaState}
          />

          {/* Fog of Awareness */}
          {data.awareness && playerEntity && (
            <FogOfAwareness3D
              playerPosition={toWorld(playerEntity.x, playerEntity.y)}
              awarenessRadius={awarenessRadius ?? 6}
              zoneAwareness={data.awareness.zoneAwareness}
              zones={data.zones ?? []}
            />
          )}

          {/* Entities */}
          {entityPositions.map(entity => {
            const entityAwareness = data.awareness?.entityAwareness?.[entity.id];
            if (entityAwareness === 'hidden') return null;
            return (
              <Entity3D
                key={entity.id}
                id={entity.id}
                name={entity.name}
                type={entity.type}
                position={[entity.wx, entity.wy + 0.3, entity.wz]}
                prevPosition={entity.prevX != null && entity.prevY != null
                  ? toWorld(entity.prevX, entity.prevY)
                  : undefined
                }
                isSelected={selectedEntityId === entity.id}
                dimmed={entityAwareness === 'partial'}
                color={entity.color}
                onClick={() => onEntityTap?.(entity.id)}
              />
            );
          })}

          {/* Movement shadow projections */}
          {data.movementShadows?.map(shadow => {
            const [sx, , sz] = toWorld(shadow.projectedX, shadow.projectedY);
            return (
              <mesh key={shadow.entityId + '-shadow'} position={[sx, 0.05, sz]}>
                <circleGeometry args={[0.3, 8]} />
                <meshBasicMaterial
                  color="#6366f1"
                  transparent
                  opacity={shadow.opacity}
                />
              </mesh>
            );
          })}

          {/* Narrator markers as floating indicators */}
          {data.narratorMarkers?.map(marker => {
            const [mx, , mz] = toWorld(marker.x, marker.y);
            const color = marker.urgency === 'high' ? '#ef4444'
              : marker.urgency === 'medium' ? '#f59e0b' : '#3b82f6';
            return (
              <group key={marker.id} position={[mx, 2.5, mz]}>
                <mesh>
                  <octahedronGeometry args={[0.15, 0]} />
                  <meshBasicMaterial color={color} transparent opacity={0.8} />
                </mesh>
                <mesh position={[0, -1.2, 0]}>
                  <cylinderGeometry args={[0.01, 0.01, 2.4, 4]} />
                  <meshBasicMaterial color={color} transparent opacity={0.3} />
                </mesh>
              </group>
            );
          })}
        </Suspense>
      </Canvas>
    </div>
  );
}
