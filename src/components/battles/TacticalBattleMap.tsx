/**
 * Tactical Battle Map — Zone-Based Battlefield Visualizer
 *
 * Lightweight SVG-based tactical diagram with:
 * - Zone-based battlefield layout
 * - Layered battlefield image backdrop
 * - Fog of awareness
 * - Narrator markers & cinematic frames
 * - Movement trails & predictive shadows
 * - Environmental pressure meter
 * - Tactical focus mode
 * - LOS visualization
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { X, Eye, Crosshair, Shield, AlertTriangle, Flame, Focus, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ArenaState } from '@/lib/living-arena';
import type { DistanceZone } from '@/lib/battle-dice';
import type { BattlefieldZone } from '@/lib/tactical-zones';
import type { NarratorMarker, CinematicFrame as CinematicFrameType, MovementShadow } from '@/lib/narrator-markers';
import type { AwarenessResult, LOSLine } from '@/lib/fog-of-awareness';
import type { BattlefieldImageStack as StackType } from '@/lib/battlefield-layers';
import { hasLineOfSight } from '@/lib/tactical-zones';
import { createLOSLine } from '@/lib/fog-of-awareness';
import { pruneMarkers, pruneMovementShadows } from '@/lib/narrator-markers';

import { ZoneRenderer } from './tactical-map/ZoneRenderer';
import { BattlefieldImageStack } from './tactical-map/BattlefieldImageStack';
import { EnvironmentPressureMeter } from './tactical-map/EnvironmentPressureMeter';
import { FogOverlay } from './tactical-map/FogOverlay';
import { NarratorMarkersRenderer } from './tactical-map/NarratorMarkersRenderer';
import { TacticalFocusPanel } from './tactical-map/TacticalFocusPanel';
import { CinematicFrameOverlay } from './tactical-map/CinematicFrameOverlay';
import { LOSVisualization } from './tactical-map/LOSVisualization';

// ── Types ───────────────────────────────────────────────────────

interface MapEntity {
  id: string;
  name: string;
  type: 'player' | 'enemy' | 'construct';
  x: number;
  y: number;
  prevX?: number;
  prevY?: number;
  color?: string;
  zoneId?: string;
}

interface MapFeature {
  id: string;
  label: string;
  type: 'structure' | 'cover' | 'hazard' | 'water' | 'vegetation' | 'vehicle' | 'platform' | 'crater';
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MapHazard {
  id: string;
  label: string;
  type: 'fire' | 'electric' | 'flood' | 'collapse' | 'debris' | 'ice' | 'generic';
  x: number;
  y: number;
  radius: number;
}

export interface TacticalMapData {
  entities: MapEntity[];
  features: MapFeature[];
  hazards: MapHazard[];
  arenaName?: string;
  distanceZone?: DistanceZone;
  arenaState?: ArenaState;
  /** Zone-based battlefield layout */
  zones?: BattlefieldZone[];
  /** Layered battlefield image */
  imageStack?: StackType;
  /** Fog of awareness result */
  awareness?: AwarenessResult;
  /** Active narrator markers */
  narratorMarkers?: NarratorMarker[];
  /** Active cinematic frame */
  cinematicFrame?: CinematicFrameType | null;
  /** Predictive movement shadows */
  movementShadows?: MovementShadow[];
}

interface TacticalBattleMapProps {
  data: TacticalMapData;
  onClose: () => void;
}

// ── Helpers ─────────────────────────────────────────────────────

const HAZARD_COLORS: Record<MapHazard['type'], string> = {
  fire: 'hsla(15, 90%, 55%, 0.35)',
  electric: 'hsla(50, 95%, 60%, 0.30)',
  flood: 'hsla(200, 80%, 55%, 0.30)',
  collapse: 'hsla(30, 60%, 45%, 0.30)',
  debris: 'hsla(25, 50%, 40%, 0.25)',
  ice: 'hsla(195, 80%, 70%, 0.30)',
  generic: 'hsla(0, 70%, 50%, 0.25)',
};

const FEATURE_COLORS: Record<MapFeature['type'], string> = {
  structure: 'hsl(var(--muted))',
  cover: 'hsl(var(--accent))',
  hazard: 'hsla(0, 70%, 50%, 0.3)',
  water: 'hsla(200, 70%, 50%, 0.25)',
  vegetation: 'hsla(130, 50%, 40%, 0.25)',
  vehicle: 'hsla(40, 50%, 50%, 0.3)',
  platform: 'hsla(220, 30%, 55%, 0.3)',
  crater: 'hsla(25, 40%, 35%, 0.25)',
};

function distanceLabel(zone?: DistanceZone): string {
  if (!zone) return '';
  const labels: Record<DistanceZone, string> = {
    melee: '0–2m • Melee',
    close: '2–5m • Close',
    mid: '5–15m • Mid',
    long: '15–50m • Long',
    extreme: '50–200m • Extreme',
  };
  return labels[zone];
}

// ── Component ───────────────────────────────────────────────────

export default function TacticalBattleMap({ data, onClose }: TacticalBattleMapProps) {
  const [selectedEntity, setSelectedEntity] = useState<MapEntity | null>(null);
  const [selectedZone, setSelectedZone] = useState<BattlefieldZone | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [showLayers, setShowLayers] = useState(true);
  const [activeMarkers, setActiveMarkers] = useState<NarratorMarker[]>(data.narratorMarkers ?? []);
  const [activeShadows, setActiveShadows] = useState<MovementShadow[]>(data.movementShadows ?? []);

  const hasZones = data.zones && data.zones.length > 0;
  const viewBox = '0 0 100 100';

  // Prune markers periodically
  useEffect(() => {
    if (activeMarkers.length === 0 && activeShadows.length === 0) return;
    const interval = setInterval(() => {
      setActiveMarkers(prev => pruneMarkers(prev));
      setActiveShadows(prev => pruneMovementShadows(prev));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeMarkers.length, activeShadows.length]);

  // Sync external markers
  useEffect(() => {
    if (data.narratorMarkers) setActiveMarkers(data.narratorMarkers);
  }, [data.narratorMarkers]);

  useEffect(() => {
    if (data.movementShadows) setActiveShadows(data.movementShadows);
  }, [data.movementShadows]);

  const gridLines = useMemo(() => {
    const lines: JSX.Element[] = [];
    for (let i = 0; i <= 100; i += 10) {
      lines.push(
        <line key={`h-${i}`} x1={0} y1={i} x2={100} y2={i} stroke="hsl(var(--border))" strokeWidth="0.15" opacity={0.3} />,
        <line key={`v-${i}`} x1={i} y1={0} x2={i} y2={100} stroke="hsl(var(--border))" strokeWidth="0.15" opacity={0.3} />,
      );
    }
    return lines;
  }, []);

  const handleEntityTap = useCallback((entity: MapEntity) => {
    setSelectedEntity(prev => prev?.id === entity.id ? null : entity);
    setSelectedZone(null);
  }, []);

  const handleZoneClick = useCallback((zone: BattlefieldZone) => {
    setSelectedZone(prev => prev?.id === zone.id ? null : zone);
    setSelectedEntity(null);
  }, []);

  // LOS lines from selected entity
  const losLines = useMemo((): LOSLine[] => {
    if (!selectedEntity || !hasZones || !data.zones) return [];
    const lines: LOSLine[] = [];
    for (const other of data.entities) {
      if (other.id === selectedEntity.id) continue;
      if (other.type === 'construct') continue;
      // Determine LOS using zones
      const fromZone = data.zones.find(z => z.occupants.includes(selectedEntity.id));
      const toZone = data.zones.find(z => z.occupants.includes(other.id));
      if (fromZone && toZone) {
        const los = hasLineOfSight(fromZone, toZone, data.zones);
        lines.push(createLOSLine(selectedEntity.x, selectedEntity.y, other.x, other.y, los));
      }
    }
    return lines;
  }, [selectedEntity, data.entities, data.zones, hasZones]);

  const getDistanceInfo = useCallback((entity: MapEntity) => {
    if (!selectedEntity || selectedEntity.id === entity.id) return null;
    const dx = entity.x - selectedEntity.x;
    const dy = entity.y - selectedEntity.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return {
      gridDistance: Math.round(dist),
      direction: dy < -5 ? 'above' : dy > 5 ? 'below' : 'level',
    };
  }, [selectedEntity]);

  // Entities in focused zone
  const focusedZoneEntities = useMemo(() => {
    if (!selectedZone) return [];
    return data.entities.filter(e =>
      selectedZone.occupants.includes(e.id) ||
      (Math.abs(e.x - selectedZone.x) < selectedZone.width / 2 + 3 &&
       Math.abs(e.y - selectedZone.y) < selectedZone.height / 2 + 3)
    );
  }, [selectedZone, data.entities]);

  // Player entity for fog center
  const playerEntity = data.entities.find(e => e.type === 'player');

  return (
    <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
      {/* Cinematic frame overlay */}
      <CinematicFrameOverlay frame={data.cinematicFrame ?? null} />

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Tactical Map</span>
          {data.arenaName && (
            <Badge variant="outline" className="text-[10px]">{data.arenaName}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {data.imageStack && (
            <Button
              variant="ghost" size="sm"
              onClick={() => setShowLayers(!showLayers)}
              className="h-7 px-2 text-[10px] gap-1"
            >
              <Layers className="w-3 h-3" />
            </Button>
          )}
          {hasZones && (
            <Button
              variant={focusMode ? 'secondary' : 'ghost'} size="sm"
              onClick={() => setFocusMode(!focusMode)}
              className="h-7 px-2 text-[10px] gap-1"
            >
              <Focus className="w-3 h-3" />
            </Button>
          )}
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Distance bar */}
      {data.distanceZone && (
        <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-b border-border flex items-center gap-2">
          <Eye className="w-3 h-3" />
          <span>Distance: {distanceLabel(data.distanceZone)}</span>
        </div>
      )}

      {/* Environmental Pressure Meter */}
      {data.arenaState && <EnvironmentPressureMeter arenaState={data.arenaState} />}

      {/* SVG Map */}
      <div className="flex-1 p-3 overflow-hidden relative">
        {/* Battlefield image background */}
        {showLayers && data.imageStack && <BattlefieldImageStack stack={data.imageStack} />}

        <svg viewBox={viewBox} className="w-full h-full max-h-[55vh] relative z-[1]" style={{ touchAction: 'none' }}>
          {/* Grid */}
          {gridLines}

          {/* Arena border */}
          <rect x={1} y={1} width={98} height={98} fill="none" stroke="hsl(var(--border))" strokeWidth="0.4" rx={2} />

          {/* Zones */}
          {hasZones && (
            <ZoneRenderer
              zones={data.zones!}
              zoneAwareness={data.awareness?.zoneAwareness}
              selectedZoneId={selectedZone?.id}
              focusedZoneId={focusMode ? selectedZone?.id : undefined}
              onZoneClick={handleZoneClick}
            />
          )}

          {/* Features (legacy/non-zone mode) */}
          {!hasZones && data.features.map(f => (
            <g key={f.id}>
              <rect
                x={f.x} y={f.y} width={f.width} height={f.height}
                fill={FEATURE_COLORS[f.type]}
                stroke="hsl(var(--border))" strokeWidth="0.2" rx={0.5}
              />
              <text
                x={f.x + f.width / 2} y={f.y + f.height / 2 + 1}
                textAnchor="middle" fontSize="2.2" fill="hsl(var(--muted-foreground))"
                className="select-none pointer-events-none"
              >
                {f.label}
              </text>
            </g>
          ))}

          {/* Hazard zones */}
          {data.hazards.map(h => (
            <g key={h.id}>
              <circle
                cx={h.x} cy={h.y} r={h.radius}
                fill={HAZARD_COLORS[h.type]}
                stroke={HAZARD_COLORS[h.type].replace(/[\d.]+\)$/, '0.7)')}
                strokeWidth="0.3" strokeDasharray="1 0.5"
              >
                <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
              </circle>
              <text
                x={h.x} y={h.y + 0.8} textAnchor="middle" fontSize="2"
                fill="hsl(var(--foreground))" className="select-none pointer-events-none"
              >
                ⚠
              </text>
            </g>
          ))}

          {/* Fog of awareness */}
          {data.awareness && playerEntity && (
            <FogOverlay
              awareness={data.awareness}
              playerX={playerEntity.x}
              playerY={playerEntity.y}
            />
          )}

          {/* LOS lines */}
          {losLines.length > 0 && <LOSVisualization lines={losLines} />}

          {/* Movement arrows */}
          <defs>
            <marker id="arrowhead" markerWidth="3" markerHeight="3" refX="3" refY="1.5" orient="auto">
              <polygon points="0 0, 3 1.5, 0 3" fill="hsl(var(--primary))" />
            </marker>
          </defs>
          {data.entities.filter(e => e.prevX !== undefined && e.prevY !== undefined).map(e => {
            const dx = e.x - (e.prevX ?? e.x);
            const dy = e.y - (e.prevY ?? e.y);
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len < 1) return null;
            return (
              <line
                key={`arrow-${e.id}`}
                x1={e.prevX} y1={e.prevY} x2={e.x} y2={e.y}
                stroke="hsl(var(--primary))" strokeWidth="0.4"
                strokeDasharray="1.5 0.8" markerEnd="url(#arrowhead)" opacity={0.6}
              />
            );
          })}

          {/* Narrator markers & shadows */}
          <NarratorMarkersRenderer markers={activeMarkers} shadows={activeShadows} />

          {/* Entities */}
          {data.entities.map(entity => {
            const isSelected = selectedEntity?.id === entity.id;
            const distInfo = getDistanceInfo(entity);
            const entityAwareness = data.awareness?.entityAwareness?.[entity.id];
            if (entityAwareness === 'hidden') return null;
            const dimmed = entityAwareness === 'partial';

            return (
              <g key={entity.id} onClick={() => handleEntityTap(entity)} className="cursor-pointer" opacity={dimmed ? 0.5 : 1}>
                {/* Selection ring */}
                {isSelected && (
                  <circle cx={entity.x} cy={entity.y} r={4.5} fill="none" stroke="hsl(var(--primary))" strokeWidth="0.3" opacity={0.7}>
                    <animate attributeName="r" values="4.5;5.5;4.5" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Entity shape */}
                {entity.type === 'player' ? (
                  <circle cx={entity.x} cy={entity.y} r={3}
                    fill={entity.color || 'hsl(var(--primary))'}
                    stroke="hsl(var(--primary-foreground))" strokeWidth="0.4"
                  />
                ) : entity.type === 'enemy' ? (
                  <polygon
                    points={`${entity.x},${entity.y - 3.5} ${entity.x - 3},${entity.y + 2.5} ${entity.x + 3},${entity.y + 2.5}`}
                    fill={entity.color || 'hsl(var(--destructive))'}
                    stroke="hsl(var(--destructive-foreground))" strokeWidth="0.4"
                  />
                ) : (
                  <rect
                    x={entity.x - 2.5} y={entity.y - 2.5} width={5} height={5}
                    fill={entity.color || 'hsl(var(--accent))'}
                    stroke="hsl(var(--accent-foreground))" strokeWidth="0.3" rx={0.5}
                  />
                )}

                {/* Name */}
                {!dimmed && (
                  <text
                    x={entity.x} y={entity.y + (entity.type === 'enemy' ? 6 : 5.5)}
                    textAnchor="middle" fontSize="2.5" fill="hsl(var(--foreground))"
                    className="select-none pointer-events-none font-semibold"
                  >
                    {entity.name.length > 10 ? entity.name.slice(0, 9) + '…' : entity.name}
                  </text>
                )}

                {/* Distance from selected */}
                {distInfo && selectedEntity && (
                  <text
                    x={entity.x} y={entity.y - 5} textAnchor="middle" fontSize="2"
                    fill="hsl(var(--primary))" className="select-none pointer-events-none"
                  >
                    {distInfo.gridDistance}u {distInfo.direction !== 'level' ? `(${distInfo.direction})` : ''}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="px-3 py-2 border-t border-border flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" /> Player
        </span>
        <span className="flex items-center gap-1">
          <span className="w-0 h-0 inline-block" style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '7px solid hsl(var(--destructive))' }} /> Opponent
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-accent inline-block" /> Construct
        </span>
        <span className="flex items-center gap-1">
          <AlertTriangle className="w-2.5 h-2.5 text-amber-400" /> Hazard
        </span>
        {hasZones && (
          <>
            <span className="flex items-center gap-1">
              <Shield className="w-2.5 h-2.5 text-emerald-400" /> Safe
            </span>
            <span className="flex items-center gap-1">
              <Flame className="w-2.5 h-2.5 text-destructive" /> Danger
            </span>
          </>
        )}
      </div>

      {/* Selected entity info */}
      {selectedEntity && !selectedZone && (
        <div className="px-3 py-2 border-t border-border bg-muted/30 text-xs text-foreground">
          <span className="font-semibold">{selectedEntity.name}</span>
          {selectedEntity.zoneId && data.zones && (
            <span className="text-muted-foreground ml-2">
              Zone: {data.zones.find(z => z.id === selectedEntity.zoneId)?.label || selectedEntity.zoneId}
            </span>
          )}
          <span className="text-muted-foreground ml-2">
            ({Math.round(selectedEntity.x)}, {Math.round(selectedEntity.y)})
          </span>
          <span className="text-muted-foreground/60 ml-2 text-[10px]">
            Tap another to measure
          </span>
        </div>
      )}

      {/* Tactical Focus Panel */}
      {selectedZone && focusMode && (
        <TacticalFocusPanel
          zone={selectedZone}
          nearbyEntities={focusedZoneEntities.map(e => ({ name: e.name, type: e.type }))}
          onClose={() => setSelectedZone(null)}
        />
      )}

      {/* Zone info (non-focus mode) */}
      {selectedZone && !focusMode && (
        <div className="px-3 py-2 border-t border-border bg-muted/30 text-xs text-foreground">
          <span className="font-semibold">{selectedZone.label}</span>
          <Badge variant="outline" className={`text-[9px] ml-2 ${
            selectedZone.threatLevel === 'safe' ? 'border-emerald-500/30 text-emerald-400' :
            selectedZone.threatLevel === 'critical' || selectedZone.threatLevel === 'imminent' ? 'border-red-500/30 text-red-400' :
            'border-amber-500/30 text-amber-400'
          }`}>
            {selectedZone.threatLevel}
          </Badge>
          <span className="text-muted-foreground ml-2">
            {selectedZone.elevation} • {selectedZone.stability}% stable
          </span>
          <span className="text-muted-foreground/60 ml-2 text-[10px]">
            Enable Focus Mode for details
          </span>
        </div>
      )}
    </div>
  );
}
