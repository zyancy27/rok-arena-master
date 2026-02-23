import { ImmersionSettings } from '@/lib/settings-defaults';
import { SettingsSection } from './SettingsSection';
import { SettingsToggle } from './SettingsToggle';

interface Props {
  settings: ImmersionSettings;
  onChange: (updates: Partial<ImmersionSettings>) => void;
  onReset: () => void;
}

export function ImmersionTab({ settings, onChange, onReset }: Props) {
  return (
    <SettingsSection title="RP & Immersion" description="Control your roleplay experience" onReset={onReset}>
      <SettingsToggle label="Hide OOC Chat During Battle" description="Suppress out-of-character messages in combat" checked={settings.hideOOC} onCheckedChange={v => onChange({ hideOOC: v })} />
      <SettingsToggle label="Auto Scroll RP Chat" description="Automatically scroll to newest messages" checked={settings.autoScrollChat} onCheckedChange={v => onChange({ autoScrollChat: v })} />
      <SettingsToggle label="Cinematic Mode" description="Minimal UI for maximum immersion" checked={settings.cinematicMode} onCheckedChange={v => onChange({ cinematicMode: v })} />
      <SettingsToggle label="Auto Play Character Intro" description="Play character intro animation on battle start" checked={settings.autoPlayIntro} onCheckedChange={v => onChange({ autoPlayIntro: v })} />
      <SettingsToggle label="Show Legacy Titles" description="Display earned titles above character name" checked={settings.showTitles} onCheckedChange={v => onChange({ showTitles: v })} />
      <SettingsToggle label="Final Blow Cinematic" description="Play cinematic on the finishing blow" checked={settings.finalBlowCinematic} onCheckedChange={v => onChange({ finalBlowCinematic: v })} />
      <SettingsToggle label="Ambient Lore Text" description="Show environmental lore text during battles" checked={settings.ambientLoreText} onCheckedChange={v => onChange({ ambientLoreText: v })} />
    </SettingsSection>
  );
}
