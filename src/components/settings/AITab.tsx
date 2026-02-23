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
    <SettingsSection title="AI Settings (PvE)" description="Configure AI opponent behavior" onReset={onReset}>
      <SettingsSelect label="AI Difficulty" value={settings.aiDifficulty} options={DIFFICULTY_OPTIONS} onValueChange={v => onChange({ aiDifficulty: v as any })} />
      <SettingsToggle label="Adaptive AI" description="AI learns and adapts to your playstyle" checked={settings.adaptiveAI} onCheckedChange={v => onChange({ adaptiveAI: v })} />
      <SettingsToggle label="AI Personality Randomizer" description="Randomize AI personality each match" checked={settings.randomPersonality} onCheckedChange={v => onChange({ randomPersonality: v })} />
      <SettingsToggle label="Environmental Escalation" description="Allow arena to escalate dynamically" checked={settings.escalationEnabled} onCheckedChange={v => onChange({ escalationEnabled: v })} />
      <SettingsToggle label="Surprise NPC Interference" description="Allow unexpected NPC events during PvE" checked={settings.surpriseNPC} onCheckedChange={v => onChange({ surpriseNPC: v })} />
      <SettingsSlider label="AI Reaction Speed" description="Adjust AI response timing" value={settings.reactionSpeedMod} min={0.5} max={2} step={0.1} displayValue={`${settings.reactionSpeedMod.toFixed(1)}x`} onValueChange={v => onChange({ reactionSpeedMod: v })} />
    </SettingsSection>
  );
}
