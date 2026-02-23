import { VisualSettings } from '@/lib/settings-defaults';
import { SettingsSection } from './SettingsSection';
import { SettingsSlider } from './SettingsSlider';
import { SettingsToggle } from './SettingsToggle';
import { SettingsSelect } from './SettingsSelect';

const INTENSITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

interface Props {
  settings: VisualSettings;
  onChange: (updates: Partial<VisualSettings>) => void;
  onReset: () => void;
}

export function VisualTab({ settings, onChange, onReset }: Props) {
  return (
    <SettingsSection title="Visual Settings" description="Control VFX intensity and visual feedback" onReset={onReset}>
      <SettingsSelect label="Dynamic VFX Intensity" value={settings.vfxIntensity} options={INTENSITY_OPTIONS} onValueChange={v => onChange({ vfxIntensity: v as any })} />
      <SettingsToggle label="Battlefield Global Effects" description="Show environmental battle effects" checked={settings.globalEffects} onCheckedChange={v => onChange({ globalEffects: v })} />
      <SettingsToggle label="Personal Status Effects" description="Show status effects on your character" checked={settings.personalEffects} onCheckedChange={v => onChange({ personalEffects: v })} />
      <SettingsSelect label="Charge Animation Intensity" value={settings.chargeIntensity} options={INTENSITY_OPTIONS} onValueChange={v => onChange({ chargeIntensity: v as any })} />
      <SettingsSelect label="Momentum Glow Intensity" value={settings.momentumGlow} options={INTENSITY_OPTIONS} onValueChange={v => onChange({ momentumGlow: v as any })} />
      <SettingsSlider label="Glitch Distortion Strength" value={settings.glitchStrength} onValueChange={v => onChange({ glitchStrength: v })} />
      <SettingsToggle label="Screen Shake" description="Shake the screen during impact moments" checked={settings.screenShake} onCheckedChange={v => onChange({ screenShake: v })} />
      <SettingsToggle label="Color Saturation Boost" description="Enhance color vibrance" checked={settings.saturationBoost} onCheckedChange={v => onChange({ saturationBoost: v })} />
      <SettingsToggle label="Reduced Flash Mode" description="Minimize flashing effects (epilepsy-safe)" checked={settings.reducedFlash} onCheckedChange={v => onChange({ reducedFlash: v })} />
    </SettingsSection>
  );
}
