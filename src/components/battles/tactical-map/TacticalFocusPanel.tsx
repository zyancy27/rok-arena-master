/**
 * Tactical Focus Panel
 * Expanded detail panel for a selected zone.
 */

import { memo } from 'react';
import { X, Shield, AlertTriangle, Eye, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { BattlefieldZone } from '@/lib/tactical-zones';
import { getZoneAdvantage } from '@/lib/tactical-zones';

interface TacticalFocusPanelProps {
  zone: BattlefieldZone;
  nearbyEntities: Array<{ name: string; type: string }>;
  onClose: () => void;
}

const ELEVATION_LABELS: Record<string, { label: string; icon: typeof ArrowUp }> = {
  underground: { label: 'Underground', icon: ArrowDown },
  ground: { label: 'Ground Level', icon: Minus },
  elevated: { label: 'Elevated', icon: ArrowUp },
  high: { label: 'High Ground', icon: ArrowUp },
  aerial: { label: 'Aerial', icon: ArrowUp },
};

function TacticalFocusPanelInner({ zone, nearbyEntities, onClose }: TacticalFocusPanelProps) {
  const advantage = getZoneAdvantage(zone);
  const elev = ELEVATION_LABELS[zone.elevation] || ELEVATION_LABELS.ground;
  const ElevIcon = elev.icon;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-3 space-y-2 animate-in slide-in-from-bottom-4 duration-200 z-10">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{zone.label}</span>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-muted">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {/* Threat level */}
        <Badge variant="outline" className={`text-[10px] ${
          zone.threatLevel === 'safe' ? 'border-emerald-500/40 text-emerald-400' :
          zone.threatLevel === 'caution' ? 'border-amber-500/40 text-amber-400' :
          zone.threatLevel === 'unsafe' ? 'border-orange-500/40 text-orange-400' :
          'border-red-500/40 text-red-400'
        }`}>
          {zone.threatLevel === 'safe' ? <Shield className="w-2.5 h-2.5 mr-1" /> : <AlertTriangle className="w-2.5 h-2.5 mr-1" />}
          {zone.threatLevel.charAt(0).toUpperCase() + zone.threatLevel.slice(1)}
        </Badge>

        {/* Elevation */}
        <Badge variant="outline" className="text-[10px]">
          <ElevIcon className="w-2.5 h-2.5 mr-1" />
          {elev.label}
        </Badge>

        {/* Advantage */}
        <Badge variant="outline" className={`text-[10px] ${
          advantage.type === 'advantage' ? 'border-emerald-500/40 text-emerald-400' :
          advantage.type === 'disadvantage' ? 'border-red-500/40 text-red-400' :
          ''
        }`}>
          {advantage.label}
        </Badge>

        {/* Stability */}
        <Badge variant="outline" className="text-[10px]">
          Stability: {zone.stability}%
        </Badge>

        {/* Visibility */}
        <Badge variant="outline" className="text-[10px]">
          <Eye className="w-2.5 h-2.5 mr-1" />
          {zone.visibility}
        </Badge>
      </div>

      {/* Tactical properties */}
      <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
        {zone.tactical.hasCover && <span className="px-1.5 py-0.5 bg-muted rounded">🛡 Cover</span>}
        {zone.tactical.isHighGround && <span className="px-1.5 py-0.5 bg-muted rounded">⬆ High Ground</span>}
        {zone.tactical.difficultFooting && <span className="px-1.5 py-0.5 bg-muted rounded">⚡ Difficult</span>}
        {zone.tactical.fireSpread && <span className="px-1.5 py-0.5 bg-muted rounded">🔥 Fire</span>}
        {zone.tactical.flooding && <span className="px-1.5 py-0.5 bg-muted rounded">💧 Flooded</span>}
        {zone.tactical.poorVisibility && <span className="px-1.5 py-0.5 bg-muted rounded">🌫 Poor Vis</span>}
        {zone.tactical.narrowMovement && <span className="px-1.5 py-0.5 bg-muted rounded">↔ Narrow</span>}
        {zone.tactical.destructibleTerrain && <span className="px-1.5 py-0.5 bg-muted rounded">💥 Breakable</span>}
        {zone.tactical.electricHazard && <span className="px-1.5 py-0.5 bg-muted rounded">⚡ Electric</span>}
        {zone.tactical.toxicGas && <span className="px-1.5 py-0.5 bg-muted rounded">☠ Toxic</span>}
      </div>

      {/* Nearby entities */}
      {nearbyEntities.length > 0 && (
        <div className="text-[10px] text-muted-foreground">
          <span className="font-medium">Present: </span>
          {nearbyEntities.map(e => e.name).join(', ')}
        </div>
      )}

      {/* Collapse warning */}
      {zone.collapseWarning && (
        <div className="text-[10px] text-red-400 font-medium flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          ⚠ COLLAPSE WARNING — This zone may give way at any moment
        </div>
      )}
    </div>
  );
}

export const TacticalFocusPanel = memo(TacticalFocusPanelInner);
