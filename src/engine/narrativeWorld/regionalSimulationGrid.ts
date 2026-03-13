/**
 * Regional Simulation Grid
 *
 * Divides the world into independent simulation regions, each tracking
 * its own environment, faction presence, NPC activity, economy, rumors,
 * events, weather, and danger level. When players travel into a region,
 * the narrator pulls data from that specific region.
 */

// ── Types ───────────────────────────────────────────────────────

export interface RegionState {
  regionId: string;
  regionName: string;
  environment: RegionEnvironment;
  factionPresence: FactionPresence[];
  npcActivity: NpcActivityEntry[];
  economy: RegionEconomy;
  rumors: string[];
  ongoingEvents: RegionEvent[];
  weather: string;
  dangerLevel: number; // 0–10
  lastUpdated: number; // timestamp
}

export interface RegionEnvironment {
  terrain: string;
  biome: string;
  lighting: string;
  temperature: string;
  conditions: string[];
  visibility: 'clear' | 'reduced' | 'poor' | 'blind';
}

export interface FactionPresence {
  factionName: string;
  controlLevel: number; // 0–100
  hostility: number; // 0–10
  activity: string;
}

export interface NpcActivityEntry {
  npcName: string;
  activity: string;
  disposition: string;
}

export interface RegionEconomy {
  tradeDemand: 'low' | 'medium' | 'high';
  supplyLevel: 'scarce' | 'normal' | 'abundant';
  priceModifier: number; // 0.5–2.0
  specialGoods: string[];
}

export interface RegionEvent {
  eventId: string;
  description: string;
  severity: number; // 1–10
  daysActive: number;
  evolving: boolean;
  stages: string[];
  currentStage: number;
}

export interface RegionalGrid {
  regions: Map<string, RegionState>;
  playerRegion: string;
  adjacentRegions: string[];
}

// ── Factory ─────────────────────────────────────────────────────

const DEFAULT_REGIONS = [
  'north_forest', 'dam_basin', 'iron_road', 'market_town',
  'mountain_pass', 'river_valley', 'dark_hollow', 'coastal_ruins',
  'ancient_wastes', 'trade_crossing',
];

export function createRegionalGrid(currentZone: string): RegionalGrid {
  const regions = new Map<string, RegionState>();

  for (const regionId of DEFAULT_REGIONS) {
    regions.set(regionId, createDefaultRegion(regionId));
  }

  // If the player's current zone isn't a default, add it
  const normalizedZone = normalizeRegionId(currentZone);
  if (!regions.has(normalizedZone)) {
    regions.set(normalizedZone, createDefaultRegion(normalizedZone, currentZone));
  }

  return {
    regions,
    playerRegion: normalizedZone,
    adjacentRegions: getAdjacentRegions(normalizedZone),
  };
}

function createDefaultRegion(regionId: string, displayName?: string): RegionState {
  return {
    regionId,
    regionName: displayName || regionId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    environment: {
      terrain: 'mixed',
      biome: 'temperate',
      lighting: 'natural',
      temperature: 'mild',
      conditions: [],
      visibility: 'clear',
    },
    factionPresence: [],
    npcActivity: [],
    economy: {
      tradeDemand: 'medium',
      supplyLevel: 'normal',
      priceModifier: 1.0,
      specialGoods: [],
    },
    rumors: [],
    ongoingEvents: [],
    weather: 'clear',
    dangerLevel: 2,
    lastUpdated: Date.now(),
  };
}

function normalizeRegionId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function getAdjacentRegions(regionId: string): string[] {
  // Simple adjacency — in a real system this would be a graph
  const idx = DEFAULT_REGIONS.indexOf(regionId);
  if (idx === -1) return DEFAULT_REGIONS.slice(0, 3);
  const adj: string[] = [];
  if (idx > 0) adj.push(DEFAULT_REGIONS[idx - 1]);
  if (idx < DEFAULT_REGIONS.length - 1) adj.push(DEFAULT_REGIONS[idx + 1]);
  if (DEFAULT_REGIONS.length > 2) {
    adj.push(DEFAULT_REGIONS[(idx + 2) % DEFAULT_REGIONS.length]);
  }
  return adj;
}

// ── Operations ──────────────────────────────────────────────────

/**
 * Update a region's state from world simulation data.
 */
export function updateRegion(
  grid: RegionalGrid,
  regionId: string,
  updates: Partial<RegionState>,
): RegionalGrid {
  const normalized = normalizeRegionId(regionId);
  const existing = grid.regions.get(normalized) || createDefaultRegion(normalized, regionId);
  const updated: RegionState = {
    ...existing,
    ...updates,
    lastUpdated: Date.now(),
  };
  const newRegions = new Map(grid.regions);
  newRegions.set(normalized, updated);
  return { ...grid, regions: newRegions };
}

/**
 * Move the player to a new region.
 */
export function movePlayerToRegion(grid: RegionalGrid, newRegionId: string): RegionalGrid {
  const normalized = normalizeRegionId(newRegionId);
  if (!grid.regions.has(normalized)) {
    const newRegions = new Map(grid.regions);
    newRegions.set(normalized, createDefaultRegion(normalized, newRegionId));
    return {
      regions: newRegions,
      playerRegion: normalized,
      adjacentRegions: getAdjacentRegions(normalized),
    };
  }
  return {
    ...grid,
    playerRegion: normalized,
    adjacentRegions: getAdjacentRegions(normalized),
  };
}

/**
 * Evolve events within a region (called periodically).
 */
export function evolveRegionEvents(region: RegionState): RegionState {
  const evolvedEvents = region.ongoingEvents.map(event => {
    if (!event.evolving) return event;
    if (event.currentStage >= event.stages.length - 1) return event;
    // Progress events that have been active long enough
    const shouldProgress = event.daysActive >= 2 * (event.currentStage + 1);
    if (!shouldProgress) return { ...event, daysActive: event.daysActive + 1 };
    return {
      ...event,
      currentStage: event.currentStage + 1,
      description: event.stages[event.currentStage + 1] || event.description,
      severity: Math.min(10, event.severity + 1),
      daysActive: event.daysActive + 1,
    };
  });

  return { ...region, ongoingEvents: evolvedEvents, lastUpdated: Date.now() };
}

/**
 * Get the player's current region state.
 */
export function getPlayerRegion(grid: RegionalGrid): RegionState | null {
  return grid.regions.get(grid.playerRegion) || null;
}

/**
 * Get states for adjacent regions (for narrator hints about nearby areas).
 */
export function getAdjacentRegionStates(grid: RegionalGrid): RegionState[] {
  return grid.adjacentRegions
    .map(id => grid.regions.get(id))
    .filter((r): r is RegionState => r !== undefined);
}

/**
 * Build narrator context from the player's current region.
 */
export function buildRegionalNarratorContext(grid: RegionalGrid): string {
  const region = getPlayerRegion(grid);
  if (!region) return '';

  const parts: string[] = [];
  parts.push(`CURRENT REGION: ${region.regionName}`);
  parts.push(`Terrain: ${region.environment.terrain}, Biome: ${region.environment.biome}`);
  parts.push(`Weather: ${region.weather}, Visibility: ${region.environment.visibility}`);
  parts.push(`Danger Level: ${region.dangerLevel}/10`);

  if (region.factionPresence.length > 0) {
    const factions = region.factionPresence.map(f =>
      `${f.factionName} (control: ${f.controlLevel}%, hostility: ${f.hostility}/10)`
    ).join('; ');
    parts.push(`Factions: ${factions}`);
  }

  if (region.ongoingEvents.length > 0) {
    parts.push(`Active events: ${region.ongoingEvents.map(e => e.description).join('; ')}`);
  }

  if (region.rumors.length > 0) {
    parts.push(`Local rumors: ${region.rumors.slice(0, 2).join('; ')}`);
  }

  // Adjacent region hints
  const adjacent = getAdjacentRegionStates(grid);
  const dangerousAdj = adjacent.filter(r => r.dangerLevel >= 6);
  if (dangerousAdj.length > 0) {
    parts.push(`Nearby danger: ${dangerousAdj.map(r => `${r.regionName} (danger ${r.dangerLevel})`).join(', ')}`);
  }

  return parts.join('. ');
}
