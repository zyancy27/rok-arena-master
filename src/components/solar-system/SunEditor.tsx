import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Save, Loader2, Sun, Thermometer, Flame, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface SunCustomization {
  name: string;
  description: string;
  color: string;
  temperature: number;
}

interface SunEditorProps {
  sun: SunCustomization;
  onSave: (data: SunCustomization) => Promise<void>;
  onBack: () => void;
}

// Real-life stellar classification based on temperature
// https://en.wikipedia.org/wiki/Stellar_classification
const STELLAR_TYPES = [
  { type: 'M', name: 'Red Dwarf', minTemp: 2400, maxTemp: 3700, color: '#FF4500', description: 'Cool, dim stars. Most common in the universe. Very long lifespans (trillions of years).' },
  { type: 'K', name: 'Orange Dwarf', minTemp: 3700, maxTemp: 5200, color: '#FF8C00', description: 'Slightly cooler than our Sun. Stable for billions of years. Good candidates for habitable planets.' },
  { type: 'G', name: 'Yellow Dwarf', minTemp: 5200, maxTemp: 6000, color: '#FDB813', description: 'Like our Sun! Medium temperature, stable for ~10 billion years.' },
  { type: 'F', name: 'Yellow-White', minTemp: 6000, maxTemp: 7500, color: '#F5F5DC', description: 'Hotter than our Sun. Shorter lifespan but still stable enough for life.' },
  { type: 'A', name: 'White Star', minTemp: 7500, maxTemp: 10000, color: '#CAE1FF', description: 'Hot white stars. Short lifespan of ~1 billion years. Very luminous.' },
  { type: 'B', name: 'Blue-White', minTemp: 10000, maxTemp: 30000, color: '#9BB0FF', description: 'Very hot and massive. Rare but extremely luminous. Lifespan ~100 million years.' },
  { type: 'O', name: 'Blue Giant', minTemp: 30000, maxTemp: 50000, color: '#6B8EFF', description: 'Hottest and most massive stars. Extremely rare. May go supernova.' },
];

// Calculate sun size multiplier based on temperature (mass-luminosity relation approximation)
export function getSunSizeFromTemperature(temp: number): number {
  // Real stars: hotter = bigger (generally)
  // Our Sun (5778K) = 1.0 scale
  // Red dwarfs can be 0.1x, Blue giants can be 10x+
  if (temp < 3000) return 0.4;
  if (temp < 4000) return 0.6;
  if (temp < 5000) return 0.8;
  if (temp < 6000) return 1.0;
  if (temp < 7500) return 1.3;
  if (temp < 10000) return 1.8;
  if (temp < 20000) return 3.0;
  if (temp < 35000) return 5.0;
  return 7.0;
}

// Get stellar classification from temperature
export function getStellarType(temp: number) {
  for (const star of STELLAR_TYPES) {
    if (temp >= star.minTemp && temp < star.maxTemp) {
      return star;
    }
  }
  // Default to O type for extremely hot
  if (temp >= 50000) return STELLAR_TYPES[6];
  // Default to M type for very cool
  return STELLAR_TYPES[0];
}

// Get color from temperature using real blackbody radiation approximation
export function getColorFromTemperature(temp: number): string {
  const stellar = getStellarType(temp);
  return stellar.color;
}

export default function SunEditor({ sun, onSave, onBack }: SunEditorProps) {
  const [name, setName] = useState(sun.name || 'Sol');
  const [description, setDescription] = useState(sun.description || '');
  const [temperature, setTemperature] = useState(sun.temperature || 5778);
  const [saving, setSaving] = useState(false);

  const stellarType = getStellarType(temperature);
  const sunSize = getSunSizeFromTemperature(temperature);
  const color = getColorFromTemperature(temperature);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        name: name.trim() || 'Sol',
        description,
        color,
        temperature,
      });
      toast.success('Sun customization saved!');
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
            <CardTitle className="text-2xl flex items-center gap-2">
              <Sun className="w-6 h-6 text-cosmic-gold" />
              Customize Your Star
            </CardTitle>
            <CardDescription>
              Adjust stellar properties based on real astrophysics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Star Preview */}
            <div className="flex justify-center py-6">
              <div className="relative">
                <div
                  className="rounded-full transition-all duration-500"
                  style={{
                    width: `${80 + sunSize * 30}px`,
                    height: `${80 + sunSize * 30}px`,
                    backgroundColor: color,
                    boxShadow: `0 0 ${30 * sunSize}px ${15 * sunSize}px ${color}80, 0 0 ${60 * sunSize}px ${30 * sunSize}px ${color}40`,
                  }}
                />
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-center">
                  <span className="text-sm font-bold" style={{ color }}>
                    Class {stellarType.type}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {stellarType.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Star Name */}
            <div className="space-y-2">
              <Label htmlFor="sun-name">Star Name</Label>
              <Input
                id="sun-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sol"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="sun-description">Star Lore</Label>
              <Textarea
                id="sun-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your star's history, mythology, or unique properties..."
                rows={3}
              />
            </div>

            {/* Temperature Slider */}
            <div className="space-y-4 p-4 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-primary" />
                  <Label>Surface Temperature</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Temperature determines stellar classification, color, and size. Our Sun is ~5,778K.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="text-sm font-mono font-bold" style={{ color }}>
                  {temperature.toLocaleString()}K
                </span>
              </div>
              <Slider
                value={[temperature]}
                onValueChange={(v) => setTemperature(v[0])}
                min={2400}
                max={50000}
                step={100}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Red Dwarf (2,400K)</span>
                <span>Blue Giant (50,000K)</span>
              </div>
            </div>

            {/* Stellar Facts Card */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <div className="flex items-start gap-3">
                <Flame className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm" style={{ color }}>
                    {stellarType.type}-Type: {stellarType.name}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {stellarType.description}
                  </p>
                  <div className="flex gap-4 pt-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Relative Size: </span>
                      <span className="font-bold">{sunSize.toFixed(1)}x</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Temp Range: </span>
                      <span className="font-bold">
                        {stellarType.minTemp.toLocaleString()}-{stellarType.maxTemp.toLocaleString()}K
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <Label>Quick Presets</Label>
              <div className="grid grid-cols-4 gap-2">
                {STELLAR_TYPES.slice(0, 4).map((star) => (
                  <button
                    key={star.type}
                    type="button"
                    onClick={() => setTemperature(Math.floor((star.minTemp + star.maxTemp) / 2))}
                    className={`p-2 rounded-lg border text-xs font-medium transition-all hover:scale-105 ${
                      stellarType.type === star.type
                        ? 'border-primary bg-primary/20'
                        : 'border-border bg-muted/30 hover:bg-muted/50'
                    }`}
                    style={{ color: star.color }}
                  >
                    {star.type} - {star.name.split(' ')[0]}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {STELLAR_TYPES.slice(4).map((star) => (
                  <button
                    key={star.type}
                    type="button"
                    onClick={() => setTemperature(Math.floor((star.minTemp + star.maxTemp) / 2))}
                    className={`p-2 rounded-lg border text-xs font-medium transition-all hover:scale-105 ${
                      stellarType.type === star.type
                        ? 'border-primary bg-primary/20'
                        : 'border-border bg-muted/30 hover:bg-muted/50'
                    }`}
                    style={{ color: star.color }}
                  >
                    {star.type} - {star.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Star Configuration
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
