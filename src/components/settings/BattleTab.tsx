import { BattlePreferences } from '@/lib/settings-defaults';
import { SettingsSection } from './SettingsSection';
import { SettingsToggle } from './SettingsToggle';
import { SettingsSelect } from './SettingsSelect';

interface Props {
  settings: BattlePreferences;
  onChange: (updates: Partial<BattlePreferences>) => void;
  onReset: () => void;
}

export function BattleTab({ settings, onChange, onReset }: Props) {
  return (
    <SettingsSection title="Battle Preferences" description="Customize your combat experience" onReset={onReset}>
      <SettingsToggle label="Dynamic Battlefield Effects" description="AI describes how gravity, terrain, and atmosphere affect combat moves" checked={settings.dynamicBattlefieldEffects} onCheckedChange={v => onChange({ dynamicBattlefieldEffects: v })} />
      <SettingsSelect label="Battle Narrator" description="Invisible observer commenting on the fight" value={settings.narratorFrequency} options={[{ value: 'always', label: 'Always' }, { value: 'key_moments', label: 'Key Moments' }, { value: 'off', label: 'Off' }]} onValueChange={v => onChange({ narratorFrequency: v as BattlePreferences['narratorFrequency'] })} />
      <SettingsToggle label="Dice Combat System" description="Attack/defense rolls with concentration mechanics" checked={settings.diceEnabled} onCheckedChange={v => onChange({ diceEnabled: v })} />
      <SettingsToggle label="Arena Modifiers" description="Daily/weekly rotating modifiers that affect stats, momentum, and risk chances" checked={settings.arenaModifiersEnabled} onCheckedChange={v => onChange({ arenaModifiersEnabled: v })} />
      <SettingsToggle label="Auto Overcharge Confirmation" description="Require confirmation before overcharging" checked={settings.confirmOvercharge} onCheckedChange={v => onChange({ confirmOvercharge: v })} />
      <SettingsToggle label="Show Dodge Probability %" description="Display dodge chance during combat" checked={settings.showDodgeChance} onCheckedChange={v => onChange({ showDodgeChance: v })} />
      <SettingsToggle label="Show Momentum Meter" description="Display the momentum gauge in battle" checked={settings.showMomentum} onCheckedChange={v => onChange({ showMomentum: v })} />
      <SettingsToggle label="Show Psychological Status" description="Display psychological cues during battle" checked={settings.showPsychIndicator} onCheckedChange={v => onChange({ showPsychIndicator: v })} />
      <SettingsToggle label="Enable Detailed Combat Logs" description="Show expanded dice rolls and calculations" checked={settings.detailedLogs} onCheckedChange={v => onChange({ detailedLogs: v })} />
      <SettingsToggle label="Turn Countdown Timer" description="Show remaining time for each turn" checked={settings.turnTimer} onCheckedChange={v => onChange({ turnTimer: v })} />
      <SettingsToggle label="Show Opponent Charge Meter" description="Display the opponent's charge state" checked={settings.showOpponentCharge} onCheckedChange={v => onChange({ showOpponentCharge: v })} />
      <SettingsSelect label="PvP Battle Intro Mode" description="How character entrances are handled in PvP battles" value={settings.pvpIntroMode ?? 'ai'} options={[{ value: 'player', label: 'Player-Written' }, { value: 'ai', label: 'AI-Generated' }, { value: 'off', label: 'Off' }]} onValueChange={v => onChange({ pvpIntroMode: v as BattlePreferences['pvpIntroMode'] })} />
    </SettingsSection>
  );
}
