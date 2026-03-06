/**
 * Zone Renderer — SVG sub-component for TacticalBattleMap
 * Renders zones with threat coloring, labels, and tactical indicators.
 */

import { memo } from 'react';
import type { BattlefieldZone, ThreatLevel } from '@/lib/tactical-zones';
import type { AwarenessLevel } from '@/lib/fog-of-awareness';
import { getThreatColor } from '@/lib/battlefield-layers';

const THREAT_BORDER: Record<ThreatLevel, string> = {
  safe: 'hsl(var(--border))',
  caution: 'hsla(45, 70%, 50%, 0.5)',
  unsafe: 'hsla(25, 70%, 45%, 0.6)',
  critical: 'hsla(0, 70%, 50%, 0.7)',
  imminent: 'hsla(0, 80%, 45%, 0.9)',
};

const ELEVATION_BADGE: Record<string, string> = {
  underground: '▽',
  ground: '',
  elevated: '△',
  high: '▲',
  aerial: '⬆',
};

interface ZoneRendererProps {
  zones: BattlefieldZone[];
  zoneAwareness?: Record<string, AwarenessLevel>;
  selectedZoneId?: string | null;
  focusedZoneId?: string | null;
  onZoneClick?: (zone: BattlefieldZone) => void;
}

function ZoneRendererInner({ zones, zoneAwareness, selectedZoneId, focusedZoneId, onZoneClick }: ZoneRendererProps) {
  return (
    <g>
      {zones.map(zone => {
        const awareness = zoneAwareness?.[zone.id] ?? 'full';
        if (awareness === 'hidden' && !zone.discovered) return null;

        const isSelected = selectedZoneId === zone.id;
        const isFocused = focusedZoneId === zone.id;
        const dimmed = awareness === 'hidden' || awareness === 'partial';

        return (
          <g
            key={zone.id}
            onClick={() => onZoneClick?.(zone)}
            className="cursor-pointer"
            opacity={dimmed ? 0.4 : 1}
          >
            {/* Zone background */}
            <rect
              x={zone.x - zone.width / 2}
              y={zone.y - zone.height / 2}
              width={zone.width}
              height={zone.height}
              fill={getThreatColor(zone.threatLevel)}
              stroke={isSelected ? 'hsl(var(--primary))' : THREAT_BORDER[zone.threatLevel]}
              strokeWidth={isSelected ? 0.5 : 0.25}
              rx={1.5}
              strokeDasharray={zone.collapseWarning ? '1.5 0.8' : undefined}
            />

            {/* Collapse warning pulse */}
            {zone.collapseWarning && (
              <rect
                x={zone.x - zone.width / 2}
                y={zone.y - zone.height / 2}
                width={zone.width}
                height={zone.height}
                fill="none"
                stroke="hsla(0, 80%, 50%, 0.6)"
                strokeWidth="0.4"
                rx={1.5}
              >
                <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" />
              </rect>
            )}

            {/* Threat pulse for critical/imminent */}
            {(zone.threatLevel === 'critical' || zone.threatLevel === 'imminent') && (
              <rect
                x={zone.x - zone.width / 2 - 0.5}
                y={zone.y - zone.height / 2 - 0.5}
                width={zone.width + 1}
                height={zone.height + 1}
                fill="none"
                stroke={THREAT_BORDER[zone.threatLevel]}
                strokeWidth="0.3"
                rx={2}
              >
                <animate attributeName="opacity" values="0.2;0.7;0.2" dur="2s" repeatCount="indefinite" />
              </rect>
            )}

            {/* Zone label */}
            {!dimmed && (
              <text
                x={zone.x}
                y={zone.y - 1}
                textAnchor="middle"
                fontSize={isFocused ? '2.8' : '2.2'}
                fill="hsl(var(--foreground))"
                className="select-none pointer-events-none"
                fontWeight={isSelected ? 'bold' : 'normal'}
              >
                {zone.label}
              </text>
            )}

            {/* Elevation badge */}
            {ELEVATION_BADGE[zone.elevation] && !dimmed && (
              <text
                x={zone.x}
                y={zone.y + 2.5}
                textAnchor="middle"
                fontSize="2"
                fill="hsl(var(--muted-foreground))"
                className="select-none pointer-events-none"
              >
                {ELEVATION_BADGE[zone.elevation]}
              </text>
            )}

            {/* Dimmed label for partial awareness */}
            {awareness === 'partial' && (
              <text
                x={zone.x}
                y={zone.y}
                textAnchor="middle"
                fontSize="2"
                fill="hsl(var(--muted-foreground))"
                className="select-none pointer-events-none"
                opacity={0.5}
              >
                ???
              </text>
            )}

            {/* Tactical property icons */}
            {!dimmed && (
              <g>
                {zone.tactical.hasCover && (
                  <text x={zone.x - zone.width / 2 + 2} y={zone.y + zone.height / 2 - 1} fontSize="2.5" className="select-none pointer-events-none">🛡</text>
                )}
                {zone.tactical.fireSpread && (
                  <text x={zone.x + zone.width / 2 - 4} y={zone.y + zone.height / 2 - 1} fontSize="2.5" className="select-none pointer-events-none">🔥</text>
                )}
                {zone.tactical.flooding && (
                  <text x={zone.x + zone.width / 2 - 4} y={zone.y + zone.height / 2 - 1} fontSize="2.5" className="select-none pointer-events-none">💧</text>
                )}
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

export const ZoneRenderer = memo(ZoneRendererInner);
