/**
 * ZonePlate3D — A zone floor plate in the 3D battlefield
 * Shows elevation, threat level, and tactical properties.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import type { Mesh } from 'three';
import type { BattlefieldZone } from '@/lib/tactical-zones';
import type { AwarenessLevel } from '@/lib/fog-of-awareness';

interface ZonePlate3DProps {
  zone: BattlefieldZone;
  isSelected: boolean;
  isFocused: boolean;
  awareness?: AwarenessLevel;
  onClick: () => void;
}

function getElevationY(elevation: string): number {
  switch (elevation) {
    case 'aerial': return 3;
    case 'high': return 2;
    case 'elevated': return 1;
    case 'underground': return -1;
    default: return 0;
  }
}

function getThreatColor(threat: string): string {
  switch (threat) {
    case 'safe': return '#22c55e';
    case 'caution': return '#eab308';
    case 'unsafe': return '#f97316';
    case 'critical': return '#ef4444';
    case 'imminent': return '#dc2626';
    default: return '#6b7280';
  }
}

function getZoneBaseColor(zone: BattlefieldZone): string {
  if (zone.colorHint === 'water') return '#1e40af';
  if (zone.colorHint === 'hazard') return '#7f1d1d';
  if (zone.tactical.fireSpread) return '#7f1d1d';
  if (zone.tactical.flooding) return '#1e3a5f';
  if (zone.tactical.hasCover) return '#374151';
  if (zone.tactical.isHighGround) return '#4b5563';
  return '#2a2a3e';
}

export function ZonePlate3D({ zone, isSelected, isFocused, awareness, onClick }: ZonePlate3DProps) {
  const meshRef = useRef<Mesh>(null);
  const borderRef = useRef<Mesh>(null);

  const elevY = getElevationY(zone.elevation);
  const worldX = (zone.x - 50) * 0.2;
  const worldZ = (zone.y - 50) * 0.2;
  const worldW = zone.width * 0.18;
  const worldH = zone.height * 0.18;

  const baseColor = getZoneBaseColor(zone);
  const threatColor = getThreatColor(zone.threatLevel);

  const opacity = awareness === 'hidden' ? 0 : awareness === 'partial' ? 0.4 : 0.85;
  const scale = isFocused ? 1.08 : 1;

  // Pulse for unstable/collapse zones
  useFrame((state) => {
    if (!borderRef.current) return;
    if (zone.collapseWarning || zone.threatLevel === 'imminent') {
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.3 + 0.7;
      (borderRef.current.material as any).opacity = pulse;
    }
    if (isSelected && meshRef.current) {
      const glow = Math.sin(state.clock.elapsedTime * 2) * 0.1 + 0.9;
      meshRef.current.scale.setScalar(glow);
    }
  });

  if (awareness === 'hidden') return null;

  return (
    <group position={[worldX, elevY * 0.8, worldZ]} scale={scale}>
      {/* Zone floor plate */}
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.03, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        <planeGeometry args={[worldW, worldH]} />
        <meshStandardMaterial
          color={baseColor}
          transparent
          opacity={opacity}
          roughness={0.8}
        />
      </mesh>

      {/* Threat border */}
      <mesh ref={borderRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[
          Math.min(worldW, worldH) * 0.42,
          Math.min(worldW, worldH) * 0.48,
          4
        ]} />
        <meshBasicMaterial color={threatColor} transparent opacity={0.5} />
      </mesh>

      {/* Selection highlight */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[
            Math.min(worldW, worldH) * 0.48,
            Math.min(worldW, worldH) * 0.52,
            4
          ]} />
          <meshBasicMaterial color="#818cf8" transparent opacity={0.7} />
        </mesh>
      )}

      {/* Zone label */}
      {awareness !== 'partial' && (
        <Text
          position={[0, 0.1, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.25}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="black"
        >
          {zone.label}
        </Text>
      )}

      {/* Elevation indicator */}
      {elevY !== 0 && (
        <Text
          position={[worldW * 0.4, 0.1, -worldH * 0.35]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.15}
          color="#a0a0c0"
          anchorX="center"
          anchorY="middle"
        >
          {zone.elevation.toUpperCase()}
        </Text>
      )}

      {/* Stability bar (visual) */}
      {zone.stability < 80 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, worldH * 0.35]}>
          <planeGeometry args={[worldW * (zone.stability / 100), 0.08]} />
          <meshBasicMaterial
            color={zone.stability < 30 ? '#ef4444' : zone.stability < 60 ? '#f59e0b' : '#22c55e'}
            transparent
            opacity={0.7}
          />
        </mesh>
      )}

      {/* Collapse warning cracks */}
      {zone.collapseWarning && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, Math.PI / 6]} position={[-0.3, 0.07, 0.1]}>
            <planeGeometry args={[worldW * 0.6, 0.03]} />
            <meshBasicMaterial color="#7f1d1d" transparent opacity={0.6} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, -Math.PI / 4]} position={[0.2, 0.07, -0.15]}>
            <planeGeometry args={[worldW * 0.4, 0.02]} />
            <meshBasicMaterial color="#7f1d1d" transparent opacity={0.5} />
          </mesh>
        </>
      )}

      {/* Cover indicators */}
      {zone.tactical.hasCover && (
        <mesh position={[worldW * 0.35, 0.25, 0]}>
          <boxGeometry args={[0.15, 0.5, 0.6]} />
          <meshStandardMaterial color="#4b5563" roughness={0.7} />
        </mesh>
      )}
    </group>
  );
}
