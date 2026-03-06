/**
 * Battlefield Image Stack — Layered CSS background compositor
 * Renders as a background behind the SVG tactical map.
 */

import { memo, useMemo } from 'react';
import type { BattlefieldImageStack as StackType } from '@/lib/battlefield-layers';

interface BattlefieldImageStackProps {
  stack: StackType;
}

function BattlefieldImageStackInner({ stack }: BattlefieldImageStackProps) {
  const style = useMemo(() => {
    const activeLayers = stack.layers
      .filter(l => l.active)
      .sort((a, b) => b.zIndex - a.zIndex);

    const backgrounds = activeLayers.map(l => l.cssBackground).join(', ');

    return {
      background: backgrounds || 'hsl(var(--background))',
      filter: stack.filter,
    } as React.CSSProperties;
  }, [stack]);

  const animatedLayers = stack.layers.filter(l => l.active && l.animation);

  return (
    <div className="absolute inset-0 rounded-lg overflow-hidden" style={style}>
      {/* Animated overlay layers */}
      {animatedLayers.map(layer => (
        <div
          key={layer.id}
          className={`absolute inset-0 ${layer.animation === 'pulse' ? 'animate-pulse' : ''}`}
          style={{
            background: layer.cssBackground,
            opacity: layer.opacity * 0.5,
          }}
        />
      ))}
    </div>
  );
}

export const BattlefieldImageStack = memo(BattlefieldImageStackInner);
