import { useMemo } from 'react';
import * as THREE from 'three';

interface PlanetRingsProps {
  innerRadius: number;
  outerRadius: number;
  color: string;
  opacity?: number;
}

export default function PlanetRings({
  innerRadius,
  outerRadius,
  color,
  opacity = 0.6,
}: PlanetRingsProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.RingGeometry(innerRadius, outerRadius, 64);
    // Rotate UVs for proper texture mapping
    const pos = geo.attributes.position;
    const v3 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i);
      geo.attributes.uv.setXY(i, v3.length() < (innerRadius + outerRadius) / 2 ? 0 : 1, 1);
    }
    return geo;
  }, [innerRadius, outerRadius]);

  return (
    <group rotation={[Math.PI / 2.5, 0, Math.PI / 6]}>
      {/* Main ring */}
      <mesh geometry={geometry}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Secondary ring for depth */}
      <mesh geometry={geometry} position={[0, 0.02, 0]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity * 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
