import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface SettingsSliderProps {
  label: string;
  description?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  displayValue?: string;
  onValueChange: (val: number) => void;
}

export function SettingsSlider({ label, description, value, min = 0, max = 1, step = 0.01, displayValue, onValueChange }: SettingsSliderProps) {
  return (
    <div className="p-3 rounded-lg bg-card border border-border space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium text-foreground">{label}</Label>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <span className="text-sm font-mono text-primary">{displayValue ?? Math.round(value * 100) + '%'}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onValueChange(v)} />
    </div>
  );
}
