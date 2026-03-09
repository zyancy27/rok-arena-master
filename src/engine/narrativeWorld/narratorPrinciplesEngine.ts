/**
 * Narrator Principles Engine
 *
 * The governing logic layer that sits above all narrative systems and guides
 * how the narrator thinks, plans, reacts, escalates, and guides.
 * Implements core DM principles: preparation with flexibility, player agency,
 * world reactivity, fairness, pacing, character-centered storytelling,
 * meaningful consequences, and clarity.
 */

import type { StoryGravityState, StoryTheme, GravityInfluence } from './storyGravityEngine';
import type { IdentityProfile } from './characterIdentityEngine';
import type { EchoMemoryState, EchoSurfaceResult } from './characterEchoSystem';
import type { NarrativePressureState } from './narrativePressureEngine';
import type { ReflectionState } from './characterReflectionEngine';
import type { ConscienceState } from './characterConscienceSystem';

// ── Types ───────────────────────────────────────────────────────

export type SceneType =
  | 'exploration'
  | 'tension_building'
  | 'social'
  | 'aftermath'
  | 'combat'
  | 'transition'
  | 'revelation'
  | 'rest';

export type PacingNeed = 'slow_down' | 'maintain' | 'intensify' | 'breathe' | 'climax';

export interface StoryHook {
  id: string;
  description: string;
  /** How this hook naturally surfaces: environment, npc, danger, rumor, clue, consequence */
  surfaceMethod: 'environment' | 'npc' | 'danger' | 'rumor' | 'clue' | 'consequence' | 'objective_reminder';
  /** Priority 1-10 */
  priority: number;
  /** Turn when created */
  turnCreated: number;
  /** Is this still active? */
  active: boolean;
}

export interface CampaignNarrativeModel {
  campaignId: string;
  /** One-line premise */
  premise: string;
  /** Current arc description */
  currentArc: string;
  /** Current objective the player is pursuing */
  currentObjective: string;
  /** Unresolved story threads */
  unresolvedThreads: string[];
  /** Active hooks available to surface */
  activeHooks: StoryHook[];
  /** Known emotional tone */
  emotionalTone: string;
  /** Current story pressure level 0-100 */
  storyPressure: number;
  /** Scene classifications for recent scenes */
  recentSceneTypes: SceneType[];
  /** Last pacing decision */
  currentPacing: PacingNeed;
}

export interface NarratorPrinciplesState {
  campaignModel: CampaignNarrativeModel;
  /** Aggregated character narrative profiles */
  characterProfiles: Map<string, CharacterNarrativeProfile>;
  /** Last scene type */
  lastSceneType: SceneType;
  /** Consecutive scenes of same type */
  sameSceneCount: number;
  /** Total narrator responses */
  totalResponses: number;
}

export interface CharacterNarrativeProfile {
  characterId: string;
  characterName: string;
  identityProfile: IdentityProfile | null;
  gravityState: StoryGravityState | null;
  pressureState: NarrativePressureState | null;
  reflectionState: ReflectionState | null;
  conscienceState: ConscienceState | null;
  echoMemory: EchoMemoryState | null;
}

export interface NarratorGuidance {
  /** What kind of scene this is */
  sceneType: SceneType;
  /** Current pacing recommendation */
  pacing: PacingNeed;
  /** Hooks to surface naturally in narration */
  hooksToSurface: StoryHook[];
  /** Identity context for the acting character */
  identityContext: string;
  /** Gravity context (theme biases) */
  gravityContext: string;
  /** Pressure context if applicable */
  pressureContext: string | null;
  /** Echo context if a relevant memory should surface */
  echoContext: string | null;
  /** Reflection prompt if conditions are right */
  reflectionContext: string | null;
  /** Conscience alert if OOC detected */
  conscienceContext: string | null;
  /** World aliveness details */
  worldAliveness: string[];
  /** Narrator principle instructions */
  principleInstructions: string;
}

// ── Constants ───────────────────────────────────────────────────

const MAX_HOOKS = 5;
const PACING_HISTORY_SIZE = 6;

// ── Factory ─────────────────────────────────────────────────────

export function createCampaignNarrativeModel(
  campaignId: string,
  description?: string,
): CampaignNarrativeModel {
  return {
    campaignId,
    premise: description || 'An adventure awaits.',
    currentArc: 'Opening',
    currentObjective: '',
    unresolvedThreads: [],
    activeHooks: [],
    emotionalTone: 'neutral',
    storyPressure: 10,
    recentSceneTypes: [],
    currentPacing: 'maintain',
  };
}

export function createNarratorPrinciplesState(campaignId: string, description?: string): NarratorPrinciplesState {
  return {
    campaignModel: createCampaignNarrativeModel(campaignId, description),
    characterProfiles: new Map(),
    lastSceneType: 'exploration',
    sameSceneCount: 0,
    totalResponses: 0,
  };
}

// ── Scene Classification ────────────────────────────────────────

const COMBAT_KEYWORDS = /\b(attack|fight|strike|slash|punch|kick|shoot|stab|block|dodge|defend|battle|combat|enemy|enemies|weapon)\b/i;
const SOCIAL_KEYWORDS = /\b(talk|speak|ask|tell|say|greet|negotiate|persuade|convince|trade|buy|sell|barter|merchant|bartender|innkeeper)\b/i;
const EXPLORATION_KEYWORDS = /\b(explore|look|search|investigate|examine|inspect|wander|travel|walk|climb|enter|open|check)\b/i;
const REST_KEYWORDS = /\b(rest|sleep|camp|sit|wait|recover|heal|meditate|relax)\b/i;

export function classifyScene(
  playerAction: string,
  hasActiveEnemies: boolean,
  recentSceneTypes: SceneType[],
): SceneType {
  if (hasActiveEnemies || COMBAT_KEYWORDS.test(playerAction)) return 'combat';
  if (REST_KEYWORDS.test(playerAction)) return 'rest';
  if (SOCIAL_KEYWORDS.test(playerAction)) return 'social';
  if (EXPLORATION_KEYWORDS.test(playerAction)) return 'exploration';

  // If we just had combat, this is likely aftermath
  if (recentSceneTypes.length > 0 && recentSceneTypes[recentSceneTypes.length - 1] === 'combat') {
    return 'aftermath';
  }

  return 'exploration';
}

// ── Pacing Logic ────────────────────────────────────────────────

export function determinePacing(
  recentScenes: SceneType[],
  storyPressure: number,
  hasActiveEnemies: boolean,
): PacingNeed {
  const last3 = recentScenes.slice(-3);
  const combatCount = last3.filter(s => s === 'combat').length;
  const restCount = last3.filter(s => s === 'rest' || s === 'social').length;

  // After sustained combat, let players breathe
  if (combatCount >= 2) return 'breathe';

  // After rest/social, time to build tension
  if (restCount >= 2 && storyPressure < 50) return 'intensify';

  // High story pressure = climax territory
  if (storyPressure >= 75) return 'climax';

  // Active enemies = maintain tension
  if (hasActiveEnemies) return 'maintain';

  // Low pressure = slow exploration
  if (storyPressure < 25) return 'slow_down';

  return 'maintain';
}

// ── Hook Management ─────────────────────────────────────────────

let _hookId = 0;

export function addStoryHook(
  model: CampaignNarrativeModel,
  description: string,
  surfaceMethod: StoryHook['surfaceMethod'],
  priority: number,
  turn: number,
): CampaignNarrativeModel {
  const hook: StoryHook = {
    id: `hook_${++_hookId}`,
    description,
    surfaceMethod,
    priority,
    turnCreated: turn,
    active: true,
  };

  const hooks = [...model.activeHooks, hook]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_HOOKS);

  return { ...model, activeHooks: hooks };
}

export function resolveHook(model: CampaignNarrativeModel, hookId: string): CampaignNarrativeModel {
  return {
    ...model,
    activeHooks: model.activeHooks.map(h =>
      h.id === hookId ? { ...h, active: false } : h,
    ),
  };
}

export function getActiveHooks(model: CampaignNarrativeModel): StoryHook[] {
  return model.activeHooks.filter(h => h.active);
}

// ── World Aliveness ─────────────────────────────────────────────

const WORLD_ALIVENESS_PROMPTS: Record<SceneType, string[]> = {
  exploration: [
    'Something moves at the edge of perception — natural life going about its business.',
    'Distant sounds suggest activity beyond the immediate area.',
    'The environment shows subtle signs of recent change — weathering, tracks, shifted objects.',
  ],
  social: [
    'Other people in the area continue their own conversations and routines.',
    'Background activity — vendors calling, children playing, workers laboring.',
    'The world doesn\'t pause for the player\'s conversation.',
  ],
  combat: [
    'The environment reacts to the violence — birds scatter, dust rises, structures shake.',
    'Nearby inhabitants flee or hide from the conflict.',
  ],
  aftermath: [
    'The quiet after conflict is never complete — settling debris, distant echoes, cautious eyes.',
    'The area bears fresh marks from what just happened.',
  ],
  tension_building: [
    'The air feels different. Something is shifting.',
    'Small signs of approaching change — atmospheric, social, or environmental.',
  ],
  transition: [
    'The landscape gradually shifts as the party moves.',
    'New sounds and smells announce a different area.',
  ],
  revelation: [
    'Everything seen before now makes slightly more sense.',
  ],
  rest: [
    'The world continues around the resting party — weather changes, animals move, time passes.',
    'Off-screen events progress while the party rests.',
  ],
};

export function getWorldAlivenessDetails(sceneType: SceneType): string[] {
  const options = WORLD_ALIVENESS_PROMPTS[sceneType] || WORLD_ALIVENESS_PROMPTS.exploration;
  // Pick 1-2 random prompts
  const count = Math.random() < 0.4 ? 2 : 1;
  const shuffled = [...options].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ── Principle Instructions Builder ──────────────────────────────

export function buildPrincipleInstructions(
  sceneType: SceneType,
  pacing: PacingNeed,
  hooksCount: number,
): string {
  const parts: string[] = [];

  // Scene-specific principles
  switch (sceneType) {
    case 'exploration':
      parts.push('SCENE: Exploration. Describe the world with discoverable details. Surface hooks through environment and NPC activity. Let the player choose what to engage with.');
      break;
    case 'combat':
      parts.push('SCENE: Combat. Focus on the fight. Enemy retaliation is mandatory. Keep narration tight and action-focused.');
      break;
    case 'social':
      parts.push('SCENE: Social interaction. Let NPCs carry the scene with dialogue. NPCs have their own agendas. Deepen world-building through conversation.');
      break;
    case 'aftermath':
      parts.push('SCENE: Aftermath. Let the consequences be visible. This is a moment to show what changed. Brief pause before the next beat.');
      break;
    case 'tension_building':
      parts.push('SCENE: Tension building. Increase environmental pressure subtly. Foreshadow upcoming events. Make the player feel something is coming.');
      break;
    case 'rest':
      parts.push('SCENE: Rest. Let time pass. Show the world changing while they rest. Brief, atmospheric.');
      break;
    case 'transition':
      parts.push('SCENE: Transition. Describe the journey briefly. Use environmental change to signal a new area.');
      break;
    case 'revelation':
      parts.push('SCENE: Revelation. Something important becomes clear. Let the moment land without rushing past it.');
      break;
  }

  // Pacing instructions
  switch (pacing) {
    case 'slow_down':
      parts.push('PACING: Slow. Let the player breathe. Describe the world at leisure. No urgency unless the player creates it.');
      break;
    case 'intensify':
      parts.push('PACING: Intensifying. Build tension gradually. Introduce complications or foreshadowing. The world is becoming more active.');
      break;
    case 'breathe':
      parts.push('PACING: Breathing room. The player needs a break from intensity. Dial back threats. Focus on atmosphere and recovery.');
      break;
    case 'climax':
      parts.push('PACING: Climactic. Major events are unfolding. High stakes, quick responses, consequences feel heavy.');
      break;
    case 'maintain':
      parts.push('PACING: Steady. Match the player\'s energy. React proportionally.');
      break;
  }

  // Hooks reminder
  if (hooksCount > 0) {
    parts.push(`HOOKS: There are ${hooksCount} active story hooks. Surface 1 naturally through the environment, NPCs, or consequences. Never present hooks as a menu.`);
  } else {
    parts.push('HOOKS: No active hooks. Consider embedding a new thread — a rumor, a suspicious detail, an NPC with a problem, or an environmental mystery.');
  }

  // Universal DM principles
  parts.push(
    'DM PRINCIPLES: ' +
    '(1) Player has freedom — never railroad, but always make the world interesting enough to engage with. ' +
    '(2) Consequences matter — decisions leave marks on the world, NPCs remember, environments change. ' +
    '(3) Clarity — the player should always understand where they are, what\'s happening, and what seems important. ' +
    '(4) Fairness — be consistent with established world rules. Dangerous things stay dangerous. ' +
    '(5) World aliveness — NPCs have lives, weather changes, off-screen events progress. ' +
    '(6) Character-centered — create situations that reveal who the character IS, not just what happens to them.'
  );

  return parts.join('\n');
}

// ── Main Guidance Builder ───────────────────────────────────────

export function buildNarratorGuidance(
  state: NarratorPrinciplesState,
  playerAction: string,
  hasActiveEnemies: boolean,
  characterId: string,
  /** Assembled context strings from existing narrative systems */
  narrativeContexts: {
    identity?: string;
    gravity?: string;
    pressure?: string | null;
    echo?: string | null;
    reflection?: string | null;
    conscience?: string | null;
  },
): NarratorGuidance {
  const model = state.campaignModel;
  const sceneType = classifyScene(playerAction, hasActiveEnemies, model.recentSceneTypes);
  const pacing = determinePacing(model.recentSceneTypes, model.storyPressure, hasActiveEnemies);
  const activeHooks = getActiveHooks(model);

  // Select hooks to surface (1-2 max per response)
  const hooksToSurface = activeHooks
    .sort((a, b) => b.priority - a.priority)
    .slice(0, Math.random() < 0.3 ? 2 : 1);

  const worldAliveness = getWorldAlivenessDetails(sceneType);
  const principleInstructions = buildPrincipleInstructions(sceneType, pacing, activeHooks.length);

  return {
    sceneType,
    pacing,
    hooksToSurface,
    identityContext: narrativeContexts.identity || '',
    gravityContext: narrativeContexts.gravity || '',
    pressureContext: narrativeContexts.pressure || null,
    echoContext: narrativeContexts.echo || null,
    reflectionContext: narrativeContexts.reflection || null,
    conscienceContext: narrativeContexts.conscience || null,
    worldAliveness,
    principleInstructions,
  };
}

// ── State Updater ───────────────────────────────────────────────

export function updatePrinciplesState(
  state: NarratorPrinciplesState,
  sceneType: SceneType,
  pacing: PacingNeed,
): NarratorPrinciplesState {
  const recentSceneTypes = [...state.campaignModel.recentSceneTypes, sceneType].slice(-PACING_HISTORY_SIZE);
  const sameSceneCount = sceneType === state.lastSceneType ? state.sameSceneCount + 1 : 1;

  return {
    ...state,
    campaignModel: {
      ...state.campaignModel,
      recentSceneTypes,
      currentPacing: pacing,
    },
    lastSceneType: sceneType,
    sameSceneCount,
    totalResponses: state.totalResponses + 1,
  };
}

// ── Narrator Context String for AI Prompt ───────────────────────

export function buildNarratorPrinciplesPromptBlock(guidance: NarratorGuidance): string {
  const sections: string[] = [];

  sections.push(guidance.principleInstructions);

  if (guidance.identityContext) {
    sections.push(`\nCHARACTER IDENTITY: ${guidance.identityContext}`);
  }

  if (guidance.gravityContext) {
    sections.push(`\nSTORY GRAVITY: ${guidance.gravityContext}`);
  }

  if (guidance.pressureContext) {
    sections.push(`\nNARRATIVE PRESSURE: ${guidance.pressureContext}`);
  }

  if (guidance.echoContext) {
    sections.push(`\nCHARACTER ECHO: ${guidance.echoContext}`);
  }

  if (guidance.reflectionContext) {
    sections.push(`\nREFLECTION MOMENT: ${guidance.reflectionContext}`);
  }

  if (guidance.conscienceContext) {
    sections.push(`\nCONSCIENCE ALERT: ${guidance.conscienceContext}`);
  }

  if (guidance.hooksToSurface.length > 0) {
    const hookDescs = guidance.hooksToSurface.map(h =>
      `• [${h.surfaceMethod}] ${h.description}`
    ).join('\n');
    sections.push(`\nACTIVE STORY HOOKS (weave 1 naturally — never present as menu):\n${hookDescs}`);
  }

  if (guidance.worldAliveness.length > 0) {
    sections.push(`\nWORLD ALIVENESS DETAILS:\n${guidance.worldAliveness.map(w => `• ${w}`).join('\n')}`);
  }

  return sections.join('\n');
}
