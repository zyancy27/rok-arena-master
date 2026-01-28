import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BattleTurnColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

const PRESET_COLORS = [
  { name: 'Royal Purple', value: '#8B5CF6' },
  { name: 'Ocean Blue', value: '#3B82F6' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Sunset Orange', value: '#F97316' },
  { name: 'Rose', value: '#EC4899' },
  { name: 'Golden', value: '#F59E0B' },
  { name: 'Crimson', value: '#DC2626' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Lime', value: '#84CC16' },
  { name: 'Violet', value: '#7C3AED' },
  { name: 'Fuchsia', value: '#D946EF' },
  { name: 'Teal', value: '#14B8A6' },
];

export default function BattleTurnColorPicker({
  color,
  onChange,
  disabled = false,
}: BattleTurnColorPickerProps) {
  const [customColor, setCustomColor] = useState(color);

  const handleCustomColorChange = (value: string) => {
    setCustomColor(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      onChange(value);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={disabled}
        >
          <div
            className="w-4 h-4 rounded-full border border-border"
            style={{ backgroundColor: color }}
          />
          <Palette className="w-4 h-4" />
          <span className="hidden sm:inline">Turn Color</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Your Battle Turn Color</Label>
            <p className="text-xs text-muted-foreground mt-1">
              This color shows when it's your turn to attack
            </p>
          </div>

          {/* Preset Colors */}
          <div className="grid grid-cols-6 gap-2">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                title={preset.name}
                className={cn(
                  'w-8 h-8 rounded-full border-2 transition-all hover:scale-110',
                  color === preset.value
                    ? 'border-foreground ring-2 ring-foreground/20'
                    : 'border-transparent hover:border-muted-foreground/50'
                )}
                style={{ backgroundColor: preset.value }}
                onClick={() => onChange(preset.value)}
              />
            ))}
          </div>

          {/* Custom Color Input */}
          <div className="flex gap-2">
            <div
              className="w-10 h-10 rounded-lg border border-border flex-shrink-0"
              style={{ backgroundColor: customColor }}
            />
            <div className="flex-1">
              <Label htmlFor="custom-color" className="text-xs">
                Custom Hex
              </Label>
              <Input
                id="custom-color"
                value={customColor}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                placeholder="#8B5CF6"
                className="h-8 text-sm font-mono"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 rounded-lg border relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: `radial-gradient(circle at center, ${color} 0%, transparent 70%)`,
              }}
            />
            <p className="text-xs text-center relative z-10">
              Preview of your turn indicator
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
