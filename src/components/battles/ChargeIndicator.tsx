/**
 * ⚡ Charge Indicator
 * Minimal UI showing charge progress with color-shifting bar.
 * Yellow → Orange → Red → White
 */

import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import type { ChargeState } from '@/lib/battle-charge';
import { getChargeProgress, getChargeColorStage, getChargeDodgePenalty } from '@/lib/battle-charge';

interface ChargeIndicatorProps {
  chargeState: ChargeState;
  characterName: string;
}

const COLOR_CLASSES: Record<string, string> = {
  yellow: 'from-yellow-400 to-amber-300',
  orange: 'from-orange-400 to-amber-500',
  red: 'from-red-500 to-orange-500',
  white: 'from-white to-yellow-100',
};

const GLOW_CLASSES: Record<string, string> = {
  yellow: 'shadow-[0_0_8px_rgba(250,204,21,0.4)]',
  orange: 'shadow-[0_0_10px_rgba(249,115,22,0.5)]',
  red: 'shadow-[0_0_14px_rgba(239,68,68,0.6)]',
  white: 'shadow-[0_0_20px_rgba(255,255,255,0.7)]',
};

export default function ChargeIndicator({ chargeState, characterName }: ChargeIndicatorProps) {
  const [pulse, setPulse] = useState(false);

  const progress = getChargeProgress(chargeState);
  const colorStage = getChargeColorStage(progress);
  const dodgePenalty = getChargeDodgePenalty(chargeState);
  const turnsElapsed = chargeState.totalChargeTurns - chargeState.chargeTurnsRemaining;
  const isFinalTurn = chargeState.chargeTurnsRemaining <= 1;

  // Pulse on final turn
  useEffect(() => {
    if (isFinalTurn) {
      const interval = setInterval(() => setPulse(p => !p), 300);
      return () => clearInterval(interval);
    }
    setPulse(false);
  }, [isFinalTurn]);

  if (!chargeState.isCharging) return null;

  return (
    <div className={`p-2 rounded-lg border bg-muted/30 space-y-1.5 transition-all duration-300 ${
      GLOW_CLASSES[colorStage]
    } ${isFinalTurn ? 'animate-pulse' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className={`w-3.5 h-3.5 ${
            colorStage === 'white' ? 'text-white' :
            colorStage === 'red' ? 'text-red-400' :
            colorStage === 'orange' ? 'text-orange-400' :
            'text-yellow-400'
          }`} />
          <span className="text-xs font-bold">
            ⚡ Charging ({turnsElapsed}/{chargeState.totalChargeTurns})
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          Dodge −{Math.round(dodgePenalty * 100)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className={`relative h-2 w-full rounded-full bg-muted/50 overflow-hidden transition-shadow duration-300 ${
        GLOW_CLASSES[colorStage]
      }`}>
        <div
          className={`h-full rounded-full bg-gradient-to-r ${COLOR_CLASSES[colorStage]} transition-all duration-700 ease-out`}
          style={{ width: `${Math.max(5, progress * 100)}%` }}
        />
        {isFinalTurn && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
        )}
      </div>

      {/* Risk warning */}
      {chargeState.accumulatedRisk > 0.1 && (
        <div className="text-[10px] text-destructive/80">
          ⚠ Risk buildup: {Math.round(chargeState.accumulatedRisk * 100)}%
        </div>
      )}

      {isFinalTurn && (
        <div className="text-[10px] font-bold text-center animate-pulse" style={{
          color: colorStage === 'white' ? '#fff' : colorStage === 'red' ? '#f87171' : '#fbbf24',
        }}>
          READY TO RELEASE — Send your charged attack!
        </div>
      )}
    </div>
  );
}
