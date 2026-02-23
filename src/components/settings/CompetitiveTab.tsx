import { CompetitiveSettings } from '@/lib/settings-defaults';
import { SettingsSection } from './SettingsSection';
import { SettingsToggle } from './SettingsToggle';

interface Props {
  settings: CompetitiveSettings;
  onChange: (updates: Partial<CompetitiveSettings>) => void;
  onReset: () => void;
}

export function CompetitiveTab({ settings, onChange, onReset }: Props) {
  return (
    <SettingsSection title="Competitive" description="Ranked and tier settings" onReset={onReset}>
      <SettingsToggle label="Show Tier Badge" description="Display your competitive tier badge" checked={settings.showTierBadge} onCheckedChange={v => onChange({ showTierBadge: v })} />
      <SettingsToggle label="Enable Ranked Queue" description="Participate in ranked matchmaking" checked={settings.enableRankedQueue} onCheckedChange={v => onChange({ enableRankedQueue: v })} />
      <SettingsToggle label="Prefer Same Tier Opponents" description="Match with players of similar rank" checked={settings.preferSameTier} onCheckedChange={v => onChange({ preferSameTier: v })} />
    </SettingsSection>
  );
}
