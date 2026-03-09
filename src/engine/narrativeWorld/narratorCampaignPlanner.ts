/**
 * Narrator Campaign Planner
 *
 * Maintains high-level campaign story understanding.
 * Tracks premise, arcs, objectives, unresolved threads, and hooks.
 * Provides the narrator with campaign-level awareness for every response.
 */

import type {
  CampaignNarrativeModel,
  StoryHook,
} from './narratorPrinciplesEngine';
import { addStoryHook, resolveHook } from './narratorPrinciplesEngine';

// ── Types ───────────────────────────────────────────────────────

export interface CampaignPlannerInput {
  campaignDescription: string;
  currentZone: string;
  dayCount: number;
  timeOfDay: string;
  storyContext: Record<string, unknown>;
  worldState: Record<string, unknown>;
  knownNpcCount: number;
  activeEnemyCount: number;
  playerAction: string;
  /** Narrator response metadata (zone changes, encounters, etc.) */
  narratorResponse?: {
    newZone?: string | null;
    encounterType?: string | null;
    enemySpawned?: boolean;
    npcInteracted?: boolean;
  };
}

// ── Thread Detection ────────────────────────────────────────────

const THREAD_PATTERNS = [
  { pattern: /\b(missing|disappeared|vanished|gone|lost)\b.*\b(person|people|child|friend|ally|npc)\b/i, thread: 'missing_person' },
  { pattern: /\b(strange|mysterious|unusual|weird)\b.*\b(sound|noise|light|mark|symbol)\b/i, thread: 'mystery' },
  { pattern: /\b(danger|threat|enemy|hostile|attack)\b.*\b(approach|coming|near|advancing)\b/i, thread: 'incoming_threat' },
  { pattern: /\b(quest|mission|task|job|request)\b/i, thread: 'active_quest' },
  { pattern: /\b(treasure|artifact|relic|valuable|hidden)\b/i, thread: 'treasure_hunt' },
  { pattern: /\b(rumor|heard|whisper|gossip|word)\b/i, thread: 'rumor' },
];

export function detectThreadsFromAction(action: string): string[] {
  const threads: string[] = [];
  for (const { pattern, thread } of THREAD_PATTERNS) {
    if (pattern.test(action)) threads.push(thread);
  }
  return threads;
}

// ── Hook Generators ─────────────────────────────────────────────

export function generateContextualHooks(
  model: CampaignNarrativeModel,
  input: CampaignPlannerInput,
  turn: number,
): CampaignNarrativeModel {
  let updated = model;

  // If entering a new zone, add exploration hook
  if (input.narratorResponse?.newZone) {
    updated = addStoryHook(
      updated,
      `New area: ${input.narratorResponse.newZone} — something notable is here to discover.`,
      'environment',
      6,
      turn,
    );
  }

  // If many NPCs are known but no active hooks involve NPCs, add one
  const hasNpcHook = updated.activeHooks.some(h => h.surfaceMethod === 'npc' && h.active);
  if (input.knownNpcCount >= 3 && !hasNpcHook) {
    updated = addStoryHook(
      updated,
      'An NPC the player has met before could reappear with new information or a request.',
      'npc',
      5,
      turn,
    );
  }

  // If no enemies and no danger hooks, consider adding subtle danger
  const hasDangerHook = updated.activeHooks.some(h => h.surfaceMethod === 'danger' && h.active);
  if (input.activeEnemyCount === 0 && !hasDangerHook && Math.random() < 0.25) {
    updated = addStoryHook(
      updated,
      'A subtle sign of danger or threat lurking at the edge of perception.',
      'danger',
      4,
      turn,
    );
  }

  return updated;
}

// ── Story Pressure Calculator ───────────────────────────────────

export function calculateStoryPressure(
  model: CampaignNarrativeModel,
  input: CampaignPlannerInput,
): number {
  let pressure = model.storyPressure;

  // Active enemies increase pressure
  if (input.activeEnemyCount > 0) pressure += 15;

  // New encounters spike pressure
  if (input.narratorResponse?.enemySpawned) pressure += 20;

  // Quiet exploration reduces pressure
  if (input.activeEnemyCount === 0 && !input.narratorResponse?.encounterType) {
    pressure -= 5;
  }

  // Unresolved threads increase ambient pressure
  pressure += model.unresolvedThreads.length * 2;

  // Clamp
  return Math.max(0, Math.min(100, pressure));
}

// ── Campaign Context Builder for AI ─────────────────────────────

export function buildCampaignPlannerContext(model: CampaignNarrativeModel): string {
  const parts: string[] = [];

  parts.push(`CAMPAIGN BRAIN — STORY AWARENESS:`);
  parts.push(`Premise: ${model.premise}`);

  if (model.currentArc) {
    parts.push(`Current Arc: ${model.currentArc}`);
  }

  if (model.currentObjective) {
    parts.push(`Active Objective: ${model.currentObjective}`);
  }

  if (model.unresolvedThreads.length > 0) {
    parts.push(`Unresolved Threads: ${model.unresolvedThreads.join('; ')}`);
  }

  parts.push(`Story Pressure: ${model.storyPressure}/100 (${model.storyPressure < 25 ? 'calm' : model.storyPressure < 50 ? 'building' : model.storyPressure < 75 ? 'tense' : 'critical'})`);
  parts.push(`Emotional Tone: ${model.emotionalTone}`);

  return parts.join('\n');
}

// ── Update Model from Response ──────────────────────────────────

export function updateModelFromResponse(
  model: CampaignNarrativeModel,
  input: CampaignPlannerInput,
  turn: number,
): CampaignNarrativeModel {
  let updated = { ...model };

  // Update story pressure
  updated.storyPressure = calculateStoryPressure(updated, input);

  // Detect new threads from player action
  const newThreads = detectThreadsFromAction(input.playerAction);
  for (const thread of newThreads) {
    if (!updated.unresolvedThreads.includes(thread)) {
      updated.unresolvedThreads = [...updated.unresolvedThreads, thread];
    }
  }

  // Generate contextual hooks
  updated = generateContextualHooks(updated, input, turn);

  return updated;
}
