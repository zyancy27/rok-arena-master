/**
 * Tactical Zone System
 *
 * Zones represent logical battle spaces rather than exact coordinates.
 * Each zone has tactical properties that influence combat mechanics,
 * movement, and narrator descriptions.
 */

import type { ArenaState } from '@/lib/living-arena';

// ── Zone Types ──────────────────────────────────────────────────

export type ElevationLevel = 'underground' | 'ground' | 'elevated' | 'high' | 'aerial';
export type ThreatLevel = 'safe' | 'caution' | 'unsafe' | 'critical' | 'imminent';
export type ZoneVisibility = 'clear' | 'partial' | 'obscured' | 'hidden';

export interface ZoneTacticalProperties {
  hasCover: boolean;
  isUnstable: boolean;
  isHighGround: boolean;
  difficultFooting: boolean;
  fireSpread: boolean;
  flooding: boolean;
  poorVisibility: boolean;
  narrowMovement: boolean;
  destructibleTerrain: boolean;
  electricHazard: boolean;
  toxicGas: boolean;
}

export interface BattlefieldZone {
  id: string;
  label: string;
  description: string;
  /** Grid position for map layout (0-100) */
  x: number;
  y: number;
  /** Zone size on map */
  width: number;
  height: number;
  elevation: ElevationLevel;
  threatLevel: ThreatLevel;
  visibility: ZoneVisibility;
  tactical: ZoneTacticalProperties;
  /** Entity IDs currently in this zone */
  occupants: string[];
  /** Hazard IDs active in this zone */
  activeHazards: string[];
  /** Whether the player has discovered this zone */
  discovered: boolean;
  /** Stability 0-100, affected by arena state */
  stability: number;
  /** Collapse prediction — true means warning shown */
  collapseWarning: boolean;
  /** Zone color hint for rendering */
  colorHint?: string;
}

// ── Zone Generation ─────────────────────────────────────────────

const TERRAIN_ZONE_TEMPLATES: Record<string, Partial<BattlefieldZone>[]> = {
  bridge: [
    { label: 'Bridge Entrance', elevation: 'elevated', tactical: defaultTactical({ hasCover: true }) },
    { label: 'Center Span', elevation: 'elevated', tactical: defaultTactical({ isUnstable: true, narrowMovement: true }) },
    { label: 'Far Side', elevation: 'elevated', tactical: defaultTactical({ hasCover: true }) },
    { label: 'River Below', elevation: 'underground', tactical: defaultTactical({ flooding: true, difficultFooting: true }), colorHint: 'water' },
  ],
  building: [
    { label: 'Rooftop', elevation: 'high', tactical: defaultTactical({ isHighGround: true, hasCover: true }) },
    { label: 'Upper Floor', elevation: 'elevated', tactical: defaultTactical({ hasCover: true, destructibleTerrain: true }) },
    { label: 'Ground Floor', elevation: 'ground', tactical: defaultTactical({ hasCover: true }) },
    { label: 'Basement', elevation: 'underground', tactical: defaultTactical({ narrowMovement: true, poorVisibility: true }) },
  ],
  forest: [
    { label: 'Dense Treeline', elevation: 'ground', tactical: defaultTactical({ hasCover: true, poorVisibility: true, difficultFooting: true }) },
    { label: 'Clearing', elevation: 'ground', tactical: defaultTactical({}) },
    { label: 'Canopy', elevation: 'high', tactical: defaultTactical({ isHighGround: true, narrowMovement: true }) },
  ],
  vehicle: [
    { label: 'Vehicle Pileup', elevation: 'ground', tactical: defaultTactical({ hasCover: true, destructibleTerrain: true }) },
    { label: 'Open Road', elevation: 'ground', tactical: defaultTactical({}) },
  ],
  water: [
    { label: 'Shoreline', elevation: 'ground', tactical: defaultTactical({ difficultFooting: true }) },
    { label: 'Shallows', elevation: 'ground', tactical: defaultTactical({ flooding: true, difficultFooting: true }), colorHint: 'water' },
    { label: 'Deep Water', elevation: 'underground', tactical: defaultTactical({ flooding: true, poorVisibility: true }), colorHint: 'water' },
  ],
  platform: [
    { label: 'Upper Platform', elevation: 'elevated', tactical: defaultTactical({ isHighGround: true }) },
    { label: 'Lower Level', elevation: 'ground', tactical: defaultTactical({}) },
  ],
  crater: [
    { label: 'Crater Rim', elevation: 'elevated', tactical: defaultTactical({ isHighGround: true, isUnstable: true }) },
    { label: 'Crater Floor', elevation: 'underground', tactical: defaultTactical({ difficultFooting: true }) },
  ],
  ruins: [
    { label: 'Standing Walls', elevation: 'ground', tactical: defaultTactical({ hasCover: true, destructibleTerrain: true, isUnstable: true }) },
    { label: 'Open Rubble', elevation: 'ground', tactical: defaultTactical({ difficultFooting: true }) },
    { label: 'Collapsed Section', elevation: 'underground', tactical: defaultTactical({ narrowMovement: true, poorVisibility: true }) },
  ],
  reactor: [
    { label: 'Control Room', elevation: 'elevated', tactical: defaultTactical({ hasCover: true }) },
    { label: 'Reactor Core', elevation: 'ground', tactical: defaultTactical({ electricHazard: true, isUnstable: true }), colorHint: 'hazard' },
    { label: 'Cooling Vents', elevation: 'ground', tactical: defaultTactical({ toxicGas: true, poorVisibility: true }) },
  ],
  volcanic: [
    { label: 'Lava Ledge', elevation: 'elevated', tactical: defaultTactical({ isHighGround: true, fireSpread: true, isUnstable: true }) },
    { label: 'Ash Field', elevation: 'ground', tactical: defaultTactical({ poorVisibility: true, difficultFooting: true }) },
    { label: 'Stable Plateau', elevation: 'ground', tactical: defaultTactical({ hasCover: true }) },
  ],
  // ── Extended templates ────────────────────────────────────────
  industrial: [
    { label: 'Main Floor', elevation: 'ground', tactical: defaultTactical({ hasCover: true, destructibleTerrain: true }) },
    { label: 'Catwalk', elevation: 'elevated', tactical: defaultTactical({ isHighGround: true, narrowMovement: true, isUnstable: true }) },
    { label: 'Storage Bay', elevation: 'ground', tactical: defaultTactical({ hasCover: true }) },
    { label: 'Machine Room', elevation: 'ground', tactical: defaultTactical({ electricHazard: true, poorVisibility: true }) },
  ],
  dam: [
    { label: 'Turbine Platform', elevation: 'elevated', tactical: defaultTactical({ isHighGround: true, electricHazard: true, isUnstable: true }) },
    { label: 'Maintenance Catwalk', elevation: 'high', tactical: defaultTactical({ narrowMovement: true, isHighGround: true }) },
    { label: 'Dam Wall', elevation: 'elevated', tactical: defaultTactical({ hasCover: true, destructibleTerrain: true }) },
    { label: 'Water Intake', elevation: 'underground', tactical: defaultTactical({ flooding: true, difficultFooting: true, poorVisibility: true }), colorHint: 'water' },
    { label: 'Generator Hall', elevation: 'ground', tactical: defaultTactical({ hasCover: true, electricHazard: true }) },
  ],
  mall: [
    { label: 'Atrium', elevation: 'ground', tactical: defaultTactical({ destructibleTerrain: true }) },
    { label: 'Upper Gallery', elevation: 'elevated', tactical: defaultTactical({ isHighGround: true, hasCover: true }) },
    { label: 'Escalator Zone', elevation: 'ground', tactical: defaultTactical({ narrowMovement: true, isUnstable: true }) },
    { label: 'Shop Front', elevation: 'ground', tactical: defaultTactical({ hasCover: true, destructibleTerrain: true }) },
    { label: 'Parking Level', elevation: 'underground', tactical: defaultTactical({ poorVisibility: true, hasCover: true }) },
  ],
  cave: [
    { label: 'Cavern Mouth', elevation: 'ground', tactical: defaultTactical({ hasCover: true }) },
    { label: 'Deep Chamber', elevation: 'underground', tactical: defaultTactical({ poorVisibility: true, difficultFooting: true }) },
    { label: 'Ledge', elevation: 'elevated', tactical: defaultTactical({ isHighGround: true, narrowMovement: true }) },
  ],
  urban: [
    { label: 'Rooftop', elevation: 'high', tactical: defaultTactical({ isHighGround: true }) },
    { label: 'Street Level', elevation: 'ground', tactical: defaultTactical({ hasCover: true, destructibleTerrain: true }) },
    { label: 'Alley', elevation: 'ground', tactical: defaultTactical({ narrowMovement: true, hasCover: true, poorVisibility: true }) },
    { label: 'Overpass', elevation: 'elevated', tactical: defaultTactical({ isHighGround: true, isUnstable: true }) },
  ],
  facility: [
    { label: 'Lab Floor', elevation: 'ground', tactical: defaultTactical({ hasCover: true }) },
    { label: 'Observation Deck', elevation: 'elevated', tactical: defaultTactical({ isHighGround: true }) },
    { label: 'Server Room', elevation: 'ground', tactical: defaultTactical({ electricHazard: true, narrowMovement: true }) },
    { label: 'Loading Dock', elevation: 'ground', tactical: defaultTactical({ hasCover: true, destructibleTerrain: true }) },
  ],
  airship: [
    { label: 'Main Deck', elevation: 'high', tactical: defaultTactical({ isHighGround: true }) },
    { label: 'Cargo Hold', elevation: 'ground', tactical: defaultTactical({ hasCover: true, narrowMovement: true }) },
    { label: 'Engine Room', elevation: 'ground', tactical: defaultTactical({ electricHazard: true, isUnstable: true }) },
    { label: 'Observation Bow', elevation: 'high', tactical: defaultTactical({ isHighGround: true }) },
  ],
  descent: [
    { label: 'Upper Level', elevation: 'high', tactical: defaultTactical({ isHighGround: true }) },
    { label: 'Mid Drop', elevation: 'elevated', tactical: defaultTactical({ isUnstable: true, narrowMovement: true }) },
    { label: 'Lower Landing', elevation: 'ground', tactical: defaultTactical({ difficultFooting: true }) },
    { label: 'Freefall Zone', elevation: 'aerial', tactical: defaultTactical({ isUnstable: true }) },
  ],
};

function defaultTactical(overrides: Partial<ZoneTacticalProperties> = {}): ZoneTacticalProperties {
  return {
    hasCover: false,
    isUnstable: false,
    isHighGround: false,
    difficultFooting: false,
    fireSpread: false,
    flooding: false,
    poorVisibility: false,
    narrowMovement: false,
    destructibleTerrain: false,
    electricHazard: false,
    toxicGas: false,
    ...overrides,
  };
}

/** Generate a default open zone when no terrain matches */
function generateDefaultZones(): BattlefieldZone[] {
  return [
    createZone('zone-center', 'Center', 'The main area of engagement.', 50, 50, 30, 30, 'ground'),
    createZone('zone-north', 'North Side', 'The far end of the arena.', 50, 15, 25, 20, 'ground'),
    createZone('zone-south', 'South Side', 'Near the entry point.', 50, 85, 25, 20, 'ground'),
    createZone('zone-east', 'East Flank', 'Right side approach.', 85, 50, 20, 25, 'ground'),
    createZone('zone-west', 'West Flank', 'Left side approach.', 15, 50, 20, 25, 'ground'),
  ];
}

function createZone(
  id: string, label: string, description: string,
  x: number, y: number, width: number, height: number,
  elevation: ElevationLevel,
  tactical?: ZoneTacticalProperties,
  colorHint?: string,
): BattlefieldZone {
  return {
    id, label, description, x, y, width, height, elevation,
    threatLevel: 'safe',
    visibility: 'clear',
    tactical: tactical ?? defaultTactical(),
    occupants: [],
    activeHazards: [],
    discovered: true,
    stability: 100,
    collapseWarning: false,
    colorHint,
  };
}

/** Generate zones from terrain tags */
export function generateZones(terrainTags: string[], locationName?: string | null): BattlefieldZone[] {
  const zones: BattlefieldZone[] = [];
  const matched = new Set<string>();

  for (const tag of terrainTags) {
    const norm = tag.toLowerCase();
    for (const [key, templates] of Object.entries(TERRAIN_ZONE_TEMPLATES)) {
      if (norm.includes(key) && !matched.has(key)) {
        matched.add(key);
        templates.forEach((t, i) => {
          const angle = (i / templates.length) * Math.PI * 2;
          const radius = 28 + Math.random() * 8;
          const cx = 50 + Math.cos(angle) * radius;
          const cy = 50 + Math.sin(angle) * radius;
          zones.push(createZone(
            `zone-${key}-${i}`, t.label || key, `Part of the ${locationName || 'battlefield'}.`,
            cx, cy, 18 + Math.random() * 8, 14 + Math.random() * 6,
            t.elevation || 'ground', t.tactical, t.colorHint,
          ));
        });
        break;
      }
    }
  }

  if (zones.length === 0) return generateDefaultZones();

  // Always add a center engagement zone if not already present
  if (!zones.find(z => z.label.toLowerCase().includes('center'))) {
    zones.push(createZone('zone-center', 'Center', 'Primary engagement area.', 50, 50, 22, 18, 'ground'));
  }

  return zones;
}

// ── Zone State Updates ──────────────────────────────────────────

export function updateZoneThreatLevel(zone: BattlefieldZone, arenaState?: ArenaState): ThreatLevel {
  let threat: ThreatLevel = 'safe';

  if (zone.activeHazards.length > 0) threat = 'caution';
  if (zone.tactical.fireSpread || zone.tactical.electricHazard || zone.tactical.flooding) threat = 'unsafe';
  if (zone.stability < 30) threat = 'critical';
  if (zone.stability < 15 || zone.collapseWarning) threat = 'imminent';

  if (arenaState) {
    if (arenaState.isCritical && zone.tactical.isUnstable) threat = 'imminent';
    else if (arenaState.hazardLevel > 60 && zone.tactical.destructibleTerrain) {
      threat = threat === 'safe' ? 'caution' : threat;
    }
  }

  return threat;
}

export function updateZonesFromArenaState(zones: BattlefieldZone[], arenaState: ArenaState): BattlefieldZone[] {
  return zones.map(zone => {
    let stability = zone.stability;

    // Arena instability affects unstable zones more
    if (zone.tactical.isUnstable) {
      stability = Math.min(stability, arenaState.stability - 10);
    } else {
      stability = Math.min(stability, arenaState.stability + 10);
    }
    stability = Math.max(0, Math.min(100, stability));

    // Add condition-based tactical updates
    const tactical = { ...zone.tactical };
    if (arenaState.conditionTags.includes('burning') && zone.tactical.destructibleTerrain) {
      tactical.fireSpread = true;
    }
    if (arenaState.conditionTags.includes('flooding')) {
      if (zone.elevation === 'underground' || zone.elevation === 'ground') {
        tactical.flooding = true;
      }
    }
    if (arenaState.conditionTags.includes('structural_damage') && zone.tactical.isUnstable) {
      tactical.destructibleTerrain = true;
    }

    const collapseWarning = stability < 25 && zone.tactical.isUnstable;
    const threatLevel = updateZoneThreatLevel({ ...zone, stability, tactical, collapseWarning }, arenaState);

    return { ...zone, stability, tactical, collapseWarning, threatLevel };
  });
}

// ── Zone Tactical Queries ───────────────────────────────────────

export function getZoneConnections(zones: BattlefieldZone[], zoneId: string): BattlefieldZone[] {
  const zone = zones.find(z => z.id === zoneId);
  if (!zone) return [];
  return zones.filter(z => {
    if (z.id === zoneId) return false;
    const dx = Math.abs(z.x - zone.x);
    const dy = Math.abs(z.y - zone.y);
    return dx < 40 && dy < 40;
  });
}

export function getElevationDifference(from: ElevationLevel, to: ElevationLevel): number {
  const levels: Record<ElevationLevel, number> = { underground: -1, ground: 0, elevated: 1, high: 2, aerial: 3 };
  return levels[to] - levels[from];
}

export function hasLineOfSight(from: BattlefieldZone, to: BattlefieldZone, allZones: BattlefieldZone[]): 'clear' | 'partial' | 'blocked' {
  if (from.id === to.id) return 'clear';

  // Elevation advantage always gives clear LOS downward
  const elevDiff = getElevationDifference(from.elevation, to.elevation);
  if (elevDiff < -1) return 'clear'; // Looking down from high

  // Check for blocking zones between
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  let blocked = false;
  let partial = false;

  for (const z of allZones) {
    if (z.id === from.id || z.id === to.id) continue;
    // Check if zone is roughly between from and to
    const t = ((z.x - from.x) * dx + (z.y - from.y) * dy) / (dist * dist);
    if (t < 0.1 || t > 0.9) continue;
    const projX = from.x + t * dx;
    const projY = from.y + t * dy;
    const perpDist = Math.sqrt((z.x - projX) ** 2 + (z.y - projY) ** 2);
    if (perpDist < z.width / 2) {
      if (z.tactical.hasCover || z.elevation === 'high') blocked = true;
      else partial = true;
    }
  }

  if (from.visibility === 'obscured' || to.visibility === 'obscured') partial = true;
  if (from.visibility === 'hidden' || to.visibility === 'hidden') blocked = true;

  if (blocked) return 'blocked';
  if (partial) return 'partial';
  return 'clear';
}

/** Get tactical property summary for narrator context */
export function getZoneNarratorContext(zone: BattlefieldZone): string {
  const props: string[] = [];
  if (zone.tactical.hasCover) props.push('cover available');
  if (zone.tactical.isHighGround) props.push('high ground advantage');
  if (zone.tactical.isUnstable) props.push('structurally unstable');
  if (zone.tactical.difficultFooting) props.push('difficult terrain');
  if (zone.tactical.fireSpread) props.push('fire hazard');
  if (zone.tactical.flooding) props.push('flooding');
  if (zone.tactical.poorVisibility) props.push('poor visibility');
  if (zone.tactical.narrowMovement) props.push('restricted movement');
  if (zone.tactical.electricHazard) props.push('electric hazard');
  if (zone.tactical.toxicGas) props.push('toxic atmosphere');
  if (zone.collapseWarning) props.push('⚠ COLLAPSE IMMINENT');
  return props.length ? `[${zone.label}]: ${props.join(', ')}` : '';
}

/** Get advantage/disadvantage description */
export function getZoneAdvantage(zone: BattlefieldZone): { label: string; type: 'advantage' | 'disadvantage' | 'neutral' } {
  if (zone.threatLevel === 'imminent') return { label: 'Imminent Collapse', type: 'disadvantage' };
  if (zone.tactical.isHighGround && zone.tactical.hasCover) return { label: 'Fortified Position', type: 'advantage' };
  if (zone.tactical.isHighGround) return { label: 'High Ground', type: 'advantage' };
  if (zone.tactical.hasCover) return { label: 'Cover Available', type: 'advantage' };
  if (zone.tactical.fireSpread || zone.tactical.electricHazard) return { label: 'Active Hazard', type: 'disadvantage' };
  if (zone.tactical.flooding) return { label: 'Flooded', type: 'disadvantage' };
  if (zone.tactical.difficultFooting) return { label: 'Difficult Terrain', type: 'disadvantage' };
  return { label: 'Open Ground', type: 'neutral' };
}
