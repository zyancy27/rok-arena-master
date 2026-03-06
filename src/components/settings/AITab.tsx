import { AISettings } from '@/lib/settings-defaults';
import { SettingsSection } from './SettingsSection';
import { SettingsToggle } from './SettingsToggle';
import { SettingsSelect } from './SettingsSelect';
import { SettingsSlider } from './SettingsSlider';

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'hard', label: 'Hard' },
  { value: 'brutal', label: 'Brutal' },
];

interface Props {
  settings: AISettings;
  onChange: (updates: Partial<AISettings>) => void;
  onReset: () => void;
}

export function AITab({ settings, onChange, onReset }: Props) {
  return (
    <SettingsSection title="Opponent Behavior (PvE)" description="Configure how opponents fight and react" onReset={onReset}>
      <SettingsSelect label="Opponent Difficulty" value={settings.aiDifficulty} options={DIFFICULTY_OPTIONS} onValueChange={v => onChange({ aiDifficulty: v as any })} />
      <SettingsToggle label="Adaptive Opponents" description="Opponents learn and adapt to your playstyle" checked={settings.adaptiveAI} onCheckedChange={v => onChange({ adaptiveAI: v })} />
      <SettingsToggle label="Personality Randomizer" description="Randomize opponent personality each match" checked={settings.randomPersonality} onCheckedChange={v => onChange({ randomPersonality: v })} />
      <SettingsToggle label="Environmental Escalation" description="Allow arena to escalate dynamically" checked={settings.escalationEnabled} onCheckedChange={v => onChange({ escalationEnabled: v })} />
      <SettingsToggle label="Surprise NPC Interference" description="Allow unexpected NPC events during PvE" checked={settings.surpriseNPC} onCheckedChange={v => onChange({ surpriseNPC: v })} />
      <SettingsSlider label="Opponent Reaction Speed" description="Adjust opponent response timing" value={settings.reactionSpeedMod} min={0.5} max={2} step={0.1} displayValue={`${settings.reactionSpeedMod.toFixed(1)}x`} onValueChange={v => onChange({ reactionSpeedMod: v })} />
    </SettingsSection>
  );
}
