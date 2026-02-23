import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface SettingsToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (val: boolean) => void;
}

export function SettingsToggle({ label, description, checked, onCheckedChange }: SettingsToggleProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
      <div className="space-y-0.5 pr-4">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
