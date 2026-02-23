import { PerformanceSettings } from '@/lib/settings-defaults';
import { SettingsSection } from './SettingsSection';
import { SettingsToggle } from './SettingsToggle';
import { SettingsSelect } from './SettingsSelect';

const FPS_OPTIONS = [
  { value: '30', label: '30 FPS' },
  { value: '60', label: '60 FPS' },
  { value: '120', label: '120 FPS' },
];

interface Props {
  settings: PerformanceSettings;
  onChange: (updates: Partial<PerformanceSettings>) => void;
  onReset: () => void;
}

export function PerformanceTab({ settings, onChange, onReset }: Props) {
  return (
    <SettingsSection title="Performance Settings" description="Optimize for your device" onReset={onReset}>
      <SettingsToggle label="Battery Saver Mode" description="Reduce GPU usage to extend battery life" checked={settings.batterySaver} onCheckedChange={v => onChange({ batterySaver: v })} />
      <SettingsToggle label="Reduce Background Animations" description="Disable non-essential ambient animations" checked={settings.reduceAnimations} onCheckedChange={v => onChange({ reduceAnimations: v })} />
      <SettingsToggle label="Limit Particle Effects" description="Cap particle count for smoother performance" checked={settings.particleLimit} onCheckedChange={v => onChange({ particleLimit: v })} />
      <SettingsSelect label="Cap Frame Rate" value={String(settings.capFPS)} options={FPS_OPTIONS} onValueChange={v => onChange({ capFPS: Number(v) })} />
      <SettingsToggle label="Low Data Mode" description="Reduce network usage for slower connections" checked={settings.lowDataMode} onCheckedChange={v => onChange({ lowDataMode: v })} />
      <SettingsToggle label="Auto-Disable VFX on FPS Drop" description="Automatically lower effects if FPS drops" checked={settings.adaptiveVFX} onCheckedChange={v => onChange({ adaptiveVFX: v })} />
      <SettingsToggle label="Disable Real-Time Physics Visuals" description="Turn off physics-based visual layer" checked={settings.disablePhysicsVisuals} onCheckedChange={v => onChange({ disablePhysicsVisuals: v })} />
    </SettingsSection>
  );
}
