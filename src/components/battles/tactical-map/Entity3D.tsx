/**
 * Entity3D — Character/enemy/construct representation in 3D map
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import type { Mesh, Group } from 'three';

interface Entity3DProps {
  id: string;
  name: string;
  type: 'player' | 'enemy' | 'construct';
  position: [number, number, number];
  prevPosition?: [number, number, number];
  isSelected: boolean;
  dimmed: boolean;
  color?: string;
  onClick: () => void;
}

export function Entity3D({
  id, name, type, position, prevPosition,
  isSelected, dimmed, color, onClick,
}: Entity3DProps) {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);

  const baseColor = color || (
    type === 'player' ? '#6366f1'
    : type === 'enemy' ? '#ef4444'
    : '#f59e0b'
  );

  // Selection pulse
  useFrame((state) => {
    if (!meshRef.current) return;
    if (isSelected) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      meshRef.current.scale.set(s, s, s);
    } else {
      meshRef.current.scale.set(1, 1, 1);
    }
  });

  const opacity = dimmed ? 0.4 : 1;

  return (
    <group ref={groupRef} position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* Movement trail */}
      {prevPosition && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                prevPosition[0] - position[0], prevPosition[1] - position[1], prevPosition[2] - position[2],
                0, 0, 0,
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#6366f1" transparent opacity={0.4} />
        </line>
      )}

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
          <ringGeometry args={[0.5, 0.6, 16]} />
          <meshBasicMaterial color="#818cf8" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Entity shape */}
      <mesh ref={meshRef}>
        {type === 'player' ? (
          <>
            <capsuleGeometry args={[0.2, 0.4, 4, 8]} />
            <meshStandardMaterial
              color={baseColor}
              transparent
              opacity={opacity}
              roughness={0.5}
              metalness={0.3}
              emissive={baseColor}
              emissiveIntensity={isSelected ? 0.4 : 0.1}
            />
          </>
        ) : type === 'enemy' ? (
          <>
            <coneGeometry args={[0.25, 0.6, 4]} />
            <meshStandardMaterial
              color={baseColor}
              transparent
              opacity={opacity}
              roughness={0.4}
              metalness={0.2}
              emissive={baseColor}
              emissiveIntensity={isSelected ? 0.4 : 0.1}
            />
          </>
        ) : (
          <>
            <boxGeometry args={[0.35, 0.35, 0.35]} />
            <meshStandardMaterial
              color={baseColor}
              transparent
              opacity={opacity}
              roughness={0.6}
              metalness={0.1}
              emissive={baseColor}
              emissiveIntensity={0.15}
            />
          </>
        )}
      </mesh>

      {/* Name label - always faces camera */}
      {!dimmed && (
        <Billboard>
          <Text
            position={[0, type === 'enemy' ? 0.6 : 0.55, 0]}
            fontSize={0.18}
            color="white"
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.015}
            outlineColor="black"
          >
            {name.length > 12 ? name.slice(0, 11) + '…' : name}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
