/**
 * Narrator Marker System
 *
 * Temporary battlefield markers placed by the narrator system to
 * highlight events, threats, and points of interest on the tactical map.
 */

// ── Types ───────────────────────────────────────────────────────

export type MarkerType =
  | 'movement_detected'
  | 'energy_surge'
  | 'collapse_likely'
  | 'unknown_disturbance'
  | 'fire_spread'
  | 'structural_break'
  | 'incoming_attack'
  | 'opportunity'
  | 'discovery';

export interface NarratorMarker {
  id: string;
  type: MarkerType;
  label: string;
  x: number;
  y: number;
  /** Zone ID this marker belongs to, if any */
  zoneId?: string;
  /** Timestamp when created */
  createdAt: number;
  /** Duration in ms before auto-removal (default 8000) */
  duration: number;
  /** Whether this marker is still relevant */
  active: boolean;
  /** Urgency affects visual treatment */
  urgency: 'low' | 'medium' | 'high';
}

// ── Cinematic Situation Frame ───────────────────────────────────

export interface CinematicFrame {
  id: string;
  title: string;
  description: string;
  /** Zone to highlight */
  zoneId?: string;
  /** Entity to highlight */
  entityId?: string;
  /** Timestamp created */
  createdAt: number;
  /** Show duration ms (default 3000) */
  duration: number;
  /** Visual emphasis type */
  emphasis: 'impact' | 'danger' | 'shift' | 'reveal';
}

// ── Predictive Movement Shadow ──────────────────────────────────

export interface MovementShadow {
  entityId: string;
  /** Projected position */
  projectedX: number;
  projectedY: number;
  /** Target zone ID if zone-based */
  targetZoneId?: string;
  /** Opacity 0-0.4 */
  opacity: number;
  /** Timestamp */
  createdAt: number;
  /** Auto-remove after ms */
  duration: number;
}

// ── Factory Functions ───────────────────────────────────────────

const MARKER_LABELS: Record<MarkerType, string> = {
  movement_detected: 'Movement Detected',
  energy_surge: 'Energy Surge',
  collapse_likely: 'Collapse Likely',
  unknown_disturbance: 'Unknown Disturbance',
  fire_spread: 'Active Fire Spread',
  structural_break: 'Structural Break',
  incoming_attack: 'Incoming!',
  opportunity: 'Opportunity',
  discovery: 'Discovery',
};

const MARKER_ICONS: Record<MarkerType, string> = {
  movement_detected: '👁',
  energy_surge: '⚡',
  collapse_likely: '⚠',
  unknown_disturbance: '❓',
  fire_spread: '🔥',
  structural_break: '💥',
  incoming_attack: '🎯',
  opportunity: '✨',
  discovery: '🔍',
};

export function createMarker(
  type: MarkerType,
  x: number, y: number,
  opts?: { zoneId?: string; urgency?: 'low' | 'medium' | 'high'; duration?: number },
): NarratorMarker {
  return {
    id: `marker-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    label: MARKER_LABELS[type],
    x, y,
    zoneId: opts?.zoneId,
    createdAt: Date.now(),
    duration: opts?.duration ?? 8000,
    active: true,
    urgency: opts?.urgency ?? 'medium',
  };
}

export function getMarkerIcon(type: MarkerType): string {
  return MARKER_ICONS[type];
}

export function getMarkerColor(urgency: NarratorMarker['urgency']): string {
  const colors = {
    low: 'hsla(200, 60%, 55%, 0.6)',
    medium: 'hsla(45, 70%, 55%, 0.7)',
    high: 'hsla(0, 70%, 55%, 0.8)',
  };
  return colors[urgency];
}

export function createCinematicFrame(
  title: string, description: string,
  emphasis: CinematicFrame['emphasis'],
  opts?: { zoneId?: string; entityId?: string; duration?: number },
): CinematicFrame {
  return {
    id: `cine-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title, description,
    zoneId: opts?.zoneId,
    entityId: opts?.entityId,
    createdAt: Date.now(),
    duration: opts?.duration ?? 3000,
    emphasis,
  };
}

export function createMovementShadow(
  entityId: string,
  projectedX: number, projectedY: number,
  targetZoneId?: string,
): MovementShadow {
  return {
    entityId,
    projectedX, projectedY,
    targetZoneId,
    opacity: 0.25,
    createdAt: Date.now(),
    duration: 4000,
  };
}

/** Filter out expired markers */
export function pruneMarkers(markers: NarratorMarker[]): NarratorMarker[] {
  const now = Date.now();
  return markers.filter(m => m.active && (now - m.createdAt) < m.duration);
}

export function pruneCinematicFrames(frames: CinematicFrame[]): CinematicFrame[] {
  const now = Date.now();
  return frames.filter(f => (now - f.createdAt) < f.duration);
}

export function pruneMovementShadows(shadows: MovementShadow[]): MovementShadow[] {
  const now = Date.now();
  return shadows.filter(s => (now - s.createdAt) < s.duration);
}

// ── Narrator Event → Marker Mapping ─────────────────────────────

/** Auto-generate markers from arena condition changes */
export function generateMarkersFromConditions(
  conditionTags: string[],
  zones: Array<{ id: string; x: number; y: number; tactical: { isUnstable?: boolean; fireSpread?: boolean } }>,
): NarratorMarker[] {
  const markers: NarratorMarker[] = [];

  for (const tag of conditionTags) {
    if (tag === 'structural_damage') {
      const unstable = zones.filter(z => z.tactical.isUnstable);
      for (const z of unstable.slice(0, 2)) {
        markers.push(createMarker('collapse_likely', z.x, z.y, { zoneId: z.id, urgency: 'high' }));
      }
    }
    if (tag === 'burning') {
      const burnable = zones.filter(z => z.tactical.fireSpread);
      for (const z of burnable.slice(0, 2)) {
        markers.push(createMarker('fire_spread', z.x, z.y, { zoneId: z.id, urgency: 'medium' }));
      }
    }
    if (tag === 'seismic_activity') {
      markers.push(createMarker('unknown_disturbance', 50, 50, { urgency: 'high' }));
    }
    if (tag === 'explosive_damage') {
      markers.push(createMarker('structural_break', 50, 50, { urgency: 'high' }));
    }
    if (tag === 'spatial_distortion') {
      markers.push(createMarker('energy_surge', 50, 50, { urgency: 'high' }));
    }
  }

  return markers;
}
