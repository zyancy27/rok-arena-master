import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SettingsSelectProps {
  label: string;
  description?: string;
  value: string;
  options: { value: string; label: string }[];
  onValueChange: (val: string) => void;
}

export function SettingsSelect({ label, description, value, options, onValueChange }: SettingsSelectProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
      <div className="space-y-0.5 pr-4">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
