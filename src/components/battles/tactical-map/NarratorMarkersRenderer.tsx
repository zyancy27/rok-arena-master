/**
 * Narrator Markers — SVG overlay for temporary battlefield markers
 */

import { memo } from 'react';
import type { NarratorMarker, MovementShadow } from '@/lib/narrator-markers';
import { getMarkerIcon, getMarkerColor } from '@/lib/narrator-markers';

interface NarratorMarkersRendererProps {
  markers: NarratorMarker[];
  shadows?: MovementShadow[];
}

function NarratorMarkersRendererInner({ markers, shadows = [] }: NarratorMarkersRendererProps) {
  return (
    <g>
      {/* Movement prediction shadows */}
      {shadows.map(s => (
        <g key={`shadow-${s.entityId}`} opacity={s.opacity}>
          <circle
            cx={s.projectedX}
            cy={s.projectedY}
            r={2.5}
            fill="hsl(var(--primary))"
            opacity={0.2}
            strokeDasharray="1 0.5"
            stroke="hsl(var(--primary))"
            strokeWidth="0.2"
          />
        </g>
      ))}

      {/* Narrator markers */}
      {markers.map(marker => {
        const age = Date.now() - marker.createdAt;
        const fadeRatio = Math.max(0, 1 - age / marker.duration);

        return (
          <g key={marker.id} opacity={fadeRatio}>
            {/* Marker ring */}
            <circle
              cx={marker.x}
              cy={marker.y}
              r={3.5}
              fill="none"
              stroke={getMarkerColor(marker.urgency)}
              strokeWidth="0.3"
            >
              {marker.urgency !== 'low' && (
                <animate attributeName="r" values="3.5;5;3.5" dur="2s" repeatCount="indefinite" />
              )}
            </circle>

            {/* Icon */}
            <text
              x={marker.x}
              y={marker.y + 1}
              textAnchor="middle"
              fontSize="3"
              className="select-none pointer-events-none"
            >
              {getMarkerIcon(marker.type)}
            </text>

            {/* Label */}
            <text
              x={marker.x}
              y={marker.y + 5.5}
              textAnchor="middle"
              fontSize="1.8"
              fill={getMarkerColor(marker.urgency)}
              className="select-none pointer-events-none"
            >
              {marker.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export const NarratorMarkersRenderer = memo(NarratorMarkersRendererInner);
