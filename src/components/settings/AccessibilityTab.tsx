import { AccessibilitySettings } from '@/lib/settings-defaults';
import { SettingsSection } from './SettingsSection';
import { SettingsToggle } from './SettingsToggle';
import { SettingsSelect } from './SettingsSelect';

const COLORBLIND_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'protanopia', label: 'Protanopia' },
  { value: 'deuteranopia', label: 'Deuteranopia' },
  { value: 'tritanopia', label: 'Tritanopia' },
];

interface Props {
  settings: AccessibilitySettings;
  onChange: (updates: Partial<AccessibilitySettings>) => void;
  onReset: () => void;
}

export function AccessibilityTab({ settings, onChange, onReset }: Props) {
  return (
    <SettingsSection title="Accessibility" description="Make the game comfortable for everyone" onReset={onReset}>
      <SettingsToggle label="Large Text Mode" description="Increase text size across the UI" checked={settings.largeText} onCheckedChange={v => onChange({ largeText: v })} />
      <SettingsToggle label="High Contrast Mode" description="Increase contrast for better visibility" checked={settings.highContrast} onCheckedChange={v => onChange({ highContrast: v })} />
      <SettingsSelect label="Colorblind Mode" value={settings.colorblindMode} options={COLORBLIND_OPTIONS} onValueChange={v => onChange({ colorblindMode: v as any })} />
      <SettingsToggle label="Reduce Motion" description="Minimize animations and transitions" checked={settings.reduceMotion} onCheckedChange={v => onChange({ reduceMotion: v })} />
      <SettingsToggle label="Text-to-Speech for Battle Logs" description="Read combat logs aloud" checked={settings.ttsLogs} onCheckedChange={v => onChange({ ttsLogs: v })} />
      <SettingsToggle label="Subtitles for SFX Events" description="Show text labels for sound effects" checked={settings.sfxSubtitles} onCheckedChange={v => onChange({ sfxSubtitles: v })} />
    </SettingsSection>
  );
}
