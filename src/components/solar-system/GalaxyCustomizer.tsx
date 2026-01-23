import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Palette, Sparkles, Loader2, Orbit, CloudFog, Wind, Zap } from 'lucide-react';
import { AutoSaveIndicator } from '@/components/ui/auto-save-indicator';
import { useAutoSave } from '@/hooks/use-auto-save';

interface GalaxyCustomization {
  background_type: string;
  galaxy_shape: string;
  visual_effects: {
    dust_clouds: boolean;
    asteroid_belts: boolean;
    cosmic_rays: boolean;
  };
  custom_colors: {
    primary: string;
    secondary: string;
  };
}

const BACKGROUNDS = [
  { value: 'nebula_purple', label: 'Purple Nebula', colors: ['#4C1D95', '#1E1B4B'] },
  { value: 'nebula_blue', label: 'Blue Nebula', colors: ['#0C4A6E', '#0F172A'] },
  { value: 'nebula_red', label: 'Red Nebula', colors: ['#7F1D1D', '#1C1917'] },
  { value: 'nebula_green', label: 'Green Nebula', colors: ['#14532D', '#0A0A0A'] },
  { value: 'deep_space', label: 'Deep Space', colors: ['#020617', '#0A0A0A'] },
  { value: 'cosmic_gold', label: 'Cosmic Gold', colors: ['#78350F', '#1C1917'] },
];

const GALAXY_SHAPES = [
  { value: 'spiral', label: 'Spiral', icon: Orbit },
  { value: 'elliptical', label: 'Elliptical', icon: Sparkles },
  { value: 'irregular', label: 'Irregular', icon: Wind },
  { value: 'ring', label: 'Ring', icon: Orbit },
];

interface GalaxyCustomizerProps {
  onClose?: () => void;
}

export default function GalaxyCustomizer({ onClose }: GalaxyCustomizerProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [customization, setCustomization] = useState<GalaxyCustomization>({
    background_type: 'nebula_purple',
    galaxy_shape: 'spiral',
    visual_effects: {
      dust_clouds: false,
      asteroid_belts: false,
      cosmic_rays: true,
    },
    custom_colors: {
      primary: '#8B5CF6',
      secondary: '#1E1B4B',
    },
  });

  useEffect(() => {
    fetchCustomization();
  }, [user]);

  const fetchCustomization = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('galaxy_customizations')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCustomization({
          background_type: data.background_type,
          galaxy_shape: data.galaxy_shape,
          visual_effects: data.visual_effects as GalaxyCustomization['visual_effects'],
          custom_colors: data.custom_colors as GalaxyCustomization['custom_colors'],
        });
      }
    } catch (error) {
      console.error('Failed to fetch galaxy customization:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCustomization = async (data: GalaxyCustomization) => {
    if (!user) return;

    const { error } = await supabase
      .from('galaxy_customizations')
      .upsert({
        user_id: user.id,
        background_type: data.background_type,
        galaxy_shape: data.galaxy_shape,
        visual_effects: data.visual_effects,
        custom_colors: data.custom_colors,
      }, {
        onConflict: 'user_id',
      });

    if (error) throw error;
  };

  const { isSaving, lastSaved, undo, canUndo } = useAutoSave({
    data: customization,
    onSave: saveCustomization,
    enabled: !loading,
    debounceMs: 1500,
  });

  const updateCustomization = (updates: Partial<GalaxyCustomization>) => {
    setCustomization(prev => ({ ...prev, ...updates }));
  };

  const updateVisualEffects = (key: keyof GalaxyCustomization['visual_effects'], value: boolean) => {
    setCustomization(prev => ({
      ...prev,
      visual_effects: { ...prev.visual_effects, [key]: value },
    }));
  };

  const selectedBackground = BACKGROUNDS.find(b => b.value === customization.background_type);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="bg-card-gradient border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Galaxy Appearance
            </CardTitle>
            <CardDescription>
              Customize how your combined galaxy looks when viewing with friends
            </CardDescription>
          </div>
          <AutoSaveIndicator
            isSaving={isSaving}
            lastSaved={lastSaved}
            onUndo={undo}
            canUndo={canUndo}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Background */}
        <div className="space-y-3">
          <Label>Background Style</Label>
          <Select
            value={customization.background_type}
            onValueChange={(value) => updateCustomization({ background_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BACKGROUNDS.map((bg) => (
                <SelectItem key={bg.value} value={bg.value}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded-full"
                      style={{ 
                        background: `linear-gradient(135deg, ${bg.colors[0]}, ${bg.colors[1]})` 
                      }}
                    />
                    {bg.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Preview */}
          {selectedBackground && (
            <div 
              className="h-20 rounded-lg border"
              style={{ 
                background: `linear-gradient(135deg, ${selectedBackground.colors[0]}, ${selectedBackground.colors[1]})` 
              }}
            />
          )}
        </div>

        {/* Galaxy Shape */}
        <div className="space-y-3">
          <Label>Galaxy Shape</Label>
          <div className="grid grid-cols-2 gap-2">
            {GALAXY_SHAPES.map((shape) => {
              const Icon = shape.icon;
              return (
                <Button
                  key={shape.value}
                  variant={customization.galaxy_shape === shape.value ? 'default' : 'outline'}
                  className="justify-start gap-2"
                  onClick={() => updateCustomization({ galaxy_shape: shape.value })}
                >
                  <Icon className="w-4 h-4" />
                  {shape.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Visual Effects */}
        <div className="space-y-4">
          <Label>Visual Effects</Label>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudFog className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Dust Clouds</span>
            </div>
            <Switch
              checked={customization.visual_effects.dust_clouds}
              onCheckedChange={(checked) => updateVisualEffects('dust_clouds', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Orbit className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Asteroid Belts</span>
            </div>
            <Switch
              checked={customization.visual_effects.asteroid_belts}
              onCheckedChange={(checked) => updateVisualEffects('asteroid_belts', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Cosmic Rays</span>
            </div>
            <Switch
              checked={customization.visual_effects.cosmic_rays}
              onCheckedChange={(checked) => updateVisualEffects('cosmic_rays', checked)}
            />
          </div>
        </div>

        {/* Close button if modal */}
        {onClose && (
          <Button variant="outline" onClick={onClose} className="w-full">
            Done
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
