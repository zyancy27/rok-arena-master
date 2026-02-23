/**
 * Psychological Cue Indicator
 * Shows subtle visual cues based on the dominant psychological state.
 * No numbers are shown — only visual/text hints.
 */

import type { PsychCue } from '@/lib/battle-psychology';

interface PsychCueIndicatorProps {
  cue: PsychCue;
  characterName: string;
  variant?: 'user' | 'opponent';
}

const CUE_CONFIG: Record<NonNullable<PsychCue>, { icon: string; label: string; color: string; bgClass: string }> = {
  focused: {
    icon: '🎯',
    label: 'Focused',
    color: 'text-cyan-400',
    bgClass: 'bg-cyan-500/10 border-cyan-500/30',
  },
  shaken: {
    icon: '😰',
    label: 'Shaken',
    color: 'text-blue-300',
    bgClass: 'bg-blue-500/10 border-blue-500/30',
  },
  enraged: {
    icon: '🔥',
    label: 'Enraged',
    color: 'text-red-400',
    bgClass: 'bg-red-500/10 border-red-500/30',
  },
  resolute: {
    icon: '🛡️',
    label: 'Resolute',
    color: 'text-emerald-400',
    bgClass: 'bg-emerald-500/10 border-emerald-500/30',
  },
  confident: {
    icon: '✨',
    label: 'Confident',
    color: 'text-yellow-400',
    bgClass: 'bg-yellow-500/10 border-yellow-500/30',
  },
};

export default function PsychCueIndicator({ cue, characterName, variant = 'user' }: PsychCueIndicatorProps) {
  if (!cue) return null;

  const config = CUE_CONFIG[cue];

  return (
    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${config.bgClass}`}>
      <span>{config.icon}</span>
      <span className={config.color}>{config.label}</span>
    </div>
  );
}
