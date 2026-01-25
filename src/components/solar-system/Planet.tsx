import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import Atmosphere from './Atmosphere';
import PlanetRings from './PlanetRings';
import Moon from './Moon';
import PlanetSurface from './PlanetSurface';
import { getGravityClass } from '@/lib/planet-physics';
import { parseTerrainFromLore, generateTerrainVisuals } from '@/lib/planet-terrain';
import { useIsMobile } from '@/hooks/use-mobile';

export interface MoonData {
  name: string;
  displayName?: string;
  color?: string;
  characterCount: number;
}

interface PlanetProps {
  name: string;
  orbitRadius: number;
  planetSize: number;
  orbitSpeed: number;
  color: string;
  emissiveColor?: string;
  characterCount: number;
  onClick: (position: { x: number; y: number; z: number }) => void;
  isSelected: boolean;
  hasRingsOverride?: boolean | null;
  moonCountOverride?: number | null;
  // Sun properties for accurate effects
  sunTemperature?: number;
  sunLuminosity?: number;
  habitableZoneInner?: number;
  habitableZoneOuter?: number;
  // Planet physics
  gravity?: number | null;
  // Planet lore for terrain parsing
  description?: string;
  // Moon customization data
  moonCustomizations?: MoonData[];
  onMoonClick?: (moonName: string, position: { x: number; y: number; z: number }) => void;
}

// Determine planet features based on name hash for consistency
function getPlanetFeatures(name: string, size: number) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hasRings = Math.abs(hash % 3) === 0; // ~33% of planets have rings
  const moonCount = size > 0.8 ? Math.abs(hash % 3) + 1 : size > 0.6 ? Math.abs(hash % 2) : 0;
  const atmosphereIntensity = 0.5 + (Math.abs(hash % 100) / 100) * 1.5;
  
  return { hasRings, moonCount, atmosphereIntensity };
}

// Generate moon colors based on planet
function getMoonColors(planetColor: string, count: number): string[] {
  const colors = ['#9CA3AF', '#D1D5DB', '#6B7280', '#E5E7EB', '#A1A1AA'];
  return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
}

export default function Planet({
  name,
  orbitRadius,
  planetSize,
  orbitSpeed,
  color,
  emissiveColor,
  characterCount,
  onClick,
  isSelected,
  hasRingsOverride,
  moonCountOverride,
  sunTemperature = 5778,
  sunLuminosity = 1,
  habitableZoneInner = 4.75,
  habitableZoneOuter = 6.85,
  gravity,
  description = '',
  moonCustomizations = [],
  onMoonClick,
}: PlanetProps) {
  const groupRef = useRef<THREE.Group>(null);
  const planetRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const angleRef = useRef(Math.random() * Math.PI * 2);
  const isMobile = useIsMobile();

  const defaultFeatures = useMemo(() => getPlanetFeatures(name, planetSize), [name, planetSize]);
  
  // Apply overrides if provided
  const hasRings = hasRingsOverride !== null && hasRingsOverride !== undefined 
    ? hasRingsOverride 
    : defaultFeatures.hasRings;
  const moonCount = moonCountOverride !== null && moonCountOverride !== undefined 
    ? moonCountOverride 
    : defaultFeatures.moonCount;
  const atmosphereIntensity = defaultFeatures.atmosphereIntensity;
  
  const moonColors = useMemo(() => getMoonColors(color, moonCount), [color, moonCount]);

  // Calculate if planet is in habitable zone
  const isInHabitableZone = orbitRadius >= habitableZoneInner && orbitRadius <= habitableZoneOuter;
  
  // Gravity classification for display
  const gravityInfo = gravity ? getGravityClass(gravity) : null;

  // Parse terrain from description/lore
  const terrainFeatures = useMemo(() => parseTerrainFromLore(description), [description]);
  const terrainVisuals = useMemo(
    () => generateTerrainVisuals(terrainFeatures, color),
    [terrainFeatures, color]
  );
  
  // Calculate planet temperature based on distance from sun and sun's luminosity
  // T_planet ∝ (L^0.25) / (d^0.5) - simplified equilibrium temperature
  const planetTemperature = useMemo(() => {
    const baseTemp = 288; // Earth's average temp in K at 1 AU from Sun
    const distanceRatio = orbitRadius / 5; // 5 = 1 AU equivalent in our scale
    const tempK = baseTemp * Math.pow(sunLuminosity, 0.25) / Math.pow(distanceRatio, 0.5);
    return Math.round(tempK);
  }, [orbitRadius, sunLuminosity]);
  
  // Determine planet climate zone for visual effects
  const climateZone = useMemo(() => {
    if (planetTemperature > 400) return 'scorched'; // Too hot, like Mercury/Venus
    if (planetTemperature > 320) return 'hot';
    if (planetTemperature >= 250 && planetTemperature <= 310) return 'temperate'; // Earth-like
    if (planetTemperature >= 200) return 'cold';
    return 'frozen'; // Ice world
  }, [planetTemperature]);

  // Adjust emissive based on heat from sun
  const heatEmissive = useMemo(() => {
    if (climateZone === 'scorched') return 0.6;
    if (climateZone === 'hot') return 0.4;
    return 0.2;
  }, [climateZone]);

  useFrame((state, delta) => {
    if (groupRef.current && !isSelected) {
      angleRef.current += orbitSpeed * delta;
      const x = Math.cos(angleRef.current) * orbitRadius;
      const z = Math.sin(angleRef.current) * orbitRadius;
      groupRef.current.position.x = x;
      groupRef.current.position.z = z;
    }

    if (planetRef.current) {
      // Slow rotation for a more realistic feel
      planetRef.current.rotation.y += delta * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Enhanced planet surface with procedural terrain */}
      <group
        ref={planetRef}
        onClick={(e) => {
          e.stopPropagation();
          if (groupRef.current) {
            onClick({
              x: groupRef.current.position.x,
              y: groupRef.current.position.y,
              z: groupRef.current.position.z,
            });
          }
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <PlanetSurface
          size={planetSize}
          color={color}
          description={description}
          oceanCoverage={terrainFeatures.oceanCoverage}
          hasMountains={terrainFeatures.hasMountains}
          hasVolcanoes={terrainFeatures.hasVolcanoes}
          hasTundra={terrainFeatures.hasTundra}
          hasDeserts={terrainFeatures.hasDeserts}
          hasForests={terrainFeatures.hasForests}
          isHovered={hovered}
        />
      </group>

      {/* Lava glow for volcanic worlds */}
      {terrainVisuals.hasLavaGlow && (
        <mesh>
          <sphereGeometry args={[planetSize * 1.02, 16, 16]} />
          <meshBasicMaterial
            color={terrainVisuals.emissiveColor || "#F97316"}
            transparent
            opacity={hovered ? 0.35 : 0.2}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Habitable zone indicator glow */}
      {isInHabitableZone && (
        <mesh>
          <sphereGeometry args={[planetSize * 1.15, 16, 16]} />
          <meshBasicMaterial
            color="#22C55E"
            transparent
            opacity={hovered ? 0.25 : 0.1}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Dust storm effect for desert worlds */}
      {terrainVisuals.hasDustStorms && (
        <mesh>
          <sphereGeometry args={[planetSize * 1.08, 16, 16]} />
          <meshBasicMaterial
            color={terrainVisuals.dustColor}
            transparent
            opacity={0.12}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Crystal shine effect */}
      {terrainVisuals.hasCrystalShine && (
        <mesh>
          <sphereGeometry args={[planetSize * 1.03, 16, 16]} />
          <meshBasicMaterial
            color={terrainFeatures.crystalColor}
            transparent
            opacity={hovered ? 0.2 : 0.1}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Magical aura glow */}
      {terrainVisuals.hasMagicGlow && (
        <mesh>
          <sphereGeometry args={[planetSize * 1.06, 16, 16]} />
          <meshBasicMaterial
            color={terrainFeatures.glowColor}
            transparent
            opacity={hovered ? 0.18 : 0.08}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Aurora effect for polar/magical worlds */}
      {terrainVisuals.hasAurorae && (
        <mesh rotation={[0.3, 0, 0]}>
          <torusGeometry args={[planetSize * 1.3, planetSize * 0.15, 8, 32]} />
          <meshBasicMaterial
            color={terrainFeatures.hasMagicAura ? "#9370DB" : "#4ADE80"}
            transparent
            opacity={hovered ? 0.12 : 0.05}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Layered atmosphere */}
      <Atmosphere
        planetSize={planetSize}
        color={terrainVisuals.accentColor}
        intensity={hovered ? atmosphereIntensity * 1.5 : atmosphereIntensity}
        animated
      />

      {/* Planetary rings (for some planets) */}
      {hasRings && (
        <PlanetRings
          innerRadius={planetSize * 1.4}
          outerRadius={planetSize * 2.2}
          color={color}
          opacity={hovered ? 0.7 : 0.5}
        />
      )}

      {/* Moons (for larger planets) - either from customizations or auto-generated */}
      {moonCustomizations.length > 0 ? (
        // Render customized moons with character counts
        moonCustomizations.map((moon, index) => (
          <Moon
            key={moon.name}
            orbitRadius={planetSize * (1.8 + index * 0.6)}
            moonSize={planetSize * (0.15 - Math.min(index, 3) * 0.03)}
            orbitSpeed={2 + index * 0.5}
            color={moon.color || moonColors[index % moonColors.length]}
            startAngle={(index * Math.PI * 2) / moonCustomizations.length}
            name={moon.displayName || moon.name}
            characterCount={moon.characterCount}
            onClick={onMoonClick ? (pos) => onMoonClick(moon.name, pos) : undefined}
          />
        ))
      ) : (
        // Auto-generated moons (visual only)
        Array.from({ length: moonCount }).map((_, index) => (
          <Moon
            key={index}
            orbitRadius={planetSize * (1.8 + index * 0.6)}
            moonSize={planetSize * (0.15 - index * 0.03)}
            orbitSpeed={2 + index * 0.5}
            color={moonColors[index]}
            startAngle={(index * Math.PI * 2) / moonCount}
          />
        ))
      )}

      {/* Label */}
      <Html
        position={[0, planetSize + (hasRings ? 1.2 : 0.5), 0]}
        center
        distanceFactor={isMobile ? 12 : undefined}
        style={{
          pointerEvents: 'none',
          opacity: hovered || isSelected ? 1 : 0.7,
          transition: 'opacity 0.3s',
        }}
      >
        <div className="text-center whitespace-nowrap" style={{ transform: isMobile ? 'scale(0.8)' : 'none' }}>
          <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-bold text-white drop-shadow-lg flex items-center gap-1 justify-center`}>
            {name}
            {isInHabitableZone && (
              <span className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} text-green-400`} title="In habitable zone">🌱</span>
            )}
          </div>
          {!isMobile && (
            <>
              <div className="text-xs text-muted-foreground">
                {characterCount} character{characterCount !== 1 ? 's' : ''}
              </div>
              <div className="text-[10px] text-muted-foreground/70">
                ~{planetTemperature}K · {climateZone}
              </div>
              {gravityInfo && (
                <div 
                  className="text-[10px] mt-0.5 px-1.5 py-0.5 rounded-full inline-block"
                  style={{ 
                    backgroundColor: gravityInfo.color + '30', 
                    color: gravityInfo.color 
                  }}
                >
                  {gravity?.toFixed(1)}g · {gravityInfo.name}
                </div>
              )}
            </>
          )}
        </div>
      </Html>
    </group>
  );
}
