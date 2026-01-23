import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Globe, Orbit, Weight, Ruler } from 'lucide-react';
import { toast } from 'sonner';
import { 
  getGravityClass, 
  calculateGravityStatModifiers, 
  PLANET_PRESETS,
  type PlanetPhysics 
} from '@/lib/planet-physics';
import { useAutoSave } from '@/hooks/use-auto-save';
import { AutoSaveIndicator } from '@/components/ui/auto-save-indicator';

export interface PlanetCustomization {
  name: string;
  displayName: string;
  description: string;
  color: string;
  hasRings: boolean | null;
  moonCount: number | null;
  gravity: number | null;
  radius: number | null;
  orbitalDistance: number | null;
}

interface PlanetEditorProps {
  planet: PlanetCustomization;
  onSave: (data: PlanetCustomization) => Promise<void>;
  onBack: () => void;
}

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

export default function PlanetEditor({ planet, onSave, onBack }: PlanetEditorProps) {
  const [displayName, setDisplayName] = useState(planet.displayName || planet.name);
  const [description, setDescription] = useState(planet.description);
  const [color, setColor] = useState(planet.color);
  const [hasRings, setHasRings] = useState<boolean>(planet.hasRings ?? false);
  const [customizeRings, setCustomizeRings] = useState(planet.hasRings !== null);
  const [moonCount, setMoonCount] = useState<number>(planet.moonCount ?? 0);
  const [customizeMoons, setCustomizeMoons] = useState(planet.moonCount !== null);
  const [saving, setSaving] = useState(false);
  
  // Physics properties
  const [gravity, setGravity] = useState<number>(planet.gravity ?? 1.0);
  const [radius, setRadius] = useState<number>(planet.radius ?? 1.0);
  const [orbitalDistance, setOrbitalDistance] = useState<number>(planet.orbitalDistance ?? 1.0);
  const [customizePhysics, setCustomizePhysics] = useState(
    planet.gravity !== null || planet.radius !== null || planet.orbitalDistance !== null
  );

  const gravityClass = getGravityClass(gravity);
  const statModifiers = calculateGravityStatModifiers(gravity);

  // Memoize the current data for auto-save
  const currentData = useMemo<PlanetCustomization>(() => ({
    name: planet.name,
    displayName: displayName.trim() || planet.name,
    description,
    color,
    hasRings: customizeRings ? hasRings : null,
    moonCount: customizeMoons ? moonCount : null,
    gravity: customizePhysics ? gravity : null,
    radius: customizePhysics ? radius : null,
    orbitalDistance: customizePhysics ? orbitalDistance : null,
  }), [planet.name, displayName, description, color, customizeRings, hasRings, customizeMoons, moonCount, customizePhysics, gravity, radius, orbitalDistance]);

  // Auto-save hook
  const { isSaving: autoSaving, lastSaved, canUndo, undo, saveNow } = useAutoSave({
    data: currentData,
    onSave,
    debounceMs: 1500,
    enabled: true,
  });

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
    setSaving(true);
    try {
      await saveNow();
      toast.success('Planet customization saved!');
      onBack();
    } catch (error) {
      toast.error('Failed to save customization');
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Customize Planet</CardTitle>
                <CardDescription>
                  Personalize {planet.name}'s appearance and lore
                </CardDescription>
              </div>
              <AutoSaveIndicator
                isSaving={autoSaving}
                lastSaved={lastSaved}
                canUndo={canUndo}
                onUndo={undo}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="planet-display-name">Display Name</Label>
              <Input
                id="planet-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={planet.name}
              />
              <p className="text-xs text-muted-foreground">
                Original name: {planet.name}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="planet-description">Planet Lore</Label>
              <Textarea
                id="planet-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this planet's history, culture, environment, or notable features..."
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <Label className="text-base font-semibold">Planet Physics</Label>
                </div>
                <Switch checked={customizePhysics} onCheckedChange={setCustomizePhysics} />
              </div>
              <p className="text-xs text-muted-foreground">
                Define physical properties that affect orbital position and character stats
              </p>
              
              {customizePhysics && (
                <div className="space-y-4 pt-2">
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
                    <p className="text-xs text-muted-foreground">
                      Affects visual size. Earth = 6,371 km radius
                    </p>
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
                    <p className="text-xs text-muted-foreground">
                      Distance from sun in Astronomical Units. Earth = 1 AU. Affects climate zone.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Rings Toggle */}
            <div className="space-y-3 p-4 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Customize Rings</Label>
                  <p className="text-xs text-muted-foreground">Override default ring appearance</p>
                </div>
                <Switch checked={customizeRings} onCheckedChange={setCustomizeRings} />
              </div>
              {customizeRings && (
                <div className="flex items-center justify-between pt-2">
                  <Label>Has Planetary Rings</Label>
                  <Switch checked={hasRings} onCheckedChange={setHasRings} />
                </div>
              )}
            </div>

            {/* Moons Slider */}
            <div className="space-y-3 p-4 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Customize Moons</Label>
                  <p className="text-xs text-muted-foreground">Override default moon count</p>
                </div>
                <Switch checked={customizeMoons} onCheckedChange={setCustomizeMoons} />
              </div>
              {customizeMoons && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <Label>Number of Moons</Label>
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
              )}
            </div>

            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Customization
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
