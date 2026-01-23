import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Globe, Orbit, Weight, Ruler, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { 
  getGravityClass, 
  calculateGravityStatModifiers, 
  PLANET_PRESETS 
} from '@/lib/planet-physics';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const PLANET_COLORS = [
  { name: 'Crimson', value: '#DC2626' },
  { name: 'Amber', value: '#D97706' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Cyan', value: '#0891B2' },
  { name: 'Violet', value: '#7C3AED' },
  { name: 'Rose', value: '#DB2777' },
  { name: 'Slate', value: '#475569' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Sky', value: '#0EA5E9' },
  { name: 'Lime', value: '#84CC16' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Indigo', value: '#6366F1' },
];

interface CreatePlanetDialogProps {
  onSuccess: () => void;
  onBack: () => void;
  existingPlanets: string[];
  solarSystemId: string;
}

export default function CreatePlanetDialog({ onSuccess, onBack, existingPlanets, solarSystemId }: CreatePlanetDialogProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  
  // Basic info
  const [planetName, setPlanetName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#059669');
  
  // Physics
  const [gravity, setGravity] = useState(1.0);
  const [radius, setRadius] = useState(1.0);
  const [orbitalDistance, setOrbitalDistance] = useState(1.0);
  
  // Optional features
  const [hasRings, setHasRings] = useState(false);
  const [moonCount, setMoonCount] = useState(0);

  const gravityClass = getGravityClass(gravity);
  const statModifiers = calculateGravityStatModifiers(gravity);

  const applyPreset = (presetName: string) => {
    const preset = PLANET_PRESETS[presetName];
    if (preset) {
      setGravity(preset.gravity);
      setRadius(preset.radius);
      setOrbitalDistance(preset.orbitalDistance);
      toast.success(`Applied ${presetName} preset`);
    }
  };

  const handleSave = async () => {
    if (!planetName.trim()) {
      toast.error('Please enter a planet name');
      return;
    }
    
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    // Check if planet already exists
    if (existingPlanets.some(p => p.toLowerCase() === planetName.toLowerCase())) {
      toast.error('A planet with this name already exists');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('planet_customizations')
        .insert({
          user_id: user.id,
          planet_name: planetName.trim(),
          display_name: displayName.trim() || planetName.trim(),
          description: description.trim(),
          color,
          gravity,
          radius,
          orbital_distance: orbitalDistance,
          has_rings: hasRings,
          moon_count: moonCount,
          solar_system_id: solarSystemId,
        });

      if (error) throw error;

      toast.success(`${displayName || planetName} created successfully!`);
      onSuccess();
    } catch (error) {
      console.error('Failed to create planet:', error);
      toast.error('Failed to create planet');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-md overflow-auto animate-fade-in">
      <div className="container mx-auto py-6 px-4 max-w-2xl">
        <Card className="bg-card-gradient border-border">
          <CardHeader>
            <Button
              variant="ghost"
              size="sm"
              className="w-fit -ml-2 mb-2"
              onClick={onBack}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <CardTitle className="text-2xl">Create New Planet</CardTitle>
            </div>
            <CardDescription>
              Add a new world to your solar system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Planet Name (required) */}
            <div className="space-y-2">
              <Label htmlFor="planet-name" className="text-base">
                Planet Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="planet-name"
                value={planetName}
                onChange={(e) => setPlanetName(e.target.value)}
                placeholder="e.g., Xandar, Korelia, Nova Prime..."
              />
              <p className="text-xs text-muted-foreground">
                This will be used as the internal identifier
              </p>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={planetName || 'Optional display name'}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="planet-description">Planet Lore</Label>
              <Textarea
                id="planet-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this planet's history, culture, environment, or notable features... (affects visual appearance)"
                rows={4}
              />
            </div>

            {/* Planet Color */}
            <div className="space-y-3">
              <Label>Planet Color</Label>
              <div className="grid grid-cols-6 gap-2">
                {PLANET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`h-10 rounded-lg transition-all ${
                      color === c.value
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Planet Physics Section */}
            <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-primary/20">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <Label className="text-base font-semibold">Planet Physics</Label>
              </div>
              
              {/* Preset selector */}
              <div className="space-y-2">
                <Label>Quick Preset</Label>
                <Select onValueChange={applyPreset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Apply a preset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(PLANET_PRESETS).map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Gravity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Weight className="w-3 h-3" />
                    Surface Gravity
                  </Label>
                  <span 
                    className="text-sm font-medium px-2 py-0.5 rounded"
                    style={{ backgroundColor: gravityClass.color + '30', color: gravityClass.color }}
                  >
                    {gravity.toFixed(2)}g — {gravityClass.name}
                  </span>
                </div>
                <Slider
                  value={[gravity]}
                  onValueChange={(v) => setGravity(v[0])}
                  min={0.05}
                  max={4}
                  step={0.05}
                />
                <p className="text-xs text-muted-foreground">{gravityClass.description}</p>
                
                {/* Stat modifiers preview */}
                <div className="mt-2 p-2 rounded bg-background/50 text-xs">
                  <p className="font-medium text-foreground/80 mb-1">Character Stat Modifiers:</p>
                  <p className="text-muted-foreground">{statModifiers.description}</p>
                </div>
              </div>

              {/* Radius */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Ruler className="w-3 h-3" />
                    Planet Radius
                  </Label>
                  <span className="text-sm font-medium">
                    {radius.toFixed(2)}× Earth
                  </span>
                </div>
                <Slider
                  value={[radius]}
                  onValueChange={(v) => setRadius(v[0])}
                  min={0.1}
                  max={5}
                  step={0.1}
                />
              </div>

              {/* Orbital Distance */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Orbit className="w-3 h-3" />
                    Orbital Distance
                  </Label>
                  <span className="text-sm font-medium">
                    {orbitalDistance.toFixed(2)} AU
                  </span>
                </div>
                <Slider
                  value={[orbitalDistance]}
                  onValueChange={(v) => setOrbitalDistance(v[0])}
                  min={0.2}
                  max={10}
                  step={0.1}
                />
              </div>
            </div>

            {/* Rings & Moons */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 p-3 rounded-lg bg-muted/30">
                <Label>Planetary Rings</Label>
                <Select value={hasRings ? 'yes' : 'no'} onValueChange={(v) => setHasRings(v === 'yes')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No Rings</SelectItem>
                    <SelectItem value="yes">Has Rings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2 p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label>Moons</Label>
                  <span className="text-sm font-medium">{moonCount}</span>
                </div>
                <Slider
                  value={[moonCount]}
                  onValueChange={(v) => setMoonCount(v[0])}
                  min={0}
                  max={5}
                  step={1}
                />
              </div>
            </div>

            <Button onClick={handleSave} className="w-full" disabled={saving || !planetName.trim()}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Create Planet
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
