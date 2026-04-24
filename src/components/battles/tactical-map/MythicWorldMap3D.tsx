/**
 * MythicWorldMap3D — Cinematic, lived-in 3D world renderer.
 *
 * Replaces the flat tactical-plate look with a navigable Google-Maps-style
 * miniature world: rolling heightmap terrain, biome-tinted ground, gold
 * landmark beacons, lit settlements, fog volumes, drifting particles, and
 * a starfield skybox. Designed to feel like you are *looking at the place*
 * the narrator described, not abstract hexagons.
 *
 * Art direction: "Mythic Symbolic" — deep indigo (#0a0a1f → #1f1a3d),
 * violet glows (#8b5cf6), gold accents (#fbbf24).
 */

import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Billboard, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { TacticalMapData } from '@/components/battles/TacticalBattleMap';
import { detectBiomeForVisuals, getBiomeMaterialSet, getLightingProfile } from '@/lib/map/visual-identity';

// ─── Mythic palette (locked) ──────────────────────────────────────

const MYTHIC = {
  voidDeep:     '#05050f',
  voidMid:      '#0a0a1f',
  indigo:       '#1f1a3d',
  violet:       '#8b5cf6',
  violetGlow:   '#a78bfa',
  gold:         '#fbbf24',
  goldGlow:     '#fde68a',
  amber:        '#f59e0b',
  ember:        '#ef4444',
  mist:         '#3a2a5a',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────

/** Convert 0-100 grid coords → world coords centered on origin. */
function toWorld(gridX: number, gridY: number, scale = 0.28): [number, number, number] {
  return [(gridX - 50) * scale, 0, (gridY - 50) * scale];
}

/** Deterministic pseudo-random from string seed. */
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}
function rand(seed: number, salt: number): number {
  const x = Math.sin(seed * 9301 + salt * 49297) * 233280;
  return x - Math.floor(x);
}

function getElevationY(elevation?: string): number {
  switch (elevation) {
    case 'aerial':      return 4.5;
    case 'high':        return 2.4;
    case 'elevated':    return 1.2;
    case 'underground': return -0.8;
    default:            return 0;
  }
}

// ─── Terrain heightmap ────────────────────────────────────────────

interface TerrainProps {
  groundColor: string;
  accentColor: string;
  seed: number;
  zones: TacticalMapData['zones'];
}

function MythicTerrain({ groundColor, accentColor, seed, zones }: TerrainProps) {
  const geometry = useMemo(() => {
    const size = 30;
    const segments = 64;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    const positions = geo.attributes.position;

    // Sample heights with simple multi-octave sin/cos noise + zone bumps
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);

      const n1 = Math.sin(x * 0.35 + seed) * Math.cos(y * 0.32 + seed * 0.7) * 0.6;
      const n2 = Math.sin(x * 0.9 + seed * 1.3) * Math.cos(y * 0.85) * 0.18;
      const n3 = Math.sin(x * 1.7) * Math.cos(y * 1.6) * 0.06;

      // Zone influence — push terrain up under elevated zones
      let zoneBoost = 0;
      if (zones) {
        for (const z of zones) {
          const [zx, , zz] = toWorld(z.x, z.y);
          const dx = x - zx;
          const dz = y - zz;
          const dist = Math.sqrt(dx * dx + dz * dz);
          const radius = Math.max(z.width, z.height) * 0.18;
          if (dist < radius) {
            const falloff = 1 - dist / radius;
            zoneBoost += getElevationY(z.elevation) * falloff * 0.4;
          }
        }
      }

      positions.setZ(i, n1 + n2 + n3 + zoneBoost);
    }
    geo.computeVertexNormals();
    return geo;
  }, [seed, zones]);

  // Vertex coloring — blend ground + accent based on height
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: groundColor,
      roughness: 0.96,
      metalness: 0.02,
      flatShading: false,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uAccent = { value: new THREE.Color(accentColor) };
      shader.uniforms.uMythic = { value: new THREE.Color(MYTHIC.indigo) };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\nvarying float vHeight;`)
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>\nvHeight = position.z;`
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>\nuniform vec3 uAccent;\nuniform vec3 uMythic;\nvarying float vHeight;`
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>\n
           float t = clamp(vHeight * 0.6 + 0.3, 0.0, 1.0);
           vec3 lowMix = mix(uMythic, diffuseColor.rgb, 0.85);
           vec3 highMix = mix(diffuseColor.rgb, uAccent, 0.5);
           diffuseColor.rgb = mix(lowMix, highMix, t);`
        );
    };
    return mat;
  }, [groundColor, accentColor]);

  return (
    <mesh
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.05, 0]}
      receiveShadow
    />
  );
}

// ─── Skybox / horizon dome ────────────────────────────────────────

function MythicSky() {
  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop:    { value: new THREE.Color(MYTHIC.voidDeep) },
        uMid:    { value: new THREE.Color(MYTHIC.indigo) },
        uHorizon:{ value: new THREE.Color(MYTHIC.violet) },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPos;
        uniform vec3 uTop;
        uniform vec3 uMid;
        uniform vec3 uHorizon;
        void main() {
          float h = normalize(vWorldPos).y;
          float t = smoothstep(-0.1, 0.6, h);
          vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.3, h));
          col = mix(col, uTop, smoothstep(0.3, 1.0, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    return mat;
  }, []);

  return (
    <mesh material={material}>
      <sphereGeometry args={[80, 24, 16]} />
    </mesh>
  );
}

// ─── Drifting mist particles ──────────────────────────────────────

function MistParticles({ count = 220, color = MYTHIC.mist }: { count?: number; color?: string }) {
  const ref = useRef<THREE.Points>(null);

  const { positions, scales } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sc = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 26;
      pos[i * 3 + 1] = Math.random() * 3.5 + 0.2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 26;
      sc[i] = Math.random() * 0.6 + 0.4;
    }
    return { positions: pos, scales: sc };
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3]     += Math.sin(t * 0.1 + i) * 0.002;
      arr[i * 3 + 2] += Math.cos(t * 0.08 + i * 0.5) * 0.002;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-scale" count={count} array={scales} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.18}
        transparent
        opacity={0.42}
        depthWrite={false}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─── Light beam (godrays substitute) ──────────────────────────────

function LightBeam({ position, color, height = 5, radius = 0.18 }: {
  position: [number, number, number];
  color: string;
  height?: number;
  radius?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    const pulse = Math.sin(s.clock.elapsedTime * 1.4 + position[0]) * 0.15 + 0.85;
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.25 * pulse;
  });
  return (
    <mesh ref={ref} position={[position[0], position[1] + height / 2, position[2]]}>
      <cylinderGeometry args={[radius * 0.3, radius, height, 8, 1, true]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.25}
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ─── Landmark beacon (gold, anchored to a zone) ───────────────────

function LandmarkBeacon({
  position, label, color = MYTHIC.gold, scale = 1, urgent = false,
}: {
  position: [number, number, number];
  label: string;
  color?: string;
  scale?: number;
  urgent?: boolean;
}) {
  const ringRef = useRef<THREE.Mesh>(null);
  const orbRef = useRef<THREE.Mesh>(null);

  useFrame((s) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.01;
      const sc = 1 + Math.sin(s.clock.elapsedTime * (urgent ? 4 : 1.5)) * 0.08;
      ringRef.current.scale.set(sc, sc, 1);
    }
    if (orbRef.current) {
      const m = orbRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.7 + Math.sin(s.clock.elapsedTime * 2.2) * 0.25;
    }
  });

  return (
    <group position={position}>
      {/* Ground ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[0.48 * scale, 0.62 * scale, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>

      {/* Pillar */}
      <mesh position={[0, 0.6 * scale, 0]}>
        <cylinderGeometry args={[0.05 * scale, 0.08 * scale, 1.2 * scale, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.6}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>

      {/* Floating orb */}
      <mesh ref={orbRef} position={[0, 1.4 * scale, 0]}>
        <sphereGeometry args={[0.16 * scale, 16, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} />
      </mesh>

      {/* Light source */}
      <pointLight color={color} intensity={1.6} distance={6} decay={2} position={[0, 1.4 * scale, 0]} />

      {/* Vertical beam */}
      <LightBeam position={[0, 0.05, 0]} color={color} height={4 * scale} radius={0.22 * scale} />

      {/* Floating label */}
      <Billboard position={[0, 1.95 * scale, 0]}>
        <Text
          fontSize={0.22}
          color={MYTHIC.goldGlow}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.018}
          outlineColor={MYTHIC.voidDeep}
          letterSpacing={0.05}
        >
          {label.toUpperCase()}
        </Text>
      </Billboard>
    </group>
  );
}

// ─── Settlement / lived-in cluster ────────────────────────────────

function Settlement({
  position, seed, density = 8, palette,
}: {
  position: [number, number, number];
  seed: number;
  density?: number;
  palette: { wall: string; roof: string; light: string };
}) {
  const buildings = useMemo(() => {
    const arr: Array<{
      x: number; z: number; w: number; d: number; h: number;
      rot: number; lit: boolean;
    }> = [];
    for (let i = 0; i < density; i++) {
      const angle = rand(seed, i * 3 + 1) * Math.PI * 2;
      const dist = 0.4 + rand(seed, i * 3 + 2) * 1.6;
      arr.push({
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        w: 0.25 + rand(seed, i * 3 + 3) * 0.35,
        d: 0.25 + rand(seed, i * 3 + 4) * 0.35,
        h: 0.3 + rand(seed, i * 3 + 5) * 0.7,
        rot: rand(seed, i * 3 + 6) * Math.PI,
        lit: rand(seed, i * 3 + 7) > 0.35,
      });
    }
    return arr;
  }, [seed, density]);

  return (
    <group position={position}>
      {buildings.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]} rotation={[0, b.rot, 0]}>
          {/* Wall */}
          <mesh position={[0, b.h / 2, 0]}>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color={palette.wall} roughness={0.85} metalness={0.05} />
          </mesh>
          {/* Roof — pyramid */}
          <mesh position={[0, b.h + 0.12, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[Math.max(b.w, b.d) * 0.78, 0.28, 4]} />
            <meshStandardMaterial color={palette.roof} roughness={0.9} metalness={0.08} />
          </mesh>
          {/* Window light */}
          {b.lit && (
            <mesh position={[0, b.h * 0.5, b.d / 2 + 0.001]}>
              <planeGeometry args={[b.w * 0.35, b.h * 0.25]} />
              <meshBasicMaterial color={palette.light} transparent opacity={0.95} />
            </mesh>
          )}
          {b.lit && (
            <pointLight
              color={palette.light}
              intensity={0.4}
              distance={1.4}
              decay={2}
              position={[0, b.h * 0.6, b.d / 2 + 0.05]}
            />
          )}
        </group>
      ))}
    </group>
  );
}

// ─── Tree / foliage cluster ───────────────────────────────────────

function FoliageCluster({
  position, seed, count = 14, palette,
}: {
  position: [number, number, number];
  seed: number;
  count?: number;
  palette: { trunk: string; leaves: string; leavesAccent: string };
}) {
  const items = useMemo(() => {
    const arr = [] as Array<{ x: number; z: number; h: number; r: number; tone: number }>;
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (rand(seed, i * 5 + 1) - 0.5) * 4,
        z: (rand(seed, i * 5 + 2) - 0.5) * 4,
        h: 0.5 + rand(seed, i * 5 + 3) * 0.7,
        r: 0.18 + rand(seed, i * 5 + 4) * 0.18,
        tone: rand(seed, i * 5 + 5),
      });
    }
    return arr;
  }, [seed, count]);

  return (
    <group position={position}>
      {items.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          {/* Trunk */}
          <mesh position={[0, t.h * 0.3, 0]}>
            <cylinderGeometry args={[0.04, 0.06, t.h * 0.6, 5]} />
            <meshStandardMaterial color={palette.trunk} roughness={0.95} metalness={0} />
          </mesh>
          {/* Crown — stacked cones for stylized fantasy tree */}
          <mesh position={[0, t.h * 0.9, 0]}>
            <coneGeometry args={[t.r * 1.4, t.h * 0.7, 6]} />
            <meshStandardMaterial color={t.tone > 0.5 ? palette.leaves : palette.leavesAccent} roughness={0.85} />
          </mesh>
          <mesh position={[0, t.h * 1.25, 0]}>
            <coneGeometry args={[t.r * 1.0, t.h * 0.55, 6]} />
            <meshStandardMaterial color={palette.leavesAccent} roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Ruin / standing stone ────────────────────────────────────────

function RuinCluster({ position, seed, color }: { position: [number, number, number]; seed: number; color: string }) {
  const stones = useMemo(() => {
    const arr = [] as Array<{ x: number; z: number; h: number; rot: number; tilt: number }>;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + rand(seed, i) * 0.4;
      arr.push({
        x: Math.cos(angle) * 1.0,
        z: Math.sin(angle) * 1.0,
        h: 0.8 + rand(seed, i * 7) * 0.6,
        rot: rand(seed, i * 11) * Math.PI,
        tilt: (rand(seed, i * 13) - 0.5) * 0.25,
      });
    }
    return arr;
  }, [seed]);

  return (
    <group position={position}>
      {stones.map((s, i) => (
        <mesh
          key={i}
          position={[s.x, s.h / 2, s.z]}
          rotation={[s.tilt, s.rot, s.tilt * 0.5]}
        >
          <boxGeometry args={[0.28, s.h, 0.18]} />
          <meshStandardMaterial color={color} roughness={0.95} metalness={0.05} />
        </mesh>
      ))}
      {/* Center cairn */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.35, 0.4, 0.12, 8]} />
        <meshStandardMaterial color={color} roughness={0.92} />
      </mesh>
    </group>
  );
}

// ─── Entity pip — gold/violet/ember pawns ─────────────────────────

function MythicEntity({
  position, name, type, isSelected, dimmed, onClick,
}: {
  position: [number, number, number];
  name: string;
  type: 'player' | 'enemy' | 'construct';
  isSelected: boolean;
  dimmed: boolean;
  onClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  const baseColor =
    type === 'player' ? MYTHIC.gold :
    type === 'enemy'  ? MYTHIC.ember :
                        MYTHIC.violetGlow;

  useFrame((s) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(s.clock.elapsedTime * 1.6 + position[0]) * 0.04;
    }
    if (haloRef.current) {
      haloRef.current.rotation.z += 0.015;
      const sc = isSelected ? 1.25 + Math.sin(s.clock.elapsedTime * 4) * 0.1 : 1;
      haloRef.current.scale.set(sc, sc, 1);
    }
  });

  const opacity = dimmed ? 0.5 : 1;

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      {/* Halo */}
      <mesh ref={haloRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
        <ringGeometry args={[0.18, 0.28, 24]} />
        <meshBasicMaterial color={baseColor} transparent opacity={0.55 * opacity} side={THREE.DoubleSide} />
      </mesh>

      {/* Pawn body — capped pillar */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.11, 0.16, 0.36, 12]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={isSelected ? 1.2 : 0.5}
          roughness={0.4}
          metalness={0.3}
          transparent
          opacity={opacity}
        />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={isSelected ? 1.4 : 0.6}
          roughness={0.3}
          metalness={0.4}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Light */}
      <pointLight color={baseColor} intensity={0.7} distance={2.2} decay={2} position={[0, 0.5, 0]} />

      {/* Label */}
      <Billboard position={[0, 0.85, 0]}>
        <Text
          fontSize={0.16}
          color="#f5f5fb"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.014}
          outlineColor={MYTHIC.voidDeep}
          letterSpacing={0.04}
        >
          {name}
        </Text>
      </Billboard>
    </group>
  );
}

// ─── Hazard glow disc ─────────────────────────────────────────────

function HazardGlow({ position, color, radius }: { position: [number, number, number]; color: string; radius: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.MeshBasicMaterial;
    m.opacity = 0.35 + Math.sin(s.clock.elapsedTime * 3 + position[0]) * 0.15;
  });
  return (
    <group position={[position[0], 0.06, position[2]]}>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 0.25, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight color={color} intensity={1.2} distance={radius * 0.8} decay={2} position={[0, 0.4, 0]} />
    </group>
  );
}

// ─── Biome → prop palette resolver ────────────────────────────────

interface PropPalette {
  buildings: { wall: string; roof: string; light: string };
  foliage:   { trunk: string; leaves: string; leavesAccent: string };
  ruinColor: string;
}

function resolvePropPalette(biomeId: string): PropPalette {
  const mats = getBiomeMaterialSet(biomeId);
  return {
    buildings: {
      wall: mats.structure.color,
      roof: mats.structureAccent.color,
      light: MYTHIC.goldGlow,
    },
    foliage: {
      trunk: mats.structure.color,
      leaves: mats.foliage.color,
      leavesAccent: mats.foliageAccent.color,
    },
    ruinColor: mats.stone.color,
  };
}

/** Decide which props to seed into each zone based on its label/tactical hints. */
function classifyZone(
  zone: NonNullable<TacticalMapData['zones']>[number]
): 'settlement' | 'foliage' | 'ruin' | 'open' {
  const label = (zone.label || '').toLowerCase();
  const hint = (zone.colorHint || '').toLowerCase();
  const tact = zone.tactical || ({} as Partial<typeof zone.tactical>);

  if (/town|village|market|hall|inn|temple|shrine|camp|outpost|fort|keep|gate|bridge|building|rooftop|floor|station|hangar|deck/.test(label)) return 'settlement';
  if (/forest|wood|grove|jungle|thicket|garden|treeline|canopy|clearing/.test(label)) return 'foliage';
  if (/ruin|tomb|cairn|stone|altar|crypt|monolith|barrow|relic|wreck/.test(label)) return 'ruin';
  if (hint === 'water') return 'open';
  if (tact.hasCover) return 'settlement';
  return 'open';
}

// ─── Main component ───────────────────────────────────────────────

interface MythicWorldMap3DProps {
  data: TacticalMapData;
  selectedEntityId?: string | null;
  selectedZoneId?: string | null;
  onEntityTap?: (id: string) => void;
  onZoneTap?: (id: string) => void;
}

export function MythicWorldMap3D({
  data,
  selectedEntityId,
  selectedZoneId,
  onEntityTap,
  onZoneTap,
}: MythicWorldMap3DProps) {
  const biomeId = useMemo(
    () => detectBiomeForVisuals(data.arenaName),
    [data.arenaName]
  );
  const lightingProfile = useMemo(() => getLightingProfile(biomeId), [biomeId]);
  const propPalette = useMemo(() => resolvePropPalette(biomeId), [biomeId]);
  const seed = useMemo(() => hashSeed((data.arenaName || 'world') + '::' + biomeId), [data.arenaName, biomeId]);

  const groundColor = lightingProfile.fogTint || MYTHIC.indigo;
  const accentColor = MYTHIC.violet;

  // Position entities in world space with elevation lift
  const entityPositions = useMemo(() => {
    return data.entities.map(e => {
      const zone = data.zones?.find(z => z.id === e.zoneId);
      const [wx, , wz] = toWorld(e.x, e.y);
      const wy = getElevationY(zone?.elevation) * 0.4 + 0.1;
      return { ...e, wx, wy, wz };
    });
  }, [data.entities, data.zones]);

  return (
    <div className="w-full h-full relative" style={{ touchAction: 'none' }}>
      {/* Vignette overlay */}
      <div
        className="absolute inset-0 z-10 pointer-events-none rounded-lg"
        style={{ boxShadow: 'inset 0 0 80px 24px rgba(5, 5, 15, 0.95)' }}
      />
      {/* Compass / scale hint */}
      <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-amber-200/90 backdrop-blur-sm border border-amber-500/20 pointer-events-none">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
        {biomeId.replace(/_/g, ' ')}
      </div>

      <Canvas
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        style={{ background: MYTHIC.voidDeep }}
      >
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 9, 12]} fov={42} />
          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            maxPolarAngle={Math.PI / 2.15}
            minPolarAngle={Math.PI / 8}
            minDistance={4}
            maxDistance={28}
            target={[0, 0.4, 0]}
            enableDamping
            dampingFactor={0.08}
          />

          {/* ── Sky & atmosphere ── */}
          <MythicSky />
          <Stars radius={60} depth={40} count={1400} factor={3} fade speed={0.4} />
          <fog attach="fog" args={[MYTHIC.voidMid, 14, 38]} />

          {/* ── Lights ── */}
          <ambientLight color={MYTHIC.indigo} intensity={0.55} />
          <directionalLight
            position={[6, 10, 6]}
            intensity={0.9}
            color={MYTHIC.violetGlow}
          />
          <directionalLight
            position={[-8, 5, -4]}
            intensity={0.35}
            color={MYTHIC.gold}
          />
          {/* Hero rim moonlight */}
          <pointLight position={[0, 12, -4]} color={MYTHIC.violet} intensity={1.4} distance={28} decay={2} />

          {/* ── Terrain ── */}
          <MythicTerrain
            groundColor={groundColor}
            accentColor={accentColor}
            seed={seed}
            zones={data.zones || []}
          />

          {/* ── Mist ── */}
          <MistParticles count={260} color={MYTHIC.mist} />

          {/* ── Worldbuilding props per zone ── */}
          {data.zones?.map((zone, idx) => {
            const [wx, , wz] = toWorld(zone.x, zone.y);
            const wy = getElevationY(zone.elevation) * 0.4;
            const zSeed = hashSeed(zone.id + seed.toFixed(4));
            const kind = classifyZone(zone);
            const isSelected = selectedZoneId === zone.id;

            return (
              <group key={zone.id}>
                {kind === 'settlement' && (
                  <Settlement
                    position={[wx, wy, wz]}
                    seed={zSeed}
                    density={7 + Math.floor(rand(zSeed, 1) * 5)}
                    palette={propPalette.buildings}
                  />
                )}
                {kind === 'foliage' && (
                  <FoliageCluster
                    position={[wx, wy, wz]}
                    seed={zSeed}
                    count={12 + Math.floor(rand(zSeed, 2) * 6)}
                    palette={propPalette.foliage}
                  />
                )}
                {kind === 'ruin' && (
                  <RuinCluster
                    position={[wx, wy, wz]}
                    seed={zSeed}
                    color={propPalette.ruinColor}
                  />
                )}

                {/* Always plant a landmark beacon */}
                <LandmarkBeacon
                  position={[wx, wy + 0.05, wz]}
                  label={zone.label}
                  color={isSelected ? MYTHIC.goldGlow : MYTHIC.gold}
                  scale={isSelected ? 1.15 : 1}
                />

                {/* Invisible click target for the zone */}
                <mesh
                  position={[wx, wy + 0.02, wz]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  onClick={(e) => { e.stopPropagation(); onZoneTap?.(zone.id); }}
                >
                  <circleGeometry args={[Math.max(zone.width, zone.height) * 0.16, 24]} />
                  <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>
              </group>
            );
          })}

          {/* ── Hazards ── */}
          {data.hazards?.map(h => {
            const [wx, , wz] = toWorld(h.x, h.y);
            const color = /fire|burn|ember/.test(h.type) ? MYTHIC.ember
              : /electric|spark|storm/.test(h.type) ? MYTHIC.gold
              : /water|flood|ice/.test(h.type) ? '#60a5fa'
              : MYTHIC.violet;
            return <HazardGlow key={h.id} position={[wx, 0, wz]} color={color} radius={h.radius * 0.6} />;
          })}

          {/* ── Entities ── */}
          {entityPositions.map(entity => {
            const awareness = data.awareness?.entityAwareness?.[entity.id];
            if (awareness === 'hidden') return null;
            return (
              <MythicEntity
                key={entity.id}
                position={[entity.wx, entity.wy + 0.3, entity.wz]}
                name={entity.name}
                type={entity.type}
                isSelected={selectedEntityId === entity.id}
                dimmed={awareness === 'partial'}
                onClick={() => onEntityTap?.(entity.id)}
              />
            );
          })}
        </Suspense>
      </Canvas>
    </div>
  );
}

export default MythicWorldMap3D;
