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

  const throneColor = holder.isEmpty && !holder.isCreator ? '#2D3748' : holder.color;
  const emissiveIntensity = hovered || isSelected ? 0.4 : holder.isCreator ? 0.2 : 0.05;

  return (
    <group 
      ref={throneRef} 
      position={position}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Throne Base */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.2, 0.6, 1]} />
        <meshStandardMaterial 
          color={throneColor} 
          metalness={0.8} 
          roughness={0.2}
          emissive={throneColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Throne Back */}
      <mesh position={[0, 1.5, -0.4]}>
        <boxGeometry args={[1.2, 2.4, 0.2]} />
        <meshStandardMaterial 
          color={throneColor} 
          metalness={0.8} 
          roughness={0.2}
          emissive={throneColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Armrests */}
      <mesh position={[-0.55, 0.8, 0]}>
        <boxGeometry args={[0.15, 0.4, 0.8]} />
        <meshStandardMaterial color={throneColor} metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0.55, 0.8, 0]}>
        <boxGeometry args={[0.15, 0.4, 0.8]} />
        <meshStandardMaterial color={throneColor} metalness={0.9} roughness={0.1} />
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

      {/* Avatar silhouette (placeholder) */}
      {holder.isCreator && (
        <group position={[0, 1.2, 0]}>
          {/* Head */}
          <mesh position={[0, 0.8, 0]}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial 
              color="#1a1a2e"
              emissive={holder.color}
              emissiveIntensity={0.1}
              transparent
              opacity={0.8}
            />
          </mesh>
          {/* Body */}
          <mesh position={[0, 0.2, 0]}>
            <capsuleGeometry args={[0.2, 0.6, 8, 16]} />
            <meshStandardMaterial 
              color="#1a1a2e"
              emissive={holder.color}
              emissiveIntensity={0.1}
              transparent
              opacity={0.8}
            />
          </mesh>
        </group>
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

  // Create galaxy/multiverse particles inside the dome
  const particles = useMemo(() => {
    const positions = new Float32Array(2000 * 3);
    const colors = new Float32Array(2000 * 3);
    
    for (let i = 0; i < 2000; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      const r = Math.random() * 4 + 1;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.3 - 2;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      // Colorful galaxy colors
      const colorChoice = Math.random();
      if (colorChoice < 0.3) {
        colors[i * 3] = 0.5 + Math.random() * 0.5;
        colors[i * 3 + 1] = 0.2;
        colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
      } else if (colorChoice < 0.6) {
        colors[i * 3] = 0.2;
        colors[i * 3 + 1] = 0.6 + Math.random() * 0.4;
        colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
      } else {
        colors[i * 3] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
        colors[i * 3 + 2] = 0.3;
      }
    }
    
    return { positions, colors };
  }, []);

  return (
    <group position={[0, -4, 0]}>
      {/* The table/platform */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[6, 6, 0.3, 64]} />
        <meshStandardMaterial 
          color="#1a1a2e"
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* Decorative ring */}
      <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[6.2, 0.1, 8, 64]} />
        <meshStandardMaterial 
          color="#FFD700"
          emissive="#FFD700"
          emissiveIntensity={0.3}
          metalness={1}
          roughness={0}
        />
      </mesh>

      {/* The dome itself */}
      <mesh ref={domeRef} position={[0, 0, 0]}>
        <sphereGeometry args={[5, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial 
          color="#0a0a1a"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner rotating galaxy */}
      <group ref={innerRef}>
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2000}
              array={particles.positions}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={2000}
              array={particles.colors}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.08}
            vertexColors
            transparent
            opacity={0.8}
            sizeAttenuation
          />
        </points>

        {/* Central bright core */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial 
            color="#ffffff"
            emissive="#8B5CF6"
            emissiveIntensity={2}
          />
        </mesh>

        {/* Orbiting mini-systems */}
        {[0, 1, 2, 3, 4].map((i) => (
          <Float key={i} speed={1 + i * 0.2} floatIntensity={0.2}>
            <mesh position={[
              Math.cos(i * Math.PI * 0.4) * (2 + i * 0.3),
              -1 + Math.random(),
              Math.sin(i * Math.PI * 0.4) * (2 + i * 0.3)
            ]}>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshStandardMaterial 
                color={['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'][i]}
                emissive={['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'][i]}
                emissiveIntensity={0.5}
              />
            </mesh>
          </Float>
        ))}
      </group>

      {/* Dome glow effect */}
      <pointLight position={[0, 1, 0]} color="#8B5CF6" intensity={2} distance={10} />
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
  const thronePositions: [number, number, number][] = useMemo(() => {
    const positions: [number, number, number][] = [];
    const radius = 10;
    const startAngle = Math.PI * 0.15;
    const endAngle = Math.PI * 0.85;
    
    for (let i = 0; i < 7; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / 6);
      positions.push([
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius - 5
      ]);
    }
    return positions;
  }, []);

  return (
    <>
      {/* Ambient and dramatic lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 10, 0]} intensity={1} color="#8B5CF6" />
      <pointLight position={[-10, 5, -10]} intensity={0.5} color="#FFD700" />
      <pointLight position={[10, 5, -10]} intensity={0.5} color="#FFD700" />
      <spotLight 
        position={[0, 15, 0]} 
        angle={0.4} 
        penumbra={0.5} 
        intensity={2} 
        color="#ffffff"
        castShadow
      />

      {/* Background stars */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* The floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial 
          color="#0a0a1a"
          metalness={0.8}
          roughness={0.3}
        />
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
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.6}
        target={[0, 0, 0]}
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
        camera={{ position: [0, 8, 18], fov: 50 }}
        className="!fixed inset-0"
        gl={{ antialias: true }}
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
