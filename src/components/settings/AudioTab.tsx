import { AudioSettings } from '@/lib/settings-defaults';
import { SettingsSection } from './SettingsSection';
import { SettingsSlider } from './SettingsSlider';
import { SettingsToggle } from './SettingsToggle';
import { Separator } from '@/components/ui/separator';

interface Props {
  settings: AudioSettings;
  onChange: (updates: Partial<AudioSettings>) => void;
  onReset: () => void;
}

export function AudioTab({ settings, onChange, onReset }: Props) {
  return (
    <SettingsSection title="Audio Settings" description="Control volume levels, narrator voice, and sound effects" onReset={onReset}>
      <SettingsSlider label="Master Volume" value={settings.masterVolume} onValueChange={v => onChange({ masterVolume: v })} />
      <SettingsSlider label="Battle SFX Volume" value={settings.sfxVolume} onValueChange={v => onChange({ sfxVolume: v })} />
      <SettingsSlider label="Ambient Arena Volume" value={settings.ambientVolume} onValueChange={v => onChange({ ambientVolume: v })} />
      <SettingsSlider label="Momentum Escalation Volume" value={settings.momentumVolume} onValueChange={v => onChange({ momentumVolume: v })} />
      <SettingsToggle label="Charge Build-Up SFX" description="Play sound effects during charge build-up" checked={settings.chargeSfx} onCheckedChange={v => onChange({ chargeSfx: v })} />
      <SettingsToggle label="Glitch Distortion Audio" description="Enable glitch audio effects during reality distortion" checked={settings.glitchAudio} onCheckedChange={v => onChange({ glitchAudio: v })} />
      <SettingsToggle label="Dimensional Distortion Bass" description="Deep bass rumble during dimensional shifts" checked={settings.dimensionalBass} onCheckedChange={v => onChange({ dimensionalBass: v })} />
      <SettingsToggle label="Low HP Heartbeat" description="Heartbeat effect when HP is critically low" checked={settings.heartbeatLowHP} onCheckedChange={v => onChange({ heartbeatLowHP: v })} />
      <SettingsToggle label="Stereo Spatial Audio" description="3D positional audio for battle effects" checked={settings.spatialAudio} onCheckedChange={v => onChange({ spatialAudio: v })} />
      <SettingsToggle label="Battery Saver Audio Mode" description="Reduce audio processing to save battery" checked={settings.batterySaverAudio} onCheckedChange={v => onChange({ batterySaverAudio: v })} />

      <Separator className="my-4" />

      <h3 className="text-sm font-semibold text-foreground mb-3">🎙️ Narrator Voice</h3>
      <SettingsToggle label="Enable Narrator Voice" description="Give the Narrator a spoken voice using AI text-to-speech" checked={settings.narratorVoiceEnabled} onCheckedChange={v => onChange({ narratorVoiceEnabled: v })} />
      {settings.narratorVoiceEnabled && (
        <>
          <SettingsToggle label="Auto-Read Narrator Messages" description="Automatically read narrator messages aloud when received" checked={settings.narratorAutoRead} onCheckedChange={v => onChange({ narratorAutoRead: v })} />
          <SettingsSlider label="Narrator Voice Volume" value={settings.narratorVoiceVolume} onValueChange={v => onChange({ narratorVoiceVolume: v })} />
        </>
      )}

      <Separator className="my-4" />

      <h3 className="text-sm font-semibold text-foreground mb-3">🔔 Chat Sounds</h3>
      <SettingsToggle label="Enable Chat Sounds" description="Play notification sounds for messages sent, received, dice rolls, and combat events" checked={settings.chatSoundsEnabled} onCheckedChange={v => onChange({ chatSoundsEnabled: v })} />
      {settings.chatSoundsEnabled && (
        <SettingsSlider label="Chat Sounds Volume" value={settings.chatSoundsVolume} onValueChange={v => onChange({ chatSoundsVolume: v })} />
      )}
    </SettingsSection>
  );
}
