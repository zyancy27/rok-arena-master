import { NotificationSettings } from '@/lib/settings-defaults';
import { SettingsSection } from './SettingsSection';
import { SettingsToggle } from './SettingsToggle';

interface Props {
  settings: NotificationSettings;
  onChange: (updates: Partial<NotificationSettings>) => void;
  onReset: () => void;
}

export function NotificationsTab({ settings, onChange, onReset }: Props) {
  return (
    <SettingsSection title="Notifications" description="Choose which alerts you receive" onReset={onReset}>
      <SettingsToggle label="Match Found Alert" checked={settings.matchFound} onCheckedChange={v => onChange({ matchFound: v })} />
      <SettingsToggle label="Turn Reminder Alert" checked={settings.turnReminder} onCheckedChange={v => onChange({ turnReminder: v })} />
      <SettingsToggle label="Rival Online Alert" checked={settings.rivalOnline} onCheckedChange={v => onChange({ rivalOnline: v })} />
      <SettingsToggle label="Faction Event Alert" checked={settings.factionEvent} onCheckedChange={v => onChange({ factionEvent: v })} />
      <SettingsToggle label="Weekly Modifier Alert" checked={settings.weeklyModifier} onCheckedChange={v => onChange({ weeklyModifier: v })} />
      <SettingsToggle label="Low HP Warning Alert" checked={settings.lowHPWarning} onCheckedChange={v => onChange({ lowHPWarning: v })} />
    </SettingsSection>
  );
}
