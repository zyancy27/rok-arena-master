/**
 * Interactive 3D Planet Preview
 * 
 * Uses React Three Fiber with the actual PlanetSurface component
 * to render a preview that matches the description-based terrain.
 */

import { useState, useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shuffle, PanelRightClose, PanelRightOpen, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import PlanetSurface from './PlanetSurface';
import Atmosphere from './Atmosphere';
import PlanetRings from './PlanetRings';
import { parseTerrainFromLore, generateTerrainVisuals, getTerrainSummary } from '@/lib/planet-terrain';
import { type PlanetParams } from '@/lib/planet-generator';

interface PlanetPreview3DProps {
  description: string;
  displayName: string;
  color: string;
  hasRings: boolean;
  initialParams: PlanetParams | null;
  onClose: () => void;
  onParamsUpdate: (params: PlanetParams) => void;
}

// Preview planet component that uses the actual terrain system
function PreviewPlanet({ 
  description, 
  color, 
  hasRings, 
  seed 
}: { 
  description: string; 
  color: string; 
  hasRings: boolean; 
  seed: number;
}) {
  // Parse terrain from description - same logic as the main solar system
  const terrainFeatures = useMemo(() => parseTerrainFromLore(description), [description]);
  const terrainVisuals = useMemo(
    () => generateTerrainVisuals(terrainFeatures, color),
    [terrainFeatures, color]
  );
  
  // Planet size for preview
  const planetSize = 1.5;
  
  return (
    <group>
      {/* Main planet surface - uses full lore-based terrain */}
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
        isHovered={false}
      />
      
      {/* Atmosphere */}
      <Atmosphere 
        planetSize={planetSize} 
        color={terrainVisuals.atmosphereColor}
        intensity={terrainFeatures.atmosphereType === 'thick' ? 1.5 : 
                   terrainFeatures.atmosphereType === 'thin' ? 0.5 : 
                   terrainFeatures.atmosphereType === 'none' ? 0 : 1}
      />
      
      {/* Rings */}
      {hasRings && (
        <PlanetRings 
          innerRadius={planetSize * 1.4}
          outerRadius={planetSize * 2.2}
          color={color}
        />
      )}
    </group>
  );
}

// Loading fallback
function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-sm">Generating terrain...</span>
      </div>
    </Html>
  );
}

export default function PlanetPreview3D({
  description,
  displayName,
  color,
  hasRings,
  initialParams,
  onClose,
  onParamsUpdate,
}: PlanetPreview3DProps) {
  const [isPanelHidden, setIsPanelHidden] = useState(false);
  const [seed, setSeed] = useState(() => initialParams?.seed || Math.floor(Math.random() * 1000000));
  
  // Parse terrain features for display
  const terrainFeatures = useMemo(() => parseTerrainFromLore(description), [description]);
  const terrainSummary = useMemo(() => getTerrainSummary(terrainFeatures), [terrainFeatures]);
  
  // Handle randomize - regenerates with new seed
  const handleRandomizeSeed = () => {
    if (!description.trim()) {
      toast.error('No description available');
      return;
    }
    
    const newSeed = Math.floor(Math.random() * 1000000);
    setSeed(newSeed);
    
    // Update params for parent
    if (initialParams) {
      const updatedParams = { ...initialParams, seed: newSeed };
      onParamsUpdate(updatedParams);
    }
    
    toast.success('Regenerated with new seed', { description: `Seed: ${newSeed}` });
  };

  // Unique key for planet remounting on seed change
  const planetKey = `${description}-${seed}-${color}`;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* 3D Canvas with React Three Fiber */}
      <Canvas
        camera={{ position: [0, 1, 4], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0A0A0F' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight 
          position={[5, 3, 5]} 
          intensity={1.5} 
          castShadow={false}
        />
        <pointLight position={[-5, -3, -5]} intensity={0.3} color="#4080ff" />
        
        {/* Stars background */}
        <Stars 
          radius={100} 
          depth={50} 
          count={3000} 
          factor={4} 
          saturation={0.3} 
          fade 
          speed={0.5}
        />
        
        {/* Interactive planet */}
        <Suspense fallback={<LoadingFallback />}>
          <group key={planetKey}>
            <PreviewPlanet
              description={description}
              color={color}
              hasRings={hasRings}
              seed={seed}
            />
          </group>
        </Suspense>
        
        {/* Orbit controls for interaction */}
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          minDistance={2}
          maxDistance={10}
          autoRotate
          autoRotateSpeed={0.5}
          dampingFactor={0.1}
          enableDamping
        />
      </Canvas>
      
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-background/80 to-transparent">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Editor
          </Button>
          <span className="px-2 py-1 text-xs font-mono bg-secondary rounded">
            {displayName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRandomizeSeed}
            disabled={!description.trim()}
          >
            <Shuffle className="w-4 h-4 mr-1" />
            Randomize
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPanelHidden(!isPanelHidden)}
          >
            {isPanelHidden ? <PanelRightOpen className="h-5 w-5" /> : <PanelRightClose className="h-5 w-5" />}
          </Button>
        </div>
      </header>
      
      {/* Info Panel */}
      <div className={`absolute top-20 right-4 z-10 w-80 transition-transform duration-300 ${isPanelHidden ? 'translate-x-96' : 'translate-x-0'}`}>
        <Card className="bg-card/95 backdrop-blur border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Terrain Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {/* Terrain Summary */}
            <div className="p-2 bg-secondary/50 rounded text-xs">
              {terrainSummary || 'Add a description to generate terrain features'}
            </div>
            
            {/* Detected Features */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Detected Features
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <FeatureIndicator label="Oceans" active={terrainFeatures.oceanCoverage > 0.1} />
                <FeatureIndicator label="Mountains" active={terrainFeatures.hasMountains} />
                <FeatureIndicator label="Volcanoes" active={terrainFeatures.hasVolcanoes} />
                <FeatureIndicator label="Forests" active={terrainFeatures.hasForests} />
                <FeatureIndicator label="Deserts" active={terrainFeatures.hasDeserts} />
                <FeatureIndicator label="Tundra" active={terrainFeatures.hasTundra} />
                <FeatureIndicator label="Cities" active={terrainFeatures.hasCities} />
                <FeatureIndicator label="Ruins" active={terrainFeatures.hasRuins} />
                <FeatureIndicator label="Crystals" active={terrainFeatures.hasCrystals} />
                <FeatureIndicator label="Floating Islands" active={terrainFeatures.hasFloatingIslands} />
                <FeatureIndicator label="Storms" active={terrainFeatures.hasStorms} />
                <FeatureIndicator label="Magic Aura" active={terrainFeatures.hasMagicAura} />
              </div>
            </div>
            
            {/* Environment Info */}
            <div className="space-y-1.5 pt-2 border-t">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Primary Biome:</span>
                <span className="capitalize">{terrainFeatures.primaryBiome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Atmosphere:</span>
                <span className="capitalize">{terrainFeatures.atmosphereType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gravity:</span>
                <span>
                  {terrainFeatures.highGravity ? 'High' : 
                   terrainFeatures.lowGravity ? 'Low' : 
                   terrainFeatures.variableGravity ? 'Variable' : 'Normal'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seed:</span>
                <span className="font-mono text-xs">{seed}</span>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground pt-2 border-t">
              🖱️ Drag to rotate • Scroll to zoom • Auto-rotating
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper component for feature indicators
function FeatureIndicator({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 ${active ? 'text-foreground' : 'text-muted-foreground/50'}`}>
      <div className={`w-2 h-2 rounded-full ${active ? 'bg-primary' : 'bg-muted'}`} />
      <span>{label}</span>
    </div>
  );
}
