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
  ingestFromSignature,
  ingestFromDialogue as gravityIngestFromDialogue,
  type StoryGravityState,
  // Echo
  createEchoMemory,
  recordEcho,
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
  createCampaignNarrativeModel,
  createNarratorPrinciplesState,
  classifyScene,
  determinePacing,
  updatePrinciplesState,
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
      const model = createCampaignNarrativeModel(
        opts.campaignId,
        opts.campaignDescription || 'An adventure awaits.',
      );
      stateRef.current = {
        identity: createIdentityProfile(opts.characterId),
        gravity: createStoryGravity(opts.characterId),
        echo: createEchoMemory(),
        reflection: createReflectionState(),
        pressure: createPressureEngineState(),
        conscience: createConscienceState(),
        principles: createNarratorPrinciplesState(model),
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
    encounterType: string | null,
    currentZone: string,
  ): string => {
    const state = getState();
    if (!state || !opts) return '';

    state.turnNumber += 1;
    state.inCombat = encounterType === 'combat';

    // 1. Ingest signal into Identity Engine
    const signal: IdentitySignal = {
      action: playerAction,
      context: currentZone,
      timestamp: Date.now(),
    };
    ingestIdentitySignal(state.identity, signal);

    // 2. Feed gravity from dialogue
    gravityIngestFromDialogue(state.gravity, playerAction);

    // 3. Classify scene & determine pacing
    const sceneType: SceneType = state.inCombat
      ? 'combat'
      : classifyScene(playerAction, encounterType || 'exploration');
    const pacing = determinePacing(state.principles, sceneType);

    // 4. Update principles state
    updatePrinciplesState(state.principles, sceneType);

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
    const directive = directScene(sceneType, pacing, {
      hasActiveHooks: state.principles.campaignModel.activeHooks.filter(h => h.active).length > 0,
      hasNearbyNpcs: true,
      recentCombatTurns: state.inCombat ? 1 : 0,
      unresolvedConsequences: state.principles.campaignModel.unresolvedThreads.length,
    });
    const directorBlock = buildSceneDirectorPromptBlock(directive);

    // 7. Build principles prompt
    const principlesBlock = buildNarratorPrinciplesPromptBlock(state.principles, sceneType);

    // 8. Build campaign planner context
    const plannerBlock = buildCampaignPlannerContext(state.principles.campaignModel);

    // Combine all blocks
    const blocks = [
      assembled.combinedBlock,
      directorBlock,
      principlesBlock,
      plannerBlock,
    ].filter(Boolean);

    return blocks.join('\n');
  }, [getState, opts]);

  /**
   * After receiving a narrator response, feed it back into the subsystems
   * so they can learn from the narration (update gravity, echo, etc.)
   */
  const ingestNarratorResponse = useCallback((
    narration: string,
    encounterType: string | null,
  ) => {
    const state = getState();
    if (!state) return;

    // Update principles model from response
    updateModelFromResponse(
      state.principles.campaignModel,
      narration,
      encounterType || 'exploration',
    );
  }, [getState]);

  return {
    buildNarrativeBlock,
    ingestNarratorResponse,
  };
}
