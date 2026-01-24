import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, OrbitControls, Text, Float, Sparkles } from '@react-three/drei';
import { useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Crown, Sparkles as SparklesIcon } from 'lucide-react';

// Throne holder data - hardcoded for now
interface ThroneHolder {
  id: number;
  name: string;
  title: string;
  contribution: string;
  characterName: string;
  characterDescription: string;
  color: string;
  isEmpty: boolean;
  isCreator: boolean;
}

const throneHolders: ThroneHolder[] = [
  // Original 3 Creators
  {
    id: 1,
    name: 'The First King',
    title: 'Creator of Level 7',
    contribution: 'Logic Resorts - Willpower-based paradox',
    characterName: 'Awaiting Avatar',
    characterDescription: 'The most meaningful creation of the First King',
    color: '#FFD700',
    isEmpty: true,
    isCreator: true,
  },
  {
    id: 2,
    name: 'The Second King',
    title: 'Creator of Level 6',
    contribution: 'Logic Bending - Balance restoration',
    characterName: 'Awaiting Avatar',
    characterDescription: 'The most meaningful creation of the Second King',
    color: '#C0C0C0',
    isEmpty: true,
    isCreator: true,
  },
  {
    id: 3,
    name: 'The Third King',
    title: 'Original Creator',
    contribution: 'Founding Architect',
    characterName: 'Awaiting Avatar',
    characterDescription: 'The most meaningful creation of the Third King',
    color: '#CD7F32',
    isEmpty: true,
    isCreator: true,
  },
  // 4 Thrones for future contributors
  {
    id: 4,
    name: 'Empty Throne',
    title: 'Awaiting Champion',
    contribution: 'Reserved for one who changes the game',
    characterName: '???',
    characterDescription: 'For one who creates a new level',
    color: '#4A5568',
    isEmpty: true,
    isCreator: false,
  },
  {
    id: 5,
    name: 'Empty Throne',
    title: 'Awaiting Champion',
    contribution: 'Reserved for one who changes the game',
    characterName: '???',
    characterDescription: 'For one who creates a new level',
    color: '#4A5568',
    isEmpty: true,
    isCreator: false,
  },
  {
    id: 6,
    name: 'Empty Throne',
    title: 'Awaiting Champion',
    contribution: 'Reserved for one who changes the game',
    characterName: '???',
    characterDescription: 'For one who creates a new level',
    color: '#4A5568',
    isEmpty: true,
    isCreator: false,
  },
  {
    id: 7,
    name: 'Empty Throne',
    title: 'Awaiting Champion',
    contribution: 'Reserved for one who changes the game',
    characterName: '???',
    characterDescription: 'For one who creates a new level',
    color: '#4A5568',
    isEmpty: true,
    isCreator: false,
  },
];

// Pose configurations for each throne holder - ethereal cosmic beings
const figureConfigs: Record<number, {
  pose: 'commanding' | 'relaxed' | 'contemplative';
  headTilt: number;
  armSpread: number;
  leanAngle: number;
}> = {
  1: { pose: 'commanding', headTilt: 0.1, armSpread: 0.4, leanAngle: 0.15 },
  2: { pose: 'relaxed', headTilt: -0.05, armSpread: 0.6, leanAngle: -0.1 },
  3: { pose: 'contemplative', headTilt: 0.2, armSpread: 0.2, leanAngle: 0.05 },
};

// Wireframe holographic figure - cosmic energy being
function SeatedFigure({ holderId, color }: { holderId: number; color: string }) {
  const figRef = useRef<THREE.Group>(null);
  const config = figureConfigs[holderId] || figureConfigs[1];
  
  // Subtle breathing/floating animation
  useFrame((state) => {
    if (figRef.current) {
      figRef.current.position.y = 0.6 + Math.sin(state.clock.elapsedTime * 0.8 + holderId) * 0.02;
    }
  });

  // Wireframe material for holographic look
  const wireframeMaterial = useMemo(() => (
    <meshBasicMaterial 
      color={color}
      wireframe
      transparent
      opacity={0.8}
    />
  ), [color]);

  // Solid glow core material
  const glowMaterial = useMemo(() => (
    <meshBasicMaterial 
      color={color}
      transparent
      opacity={0.3}
    />
  ), [color]);

  return (
    <group ref={figRef} position={[0, 0.6, 0.1]}>
      {/* Energy aura behind figure */}
      <mesh position={[0, 0.9, -0.15]}>
        <planeGeometry args={[1.2, 1.8]} />
        <meshBasicMaterial 
          color={color}
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* HEAD */}
      <group position={[0, 1.55, 0]} rotation={[config.headTilt, 0, 0]}>
        {/* Wireframe skull */}
        <mesh>
          <sphereGeometry args={[0.16, 12, 8]} />
          {wireframeMaterial}
        </mesh>
        {/* Inner glow */}
        <mesh>
          <sphereGeometry args={[0.12, 8, 6]} />
          {glowMaterial}
        </mesh>
        {/* Eyes - solid glow points */}
        <mesh position={[0.05, 0.02, 0.12]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh position={[-0.05, 0.02, 0.12]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
        {/* Crown/halo */}
        <mesh position={[0, 0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.2, 0.02, 6, 24]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </group>

      {/* NECK */}
      <mesh position={[0, 1.38, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 0.12, 8]} />
        {wireframeMaterial}
      </mesh>

      {/* TORSO */}
      <group position={[0, 0.95, 0]} rotation={[config.leanAngle, 0, 0]}>
        {/* Ribcage wireframe */}
        <mesh>
          <cylinderGeometry args={[0.2, 0.15, 0.4, 10]} />
          {wireframeMaterial}
        </mesh>
        {/* Inner chest glow */}
        <mesh>
          <cylinderGeometry args={[0.12, 0.1, 0.3, 6]} />
          {glowMaterial}
        </mesh>
        {/* Shoulders */}
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.5, 0.08, 0.15]} />
          {wireframeMaterial}
        </mesh>
      </group>

      {/* PELVIS/HIPS - seated */}
      <mesh position={[0, 0.55, 0.05]}>
        <boxGeometry args={[0.3, 0.2, 0.2]} />
        {wireframeMaterial}
      </mesh>

      {/* LEFT ARM */}
      <group position={[-0.28, 1.05, 0]} rotation={[-0.5, 0, config.armSpread]}>
        {/* Upper arm */}
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.035, 0.04, 0.25, 6]} />
          {wireframeMaterial}
        </mesh>
        {/* Elbow joint */}
        <mesh position={[0, -0.3, 0]}>
          <sphereGeometry args={[0.04, 6, 4]} />
          {wireframeMaterial}
        </mesh>
        {/* Forearm */}
        <group position={[0, -0.35, 0.1]} rotation={[-0.7, 0, 0]}>
          <mesh position={[0, -0.1, 0]}>
            <cylinderGeometry args={[0.03, 0.035, 0.22, 6]} />
            {wireframeMaterial}
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.25, 0]}>
            <sphereGeometry args={[0.04, 6, 4]} />
            {wireframeMaterial}
          </mesh>
          {/* Fingers */}
          {[-0.02, 0, 0.02].map((offset, i) => (
            <mesh key={i} position={[offset, -0.32, 0]}>
              <cylinderGeometry args={[0.008, 0.01, 0.06, 4]} />
              {wireframeMaterial}
            </mesh>
          ))}
        </group>
      </group>

      {/* RIGHT ARM */}
      <group 
        position={[0.28, 1.05, 0]} 
        rotation={[
          config.pose === 'contemplative' ? -1.2 : -0.5, 
          0, 
          -config.armSpread
        ]}
      >
        {/* Upper arm */}
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.035, 0.04, 0.25, 6]} />
          {wireframeMaterial}
        </mesh>
        {/* Elbow joint */}
        <mesh position={[0, -0.3, 0]}>
          <sphereGeometry args={[0.04, 6, 4]} />
          {wireframeMaterial}
        </mesh>
        {/* Forearm */}
        <group 
          position={[0, -0.35, 0.1]} 
          rotation={[config.pose === 'contemplative' ? -1.0 : -0.7, 0, 0]}
        >
          <mesh position={[0, -0.1, 0]}>
            <cylinderGeometry args={[0.03, 0.035, 0.22, 6]} />
            {wireframeMaterial}
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.25, 0]}>
            <sphereGeometry args={[0.04, 6, 4]} />
            {wireframeMaterial}
          </mesh>
          {/* Fingers */}
          {[-0.02, 0, 0.02].map((offset, i) => (
            <mesh key={i} position={[offset, -0.32, 0]}>
              <cylinderGeometry args={[0.008, 0.01, 0.06, 4]} />
              {wireframeMaterial}
            </mesh>
          ))}
          {/* Holding orb for commanding pose */}
          {config.pose === 'commanding' && (
            <Float speed={3} floatIntensity={0.2}>
              <mesh position={[0, -0.4, 0.1]}>
                <icosahedronGeometry args={[0.08, 0]} />
                <meshBasicMaterial color={color} wireframe />
              </mesh>
              <mesh position={[0, -0.4, 0.1]}>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshBasicMaterial color={color} transparent opacity={0.5} />
              </mesh>
            </Float>
          )}
        </group>
      </group>

      {/* LEFT LEG */}
      <group position={[-0.12, 0.4, 0.15]}>
        {/* Thigh */}
        <mesh rotation={[1.3, 0, 0.1]} position={[0, 0, 0.1]}>
          <cylinderGeometry args={[0.05, 0.04, 0.3, 6]} />
          {wireframeMaterial}
        </mesh>
        {/* Knee */}
        <mesh position={[-0.02, -0.1, 0.28]}>
          <sphereGeometry args={[0.04, 6, 4]} />
          {wireframeMaterial}
        </mesh>
        {/* Shin */}
        <mesh position={[-0.02, -0.25, 0.35]} rotation={[0.2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.04, 0.28, 6]} />
          {wireframeMaterial}
        </mesh>
        {/* Foot */}
        <mesh position={[-0.02, -0.42, 0.42]}>
          <boxGeometry args={[0.06, 0.03, 0.12]} />
          {wireframeMaterial}
        </mesh>
      </group>

      {/* RIGHT LEG */}
      <group position={[0.12, 0.4, 0.15]}>
        {/* Thigh */}
        <mesh rotation={[1.3, 0, -0.1]} position={[0, 0, 0.1]}>
          <cylinderGeometry args={[0.05, 0.04, 0.3, 6]} />
          {wireframeMaterial}
        </mesh>
        {/* Knee */}
        <mesh position={[0.02, -0.1, 0.28]}>
          <sphereGeometry args={[0.04, 6, 4]} />
          {wireframeMaterial}
        </mesh>
        {/* Shin */}
        <mesh position={[0.02, -0.25, 0.35]} rotation={[0.2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.04, 0.28, 6]} />
          {wireframeMaterial}
        </mesh>
        {/* Foot */}
        <mesh position={[0.02, -0.42, 0.42]}>
          <boxGeometry args={[0.06, 0.03, 0.12]} />
          {wireframeMaterial}
        </mesh>
      </group>

      {/* SPINE - visible through wireframe */}
      {[0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2].map((y, i) => (
        <mesh key={i} position={[0, y, -0.08]}>
          <boxGeometry args={[0.04, 0.06, 0.04]} />
          {wireframeMaterial}
        </mesh>
      ))}

      {/* Sparkle particles around figure */}
      <Sparkles
        count={20}
        scale={[1, 1.8, 0.6]}
        position={[0, 0.9, 0]}
        size={2}
        speed={0.4}
        color={color}
      />

      {/* Energy field outline */}
      <mesh position={[0, 0.9, 0]}>
        <capsuleGeometry args={[0.35, 0.9, 4, 12]} />
        <meshBasicMaterial 
          color={color}
          wireframe
          transparent
          opacity={0.15}
        />
      </mesh>
    </group>
  );
}

// Individual Throne component
function Throne({ 
  position, 
  holder, 
  onClick, 
  isSelected 
}: { 
  position: [number, number, number]; 
  holder: ThroneHolder;
  onClick: () => void;
  isSelected: boolean;
}) {
  const throneRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (throneRef.current && isSelected) {
      throneRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  const throneColor = holder.isEmpty && !holder.isCreator ? '#4a5a6a' : holder.color;

  // Calculate rotation to face the dome center (0, -2, 0)
  const domeCenter = { x: 0, z: 0 };
  const rotationY = Math.atan2(domeCenter.x - position[0], domeCenter.z - position[2]);

  return (
    <group 
      ref={throneRef} 
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Throne Base */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.2, 0.6, 1]} />
        <meshStandardMaterial 
          color={throneColor} 
          metalness={0.6} 
          roughness={0.3}
          emissive={throneColor}
          emissiveIntensity={hovered || isSelected ? 0.8 : holder.isCreator ? 0.5 : 0.2}
        />
      </mesh>

      {/* Throne Back */}
      <mesh position={[0, 1.5, -0.4]}>
        <boxGeometry args={[1.2, 2.4, 0.2]} />
        <meshStandardMaterial 
          color={throneColor} 
          metalness={0.6} 
          roughness={0.3}
          emissive={throneColor}
          emissiveIntensity={hovered || isSelected ? 0.8 : holder.isCreator ? 0.5 : 0.2}
        />
      </mesh>

      {/* Armrests */}
      <mesh position={[-0.55, 0.8, 0]}>
        <boxGeometry args={[0.15, 0.4, 0.8]} />
        <meshStandardMaterial 
          color={throneColor} 
          emissive={throneColor}
          emissiveIntensity={0.3}
          metalness={0.7} 
          roughness={0.2} 
        />
      </mesh>
      <mesh position={[0.55, 0.8, 0]}>
        <boxGeometry args={[0.15, 0.4, 0.8]} />
        <meshStandardMaterial 
          color={throneColor} 
          emissive={throneColor}
          emissiveIntensity={0.3}
          metalness={0.7} 
          roughness={0.2} 
        />
      </mesh>

      {/* Crown ornament on top */}
      {holder.isCreator && (
        <Float speed={2} floatIntensity={0.3}>
          <mesh position={[0, 3, -0.4]}>
            <octahedronGeometry args={[0.2]} />
            <meshStandardMaterial 
              color={holder.color} 
              emissive={holder.color}
              emissiveIntensity={0.8}
              metalness={1}
              roughness={0}
            />
          </mesh>
        </Float>
      )}

      {/* Detailed Avatar Figure */}
      {holder.isCreator && (
        <SeatedFigure 
          holderId={holder.id} 
          color={holder.color} 
        />
      )}

      {/* Throne label */}
      <Text
        position={[0, -0.3, 0.6]}
        fontSize={0.15}
        color={holder.isCreator ? holder.color : '#718096'}
        anchorX="center"
        anchorY="middle"
      >
        {holder.isCreator ? holder.title : 'Awaiting'}
      </Text>

      {/* Selection glow */}
      {(hovered || isSelected) && (
        <Sparkles
          count={20}
          scale={2}
          size={2}
          speed={0.4}
          color={holder.color}
        />
      )}
    </group>
  );
}

// The Multiverse Dome
function MultiverseDome() {
  const domeRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (innerRef.current) {
      innerRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  // Create galaxy/multiverse particles - positioned in upper half of dome
  const particles = useMemo(() => {
    const positions = new Float32Array(3000 * 3);
    const colors = new Float32Array(3000 * 3);
    
    for (let i = 0; i < 3000; i++) {
      const theta = Math.random() * Math.PI * 2;
      // phi from 0 to PI/2 keeps particles in upper hemisphere
      const phi = Math.random() * Math.PI * 0.45;
      const r = Math.random() * 3.5 + 0.5;
      
      // Position particles in upper half, above the table
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) + 0.5; // Offset up from table
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      // Colorful galaxy colors
      const colorChoice = Math.random();
      if (colorChoice < 0.3) {
        colors[i * 3] = 0.6 + Math.random() * 0.4;
        colors[i * 3 + 1] = 0.2;
        colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
      } else if (colorChoice < 0.6) {
        colors[i * 3] = 0.2;
        colors[i * 3 + 1] = 0.6 + Math.random() * 0.4;
        colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
      } else {
        colors[i * 3] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
        colors[i * 3 + 2] = 0.4;
      }
    }
    
    return { positions, colors };
  }, []);

  return (
    <group position={[0, -2, 0]}>
      {/* THE TABLE */}
      {/* Table top surface - where the dome sits */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5.5, 64]} />
        <meshStandardMaterial 
          color="#1a1a3e"
          emissive="#0a0a2e"
          emissiveIntensity={0.2}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Table rim/edge */}
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[5.5, 5.8, 0.3, 64]} />
        <meshStandardMaterial 
          color="#2a2a5e"
          emissive="#1a1a4e"
          emissiveIntensity={0.3}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Decorative gold ring on table edge */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5.3, 0.08, 8, 64]} />
        <meshBasicMaterial color="#FFD700" />
      </mesh>

      {/* Inner decorative ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4, 0.05, 8, 64]} />
        <meshBasicMaterial color="#8B5CF6" transparent opacity={0.8} />
      </mesh>

      {/* THE HALF-DOME (glass cover) */}
      <mesh ref={domeRef} position={[0, 0, 0]}>
        <sphereGeometry args={[4.5, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial 
          color="#6666cc"
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          emissive="#8888ff"
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Dome base ring where it meets the table */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4.5, 0.12, 16, 64]} />
        <meshStandardMaterial 
          color="#FFD700"
          emissive="#FFD700"
          emissiveIntensity={0.8}
          metalness={1}
          roughness={0}
        />
      </mesh>

      {/* THE MULTIVERSE INSIDE */}
      <group ref={innerRef}>
        {/* Galaxy particles */}
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={3000}
              array={particles.positions}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={3000}
              array={particles.colors}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.12}
            vertexColors
            transparent
            opacity={1}
            sizeAttenuation
          />
        </points>

        {/* Central bright core - positioned above table */}
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.9, 32, 32]} />
          <meshBasicMaterial color="#8B5CF6" transparent opacity={0.4} />
        </mesh>

        {/* Orbiting mini-systems - in upper half */}
        {[0, 1, 2, 3, 4].map((i) => {
          const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'];
          const radius = 1.5 + i * 0.4;
          const height = 1 + (i % 3) * 0.5;
          return (
            <Float key={i} speed={1.5 + i * 0.2} floatIntensity={0.2}>
              <mesh position={[
                Math.cos(i * Math.PI * 0.4) * radius,
                height,
                Math.sin(i * Math.PI * 0.4) * radius
              ]}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshBasicMaterial color={colors[i]} />
              </mesh>
            </Float>
          );
        })}

        {/* Horizontal galaxy disc/rings - in upper portion */}
        {[1.2, 2.2, 3.2].map((radius, i) => (
          <mesh key={i} position={[0, 1.2 + i * 0.3, 0]} rotation={[Math.PI / 2, 0, i * 0.3]}>
            <torusGeometry args={[radius, 0.04, 8, 64]} />
            <meshBasicMaterial 
              color={['#ff66aa', '#66aaff', '#ffaa66'][i]} 
              transparent 
              opacity={0.5} 
            />
          </mesh>
        ))}
      </group>

      {/* Lighting for the dome */}
      <pointLight position={[0, 3, 0]} color="#8B5CF6" intensity={4} distance={12} />
      <pointLight position={[0, 1, 0]} color="#ffffff" intensity={2} distance={8} />
    </group>
  );
}

// Main 3D Scene
function ThroneRoomScene({ 
  selectedThrone, 
  onSelectThrone 
}: { 
  selectedThrone: number | null;
  onSelectThrone: (id: number | null) => void;
}) {
  // Arrange thrones in a semi-circle facing the dome
  // Thrones lowered so dome is at chest height of seated figures
  const thronePositions: [number, number, number][] = useMemo(() => {
    const positions: [number, number, number][] = [];
    const radius = 10;
    const startAngle = Math.PI * 0.15;
    const endAngle = Math.PI * 0.85;
    const throneY = -3; // Lowered so dome (at y=-2) is at chest height
    
    for (let i = 0; i < 7; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / 6);
      positions.push([
        Math.cos(angle) * radius,
        throneY,
        Math.sin(angle) * radius - 5
      ]);
    }
    return positions;
  }, []);

  return (
    <>
      {/* Ambient and dramatic lighting - much brighter */}
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 10, 0]} intensity={3} color="#8B5CF6" />
      <pointLight position={[-10, 5, -10]} intensity={1.5} color="#FFD700" />
      <pointLight position={[10, 5, -10]} intensity={1.5} color="#FFD700" />
      <pointLight position={[0, 3, 8]} intensity={2} color="#ffffff" />
      <spotLight 
        position={[0, 15, 0]} 
        angle={0.6} 
        penumbra={0.5} 
        intensity={4} 
        color="#ffffff"
        castShadow
      />

      {/* Background stars */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* The floor - at throne level */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.5, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial 
          color="#2a2a5e"
          emissive="#1a1a4e"
          emissiveIntensity={0.3}
          metalness={0.4}
          roughness={0.6}
        />
      </mesh>

      {/* Floor glow ring around dome area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.48, 0]}>
        <ringGeometry args={[6, 8, 64]} />
        <meshBasicMaterial color="#8B5CF6" transparent opacity={0.3} />
      </mesh>

      {/* Thrones */}
      {throneHolders.map((holder, index) => (
        <Throne
          key={holder.id}
          position={thronePositions[index]}
          holder={holder}
          onClick={() => onSelectThrone(selectedThrone === holder.id ? null : holder.id)}
          isSelected={selectedThrone === holder.id}
        />
      ))}

      {/* The Multiverse Dome */}
      <MultiverseDome />

      {/* Camera controls */}
      <OrbitControls 
        enablePan={false}
        minDistance={8}
        maxDistance={25}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.55}
        target={[0, -2, 0]}
      />
    </>
  );
}

export default function ThroneRoom() {
  const [selectedThrone, setSelectedThrone] = useState<number | null>(null);
  const selectedHolder = selectedThrone 
    ? throneHolders.find(h => h.id === selectedThrone) 
    : null;

  return (
    <div className="min-h-screen bg-background relative">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-cosmic-gold" />
            <h1 className="text-xl font-bold text-glow">The Throne Room</h1>
          </div>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 6, 16], fov: 55 }}
        className="!fixed inset-0"
        gl={{ antialias: true }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor('#0a0a1f', 1);
          scene.background = new THREE.Color('#0a0a1f');
        }}
      >
        <ThroneRoomScene 
          selectedThrone={selectedThrone}
          onSelectThrone={setSelectedThrone}
        />
      </Canvas>

      {/* Selected throne info panel */}
      {selectedHolder && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-20">
          <div className="bg-card/90 backdrop-blur-md border border-border rounded-lg p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ 
                  backgroundColor: selectedHolder.color + '20',
                  border: `2px solid ${selectedHolder.color}`
                }}
              >
                <Crown className="w-6 h-6" style={{ color: selectedHolder.color }} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg" style={{ color: selectedHolder.color }}>
                  {selectedHolder.name}
                </h3>
                <p className="text-sm text-muted-foreground">{selectedHolder.title}</p>
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              <div>
                <span className="text-xs text-muted-foreground">Contribution</span>
                <p className="text-sm">{selectedHolder.contribution}</p>
              </div>
              
              <div className="pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3" />
                  Featured Avatar
                </span>
                <p className="text-sm font-medium">{selectedHolder.characterName}</p>
                <p className="text-xs text-muted-foreground">{selectedHolder.characterDescription}</p>
              </div>
            </div>

            {!selectedHolder.isCreator && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-center text-muted-foreground">
                  This throne awaits one who fundamentally changes how R.O.K. is played
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 hidden md:block">
        <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-3">
          <h4 className="text-xs font-semibold mb-2 text-muted-foreground">THRONE HIERARCHY</h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#FFD700' }} />
              <span>First King (Level 7)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#C0C0C0' }} />
              <span>Second King (Level 6)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#CD7F32' }} />
              <span>Third King (Founder)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#4A5568' }} />
              <span>Awaiting Champion</span>
            </div>
          </div>
        </div>
      </div>

      {/* Multiverse description */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 text-center max-w-md px-4">
        <p className="text-sm text-muted-foreground/80">
          The Seven Thrones overlook the R.O.K. Multiverse — a realm shaped by those who sit above it
        </p>
      </div>
    </div>
  );
}
