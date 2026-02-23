import { SocialSettings } from '@/lib/settings-defaults';
import { SettingsSection } from './SettingsSection';
import { SettingsToggle } from './SettingsToggle';

interface Props {
  settings: SocialSettings;
  onChange: (updates: Partial<SocialSettings>) => void;
  onReset: () => void;
}

export function SocialTab({ settings, onChange, onReset }: Props) {
  return (
    <SettingsSection title="Social & Privacy" description="Control your social presence" onReset={onReset}>
      <SettingsToggle label="Show Online Status" description="Let others see when you're online" checked={settings.showOnline} onCheckedChange={v => onChange({ showOnline: v })} />
      <SettingsToggle label="Allow Spectators" description="Let others watch your battles" checked={settings.allowSpectators} onCheckedChange={v => onChange({ allowSpectators: v })} />
      <SettingsToggle label="Allow Match Replay Sharing" description="Allow your replays to be shared" checked={settings.allowReplaySharing} onCheckedChange={v => onChange({ allowReplaySharing: v })} />
      <SettingsToggle label="Allow Friend Requests" description="Receive friend requests from other players" checked={settings.allowFriendRequests} onCheckedChange={v => onChange({ allowFriendRequests: v })} />
      <SettingsToggle label="Show Battle History Publicly" description="Make your battle record visible" checked={settings.publicHistory} onCheckedChange={v => onChange({ publicHistory: v })} />
      <SettingsToggle label="Block Direct Messages" description="Prevent non-friends from messaging you" checked={settings.blockDMs} onCheckedChange={v => onChange({ blockDMs: v })} />
    </SettingsSection>
  );
}
