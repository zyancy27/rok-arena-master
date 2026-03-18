import type { DistanceZone } from '@/lib/battle-dice';

export type RangeBand = 'close' | 'mid' | 'far';
export type CombatStance = 'guarded' | 'mobile' | 'aggressive' | 'grounded' | 'unstable';

export interface CombatStatusEffectState {
  type: string;
  intensity?: string | number;
  duration?: number;
}

export interface CombatPositionState {
  range: RangeBand;
  stance: CombatStance;
  zone?: string | null;
  meters: number;
}

export interface CombatVitalsState {
  hp: number;
  stamina: number;
  speed: number;
  strength: number;
}

export interface CombatParticipantState {
  id: string;
  name: string;
  position: CombatPositionState;
  stats: CombatVitalsState;
  statusEffects: CombatStatusEffectState[];
  engagedWith: string[];
}

export interface CombatDistanceState {
  meters: number;
  range: RangeBand;
  zoneLabel: DistanceZone | RangeBand;
}

export interface CombatEngagementState {
  sourceId: string;
  targetId: string;
  locked: boolean;
  pressure: number;
}

export interface CombatTerrainHazard {
  type: string;
  severity: number;
  zone?: string | null;
  description?: string;
}

export interface CombatTerrainState {
  zone?: string | null;
  tags: string[];
  hazards: CombatTerrainHazard[];
  stability: number;
}

export interface CombatState {
  participants: Record<string, CombatParticipantState>;
  distances: Record<string, CombatDistanceState>;
  engagements: CombatEngagementState[];
  terrain: CombatTerrainState;
}

export interface CombatStateParticipantInput {
  id: string;
  name: string;
  position?: Partial<CombatPositionState>;
  stats?: Partial<CombatVitalsState>;
  statusEffects?: CombatStatusEffectState[];
  engagedWith?: string[];
}

export interface CombatStateInput {
  participants: CombatStateParticipantInput[];
  rangeZone?: DistanceZone | RangeBand | null;
  zone?: string | null;
  terrainTags?: string[];
  hazards?: CombatTerrainHazard[];
  engagements?: CombatEngagementState[];
  stability?: number;
}

const RANGE_METERS: Record<RangeBand, number> = {
  close: 2,
  mid: 8,
  far: 24,
};

export function pairKey(a: string, b: string) {
  return [a, b].sort().join('::');
}

export function fromDistanceZone(zone?: DistanceZone | RangeBand | null): RangeBand {
  if (!zone) return 'mid';
  if (zone === 'close' || zone === 'melee') return 'close';
  if (zone === 'mid') return 'mid';
  return 'far';
}

export function toDistanceZone(range: RangeBand): DistanceZone {
  if (range === 'close') return 'close';
  if (range === 'mid') return 'mid';
  return 'long';
}

export function getRangeMeters(range: RangeBand) {
  return RANGE_METERS[range];
}

export function cloneCombatState(state: CombatState): CombatState {
  return {
    participants: Object.fromEntries(
      Object.entries(state.participants).map(([id, participant]) => [
        id,
        {
          ...participant,
          position: { ...participant.position },
          stats: { ...participant.stats },
          statusEffects: participant.statusEffects.map(effect => ({ ...effect })),
          engagedWith: [...participant.engagedWith],
        },
      ]),
    ),
    distances: Object.fromEntries(
      Object.entries(state.distances).map(([key, value]) => [key, { ...value }]),
    ),
    engagements: state.engagements.map(engagement => ({ ...engagement })),
    terrain: {
      ...state.terrain,
      tags: [...state.terrain.tags],
      hazards: state.terrain.hazards.map(hazard => ({ ...hazard })),
    },
  };
}

export function createCombatState(input: CombatStateInput): CombatState {
  const baseRange = fromDistanceZone(input.rangeZone);
  const zoneLabel = (input.rangeZone ?? toDistanceZone(baseRange)) as DistanceZone | RangeBand;
  const meters = getRangeMeters(baseRange);

  const participants = Object.fromEntries(
    input.participants.map(participant => [
      participant.id,
      {
        id: participant.id,
        name: participant.name,
        position: {
          range: participant.position?.range ?? baseRange,
          stance: participant.position?.stance ?? 'guarded',
          zone: participant.position?.zone ?? input.zone ?? null,
          meters: participant.position?.meters ?? meters,
        },
        stats: {
          hp: participant.stats?.hp ?? 100,
          stamina: participant.stats?.stamina ?? 100,
          speed: participant.stats?.speed ?? 50,
          strength: participant.stats?.strength ?? 50,
        },
        statusEffects: participant.statusEffects?.map(effect => ({ ...effect })) ?? [],
        engagedWith: [...(participant.engagedWith ?? [])],
      } satisfies CombatParticipantState,
    ]),
  );

  const distances: Record<string, CombatDistanceState> = {};
  for (let index = 0; index < input.participants.length; index += 1) {
    for (let inner = index + 1; inner < input.participants.length; inner += 1) {
      distances[pairKey(input.participants[index].id, input.participants[inner].id)] = {
        meters,
        range: baseRange,
        zoneLabel,
      };
    }
  }

  return {
    participants,
    distances,
    engagements: input.engagements?.map(engagement => ({ ...engagement })) ?? [],
    terrain: {
      zone: input.zone ?? null,
      tags: [...(input.terrainTags ?? [])],
      hazards: input.hazards?.map(hazard => ({ ...hazard })) ?? [],
      stability: input.stability ?? 0.75,
    },
  };
}
