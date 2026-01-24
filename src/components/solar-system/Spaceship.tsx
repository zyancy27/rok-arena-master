import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Text, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { useIsMobile } from '@/hooks/use-mobile';

interface SpaceshipProps {
  name: string;
  orbitRadius: number;
  orbitSpeed: number;
  size: number;
  color: string;
  characterCount: number;
  isFleet?: boolean;
  onClick?: () => void;
}

// Keywords that identify a ship or fleet home
export const SHIP_KEYWORDS = [
  'ship', 'vessel', 'cruiser', 'destroyer', 'carrier', 'frigate', 'corvette',
  'battleship', 'dreadnought', 'starship', 'spacecraft', 'shuttle', 'station',
  'ark', 'flagship', 'warship', 'gunship'
];

export const FLEET_KEYWORDS = [
  'fleet', 'armada', 'flotilla', 'squadron', 'navy', 'convoy', 'taskforce',
  'task force', 'battle group', 'battlegroup'
];

export function isShipOrFleetHome(homePlanet: string | null | undefined): { isShip: boolean; isFleet: boolean } {
  if (!homePlanet) return { isShip: false, isFleet: false };
  
  const lower = homePlanet.toLowerCase();
  const isFleet = FLEET_KEYWORDS.some(keyword => lower.includes(keyword));
  const isShip = !isFleet && SHIP_KEYWORDS.some(keyword => lower.includes(keyword));
  
  return { isShip, isFleet };
}

// Single ship mesh - sleek sci-fi design
function ShipMesh({ color, size }: { color: string; size: number }) {
  return (
    <group scale={size}>
      {/* Main hull - elongated octahedron */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial 
          color="#1a1a2e"
          metalness={0.9}
          roughness={0.2}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Engine glow */}
      <mesh position={[-0.6, 0, 0]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      
      {/* Engine trail */}
      <mesh position={[-0.9, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.12, 0.5, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
      
      {/* Wings */}
      <mesh position={[0, 0, 0.3]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.4, 0.02, 0.3]} />
        <meshStandardMaterial color="#2a2a4e" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, -0.3]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.4, 0.02, 0.3]} />
        <meshStandardMaterial color="#2a2a4e" metalness={0.8} roughness={0.3} />
      </mesh>
      
      {/* Bridge/cockpit */}
      <mesh position={[0.35, 0.08, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial 
          color="#4466aa"
          metalness={0.5}
          roughness={0.3}
          emissive="#6688cc"
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Running lights */}
      <pointLight position={[0.5, 0, 0]} color={color} intensity={0.5} distance={2} />
    </group>
  );
}

// Fleet formation - multiple ships
function FleetFormation({ color, size, shipCount }: { color: string; size: number; shipCount: number }) {
  const ships = useMemo(() => {
    const positions: [number, number, number][] = [];
    const count = Math.min(Math.max(shipCount, 3), 7); // 3-7 ships in fleet
    
    // V-formation
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / 2);
      const side = i % 2 === 0 ? 1 : -1;
      const offset = i === 0 ? 0 : side;
      positions.push([
        -row * 0.8,
        (Math.random() - 0.5) * 0.2,
        offset * (row * 0.6 + 0.3)
      ]);
    }
    return positions;
  }, [shipCount]);

  return (
    <group scale={size * 0.7}>
      {ships.map((pos, i) => (
        <group key={i} position={pos}>
          <ShipMesh color={color} size={0.6 + (i === 0 ? 0.3 : 0)} />
        </group>
      ))}
      
      {/* Fleet energy field */}
      <mesh>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial 
          color={color}
          transparent
          opacity={0.05}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

export default function Spaceship({
  name,
  orbitRadius,
  orbitSpeed,
  size,
  color,
  characterCount,
  isFleet = false,
  onClick,
}: SpaceshipProps) {
  const groupRef = useRef<THREE.Group>(null);
  const shipRef = useRef<THREE.Group>(null);
  const angle = useRef(Math.random() * Math.PI * 2);
  const isMobile = useIsMobile();

  useFrame((_, delta) => {
    angle.current += delta * orbitSpeed;
    
    if (groupRef.current) {
      // Orbital movement
      groupRef.current.position.x = Math.cos(angle.current) * orbitRadius;
      groupRef.current.position.z = Math.sin(angle.current) * orbitRadius;
      // Slight vertical bobbing
      groupRef.current.position.y = Math.sin(angle.current * 2) * 0.3;
    }
    
    if (shipRef.current) {
      // Ship faces direction of travel (tangent to orbit)
      shipRef.current.rotation.y = -angle.current + Math.PI / 2;
      // Slight banking on turns
      shipRef.current.rotation.z = Math.sin(angle.current * 3) * 0.1;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation?.();
    onClick?.();
  };

  return (
    <group ref={groupRef}>
      <group ref={shipRef} onClick={handleClick}>
        {isFleet ? (
          <FleetFormation color={color} size={size} shipCount={characterCount + 2} />
        ) : (
          <ShipMesh color={color} size={size} />
        )}
        
        {/* Ship/Fleet name label */}
        <Float speed={2} floatIntensity={0.2}>
          <Text
            position={[0, size * 0.8 + 0.5, 0]}
            fontSize={isMobile ? 0.18 : 0.25}
            color={color}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {name}
          </Text>
          {characterCount > 0 && !isMobile && (
            <Text
              position={[0, size * 0.8 + 0.2, 0]}
              fontSize={0.15}
              color="#888888"
              anchorX="center"
              anchorY="middle"
            >
              {characterCount} {characterCount === 1 ? 'crew member' : 'crew members'}
            </Text>
          )}
        </Float>
        
        {/* Particle effects */}
        <Sparkles
          count={isFleet ? 30 : 15}
          scale={isFleet ? 3 : 1.5}
          size={1.5}
          speed={0.5}
          color={color}
          opacity={0.6}
        />
      </group>
    </group>
  );
}
