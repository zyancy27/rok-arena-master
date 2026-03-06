/**
 * LOS Visualization — SVG lines showing line of sight between entities
 */

import { memo } from 'react';
import type { LOSLine } from '@/lib/fog-of-awareness';
import { LOS_COLORS } from '@/lib/fog-of-awareness';

interface LOSVisualizationProps {
  lines: LOSLine[];
}

function LOSVisualizationInner({ lines }: LOSVisualizationProps) {
  return (
    <g>
      {lines.map((line, i) => (
        <line
          key={`los-${i}`}
          x1={line.x1} y1={line.y1}
          x2={line.x2} y2={line.y2}
          stroke={LOS_COLORS[line.status]}
          strokeWidth="0.3"
          strokeDasharray={line.status === 'blocked' ? '1 1' : line.status === 'partial' ? '2 0.5' : ''}
          className="pointer-events-none"
        />
      ))}
    </g>
  );
}

export const LOSVisualization = memo(LOSVisualizationInner);
