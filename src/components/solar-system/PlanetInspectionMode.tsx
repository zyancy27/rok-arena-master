import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import Planet from './Planet';

interface PlanetInspectionModeProps {
  planetName: string;
  displayName: string;
  color: string;
  size: number;
  hasRings: boolean;
  description?: string;
  gravity?: number;
  onClose: () => void;
}

export default function PlanetInspectionMode({
  planetName,
  displayName,
  color,
  size,
  hasRings,
  description,
  gravity,
  onClose,
}: PlanetInspectionModeProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-50 bg-background/20 hover:bg-background/40 text-white"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Planet name label */}
      <div className="absolute top-4 left-4 z-50">
        <h2 className="text-2xl font-bold text-white drop-shadow-lg">{displayName}</h2>
        {gravity && (
          <p className="text-sm text-white/70">Gravity: {gravity.toFixed(2)}g</p>
        )}
      </div>

      {/* Full-screen 3D canvas */}
      <Canvas
        camera={{ position: [0, 0, size * 4], fov: 50 }}
        dpr={Math.min(window.devicePixelRatio, 2)}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 3, 5]} intensity={1.2} />
        <pointLight position={[-5, -3, -5]} intensity={0.5} color="#4fc3f7" />

        <Stars radius={100} depth={50} count={3000} factor={4} fade speed={1} />

        <Planet
          name={planetName}
          orbitRadius={0}
          planetSize={size}
          color={color}
          orbitSpeed={0}
          hasRingsOverride={hasRings}
          description={description}
          isSelected={false}
          onClick={() => {}}
          characterCount={0}
        />

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={size * 1.5}
          maxDistance={size * 10}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
