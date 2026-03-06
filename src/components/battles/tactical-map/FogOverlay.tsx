/**
 * Fog Overlay — SVG overlay for fog of awareness
 */

import { memo } from 'react';
import type { AwarenessResult } from '@/lib/fog-of-awareness';

interface FogOverlayProps {
  awareness: AwarenessResult;
  playerX: number;
  playerY: number;
}

function FogOverlayInner({ awareness, playerX, playerY }: FogOverlayProps) {
  return (
    <g>
      {/* Radial awareness gradient mask */}
      <defs>
        <radialGradient id="fog-gradient" cx={playerX / 100} cy={playerY / 100} r={awareness.awarenessRadius / 100}>
          <stop offset="0%" stopColor="transparent" />
          <stop offset="60%" stopColor="transparent" />
          <stop offset="85%" stopColor="hsla(220, 20%, 10%, 0.3)" />
          <stop offset="100%" stopColor="hsla(220, 20%, 10%, 0.6)" />
        </radialGradient>
      </defs>
      <rect
        x={0} y={0} width={100} height={100}
        fill="url(#fog-gradient)"
        className="pointer-events-none"
      />
    </g>
  );
}

export const FogOverlay = memo(FogOverlayInner);
