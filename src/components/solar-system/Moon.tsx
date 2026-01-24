import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useIsMobile } from '@/hooks/use-mobile';

interface MoonProps {
  orbitRadius: number;
  moonSize: number;
  orbitSpeed: number;
  color: string;
  startAngle?: number;
  name?: string;
  characterCount?: number;
  onClick?: (position: { x: number; y: number; z: number }) => void;
  isSelected?: boolean;
}

export default function Moon({
  orbitRadius,
  moonSize,
  orbitSpeed,
  color,
  startAngle = 0,
  name,
  characterCount = 0,
  onClick,
  isSelected,
}: MoonProps) {
  const moonRef = useRef<THREE.Group>(null);
  const angleRef = useRef(startAngle);
  const [hovered, setHovered] = useState(false);
  const isMobile = useIsMobile();

  useFrame((state, delta) => {
    if (moonRef.current && !isSelected) {
      angleRef.current += orbitSpeed * delta;
      const x = Math.cos(angleRef.current) * orbitRadius;
      const z = Math.sin(angleRef.current) * orbitRadius;
      moonRef.current.position.x = x;
      moonRef.current.position.z = z;
    }
  });

  const handleClick = (e: any) => {
    if (onClick && moonRef.current) {
      e.stopPropagation();
      onClick({
        x: moonRef.current.position.x,
        y: moonRef.current.position.y,
        z: moonRef.current.position.z,
      });
    }
  };

  return (
    <group ref={moonRef}>
      <Sphere 
        args={[moonSize, 16, 16]}
        onClick={onClick ? handleClick : undefined}
        onPointerOver={onClick ? (e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        } : undefined}
        onPointerOut={onClick ? () => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        } : undefined}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.3 : 0.1}
          roughness={0.9}
          metalness={0.1}
        />
      </Sphere>
      
      {/* Moon label - shows when it has a name and residents or is hovered */}
      {name && (hovered || characterCount > 0 || isSelected) && (
        <Html
          position={[0, moonSize + 0.2, 0]}
          center
          distanceFactor={isMobile ? 15 : undefined}
          style={{
            pointerEvents: 'none',
            opacity: hovered || isSelected ? 1 : 0.7,
            transition: 'opacity 0.3s',
          }}
        >
          <div className="text-center whitespace-nowrap" style={{ transform: isMobile ? 'scale(0.7)' : 'scale(0.85)' }}>
            <div className="text-[10px] font-medium text-white/90 drop-shadow-lg flex items-center gap-1 justify-center">
              🌙 {name}
            </div>
            {characterCount > 0 && (
              <div className="text-[9px] text-muted-foreground">
                {characterCount} resident{characterCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
