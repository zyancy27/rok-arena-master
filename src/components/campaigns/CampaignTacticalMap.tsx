/**
 * CampaignTacticalMap — Narrator-driven tactical map for campaign mode.
 * 
 * Receives sceneMap data from narrator responses and renders it as a
 * 2D SVG tactical overview or 3D view. Updates every narrator turn.
 */

import { useState, useMemo, lazy, Suspense } from 'react';
import { X, Map, Box, Grid3X3, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const TacticalMap3D = lazy(() =>
  import('@/components/battles/tactical-map/TacticalMap3D').then(m => ({ default: m.TacticalMap3D }))
);

// ── Types ──────────────────────────────────────────────

export interface NarratorSceneMap {
  locationLabel: string;
  zones: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    terrain: string;
    elevation?: string | null;
    description?: string;
  }>;
  entities: Array<{
    id: string;
    name: string;
    type: 'player' | 'enemy' | 'npc' | 'object';
    zoneId: string;
    color?: string;
  }>;
  hazards: Array<{
    id: string;
    label: string;
    type: string;
    zoneId: string;
    radius: number;
  }>;
  features: Array<{
    id: string;
    label: string;
    type: string;
    zoneId: string;
  }>;
}

interface CampaignTacticalMapProps {
  sceneMap: NarratorSceneMap;
  onClose: () => void;
}

// ── Color maps ──────────────────────────────────────────

const TERRAIN_COLORS: Record<string, string> = {
  open: 'hsl(var(--muted))',
  cover: 'hsl(var(--accent))',
  hazard: 'hsla(0, 70%, 50%, 0.25)',
  water: 'hsla(200, 70%, 50%, 0.25)',
  elevation: 'hsla(30, 50%, 50%, 0.25)',
  structure: 'hsla(220, 30%, 50%, 0.3)',
  vegetation: 'hsla(130, 50%, 40%, 0.25)',
};

const ENTITY_TYPE_COLORS: Record<string, string> = {
  player: '#3b82f6',
  enemy: '#ef4444',
  npc: '#f59e0b',
  object: '#8b5cf6',
};

const HAZARD_TYPE_COLORS: Record<string, string> = {
  fire: 'hsla(15, 90%, 55%, 0.4)',
  electric: 'hsla(50, 95%, 60%, 0.35)',
  flood: 'hsla(200, 80%, 55%, 0.35)',
  collapse: 'hsla(30, 60%, 45%, 0.35)',
  debris: 'hsla(25, 50%, 40%, 0.3)',
  ice: 'hsla(195, 80%, 70%, 0.35)',
  generic: 'hsla(0, 70%, 50%, 0.3)',
};

export default function CampaignTacticalMap({ sceneMap, onClose }: CampaignTacticalMapProps) {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  // Convert narrator sceneMap zones to positioned entities for 3D
  const tacticalMapData = useMemo(() => {
    if (!sceneMap) return null;

    // Position entities within their zones
    const positionedEntities = sceneMap.entities.map((e, i) => {
      const zone = sceneMap.zones.find(z => z.id === e.zoneId);
      if (!zone) {
        return { ...e, x: 50, y: 50, zoneId: e.zoneId };
      }
      // Spread entities within zone with jitter
      const entitiesInZone = sceneMap.entities.filter(ent => ent.zoneId === e.zoneId);
      const idx = entitiesInZone.indexOf(e);
      const jitterX = (idx - (entitiesInZone.length - 1) / 2) * 4;
      const jitterY = (Math.random() - 0.5) * 4;
      return {
        ...e,
        x: zone.x + jitterX,
        y: zone.y + jitterY,
      };
    });

    return {
      entities: positionedEntities.map(e => ({
        id: e.id,
        name: e.name,
        type: e.type === 'npc' ? 'construct' as const : e.type === 'object' ? 'construct' as const : e.type as 'player' | 'enemy' | 'construct',
        x: e.x,
        y: e.y,
        color: e.color || ENTITY_TYPE_COLORS[e.type],
        zoneId: e.zoneId,
      })),
      features: sceneMap.features.map(f => {
        const zone = sceneMap.zones.find(z => z.id === f.zoneId);
        return {
          id: f.id,
          label: f.label,
          type: f.type as any,
          x: zone ? zone.x + (Math.random() - 0.5) * 8 : 50,
          y: zone ? zone.y + (Math.random() - 0.5) * 8 : 50,
          width: 8,
          height: 6,
        };
      }),
      hazards: sceneMap.hazards.map(h => {
        const zone = sceneMap.zones.find(z => z.id === h.zoneId);
        return {
          id: h.id,
          label: h.label,
          type: h.type as any,
          x: zone ? zone.x : 50,
          y: zone ? zone.y : 50,
          radius: h.radius,
        };
      }),
      arenaName: sceneMap.locationLabel,
      zones: sceneMap.zones.map(z => ({
        id: z.id,
        label: z.label,
        x: z.x,
        y: z.y,
        width: z.width,
        height: z.height,
        terrain: z.terrain as any,
        elevation: z.elevation as any,
        cover: z.terrain === 'cover' ? 'partial' as const : 'none' as const,
        visibility: 'clear' as const,
        stability: 100,
        occupants: sceneMap.entities.filter(e => e.zoneId === z.id).map(e => e.id),
        connections: [],
      })),
    };
  }, [sceneMap]);

  if (!sceneMap || !tacticalMapData) return null;

  return (
    <div className="relative bg-background/95 border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold truncate">{sceneMap.locationLabel}</span>
          <Badge variant="outline" className="text-[10px]">
            {sceneMap.zones.length} zones · {sceneMap.entities.length} entities
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === '2d' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode('2d')}
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>2D View</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === '3d' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode('3d')}
                >
                  <Box className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>3D View</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Map viewport */}
      <div className="relative" style={{ height: '280px' }}>
        {viewMode === '2d' ? (
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            style={{ background: 'hsl(var(--background))' }}
          >
            {/* Grid */}
            <defs>
              <pattern id="campaign-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="hsl(var(--border))" strokeWidth="0.15" opacity="0.3" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#campaign-grid)" />

            {/* Zones */}
            {sceneMap.zones.map(zone => {
              const isHovered = hoveredZone === zone.id;
              return (
                <g key={zone.id}>
                  <rect
                    x={zone.x - zone.width / 2}
                    y={zone.y - zone.height / 2}
                    width={zone.width}
                    height={zone.height}
                    fill={TERRAIN_COLORS[zone.terrain] || TERRAIN_COLORS.open}
                    stroke={isHovered ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                    strokeWidth={isHovered ? 0.6 : 0.3}
                    rx={1}
                    opacity={isHovered ? 1 : 0.7}
                    onMouseEnter={() => setHoveredZone(zone.id)}
                    onMouseLeave={() => setHoveredZone(null)}
                    className="cursor-pointer transition-opacity"
                  />
                  <text
                    x={zone.x}
                    y={zone.y - zone.height / 2 + 3}
                    textAnchor="middle"
                    fill="hsl(var(--foreground))"
                    fontSize="2.2"
                    fontWeight="600"
                    opacity={0.8}
                  >
                    {zone.label}
                  </text>
                </g>
              );
            })}

            {/* Hazards */}
            {sceneMap.hazards.map(hazard => {
              const zone = sceneMap.zones.find(z => z.id === hazard.zoneId);
              if (!zone) return null;
              return (
                <circle
                  key={hazard.id}
                  cx={zone.x}
                  cy={zone.y}
                  r={hazard.radius}
                  fill={HAZARD_TYPE_COLORS[hazard.type] || HAZARD_TYPE_COLORS.generic}
                  stroke="none"
                  opacity={0.5}
                >
                  <title>{hazard.label}</title>
                </circle>
              );
            })}

            {/* Features */}
            {sceneMap.features.map(feature => {
              const zone = sceneMap.zones.find(z => z.id === feature.zoneId);
              if (!zone) return null;
              const fx = zone.x + (Math.random() * 6 - 3);
              const fy = zone.y + (Math.random() * 4 - 2);
              return (
                <g key={feature.id}>
                  <rect
                    x={fx - 2}
                    y={fy - 1.5}
                    width={4}
                    height={3}
                    fill="hsl(var(--muted))"
                    stroke="hsl(var(--border))"
                    strokeWidth={0.2}
                    rx={0.5}
                    opacity={0.6}
                  />
                  <text
                    x={fx}
                    y={fy + 0.5}
                    textAnchor="middle"
                    fill="hsl(var(--muted-foreground))"
                    fontSize="1.5"
                  >
                    {feature.label}
                  </text>
                </g>
              );
            })}

            {/* Entities */}
            {tacticalMapData.entities.map(entity => {
              const isSelected = selectedEntityId === entity.id;
              const color = entity.color || ENTITY_TYPE_COLORS[entity.type] || '#888';
              return (
                <g
                  key={entity.id}
                  onClick={() => setSelectedEntityId(isSelected ? null : entity.id)}
                  className="cursor-pointer"
                >
                  {isSelected && (
                    <circle
                      cx={entity.x}
                      cy={entity.y}
                      r={3}
                      fill="none"
                      stroke={color}
                      strokeWidth={0.4}
                      opacity={0.5}
                      strokeDasharray="1 0.5"
                    />
                  )}
                  <circle
                    cx={entity.x}
                    cy={entity.y}
                    r={entity.type === 'player' ? 2 : 1.6}
                    fill={color}
                    stroke="hsl(var(--background))"
                    strokeWidth={0.4}
                  />
                  <text
                    x={entity.x}
                    y={entity.y + 3.5}
                    textAnchor="middle"
                    fill="hsl(var(--foreground))"
                    fontSize="1.8"
                    fontWeight="500"
                  >
                    {entity.name}
                  </text>
                </g>
              );
            })}
          </svg>
        ) : (
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center bg-background">
              <span className="text-xs text-muted-foreground animate-pulse">Loading 3D view...</span>
            </div>
          }>
            <TacticalMap3D
              data={tacticalMapData as any}
              selectedEntityId={selectedEntityId}
              onEntityTap={id => setSelectedEntityId(id === selectedEntityId ? null : id)}
            />
          </Suspense>
        )}
      </div>

      {/* Hovered zone info */}
      {hoveredZone && (
        <div className="absolute bottom-1 left-1 right-1 bg-background/90 border border-border rounded px-2 py-1">
          {(() => {
            const zone = sceneMap.zones.find(z => z.id === hoveredZone);
            if (!zone) return null;
            const entitiesHere = sceneMap.entities.filter(e => e.zoneId === zone.id);
            return (
              <div className="flex items-center gap-2 text-[10px]">
                <span className="font-semibold text-foreground">{zone.label}</span>
                <Badge variant="outline" className="text-[9px] h-4">{zone.terrain}</Badge>
                {zone.elevation && zone.elevation !== 'ground' && (
                  <Badge variant="outline" className="text-[9px] h-4">{zone.elevation}</Badge>
                )}
                {zone.description && (
                  <span className="text-muted-foreground truncate">{zone.description}</span>
                )}
                {entitiesHere.length > 0 && (
                  <span className="text-muted-foreground ml-auto shrink-0">
                    {entitiesHere.map(e => e.name).join(', ')}
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
