import { FactionMemoryEngine, type FactionMemorySnapshot } from './FactionMemoryEngine';
import { LocationMemoryEngine, type LocationMemorySnapshot } from './LocationMemoryEngine';

export interface WorldMemorySnapshot {
  worldId: string;
  factions: FactionMemorySnapshot[];
  locations: LocationMemorySnapshot[];
  rumorSeeds: string[];
}

export const WorldMemoryEngine = {
  update(snapshot: WorldMemorySnapshot, event: { type: 'faction' | 'location' | 'rumor'; id?: string; detail: string }) {
    if (event.type === 'rumor') {
      return {
        ...snapshot,
        rumorSeeds: [...new Set([...snapshot.rumorSeeds, event.detail])].slice(-20),
      };
    }

    if (event.type === 'faction' && event.id) {
      return {
        ...snapshot,
        factions: snapshot.factions.map((entry) => entry.factionId === event.id ? FactionMemoryEngine.update(entry, event.detail) : entry),
      };
    }

    if (event.type === 'location' && event.id) {
      return {
        ...snapshot,
        locations: snapshot.locations.map((entry) => entry.locationId === event.id ? LocationMemoryEngine.update(entry, event.detail) : entry),
      };
    }

    return snapshot;
  },

  summarize(snapshot: WorldMemorySnapshot) {
    return {
      factionSummaries: snapshot.factions.map((entry) => ({ factionId: entry.factionId, ...FactionMemoryEngine.summarize(entry) })),
      locationSummaries: snapshot.locations.map((entry) => ({ locationId: entry.locationId, ...LocationMemoryEngine.summarize(entry) })),
      rumorPressure: snapshot.rumorSeeds.slice(-5),
    };
  },
};
