import { FactionTickEngine } from './FactionTickEngine';
import { LocationTickEngine } from './LocationTickEngine';
import { NpcGoalScheduler } from './NpcGoalScheduler';

export interface WorldSimulationTickInput {
  factions: Array<{ factionId: string; currentPressure: number; activeConflicts: string[] }>;
  locations: Array<{ locationId: string; hazardLevel: number; pressure: number }>;
  npcs: Array<{ npcId: string; motivations: string[]; pressureLevel: 'low' | 'medium' | 'high' | 'critical' }>;
}

export const WorldSimulationTickEngine = {
  tick(input: WorldSimulationTickInput) {
    return {
      factions: input.factions.map((faction) => ({ factionId: faction.factionId, ...FactionTickEngine.tick(faction) })),
      locations: input.locations.map((location) => ({ locationId: location.locationId, ...LocationTickEngine.tick(location) })),
      npcs: input.npcs.map((npc) => NpcGoalScheduler.schedule(npc)),
    };
  },
};
