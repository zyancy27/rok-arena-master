/**
 * Narrator Guidance Logic
 *
 * Helper logic layer that decides HOW to apply narrator principles
 * for a given situation. Integrates all narrative subsystems
 * (identity, gravity, pressure, echo, reflection, conscience)
 * into unified guidance for the AI narrator.
 */

import {
  buildIdentityNarratorContext,
  type IdentityProfile,
  shouldShowIdentityFeedback,
  generateIdentityFeedback,
} from './characterIdentityEngine';
import {
  buildGravityNarratorContext,
  checkWorldAcknowledgement,
  getGravityInfluences,
  type StoryGravityState,
} from './storyGravityEngine';
import {
  buildPressureNarratorContext,
  shouldGeneratePressure,
  generatePressureEvent,
  type NarrativePressureState,
  type PressureConditions,
} from './narrativePressureEngine';
import {
  buildEchoNarratorContext,
  findRelevantEcho,
  type EchoMemoryState,
  type EchoTriggerContext,
} from './characterEchoSystem';
import {
  buildReflectionNarratorContext,
  shouldGenerateReflection,
  generateReflection,
  type ReflectionState,
  type ReflectionConditions,
} from './characterReflectionEngine';
import {
  buildConscienceNarratorContext,
  type ConscienceState,
} from './characterConscienceSystem';
import type { SceneType } from './narratorPrinciplesEngine';
import type { EmotionalPressureState } from './types';

// ── Types ───────────────────────────────────────────────────────

export interface NarrativeSystemInputs {
  identity?: IdentityProfile;
  gravity?: StoryGravityState;
  pressure?: NarrativePressureState;
  echo?: EchoMemoryState;
  reflection?: ReflectionState;
  conscience?: ConscienceState;
}

export interface NarrativeSystemConditions {
  turnNumber: number;
  sceneType: SceneType;
  inCombat: boolean;
  environmentStability: EmotionalPressureState;
  messagesSinceLastPressure: number;
  activeHazards: number;
  characterId: string;
  currentZone?: string;
  narrativeContext: string;
}

export interface AssembledNarrativeContext {
  identity: string;
  gravity: string;
  pressure: string | null;
  echo: string | null;
  reflection: string | null;
  conscience: string | null;
  /** Combined context block for the AI prompt */
  combinedBlock: string;
}

// ── Main Assembly Function ──────────────────────────────────────

/**
 * Assembles all narrative system contexts into a unified block
 * for the narrator AI prompt. Only includes relevant systems
 * based on the current scene conditions.
 */
export function assembleNarrativeContext(
  systems: NarrativeSystemInputs,
  conditions: NarrativeSystemConditions,
): AssembledNarrativeContext {
  // Identity — always include if available
  const identity = systems.identity
    ? buildIdentityNarratorContext(systems.identity)
    : '';

  // Gravity — always include if available
  const gravity = systems.gravity
    ? buildGravityNarratorContext(systems.gravity)
    : '';

  // Pressure — only in non-combat, with proper cooldown
  let pressure: string | null = null;
  if (systems.pressure && !conditions.inCombat) {
    pressure = buildPressureNarratorContext(systems.pressure);
  }

  // Echo — only in exploration, social, aftermath, rest scenes
  let echo: string | null = null;
  const echoScenes: SceneType[] = ['exploration', 'social', 'aftermath', 'rest', 'transition'];
  if (systems.echo && echoScenes.includes(conditions.sceneType)) {
    const triggerCtx: EchoTriggerContext = {
      currentZoneId: conditions.currentZone,
      narrativeContext: conditions.narrativeContext,
    };
    const echoResult = findRelevantEcho(systems.echo, conditions.characterId, triggerCtx);
    if (echoResult) {
      echo = echoResult.narratorPrompt;
    }
  }

  // Reflection — only in quiet/aftermath/rest scenes, not in combat
  let reflection: string | null = null;
  if (systems.reflection && !conditions.inCombat) {
    const reflectionScenes: SceneType[] = ['aftermath', 'rest', 'transition', 'exploration'];
    if (reflectionScenes.includes(conditions.sceneType)) {
      reflection = buildReflectionNarratorContext(systems.reflection);
    }
  }

  // Conscience — always include if there's a pending alert
  let conscience: string | null = null;
  if (systems.conscience) {
    conscience = buildConscienceNarratorContext(systems.conscience);
  }

  // Build combined block
  const parts: string[] = [];
  if (identity) parts.push(`[Character Identity] ${identity}`);
  if (gravity) parts.push(`[Story Gravity] ${gravity}`);
  if (pressure) parts.push(`[Narrative Pressure] ${pressure}`);
  if (echo) parts.push(`[Character Echo] ${echo}`);
  if (reflection) parts.push(`[Reflection] ${reflection}`);
  if (conscience) parts.push(`[Conscience] ${conscience}`);

  // World acknowledgement check
  if (systems.gravity) {
    const ack = checkWorldAcknowledgement(systems.gravity);
    if (ack) {
      parts.push(`[World Acknowledgement] The world should subtly acknowledge the character's ${ack.theme} tendency: "${ack.narratorLine}"`);
    }
  }

  // Identity feedback check
  if (systems.identity && shouldShowIdentityFeedback(systems.identity, conditions.turnNumber)) {
    const feedback = generateIdentityFeedback(systems.identity, conditions.turnNumber);
    if (feedback) {
      parts.push(`[Identity Feedback] Weave this observation naturally into narration: "${feedback.text}"`);
    }
  }

  return {
    identity,
    gravity,
    pressure,
    echo,
    reflection,
    conscience,
    combinedBlock: parts.length > 0
      ? `\nNARRATIVE SYSTEMS GUIDANCE:\n${parts.join('\n')}`
      : '',
  };
}

// ── Scene-Appropriate System Selection ──────────────────────────

/**
 * Determines which narrative systems should be most active
 * based on the current scene type and conditions.
 */
export function getActiveSystemPriorities(
  sceneType: SceneType,
): { system: keyof NarrativeSystemInputs; weight: number }[] {
  const priorities: Record<SceneType, { system: keyof NarrativeSystemInputs; weight: number }[]> = {
    exploration: [
      { system: 'gravity', weight: 3 },
      { system: 'echo', weight: 2 },
      { system: 'pressure', weight: 2 },
      { system: 'identity', weight: 1 },
    ],
    social: [
      { system: 'identity', weight: 3 },
      { system: 'echo', weight: 2 },
      { system: 'conscience', weight: 2 },
      { system: 'gravity', weight: 1 },
    ],
    combat: [
      { system: 'identity', weight: 2 },
      { system: 'conscience', weight: 1 },
    ],
    aftermath: [
      { system: 'reflection', weight: 3 },
      { system: 'echo', weight: 2 },
      { system: 'identity', weight: 2 },
      { system: 'gravity', weight: 1 },
    ],
    tension_building: [
      { system: 'pressure', weight: 3 },
      { system: 'gravity', weight: 2 },
      { system: 'identity', weight: 1 },
    ],
    transition: [
      { system: 'echo', weight: 2 },
      { system: 'gravity', weight: 2 },
      { system: 'reflection', weight: 1 },
    ],
    revelation: [
      { system: 'gravity', weight: 3 },
      { system: 'echo', weight: 2 },
      { system: 'identity', weight: 2 },
    ],
    rest: [
      { system: 'reflection', weight: 3 },
      { system: 'echo', weight: 2 },
      { system: 'identity', weight: 1 },
    ],
  };

  return priorities[sceneType] || priorities.exploration;
}
