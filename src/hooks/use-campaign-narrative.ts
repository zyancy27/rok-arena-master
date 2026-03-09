/**
 * Campaign Narrative Hook
 *
 * Manages per-character narrative subsystem state (identity, gravity, echo,
 * reflection, pressure, conscience) and assembles a unified context block
 * to feed into the narrator edge function.
 *
 * State is kept in-memory (resets on page reload) — the subsystems are
 * designed to warm up quickly from conversation history.
 */

import { useRef, useCallback } from 'react';
import {
  // Identity
  createIdentityProfile,
  ingestIdentitySignal,
  type IdentityProfile,
  type IdentitySignal,
  // Gravity
  createStoryGravity,
  ingestFromDialogue as gravityIngestFromDialogue,
  type StoryGravityState,
  // Echo
  createEchoMemory,
  type EchoMemoryState,
  // Reflection
  createReflectionState,
  type ReflectionState,
  // Pressure
  createPressureEngineState,
  type NarrativePressureState,
  // Conscience
  createConscienceState,
  type ConscienceState,
  // Principles
  createNarratorPrinciplesState,
  classifyScene,
  determinePacing,
  updatePrinciplesState,
  buildNarratorGuidance,
  buildNarratorPrinciplesPromptBlock,
  type NarratorPrinciplesState,
  type SceneType,
  // Scene Director
  directScene,
  buildSceneDirectorPromptBlock,
  // Guidance Logic
  assembleNarrativeContext,
  type AssembledNarrativeContext,
  // Campaign Planner
  buildCampaignPlannerContext,
  updateModelFromResponse,
  type CampaignPlannerInput,
} from '@/engine/narrativeWorld';

export interface NarrativeStateRef {
  identity: IdentityProfile;
  gravity: StoryGravityState;
  echo: EchoMemoryState;
  reflection: ReflectionState;
  pressure: NarrativePressureState;
  conscience: ConscienceState;
  principles: NarratorPrinciplesState;
  turnNumber: number;
  inCombat: boolean;
}

interface UseCampaignNarrativeOptions {
  characterId: string;
  characterName: string;
  campaignId: string;
  campaignDescription: string | null;
}

export function useCampaignNarrative(opts: UseCampaignNarrativeOptions | null) {
  const stateRef = useRef<NarrativeStateRef | null>(null);

  // Lazy-init state on first use
  const getState = useCallback((): NarrativeStateRef | null => {
    if (!opts) return null;
    if (!stateRef.current || stateRef.current.identity.characterId !== opts.characterId) {
      stateRef.current = {
        identity: createIdentityProfile(opts.characterId),
        gravity: createStoryGravity(opts.characterId),
        echo: createEchoMemory(),
        reflection: createReflectionState(),
        pressure: createPressureEngineState(),
        conscience: createConscienceState(),
        principles: createNarratorPrinciplesState(opts.campaignId, opts.campaignDescription || undefined),
        turnNumber: 0,
        inCombat: false,
      };
    }
    return stateRef.current;
  }, [opts?.characterId, opts?.campaignId, opts?.campaignDescription]);

  /**
   * Ingest a player action into the narrative subsystems and return the
   * assembled narrator context block to send to the edge function.
   */
  const buildNarrativeBlock = useCallback((
    playerAction: string,
    hasActiveEnemies: boolean,
    currentZone: string,
  ): string => {
    const state = getState();
    if (!state || !opts) return '';

    state.turnNumber += 1;
    state.inCombat = hasActiveEnemies;

    // 1. Ingest signal into Identity Engine
    const signal: IdentitySignal = {
      source: state.inCombat ? 'combat' : 'dialogue',
      content: playerAction,
      turnNumber: state.turnNumber,
    };
    ingestIdentitySignal(state.identity, signal);

    // 2. Feed gravity from dialogue
    state.gravity = gravityIngestFromDialogue(state.gravity, playerAction, state.turnNumber);

    // 3. Classify scene & determine pacing
    const recentScenes = state.principles.campaignModel.recentSceneTypes;
    const sceneType: SceneType = classifyScene(playerAction, hasActiveEnemies, recentScenes);
    const pacing = determinePacing(recentScenes, state.principles.campaignModel.storyPressure, hasActiveEnemies);

    // 4. Update principles state
    state.principles = updatePrinciplesState(state.principles, sceneType, pacing);

    // 5. Assemble narrative subsystem contexts
    const assembled: AssembledNarrativeContext = assembleNarrativeContext(
      {
        identity: state.identity,
        gravity: state.gravity,
        pressure: state.pressure,
        echo: state.echo,
        reflection: state.reflection,
        conscience: state.conscience,
      },
      {
        turnNumber: state.turnNumber,
        sceneType,
        inCombat: state.inCombat,
        environmentStability: 'stable',
        messagesSinceLastPressure: state.turnNumber,
        activeHazards: 0,
        characterId: opts.characterId,
        currentZone,
        narrativeContext: playerAction,
      },
    );

    // 6. Build scene director note
    const activeHooks = state.principles.campaignModel.activeHooks.filter(h => h.active);
    const directive = directScene(sceneType, pacing, activeHooks.length > 0, true);
    const directorBlock = buildSceneDirectorPromptBlock(directive);

    // 7. Build guidance via the full buildNarratorGuidance flow
    const guidance = buildNarratorGuidance(
      state.principles,
      playerAction,
      hasActiveEnemies,
      opts.characterId,
      {
        identity: assembled.identity,
        gravity: assembled.gravity,
        pressure: assembled.pressure,
        echo: assembled.echo,
        reflection: assembled.reflection,
        conscience: assembled.conscience,
      },
    );
    const principlesBlock = buildNarratorPrinciplesPromptBlock(guidance);

    // 8. Build campaign planner context
    const plannerBlock = buildCampaignPlannerContext(state.principles.campaignModel);

    // Combine all blocks
    const blocks = [
      assembled.combinedBlock,
      directorBlock,
      principlesBlock,
      plannerBlock,
    ].filter(Boolean);

    return blocks.length > 0 ? `\n${blocks.join('\n')}` : '';
  }, [getState, opts]);

  /**
   * After receiving a narrator response, feed it back into the subsystems
   * so they can learn from the narration (update gravity, echo, etc.)
   */
  const ingestNarratorResponse = useCallback((
    narration: string,
    encounterType: string | null,
    currentZone: string,
    dayCount: number,
    timeOfDay: string,
    campaignDescription: string,
    storyContext: Record<string, unknown>,
    worldState: Record<string, unknown>,
    knownNpcCount: number,
    activeEnemyCount: number,
    playerAction: string,
  ) => {
    const state = getState();
    if (!state) return;

    const plannerInput: CampaignPlannerInput = {
      campaignDescription,
      currentZone,
      dayCount,
      timeOfDay,
      storyContext,
      worldState,
      knownNpcCount,
      activeEnemyCount,
      playerAction,
      narratorResponse: {
        newZone: null,
        encounterType,
        enemySpawned: false,
        npcInteracted: false,
      },
    };

    state.principles.campaignModel = updateModelFromResponse(
      state.principles.campaignModel,
      plannerInput,
      state.turnNumber,
    );
  }, [getState]);

  return {
    buildNarrativeBlock,
    ingestNarratorResponse,
  };
}
