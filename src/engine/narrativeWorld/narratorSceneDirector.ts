/**
 * Narrator Scene Director
 *
 * Decides HOW the narrator should behave in the current moment.
 * Controls narrator voice, emphasis, and response style based on
 * scene type, pacing, and character context.
 */

import type { SceneType, PacingNeed } from './narratorPrinciplesEngine';

// ── Types ───────────────────────────────────────────────────────

export type NarratorBehavior =
  | 'describe'        // Paint the scene with environmental detail
  | 'let_npc_speak'   // An NPC should carry the response
  | 'reveal_clue'     // Surface a story clue or discovery
  | 'apply_pressure'  // Create a character-revealing situation
  | 'let_breathe'     // Minimal narration, let exploration happen
  | 'remind_stakes'   // Remind player of consequences or objectives
  | 'acknowledge'     // World acknowledges player's reputation/behavior
  | 'transition'      // Bridge between scenes/zones
  | 'combat_focus';   // Tight, action-focused narration

export interface SceneDirective {
  /** Primary behavior for this response */
  primaryBehavior: NarratorBehavior;
  /** Secondary (optional) behavior */
  secondaryBehavior: NarratorBehavior | null;
  /** Max paragraph count for this response */
  maxParagraphs: number;
  /** Whether to include atmospheric detail */
  includeAtmosphere: boolean;
  /** Whether NPC dialogue should feature prominently */
  npcDialogueFocus: boolean;
  /** Whether to embed a story hook */
  embedHook: boolean;
  /** Instruction text for the AI */
  directorNote: string;
}

// ── Scene-Pacing Matrix ─────────────────────────────────────────

const BEHAVIOR_MATRIX: Record<SceneType, Record<PacingNeed, NarratorBehavior[]>> = {
  exploration: {
    slow_down: ['describe', 'let_breathe'],
    maintain: ['describe', 'let_npc_speak'],
    intensify: ['describe', 'reveal_clue'],
    breathe: ['let_breathe', 'describe'],
    climax: ['reveal_clue', 'apply_pressure'],
  },
  social: {
    slow_down: ['let_npc_speak'],
    maintain: ['let_npc_speak', 'acknowledge'],
    intensify: ['let_npc_speak', 'apply_pressure'],
    breathe: ['let_npc_speak'],
    climax: ['let_npc_speak', 'reveal_clue'],
  },
  combat: {
    slow_down: ['combat_focus'],
    maintain: ['combat_focus'],
    intensify: ['combat_focus'],
    breathe: ['combat_focus'],
    climax: ['combat_focus', 'apply_pressure'],
  },
  aftermath: {
    slow_down: ['let_breathe', 'acknowledge'],
    maintain: ['describe', 'remind_stakes'],
    intensify: ['remind_stakes', 'reveal_clue'],
    breathe: ['let_breathe'],
    climax: ['reveal_clue'],
  },
  tension_building: {
    slow_down: ['describe'],
    maintain: ['describe', 'apply_pressure'],
    intensify: ['apply_pressure', 'reveal_clue'],
    breathe: ['describe'],
    climax: ['apply_pressure'],
  },
  transition: {
    slow_down: ['transition', 'describe'],
    maintain: ['transition'],
    intensify: ['transition', 'reveal_clue'],
    breathe: ['transition', 'let_breathe'],
    climax: ['transition'],
  },
  revelation: {
    slow_down: ['reveal_clue'],
    maintain: ['reveal_clue', 'acknowledge'],
    intensify: ['reveal_clue'],
    breathe: ['reveal_clue'],
    climax: ['reveal_clue', 'apply_pressure'],
  },
  rest: {
    slow_down: ['let_breathe'],
    maintain: ['let_breathe', 'describe'],
    intensify: ['describe', 'remind_stakes'],
    breathe: ['let_breathe'],
    climax: ['remind_stakes'],
  },
};

// ── Director ────────────────────────────────────────────────────

export function directScene(
  sceneType: SceneType,
  pacing: PacingNeed,
  hasActiveHooks: boolean,
  hasNpcsNearby: boolean,
): SceneDirective {
  const behaviors = BEHAVIOR_MATRIX[sceneType]?.[pacing] || ['describe'];
  const primary = behaviors[0];
  const secondary = behaviors.length > 1 ? behaviors[1] : null;

  // Determine paragraph limits based on pacing
  let maxParagraphs: number;
  switch (pacing) {
    case 'slow_down': maxParagraphs = 3; break;
    case 'breathe': maxParagraphs = 2; break;
    case 'climax': maxParagraphs = 3; break;
    case 'intensify': maxParagraphs = 2; break;
    default: maxParagraphs = 2;
  }

  // Combat is always tight
  if (sceneType === 'combat') maxParagraphs = 2;

  const includeAtmosphere = sceneType !== 'combat' && pacing !== 'climax';
  const npcDialogueFocus = primary === 'let_npc_speak' || (hasNpcsNearby && sceneType === 'social');
  const embedHook = hasActiveHooks && Math.random() < 0.6 && sceneType !== 'combat';

  // Build director note for the AI
  const directorNote = buildDirectorNote(primary, secondary, sceneType, pacing, embedHook);

  return {
    primaryBehavior: primary,
    secondaryBehavior: secondary,
    maxParagraphs,
    includeAtmosphere,
    npcDialogueFocus,
    embedHook,
    directorNote,
  };
}

function buildDirectorNote(
  primary: NarratorBehavior,
  secondary: NarratorBehavior | null,
  sceneType: SceneType,
  pacing: PacingNeed,
  embedHook: boolean,
): string {
  const notes: string[] = [];

  const behaviorNotes: Record<NarratorBehavior, string> = {
    describe: 'Describe the environment with concrete, useful detail. What is here? What could matter? Skip generic atmosphere.',
    let_npc_speak: 'Let an NPC carry this response with direct dialogue. The world speaks through its people, not narrator prose.',
    reveal_clue: 'Surface a story clue naturally — something specific the player notices or finds. Not atmospheric hints.',
    apply_pressure: 'Create a concrete situation that forces a decision. A real problem, not a vague feeling of tension.',
    let_breathe: 'Minimal narration. One or two short sentences. Let the player decide what to do next.',
    remind_stakes: 'Remind the player of something unresolved — a specific thread, deadline, or consequence. Be concrete.',
    acknowledge: 'An NPC reacts to the character\'s reputation or behavior pattern. Show it through NPC action or dialogue.',
    transition: 'Bridge between scenes briefly. What changed? Where are they now? One or two sentences.',
    combat_focus: 'Tight, action-focused. What the enemy does. What happened. No atmospheric padding.',
  };

  notes.push(`NARRATOR DIRECTIVE: ${behaviorNotes[primary]}`);
  if (secondary) {
    notes.push(`SECONDARY: ${behaviorNotes[secondary]}`);
  }

  if (embedHook) {
    notes.push('HOOK: Embed one active story hook naturally into the scene. Do NOT present it as a choice — weave it into the world.');
  }

  return notes.join(' ');
}

// ── Build AI Prompt Block ───────────────────────────────────────

export function buildSceneDirectorPromptBlock(directive: SceneDirective): string {
  const parts: string[] = [];

  parts.push(directive.directorNote);
  parts.push(`Response length: ${directive.maxParagraphs} paragraphs max.`);

  if (directive.npcDialogueFocus) {
    parts.push('Prioritize NPC dialogue over narrator description.');
  }

  if (directive.includeAtmosphere) {
    parts.push('Include brief atmospheric detail (1 sentence max).');
  }

  return parts.join(' ');
}
