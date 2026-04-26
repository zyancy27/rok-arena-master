/**
 * NarratorResponseGroup
 *
 * Per-response orchestration of:
 *   1. live typing reveal of narrator + NPC bubbles, in order
 *   2. ordered sound-cue events tied to specific bubbles in the group
 *
 * The group key is the existing `structuredTurnGroupId` already produced by
 * `campaign-message-normalizer.ts`, so this layer is additive — no schema or
 * persistence changes required.
 *
 * Audio playback (TTS) is still owned by `useNarratorVoice` /
 * `NarrationOrchestrator`; this module only handles the cue-event timing,
 * not voice playback.
 *
 * NOTE: Real audio cues are produced by the existing
 * `getNarrationSoundManager` + `narrator-ambient-sfx` edge function. This
 * module only chooses WHICH cue ids to fire and WHEN, then delegates to
 * the manager — which already enforces cooldowns and density limits.
 */

import { getNarrationSoundManager } from '@/lib/audio/narration-sound-manager';

/** Lightweight description of one bubble inside a generated response. */
export interface NarratorResponseAct {
  messageId: string;
  /** Sequence index inside the group. */
  actIndex: number;
  speakerType: 'narrator' | 'npc' | 'environment' | 'consequence' | 'system' | 'hook';
  speakerName?: string | null;
  text: string;
}

export interface NarratorResponseGroup {
  responseGroupId: string;
  acts: NarratorResponseAct[];
}

/**
 * Map a snippet of text to a candidate cue id understood by
 * `narration-sound-manager`. We deliberately keep this small — the manager
 * enforces cooldowns, so over-eager matches are filtered downstream.
 */
const CUE_PATTERNS: Array<{ cueId: string; pattern: RegExp }> = [
  { cueId: 'explosion',     pattern: /\b(explos|blast|detonat|fireball)\b/i },
  { cueId: 'sword_clash',   pattern: /\b(blade|sword|steel)\s*(clash|ring|meet)|parry|riposte\b/i },
  { cueId: 'impact',        pattern: /\b(slam|smash|crash|impact|strike|crunch|crack)\b/i },
  { cueId: 'magic',         pattern: /\b(magic|spell|arcane|incantation|hex|sigil|glyph|mana)\b/i },
  { cueId: 'wind_gust',     pattern: /\b(wind|gust|gale)\b/i },
  { cueId: 'rain_start',    pattern: /\b(rain|downpour|drizzle)\b/i },
  { cueId: 'thunder_crack', pattern: /\b(thunder|lightning)\b/i },
  { cueId: 'footsteps',     pattern: /\b(footsteps?|approaches?|paces?|sneaks?|creeps?)\b/i },
  { cueId: 'heartbeat',     pattern: /\b(heart\s*pound|pulse\s*quicken|panic|dread|fear grips)\b/i },
  { cueId: 'crowd',         pattern: /\b(crowd|onlooker|tavern|market|plaza)\b/i },
  { cueId: 'fire_crackle',  pattern: /\b(fire|flame|torch|campfire|pyre)\b/i },
  { cueId: 'water_splash',  pattern: /\b(splash|plunge|dive|river|stream)\b/i },
];

/**
 * Pick at most one cue id for an act of generated text, biased to the
 * STRONGEST signal. Returns null if nothing meaningful matched.
 */
export function pickCueForAct(text: string): string | null {
  for (const entry of CUE_PATTERNS) {
    if (entry.pattern.test(text)) return entry.cueId;
  }
  return null;
}

/** In-flight tracking so the same group never fires its cues twice. */
const dispatchedGroups = new Set<string>();

export function __resetResponseGroupForTests() {
  dispatchedGroups.clear();
}

/**
 * Dispatch ordered sound cues for a freshly-arrived response group.
 *
 * Timing model: cues are scheduled at fixed intervals across the group so
 * later acts get later cues, mirroring read-order. The manager itself
 * enforces cooldown + density caps, so a noisy group degrades gracefully.
 */
export function dispatchResponseGroupCues(group: NarratorResponseGroup, options?: {
  /** Milliseconds between successive act cues. Default 1200ms. */
  perActDelay?: number;
  /** Hard cap on cues per group. Default 3. */
  maxCues?: number;
}) {
  if (dispatchedGroups.has(group.responseGroupId)) return;
  dispatchedGroups.add(group.responseGroupId);

  const perActDelay = options?.perActDelay ?? 1200;
  const maxCues = options?.maxCues ?? 3;
  const manager = getNarrationSoundManager();

  let firedCount = 0;
  group.acts.forEach((act, index) => {
    if (firedCount >= maxCues) return;
    const cueId = pickCueForAct(act.text);
    if (!cueId) return;
    firedCount++;
    const delay = index * perActDelay + 250;
    setTimeout(() => {
      try {
        manager.playCueById(cueId);
      } catch {
        // sound manager owns its own resilience; swallow
      }
    }, delay);
  });
}

/** Cap so the dispatched-group set doesn't grow unbounded. */
const DISPATCHED_GROUPS_CAP = 200;
const _origAdd = dispatchedGroups.add.bind(dispatchedGroups);
dispatchedGroups.add = (value: string) => {
  if (dispatchedGroups.size >= DISPATCHED_GROUPS_CAP) {
    const first = dispatchedGroups.values().next().value;
    if (first) dispatchedGroups.delete(first);
  }
  return _origAdd(value);
};
