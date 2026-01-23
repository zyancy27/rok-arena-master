import { Suspense, useEffect, useState, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, PerspectiveCamera, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Sparkles, Users, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFriends } from '@/hooks/use-friends';

interface SolarSystemNode {
  id: string;
  name: string;
  userId: string;
  ownerName: string;
  planetCount: number;
  characterCount: number;
  position: THREE.Vector3;
  color: string;
  isOwn: boolean;
}

interface StarSystemProps {
  system: SolarSystemNode;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onClick: (system: SolarSystemNode) => void;
}

function StarSystem({ system, isHovered, onHover, onClick }: StarSystemProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle pulse for user's own system
      const pulse = system.isOwn ? Math.sin(state.clock.elapsedTime * 2) * 0.1 + 1 : 1;
      const hoverScale = isHovered ? 1.3 : 1;
      meshRef.current.scale.setScalar(pulse * hoverScale);
    }
    if (glowRef.current) {
      glowRef.current.rotation.z += 0.005;
    }
  });

  const baseSize = system.isOwn ? 1.5 : 0.8 + Math.min(system.planetCount * 0.1, 0.5);

  return (
    <group position={system.position}>
      {/* Glow effect */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[baseSize * 2, 16, 16]} />
        <meshBasicMaterial
          color={system.color}
          transparent
          opacity={isHovered ? 0.3 : 0.1}
        />
      </mesh>
      
      {/* Core star */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick(system);
        }}
        onPointerEnter={(e) => {
          e.stopPropagation();
          onHover(system.id);
          document.body.style.cursor = 'pointer';
        }}
        onPointerLeave={() => {
          onHover(null);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[baseSize, 32, 32]} />
        <meshStandardMaterial
          color={system.color}
          emissive={system.color}
          emissiveIntensity={isHovered ? 1.5 : 0.8}
        />
      </mesh>

      {/* Orbiting particles for own system */}
      {system.isOwn && (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[Math.cos(i * 2.1) * 3, 0, Math.sin(i * 2.1) * 3]}>
              <sphereGeometry args={[0.15, 8, 8]} />
              <meshBasicMaterial color="#a855f7" />
            </mesh>
          ))}
        </group>
      )}

      {/* Label on hover */}
      {isHovered && (
        <Html center position={[0, baseSize + 2, 0]} className="pointer-events-none">
          <div className="bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 min-w-[150px] text-center">
            <p className="font-semibold text-sm">{system.name}</p>
            <p className="text-xs text-muted-foreground">
              {system.isOwn ? 'Your System' : `by ${system.ownerName}`}
            </p>
            <div className="flex gap-2 justify-center mt-1">
              <span className="text-xs text-primary">{system.planetCount} planets</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-primary">{system.characterCount} chars</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

interface GalaxySceneProps {
  systems: SolarSystemNode[];
  hoveredSystem: string | null;
  onHover: (id: string | null) => void;
  onSystemClick: (system: SolarSystemNode) => void;
}

function GalaxyScene({ systems, hoveredSystem, onHover, onSystemClick }: GalaxySceneProps) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0005;
    }
  });

  useEffect(() => {
    camera.position.set(0, 30, 40);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 20, 0]} intensity={1} color="#a855f7" />
      
      <Stars radius={200} depth={100} count={8000} factor={6} saturation={0.5} fade speed={0.5} />
      
      {/* Galaxy dust/nebula effect */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
        <ringGeometry args={[10, 60, 64]} />
        <meshBasicMaterial
          color="#7c3aed"
          transparent
          opacity={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      <group ref={groupRef}>
        {systems.map((system) => (
          <StarSystem
            key={system.id}
            system={system}
            isHovered={hoveredSystem === system.id}
            onHover={onHover}
            onClick={onSystemClick}
          />
        ))}
        
        {/* Connection lines between friends */}
        {systems.length > 1 && systems.filter(s => s.isOwn).map(ownSystem => (
          systems.filter(s => !s.isOwn).map(friendSystem => (
            <line key={`${ownSystem.id}-${friendSystem.id}`}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([
                    ownSystem.position.x, ownSystem.position.y, ownSystem.position.z,
                    friendSystem.position.x, friendSystem.position.y, friendSystem.position.z,
                  ])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#a855f7" transparent opacity={0.15} />
            </line>
          ))
        ))}
      </group>
    </>
  );
}

interface GalaxyViewProps {
  currentSystemId: string | null;
  onEnterSystem: (systemId: string) => void;
  onBack: () => void;
}

export default function GalaxyView({ currentSystemId, onEnterSystem, onBack }: GalaxyViewProps) {
  const { user } = useAuth();
  const { friends, following } = useFriends();
  const [systems, setSystems] = useState<SolarSystemNode[]>([]);
  const [hoveredSystem, setHoveredSystem] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllSystems();
  }, [user, friends, following]);

  const fetchAllSystems = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get connected user IDs
      const connectedUserIds = [
        user.id,
        ...friends.map(f => f.profile.id),
        ...following.map(f => f.profile.id),
      ];
      const uniqueUserIds = [...new Set(connectedUserIds)];

      // Fetch all solar systems for connected users
      const { data: systemsData, error } = await supabase
        .from('solar_systems')
        .select('id, name, user_id')
        .in('user_id', uniqueUserIds);

      if (error) throw error;

      if (!systemsData) {
        setLoading(false);
        return;
      }

      // Fetch planet counts
      const systemIds = systemsData.map(s => s.id);
      const { data: planetsData } = await supabase
        .from('planet_customizations')
        .select('solar_system_id')
        .in('solar_system_id', systemIds);

      // Fetch character counts
      const { data: charactersData } = await supabase
        .from('characters')
        .select('solar_system_id')
        .in('solar_system_id', systemIds);

      // Build counts
      const planetCounts: Record<string, number> = {};
      const characterCounts: Record<string, number> = {};
      
      planetsData?.forEach(p => {
        if (p.solar_system_id) {
          planetCounts[p.solar_system_id] = (planetCounts[p.solar_system_id] || 0) + 1;
        }
      });
      
      charactersData?.forEach(c => {
        if (c.solar_system_id) {
          characterCounts[c.solar_system_id] = (characterCounts[c.solar_system_id] || 0) + 1;
        }
      });

      // Build owner name map
      const ownerMap: Record<string, string> = { [user.id]: 'You' };
      [...friends, ...following].forEach(f => {
        ownerMap[f.profile.id] = f.profile.display_name || f.profile.username;
      });

      // Position systems in a galaxy pattern
      const ownSystems = systemsData.filter(s => s.user_id === user.id);
      const friendSystems = systemsData.filter(s => s.user_id !== user.id);
      
      const systemNodes: SolarSystemNode[] = [];
      
      // User's systems at center
      ownSystems.forEach((system, i) => {
        const angle = (i / Math.max(ownSystems.length, 1)) * Math.PI * 2;
        const radius = ownSystems.length > 1 ? 5 : 0;
        systemNodes.push({
          id: system.id,
          name: system.name,
          userId: system.user_id,
          ownerName: 'You',
          planetCount: planetCounts[system.id] || 0,
          characterCount: characterCounts[system.id] || 0,
          position: new THREE.Vector3(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
          ),
          color: '#f59e0b', // Gold for own systems
          isOwn: true,
        });
      });

      // Friend systems orbiting around
      friendSystems.forEach((system, i) => {
        const angle = (i / Math.max(friendSystems.length, 1)) * Math.PI * 2;
        const radius = 20 + Math.random() * 10;
        const yOffset = (Math.random() - 0.5) * 8;
        
        systemNodes.push({
          id: system.id,
          name: system.name,
          userId: system.user_id,
          ownerName: ownerMap[system.user_id] || 'Unknown',
          planetCount: planetCounts[system.id] || 0,
          characterCount: characterCounts[system.id] || 0,
          position: new THREE.Vector3(
            Math.cos(angle) * radius,
            yOffset,
            Math.sin(angle) * radius
          ),
          color: getSystemColor(i),
          isOwn: false,
        });
      });

      setSystems(systemNodes);
    } catch (error) {
      console.error('Failed to fetch galaxy systems:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSystemClick = (system: SolarSystemNode) => {
    onEnterSystem(system.id);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading your galaxy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] relative">
      {/* Header */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-cosmic-pink to-accent bg-clip-text text-transparent flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              My Galaxy
            </h1>
            <p className="text-muted-foreground text-sm">
              Your connected universe • Click a star to enter
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Badge variant="outline" className="gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Your Systems
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Friend Systems
        </Badge>
      </div>

      {/* Stats */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="flex gap-3">
          <Badge variant="secondary" className="gap-1.5">
            <Globe className="w-3 h-3" />
            {systems.length} Solar Systems
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <Users className="w-3 h-3" />
            {systems.filter(s => !s.isOwn).length} Connected Friends
          </Badge>
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas className="!absolute inset-0">
        <PerspectiveCamera makeDefault position={[0, 30, 40]} fov={60} />
        <Suspense fallback={null}>
          <GalaxyScene
            systems={systems}
            hoveredSystem={hoveredSystem}
            onHover={setHoveredSystem}
            onSystemClick={handleSystemClick}
          />
        </Suspense>
      </Canvas>

      {/* Empty state */}
      {systems.filter(s => !s.isOwn).length === 0 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-background/80 backdrop-blur-sm border border-border rounded-lg px-4 py-3 text-center">
            <p className="text-sm text-muted-foreground">
              Add friends to see their solar systems in your galaxy!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function getSystemColor(index: number): string {
  const colors = [
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#10b981', // emerald
    '#f97316', // orange
    '#ef4444', // red
  ];
  return colors[index % colors.length];
}
