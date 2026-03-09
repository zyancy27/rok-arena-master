import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VoiceTextarea } from '@/components/ui/voice-textarea';

export interface AppearanceData {
  appearance_height: string;
  appearance_build: string;
  appearance_hair: string;
  appearance_eyes: string;
  appearance_distinct_features: string;
  appearance_clothing_style: string;
  appearance_aura: string;
  appearance_description: string;
  appearance_posture: string;
  appearance_voice: string;
  appearance_movement_style: string;
  appearance_typical_expression: string;
}

export const DEFAULT_APPEARANCE: AppearanceData = {
  appearance_height: '',
  appearance_build: '',
  appearance_hair: '',
  appearance_eyes: '',
  appearance_distinct_features: '',
  appearance_clothing_style: '',
  appearance_aura: '',
  appearance_description: '',
  appearance_posture: '',
  appearance_voice: '',
  appearance_movement_style: '',
  appearance_typical_expression: '',
};

interface CharacterAppearanceProps {
  data: AppearanceData;
  onChange: (field: keyof AppearanceData, value: string) => void;
}

export default function CharacterAppearance({ data, onChange }: CharacterAppearanceProps) {
  return (
    <div className="space-y-4">
      {/* Primary appearance fields */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Height</Label>
          <Input placeholder="e.g. 6'2&quot;" value={data.appearance_height} onChange={(e) => onChange('appearance_height', e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Build</Label>
          <Input placeholder="e.g. Athletic" value={data.appearance_build} onChange={(e) => onChange('appearance_build', e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hair</Label>
          <Input placeholder="e.g. Silver, long" value={data.appearance_hair} onChange={(e) => onChange('appearance_hair', e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Eyes</Label>
          <Input placeholder="e.g. Golden" value={data.appearance_eyes} onChange={(e) => onChange('appearance_eyes', e.target.value)} className="h-8 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Distinct Features</Label>
          <Input placeholder="Scars, markings, unique traits..." value={data.appearance_distinct_features} onChange={(e) => onChange('appearance_distinct_features', e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Clothing Style</Label>
          <Input placeholder="Armor, robes, casual..." value={data.appearance_clothing_style} onChange={(e) => onChange('appearance_clothing_style', e.target.value)} className="h-8 text-sm" />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Aura / Presence</Label>
        <Input placeholder="How do others perceive this character?" value={data.appearance_aura} onChange={(e) => onChange('appearance_aura', e.target.value)} className="h-8 text-sm" />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">General Description</Label>
        <VoiceTextarea placeholder="Overall appearance description..." value={data.appearance_description} onValueChange={(v) => onChange('appearance_description', v)} rows={2} className="text-sm" />
      </div>

      {/* Optional fields */}
      <div className="border-t border-border pt-3">
        <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Optional Details</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Posture</Label>
            <Input placeholder="Relaxed, rigid..." value={data.appearance_posture} onChange={(e) => onChange('appearance_posture', e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Voice</Label>
            <Input placeholder="Deep, melodic..." value={data.appearance_voice} onChange={(e) => onChange('appearance_voice', e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Movement Style</Label>
            <Input placeholder="Graceful, heavy..." value={data.appearance_movement_style} onChange={(e) => onChange('appearance_movement_style', e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Typical Expression</Label>
            <Input placeholder="Stern, warm..." value={data.appearance_typical_expression} onChange={(e) => onChange('appearance_typical_expression', e.target.value)} className="h-8 text-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
