import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Shuffle, Save, FolderOpen, Plus, Trash2, Moon, Info, PanelBottomClose, PanelBottomOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanetScene } from '@/hooks/use-planet-scene';
import { 
  parsePlanetDescription, 
  parseMoonDescription,
  PlanetParams,
  MoonParams 
} from '@/lib/planet-generator';

interface SavedPlanet {
  id: string;
  name: string;
  planetText: string;
  planetParams: PlanetParams;
  moonTexts: string[];
  moonParams: MoonParams[];
  createdAt: string;
}

type QualityLevel = 'low' | 'medium' | 'high';

const QUALITY_SUBDIVISIONS: Record<QualityLevel, number> = {
  low: 2,
  medium: 3,
  high: 4,
};

export default function PlanetHub() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Scene hook
  const { sceneState, generatePlanet, generateMoons, clearScene } = usePlanetScene({ containerRef });
  
  // Form state
  const [planetText, setPlanetText] = useState('A temperate world with vast oceans and towering mountain ranges, covered in lush forests');
  const [moonTexts, setMoonTexts] = useState<string[]>([]);
  const [quality, setQuality] = useState<QualityLevel>('medium');
  const [customSeed, setCustomSeed] = useState<number | null>(null);
  
  // Generated data
  const [generatedParams, setGeneratedParams] = useState<PlanetParams | null>(null);
  const [generatedMoonParams, setGeneratedMoonParams] = useState<MoonParams[]>([]);
  
  // Saved planets
  const [savedPlanets, setSavedPlanets] = useState<SavedPlanet[]>([]);
  const [planetName, setPlanetName] = useState('');
  const [showMoons, setShowMoons] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isPanelHidden, setIsPanelHidden] = useState(false);
  
  // Load saved planets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('rok_saved_planets');
    if (saved) {
      try {
        setSavedPlanets(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved planets:', e);
      }
    }
  }, []);
  
  // Generate planet from description
  const handleGenerate = useCallback(() => {
    if (!planetText.trim()) {
      toast({
        title: 'Description required',
        description: 'Please enter a planet description',
        variant: 'destructive',
      });
      return;
    }
    
    // Parse planet description
    const params = parsePlanetDescription(planetText, customSeed ?? undefined);
    params.subdivisions = QUALITY_SUBDIVISIONS[quality];
    
    // Generate planet mesh
    generatePlanet(params);
    setGeneratedParams(params);
    
    // Parse and generate moons
    const moonParamsList: MoonParams[] = [];
    moonTexts.forEach((text, index) => {
      if (text.trim()) {
        const moonParams = parseMoonDescription(text, index, customSeed ? customSeed + index + 1 : undefined);
        moonParams.subdivisions = Math.max(2, QUALITY_SUBDIVISIONS[quality] - 1);
        moonParamsList.push(moonParams);
      }
    });
    
    if (moonParamsList.length > 0) {
      generateMoons(moonParamsList);
    }
    setGeneratedMoonParams(moonParamsList);
    
    toast({
      title: 'Planet Generated!',
      description: `Created a ${params.shapeType} planet with ${moonParamsList.length} moon(s)`,
    });
  }, [planetText, moonTexts, quality, customSeed, generatePlanet, generateMoons, toast]);
  
  // Randomize seed
  const handleRandomizeSeed = useCallback(() => {
    const newSeed = Math.floor(Math.random() * 1000000);
    setCustomSeed(newSeed);
    
    if (generatedParams) {
      // Re-generate with new seed
      const params = parsePlanetDescription(planetText, newSeed);
      params.subdivisions = QUALITY_SUBDIVISIONS[quality];
      generatePlanet(params);
      setGeneratedParams(params);
      
      // Regenerate moons with new seed
      const moonParamsList: MoonParams[] = [];
      moonTexts.forEach((text, index) => {
        if (text.trim()) {
          const moonParams = parseMoonDescription(text, index, newSeed + index + 1);
          moonParams.subdivisions = Math.max(2, QUALITY_SUBDIVISIONS[quality] - 1);
          moonParamsList.push(moonParams);
        }
      });
      
      if (moonParamsList.length > 0) {
        generateMoons(moonParamsList);
      }
      setGeneratedMoonParams(moonParamsList);
    }
    
    toast({
      title: 'Seed Randomized',
      description: `New seed: ${newSeed}`,
    });
  }, [planetText, moonTexts, quality, generatedParams, generatePlanet, generateMoons, toast]);
  
  // Add moon input
  const handleAddMoon = useCallback(() => {
    if (moonTexts.length >= 3) {
      toast({
        title: 'Maximum moons reached',
        description: 'You can only add up to 3 moons for performance',
        variant: 'destructive',
      });
      return;
    }
    setMoonTexts(prev => [...prev, 'A barren rocky moon with craters']);
  }, [moonTexts.length, toast]);
  
  // Remove moon input
  const handleRemoveMoon = useCallback((index: number) => {
    setMoonTexts(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  // Update moon text
  const handleMoonTextChange = useCallback((index: number, text: string) => {
    setMoonTexts(prev => prev.map((t, i) => i === index ? text : t));
  }, []);
  
  // Save planet
  const handleSave = useCallback(() => {
    if (!generatedParams || !planetName.trim()) {
      toast({
        title: 'Cannot save',
        description: 'Generate a planet and enter a name first',
        variant: 'destructive',
      });
      return;
    }
    
    const newSaved: SavedPlanet = {
      id: crypto.randomUUID(),
      name: planetName,
      planetText,
      planetParams: generatedParams,
      moonTexts,
      moonParams: generatedMoonParams,
      createdAt: new Date().toISOString(),
    };
    
    const updated = [...savedPlanets, newSaved];
    setSavedPlanets(updated);
    localStorage.setItem('rok_saved_planets', JSON.stringify(updated));
    
    toast({
      title: 'Planet Saved!',
      description: `"${planetName}" has been saved to your collection`,
    });
    setPlanetName('');
  }, [generatedParams, planetName, planetText, moonTexts, generatedMoonParams, savedPlanets, toast]);
  
  // Load saved planet
  const handleLoad = useCallback((saved: SavedPlanet) => {
    setPlanetText(saved.planetText);
    setMoonTexts(saved.moonTexts);
    setCustomSeed(saved.planetParams.seed);
    
    // Generate the loaded planet
    generatePlanet(saved.planetParams);
    setGeneratedParams(saved.planetParams);
    
    if (saved.moonParams.length > 0) {
      generateMoons(saved.moonParams);
    }
    setGeneratedMoonParams(saved.moonParams);
    
    toast({
      title: 'Planet Loaded',
      description: `Loaded "${saved.name}"`,
    });
  }, [generatePlanet, generateMoons, toast]);
  
  // Delete saved planet
  const handleDelete = useCallback((id: string) => {
    const updated = savedPlanets.filter(p => p.id !== id);
    setSavedPlanets(updated);
    localStorage.setItem('rok_saved_planets', JSON.stringify(updated));
    
    toast({
      title: 'Planet Deleted',
      description: 'Saved planet has been removed',
    });
  }, [savedPlanets, toast]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-3 bg-card/80 backdrop-blur border-b z-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Planet Builder</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden sm:flex">
            {sceneState.fps} FPS
          </Badge>
          <Button variant="ghost" size="icon" onClick={() => setIsInfoOpen(!isInfoOpen)}>
            <Info className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsPanelHidden(!isPanelHidden)}>
            {isPanelHidden ? <PanelBottomOpen className="h-5 w-5" /> : <PanelBottomClose className="h-5 w-5" />}
          </Button>
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex-1 relative overflow-hidden">
        {/* WebGL Canvas */}
        <div ref={containerRef} className="absolute inset-0 z-0" />
        
        {/* Info panel overlay */}
        {isInfoOpen && generatedParams && (
          <Card className="absolute top-4 right-4 p-4 z-10 bg-card/90 backdrop-blur max-w-xs">
            <h3 className="font-semibold mb-2">Planet Info</h3>
            <div className="text-sm space-y-1 text-muted-foreground">
              <p><span className="text-foreground">Seed:</span> {generatedParams.seed}</p>
              <p><span className="text-foreground">Shape:</span> {generatedParams.shapeType}</p>
              <p><span className="text-foreground">Ocean Level:</span> {Math.round(generatedParams.oceanLevel * 100)}%</p>
              <p><span className="text-foreground">Vegetation:</span> {Math.round(generatedParams.vegetation * 100)}%</p>
              <p><span className="text-foreground">Mountains:</span> {Math.round(generatedParams.mountainHeight * 100)}%</p>
              <p><span className="text-foreground">Moons:</span> {generatedMoonParams.length}</p>
              <p><span className="text-foreground">Atmosphere:</span> {generatedParams.hasAtmosphere ? 'Yes' : 'No'}</p>
              <p><span className="text-foreground">Rings:</span> {generatedParams.hasRings ? 'Yes' : 'No'}</p>
            </div>
          </Card>
        )}
        
        {/* Bottom control panel */}
        <div className={`absolute bottom-0 left-0 right-0 z-10 transition-transform duration-300 ${isPanelHidden ? 'translate-y-full' : 'translate-y-0'}`}>
          <Card className="m-3 p-4 bg-card/95 backdrop-blur border">
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-4">
                {/* Planet description */}
                <div>
                  <Label htmlFor="planet-desc" className="text-sm font-medium">Planet Description</Label>
                  <Textarea
                    id="planet-desc"
                    value={planetText}
                    onChange={(e) => setPlanetText(e.target.value)}
                    placeholder="Describe your planet... (e.g., 'A cone-shaped volcanic world with lava oceans')"
                    className="mt-1.5 min-h-[80px] resize-none"
                  />
                </div>
                
                {/* Moon section */}
                <Collapsible open={showMoons} onOpenChange={setShowMoons}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Moons ({moonTexts.length}/3)
                      </span>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2">
                    {moonTexts.map((text, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={text}
                          onChange={(e) => handleMoonTextChange(index, e.target.value)}
                          placeholder={`Moon ${index + 1} description...`}
                          className="flex-1"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveMoon(index)}
                          className="shrink-0"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {moonTexts.length < 3 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleAddMoon}
                        className="w-full border-dashed"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Moon
                      </Button>
                    )}
                  </CollapsibleContent>
                </Collapsible>
                
                {/* Controls row */}
                <div className="flex flex-wrap gap-2">
                  <Select value={quality} onValueChange={(v) => setQuality(v as QualityLevel)}>
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder="Quality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button onClick={handleGenerate} className="flex-1 min-w-[120px]">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                  
                  <Button variant="outline" onClick={handleRandomizeSeed} disabled={!generatedParams}>
                    <Shuffle className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Save/Load row */}
                <div className="flex gap-2">
                  <Input
                    value={planetName}
                    onChange={(e) => setPlanetName(e.target.value)}
                    placeholder="Planet name..."
                    className="flex-1"
                  />
                  <Button 
                    variant="secondary" 
                    onClick={handleSave}
                    disabled={!generatedParams || !planetName.trim()}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                  
                  {/* Load sheet */}
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" disabled={savedPlanets.length === 0}>
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-80">
                      <SheetHeader>
                        <SheetTitle>Saved Planets</SheetTitle>
                      </SheetHeader>
                      <ScrollArea className="h-[calc(100vh-100px)] mt-4">
                        <div className="space-y-2 pr-4">
                          {savedPlanets.map((saved) => (
                            <Card 
                              key={saved.id} 
                              className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                              onClick={() => handleLoad(saved)}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-medium">{saved.name}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {saved.planetParams.shapeType} • {saved.moonParams.length} moons
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(saved.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(saved.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </Card>
                          ))}
                          {savedPlanets.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              No saved planets yet. Generate and save one!
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  );
}
