import { useRef, useEffect, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shuffle, PanelRightClose, PanelRightOpen, Eye } from 'lucide-react';
import { usePlanetScene } from '@/hooks/use-planet-scene';
import { parsePlanetDescription, type PlanetParams } from '@/lib/planet-generator';
import { toast } from 'sonner';

interface PlanetPreview3DProps {
  description: string;
  displayName: string;
  initialParams: PlanetParams | null;
  onClose: () => void;
  onParamsUpdate: (params: PlanetParams) => void;
}

export default function PlanetPreview3D({
  description,
  displayName,
  initialParams,
  onClose,
  onParamsUpdate,
}: PlanetPreview3DProps) {
  const [isPanelHidden, setIsPanelHidden] = useState(false);
  const [generatedParams, setGeneratedParams] = useState<PlanetParams | null>(initialParams);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const { sceneState, generatePlanet, clearScene } = usePlanetScene({ containerRef: previewContainerRef });

  // Generate initial planet when scene is ready
  useEffect(() => {
    if (sceneState.isReady && initialParams) {
      generatePlanet(initialParams);
    }
  }, [sceneState.isReady, initialParams, generatePlanet]);

  // Handle randomize seed for variety
  const handleRandomizeSeed = useCallback(() => {
    if (!description.trim()) {
      toast.error('No description available');
      return;
    }
    
    const newSeed = Math.floor(Math.random() * 1000000);
    const params = parsePlanetDescription(description, newSeed);
    params.subdivisions = 3;
    setGeneratedParams(params);
    onParamsUpdate(params);
    generatePlanet(params);
    
    toast.success('Regenerated with new seed', { description: `Seed: ${newSeed}` });
  }, [description, generatePlanet, onParamsUpdate]);

  const handleClose = useCallback(() => {
    clearScene();
    onClose();
  }, [clearScene, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* 3D Canvas Container */}
      <div ref={previewContainerRef} className="absolute inset-0" />
      
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-background/80 to-transparent">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Editor
          </Button>
          <span className="px-2 py-1 text-xs font-mono bg-secondary rounded">
            {generatedParams?.shapeType || 'sphere'} • {displayName}
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
      <div className={`absolute top-20 right-4 z-10 w-72 transition-transform duration-300 ${isPanelHidden ? 'translate-x-80' : 'translate-x-0'}`}>
        <Card className="bg-card/95 backdrop-blur border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Planet Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {generatedParams && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shape:</span>
                    <span className="text-xs px-1.5 py-0.5 bg-secondary rounded">{generatedParams.shapeType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seed:</span>
                    <span className="font-mono text-xs">{generatedParams.seed}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ocean:</span>
                    <span>{Math.round(generatedParams.oceanLevel * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vegetation:</span>
                    <span>{Math.round(generatedParams.vegetation * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mountains:</span>
                    <span>{Math.round(generatedParams.mountainHeight * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rings:</span>
                    <span>{generatedParams.hasRings ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  Drag to rotate • Scroll to zoom
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
