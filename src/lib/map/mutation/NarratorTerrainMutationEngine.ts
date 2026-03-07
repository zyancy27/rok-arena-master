/**
 * NarratorTerrainMutationEngine
 *
 * Top-level orchestrator that connects the mutation pipeline
 * to the battle event system, Living Arena, and Battlefield Memory.
 *
 * Usage:
 *   const engine = createMutationEngine(zones);
 *   const result = engine.processMutationEvent({ text, source, ... });
 *   // result.zones — updated zones
 *   // result.memory — updated memory
 *   // result.sceneInstructions — for 3D renderer
 *   // result.narratorContext — for narrator prompt
 */

import type { BattlefieldZone } from '@/lib/tactical-zones';
import type { ArenaState } from '@/lib/living-arena';
import type {
  MutationSource,
  MutationResult,
  SceneMutationInstruction,
} from './mutation-types';
import {
  MutationMemory,
  createMutationMemory,
  recordMutations,
  markApplied,
  getMutationNarratorContext,
  getUnappliedMutations,
} from './mutation-memory';
import { applyMutationPipeline } from './mutation-apply';
import { applyZoneEffects } from './mutation-zone-updates';

// ── Engine State ────────────────────────────────────────────────

export interface MutationEngineState {
  zones: BattlefieldZone[];
  memory: MutationMemory;
  pendingSceneInstructions: SceneMutationInstruction[];
  lastResult: MutationResult | null;
}

export interface MutationEvent {
  text: string;
  source: MutationSource;
  turnNumber: number;
  arenaState: ArenaState;
}

export interface MutationEngineOutput {
  zones: BattlefieldZone[];
  memory: MutationMemory;
  sceneInstructions: SceneMutationInstruction[];
  narratorContext: string;
  cinematic: boolean;
  narratorMarker?: MutationResult['narratorMarker'];
  hadMutations: boolean;
}

// ── Engine Factory ──────────────────────────────────────────────

export function createMutationEngine(initialZones: BattlefieldZone[]): MutationEngineState {
  return {
    zones: initialZones,
    memory: createMutationMemory(),
    pendingSceneInstructions: [],
    lastResult: null,
  };
}

// ── Process Mutation Event ──────────────────────────────────────

export function processMutationEvent(
  state: MutationEngineState,
  event: MutationEvent,
): { state: MutationEngineState; output: MutationEngineOutput } {
  const zoneIds = state.zones.map(z => z.id);
  const zoneLabels = state.zones.map(z => z.label);

  // Run the mutation pipeline
  const result = applyMutationPipeline({
    text: event.text,
    source: event.source,
    turnNumber: event.turnNumber,
    arenaStability: event.arenaState.stability,
    arenaHazardLevel: event.arenaState.hazardLevel,
    arenaEscalation: event.arenaState.escalationStage,
    zoneIds,
    zoneLabels,
  });

  if (result.mutations.length === 0) {
    return {
      state,
      output: {
        zones: state.zones,
        memory: state.memory,
        sceneInstructions: [],
        narratorContext: getMutationNarratorContext(state.memory),
        cinematic: false,
        hadMutations: false,
      },
    };
  }

  // Apply zone effects
  const updatedZones = applyZoneEffects(state.zones, result.zoneEffects);

  // Record in memory
  const updatedMemory = recordMutations(state.memory, result.mutations);

  // Mark mutations as applied
  const appliedMemory = markApplied(
    updatedMemory,
    result.mutations.map(m => m.id),
  );

  const newState: MutationEngineState = {
    zones: updatedZones,
    memory: appliedMemory,
    pendingSceneInstructions: [
      ...state.pendingSceneInstructions,
      ...result.sceneInstructions,
    ],
    lastResult: result,
  };

  return {
    state: newState,
    output: {
      zones: updatedZones,
      memory: appliedMemory,
      sceneInstructions: result.sceneInstructions,
      narratorContext: getMutationNarratorContext(appliedMemory),
      cinematic: result.cinematic,
      narratorMarker: result.narratorMarker,
      hadMutations: true,
    },
  };
}

// ── Drain Pending Scene Instructions ────────────────────────────

export function drainSceneInstructions(
  state: MutationEngineState,
): { state: MutationEngineState; instructions: SceneMutationInstruction[] } {
  const instructions = state.pendingSceneInstructions;
  return {
    state: { ...state, pendingSceneInstructions: [] },
    instructions,
  };
}

// ── Get Narrator Context ────────────────────────────────────────

export function getEngineNarratorContext(state: MutationEngineState): string {
  return getMutationNarratorContext(state.memory);
}

// ── Query Helpers ───────────────────────────────────────────────

export function isZoneCollapsed(state: MutationEngineState, zoneId: string): boolean {
  return state.memory.collapsedZones.has(zoneId);
}

export function getZoneDamageLevel(state: MutationEngineState, zoneId: string): number {
  return state.memory.zoneDamage[zoneId] ?? 0;
}
