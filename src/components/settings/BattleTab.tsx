import { BattlePreferences } from '@/lib/settings-defaults';
import { SettingsSection } from './SettingsSection';
import { SettingsToggle } from './SettingsToggle';

interface Props {
  settings: BattlePreferences;
  onChange: (updates: Partial<BattlePreferences>) => void;
  onReset: () => void;
}

export function BattleTab({ settings, onChange, onReset }: Props) {
  return (
    <SettingsSection title="Battle Preferences" description="Customize your combat experience" onReset={onReset}>
      <SettingsToggle label="Auto Overcharge Confirmation" description="Require confirmation before overcharging" checked={settings.confirmOvercharge} onCheckedChange={v => onChange({ confirmOvercharge: v })} />
      <SettingsToggle label="Auto Guard When Charging" description="Automatically guard during charge build-up" checked={settings.autoGuardCharge} onCheckedChange={v => onChange({ autoGuardCharge: v })} />
      <SettingsToggle label="Show Dodge Probability %" description="Display dodge chance during combat" checked={settings.showDodgeChance} onCheckedChange={v => onChange({ showDodgeChance: v })} />
      <SettingsToggle label="Show Momentum Meter" description="Display the momentum gauge in battle" checked={settings.showMomentum} onCheckedChange={v => onChange({ showMomentum: v })} />
      <SettingsToggle label="Show Psychological Status" description="Display psychological cues during battle" checked={settings.showPsychIndicator} onCheckedChange={v => onChange({ showPsychIndicator: v })} />
      <SettingsToggle label="Enable Detailed Combat Logs" description="Show expanded dice rolls and calculations" checked={settings.detailedLogs} onCheckedChange={v => onChange({ detailedLogs: v })} />
      <SettingsToggle label="Turn Countdown Timer" description="Show remaining time for each turn" checked={settings.turnTimer} onCheckedChange={v => onChange({ turnTimer: v })} />
      <SettingsToggle label="Show Opponent Charge Meter" description="Display the opponent's charge state" checked={settings.showOpponentCharge} onCheckedChange={v => onChange({ showOpponentCharge: v })} />
    </SettingsSection>
  );
}
