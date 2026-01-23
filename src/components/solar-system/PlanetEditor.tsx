import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface PlanetCustomization {
  name: string;
  displayName: string;
  description: string;
  color: string;
  hasRings: boolean | null;
  moonCount: number | null;
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        name: planet.name,
        displayName: displayName.trim() || planet.name,
        description,
        color,
        hasRings: customizeRings ? hasRings : null,
        moonCount: customizeMoons ? moonCount : null,
      });
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
            <CardTitle className="text-2xl">Customize Planet</CardTitle>
            <CardDescription>
              Personalize {planet.name}'s appearance and lore
            </CardDescription>
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
