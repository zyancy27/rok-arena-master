/**
 * Environmental Pressure Meter
 * Shows how unstable/dangerous the battlefield is becoming.
 */

import { memo } from 'react';
import { AlertTriangle, Shield, Flame } from 'lucide-react';
import type { ArenaState } from '@/lib/living-arena';

type PressureLevel = 'calm' | 'tense' | 'unstable' | 'critical' | 'catastrophic';

function getPressureLevel(arenaState: ArenaState): PressureLevel {
  const score = (100 - arenaState.stability) + arenaState.hazardLevel + arenaState.environmentalPressure;
  if (score > 200) return 'catastrophic';
  if (score > 140) return 'critical';
  if (score > 80) return 'unstable';
  if (score > 30) return 'tense';
  return 'calm';
}

const PRESSURE_CONFIG: Record<PressureLevel, { label: string; color: string; icon: typeof Shield; pulse: boolean }> = {
  calm: { label: 'Calm', color: 'text-emerald-400', icon: Shield, pulse: false },
  tense: { label: 'Tense', color: 'text-amber-400', icon: AlertTriangle, pulse: false },
  unstable: { label: 'Unstable', color: 'text-orange-400', icon: AlertTriangle, pulse: true },
  critical: { label: 'Critical', color: 'text-red-400', icon: Flame, pulse: true },
  catastrophic: { label: 'Catastrophic', color: 'text-red-500', icon: Flame, pulse: true },
};

interface EnvironmentPressureMeterProps {
  arenaState: ArenaState;
}

function EnvironmentPressureMeterInner({ arenaState }: EnvironmentPressureMeterProps) {
  const level = getPressureLevel(arenaState);
  const config = PRESSURE_CONFIG[level];
  const Icon = config.icon;

  const fillPercent = Math.min(100,
    ((100 - arenaState.stability) + arenaState.hazardLevel + arenaState.environmentalPressure) / 3
  );

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] border-b border-border">
      <Icon className={`w-3 h-3 ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />
      <span className={`font-medium ${config.color}`}>
        Environment: {config.label}
      </span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden ml-1">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            level === 'calm' ? 'bg-emerald-500' :
            level === 'tense' ? 'bg-amber-500' :
            level === 'unstable' ? 'bg-orange-500' :
            'bg-red-500'
          }`}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
      <span className="text-muted-foreground tabular-nums">{arenaState.stability}%</span>
    </div>
  );
}

export const EnvironmentPressureMeter = memo(EnvironmentPressureMeterInner);
