import { useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings2, Ruler, MoveHorizontal, Palette, Sparkles, Monitor } from 'lucide-react';
import type { 
  Character3DConfig, 
  CharacterTemplate, 
  VisualStyle, 
  MotionMode, 
  ModelQuality 
} from '@/lib/character-3d-types';
import { 
  TEMPLATE_OPTIONS, 
  VISUAL_STYLE_OPTIONS, 
  MOTION_MODE_OPTIONS, 
  QUALITY_OPTIONS 
} from '@/lib/character-3d-types';

interface Character3DOptionsProps {
  config: Character3DConfig | null;
  isLoading: boolean;
  isSaving: boolean;
  onUpdate: (updates: Partial<Character3DConfig>) => Promise<void>;
}

export default function Character3DOptions({
  config,
  isLoading,
  isSaving,
  onUpdate,
}: Character3DOptionsProps) {
  const handleTemplateChange = useCallback((value: string) => {
    onUpdate({ template: value as CharacterTemplate });
  }, [onUpdate]);

  const handleHeightChange = useCallback((values: number[]) => {
    onUpdate({ height_morph: values[0] });
  }, [onUpdate]);

  const handleShouldersChange = useCallback((values: number[]) => {
    onUpdate({ shoulders_morph: values[0] });
  }, [onUpdate]);

  const handleStyleChange = useCallback((value: string) => {
    onUpdate({ visual_style: value as VisualStyle });
  }, [onUpdate]);

  const handleMotionChange = useCallback((value: string) => {
    onUpdate({ motion_mode: value as MotionMode });
  }, [onUpdate]);

  const handleQualityChange = useCallback((value: string) => {
    onUpdate({ quality: value as ModelQuality });
  }, [onUpdate]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Settings2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>3D configuration will be created when you enable 3D generation.</p>
        </CardContent>
      </Card>
    );
  }

  const adultTemplates = TEMPLATE_OPTIONS.filter(t => t.group === 'adult');
  const kidTemplates = TEMPLATE_OPTIONS.filter(t => t.group === 'kid');

  return (
    <Card className={isSaving ? 'opacity-75' : ''}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          3D Generation Options
        </CardTitle>
        <CardDescription>
          Configure how your character model will be generated
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Body Template
          </Label>
          <Select value={config.template} onValueChange={handleTemplateChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select body type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Adult Templates</SelectLabel>
                {adultTemplates.map(template => (
                  <SelectItem key={template.value} value={template.value}>
                    <div className="flex flex-col">
                      <span>{template.label}</span>
                      <span className="text-xs text-muted-foreground">{template.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Kid Templates</SelectLabel>
                {kidTemplates.map(template => (
                  <SelectItem key={template.value} value={template.value}>
                    <div className="flex flex-col">
                      <span>{template.label}</span>
                      <span className="text-xs text-muted-foreground">{template.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Morph Sliders */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-muted-foreground" />
                Height
              </span>
              <span className="text-sm text-muted-foreground">
                {config.height_morph.toFixed(2)}x
              </span>
            </Label>
            <Slider
              value={[config.height_morph]}
              onValueChange={handleHeightChange}
              min={0.8}
              max={1.2}
              step={0.01}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Shorter</span>
              <span>Taller</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MoveHorizontal className="w-4 h-4 text-muted-foreground" />
                Shoulder Width
              </span>
              <span className="text-sm text-muted-foreground">
                {config.shoulders_morph.toFixed(2)}x
              </span>
            </Label>
            <Slider
              value={[config.shoulders_morph]}
              onValueChange={handleShouldersChange}
              min={0.8}
              max={1.2}
              step={0.01}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Narrower</span>
              <span>Wider</span>
            </div>
          </div>
        </div>

        {/* Visual Style */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-muted-foreground" />
            Visual Style
          </Label>
          <RadioGroup
            value={config.visual_style}
            onValueChange={handleStyleChange}
            className="flex gap-4"
          >
            {VISUAL_STYLE_OPTIONS.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`style-${option.value}`} />
                <Label htmlFor={`style-${option.value}`} className="cursor-pointer">
                  <span className="font-medium">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">{option.description}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Motion Mode */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            Motion Mode
          </Label>
          <RadioGroup
            value={config.motion_mode}
            onValueChange={handleMotionChange}
            className="flex flex-wrap gap-4"
          >
            {MOTION_MODE_OPTIONS.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`motion-${option.value}`} />
                <Label htmlFor={`motion-${option.value}`} className="cursor-pointer">
                  <span className="font-medium">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">{option.description}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Quality */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-muted-foreground" />
            Quality Preset
          </Label>
          <Select value={config.quality} onValueChange={handleQualityChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUALITY_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
