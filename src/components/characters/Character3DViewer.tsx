import { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows } from '@react-three/drei';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, Pause, RotateCcw, Download, Palette, Maximize2, Loader2, Box } from 'lucide-react';
import * as THREE from 'three';
import type { VisualStyle, MotionMode } from '@/lib/character-3d-types';

interface Character3DViewerProps {
  glbUrl: string | null;
  visualStyle: VisualStyle;
  motionMode: MotionMode;
  onStyleToggle?: () => void;
  onDownload?: () => void;
}

function Model({ 
  url, 
  visualStyle, 
  motionMode,
  isPlaying 
}: { 
  url: string; 
  visualStyle: VisualStyle;
  motionMode: MotionMode;
  isPlaying: boolean;
}) {
  const { scene, animations } = useGLTF(url);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const modelRef = useRef<THREE.Group>(null);
  const { pointer } = useThree();

  // Clone scene to avoid mutation issues
  const clonedScene = scene.clone();

  // Apply materials based on visual style
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const originalColor = (child.material as THREE.MeshStandardMaterial)?.color?.clone() 
          || new THREE.Color(0x888888);
        
        if (visualStyle === 'toon') {
          // Toon shading
          child.material = new THREE.MeshToonMaterial({
            color: originalColor,
            gradientMap: null,
          });
        } else {
          // Semi-organic realistic
          child.material = new THREE.MeshStandardMaterial({
            color: originalColor,
            roughness: 0.7,
            metalness: 0.1,
          });
        }
      }
    });
  }, [visualStyle, clonedScene]);

  // Setup animation mixer
  useEffect(() => {
    if (animations.length > 0) {
      mixerRef.current = new THREE.AnimationMixer(clonedScene);
      const action = mixerRef.current.clipAction(animations[0]);
      if (isPlaying) {
        action.play();
      }
    }

    return () => {
      mixerRef.current?.stopAllAction();
    };
  }, [animations, clonedScene, isPlaying]);

  // Animation loop
  useFrame((state, delta) => {
    if (mixerRef.current && isPlaying) {
      mixerRef.current.update(delta);
    }

    // Interactive lean effect
    if (motionMode === 'idle_interactive' && modelRef.current) {
      const targetRotationX = pointer.y * 0.1;
      const targetRotationY = pointer.x * 0.1;
      
      modelRef.current.rotation.x = THREE.MathUtils.lerp(
        modelRef.current.rotation.x,
        targetRotationX,
        0.05
      );
      modelRef.current.rotation.y = THREE.MathUtils.lerp(
        modelRef.current.rotation.y,
        targetRotationY,
        0.05
      );
    }
  });

  return (
    <group ref={modelRef}>
      <primitive object={clonedScene} />
    </group>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 2, 0.5]} />
      <meshStandardMaterial color="#666" wireframe />
    </mesh>
  );
}

export default function Character3DViewer({
  glbUrl,
  visualStyle,
  motionMode,
  onStyleToggle,
  onDownload,
}: Character3DViewerProps) {
  const [isPlaying, setIsPlaying] = useState(motionMode !== 'static');
  const [isLoading, setIsLoading] = useState(true);
  const controlsRef = useRef<any>(null);

  const handleResetView = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const handleDownload = () => {
    if (glbUrl && onDownload) {
      onDownload();
    } else if (glbUrl) {
      // Direct download fallback
      const link = document.createElement('a');
      link.href = glbUrl;
      link.download = 'character-model.glb';
      link.click();
    }
  };

  if (!glbUrl) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Box className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            No 3D model generated yet.<br />
            Upload reference images and generate a model.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Box className="w-5 h-5 text-primary" />
            3D Preview
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {visualStyle === 'toon' ? 'Toon' : 'Semi-Organic'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Canvas Container */}
        <div className="relative h-[400px] bg-gradient-to-b from-background to-muted/30">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          
          <Canvas
            camera={{ position: [0, 1.5, 4], fov: 45 }}
            dpr={Math.min(window.devicePixelRatio, 2)}
            onCreated={() => setIsLoading(false)}
          >
            {/* Lighting */}
            <ambientLight intensity={0.4} />
            <hemisphereLight
              color="#ffffff"
              groundColor="#444444"
              intensity={0.6}
            />
            <directionalLight
              position={[5, 5, 5]}
              intensity={0.8}
              castShadow={false}
            />

            {/* Model */}
            <Suspense fallback={<LoadingFallback />}>
              <Model
                url={glbUrl}
                visualStyle={visualStyle}
                motionMode={motionMode}
                isPlaying={isPlaying}
              />
              <ContactShadows
                position={[0, -0.01, 0]}
                opacity={0.4}
                scale={5}
                blur={2}
                far={3}
              />
            </Suspense>

            {/* Controls */}
            <OrbitControls
              ref={controlsRef}
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={2}
              maxDistance={10}
              maxPolarAngle={Math.PI * 0.85}
              target={[0, 1, 0]}
            />
          </Canvas>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-between p-3 border-t border-border bg-muted/30">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            {motionMode !== 'static' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
            )}

            {/* Reset View */}
            <Button variant="outline" size="sm" onClick={handleResetView}>
              <RotateCcw className="w-4 h-4" />
            </Button>

            {/* Style Toggle */}
            {onStyleToggle && (
              <Toggle
                pressed={visualStyle === 'semi'}
                onPressedChange={onStyleToggle}
                size="sm"
                aria-label="Toggle visual style"
              >
                <Palette className="w-4 h-4 mr-1" />
                {visualStyle === 'toon' ? 'Toon' : 'Semi'}
              </Toggle>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Download */}
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-1" />
              GLB
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
