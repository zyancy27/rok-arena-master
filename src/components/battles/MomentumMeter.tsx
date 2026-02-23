/**
 * Momentum Meter Component
 * Small minimal meter below the dice combat status.
 * Glow effect when >80%. Edge State visual distortion when at 100.
 */

import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import type { MomentumState } from '@/lib/battle-momentum';

interface MomentumMeterProps {
  momentum: MomentumState;
  characterName: string;
  variant?: 'user' | 'opponent';
}

export default function MomentumMeter({ momentum, characterName, variant = 'user' }: MomentumMeterProps) {
  const [displayValue, setDisplayValue] = useState(momentum.value);

  // Smooth animation
  useEffect(() => {
    const timer = setTimeout(() => setDisplayValue(momentum.value), 50);
    return () => clearTimeout(timer);
  }, [momentum.value]);

  const isGlowing = displayValue >= 80;
  const isEdge = momentum.edgeStateActive;

  const barColor = variant === 'user'
    ? isEdge
      ? 'bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500'
      : isGlowing
        ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
        : 'bg-primary/70'
    : isEdge
      ? 'bg-gradient-to-r from-red-400 via-orange-300 to-red-500'
      : isGlowing
        ? 'bg-gradient-to-r from-red-400 to-orange-500'
        : 'bg-destructive/70';

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Zap className="w-2.5 h-2.5" />
          Momentum
        </span>
        {isEdge && (
          <span className="text-[10px] font-bold text-yellow-400 animate-pulse">
            EDGE ({momentum.edgeStateTurnsRemaining}T)
          </span>
        )}
      </div>
      <div
        className={`relative h-1.5 w-full rounded-full bg-muted/50 overflow-hidden transition-shadow duration-300 ${
          isGlowing ? 'shadow-[0_0_8px_hsl(var(--primary)/0.5)]' : ''
        } ${isEdge ? 'shadow-[0_0_12px_rgba(250,204,21,0.6)]' : ''}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${displayValue}%` }}
        />
        {isEdge && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
        )}
      </div>
    </div>
  );
}
