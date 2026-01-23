import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getStatLabel } from '@/lib/character-stats';
import { Info } from 'lucide-react';

interface StatSliderProps {
  name: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  icon: React.ReactNode;
  color: string;
}

export default function StatSlider({ name, description, value, onChange, icon, color }: StatSliderProps) {
  return (
    <div className="space-y-2 p-3 rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color }}>{icon}</span>
          <Label className="font-medium">{name}</Label>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-3 h-3 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p className="text-xs">{description}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{getStatLabel(value)}</span>
          <span className="font-bold text-sm w-8 text-right">{value}</span>
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={100}
        step={1}
        className="cursor-pointer"
        style={{
          '--slider-color': color,
        } as React.CSSProperties}
      />
    </div>
  );
}
