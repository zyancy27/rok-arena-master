/**
 * Battle Brain Sync Layer
 *
 * Handles state invalidation and rebuild logic when major
 * context changes happen (area transitions, mutations, level-ups).
 * Ensures no stale state persists across system boundaries.
 */

import type {
  UnifiedContext,
  UISignal,
  StateMutation,
  ContextMode,
} from './battleBrainTypes';

// ─── Invalidation Categories ────────────────────────────────────

export type InvalidationCategory =
  | 'area_change'
  | 'battlefield_mutation'
  | 'character_level_up'
  | 'scene_transition'
  | 'combat_start'
  | 'combat_end'
  | 'party_change'
  | 'time_change';

export interface InvalidationEvent {
  category: InvalidationCategory;
  detail: string;
  affectedSystems: string[];
}

// ─── Invalidation Rules ─────────────────────────────────────────

export function getInvalidationSignals(event: InvalidationEvent): UISignal[] {
  const signals: UISignal[] = [];

  switch (event.category) {
    case 'area_change':
      signals.push(
        { type: 'scene_rebuild', priority: 'immediate' },
        { type: 'map_refresh', priority: 'immediate' },
        { type: 'hazard_display_update', priority: 'normal' },
        { type: 'environment_stability_update', priority: 'normal' },
        { type: 'narrator_marker_update', priority: 'normal' },
      );
      break;

    case 'battlefield_mutation':
      signals.push(
        { type: 'zone_change', priority: 'immediate' },
        { type: 'map_refresh', payload: { partial: true }, priority: 'normal' },
        { type: 'hazard_display_update', priority: 'normal' },
      );
      break;

    case 'character_level_up':
      signals.push(
        { type: 'level_xp_update', priority: 'immediate' },
        { type: 'status_bar_update', priority: 'normal' },
        { type: 'notification_update', payload: { type: 'level_up' }, priority: 'normal' },
      );
      break;

    case 'scene_transition':
      signals.push(
        { type: 'scene_rebuild', priority: 'immediate' },
        { type: 'map_refresh', priority: 'immediate' },
        { type: 'sound_trigger', payload: { event: 'scene_transition' }, priority: 'normal' },
      );
      break;

    case 'combat_start':
      signals.push(
        { type: 'input_lock_change', payload: { locked: false }, priority: 'immediate' },
        { type: 'turn_indicator_update', priority: 'immediate' },
        { type: 'threat_panel_update', priority: 'normal' },
        { type: 'map_refresh', priority: 'normal' },
      );
      break;

    case 'combat_end':
      signals.push(
        { type: 'input_lock_change', payload: { locked: true }, priority: 'immediate' },
        { type: 'turn_indicator_update', priority: 'immediate' },
        { type: 'notification_update', payload: { type: 'combat_end' }, priority: 'normal' },
      );
      break;

    case 'party_change':
      signals.push(
        { type: 'status_bar_update', priority: 'normal' },
        { type: 'threat_panel_update', priority: 'normal' },
      );
      break;

    case 'time_change':
      signals.push(
        { type: 'environment_stability_update', priority: 'deferred' },
        { type: 'sound_trigger', payload: { event: 'time_change' }, priority: 'deferred' },
      );
      break;
  }

  return signals;
}

// ─── Context Mode Detector ──────────────────────────────────────

export function detectContextMode(
  hasBattle: boolean,
  hasCampaign: boolean,
  battleMode: string | null,
  isInCombat: boolean,
  isSolo: boolean,
  playerCount: number,
): ContextMode {
  if (hasBattle) {
    if (battleMode === 'eve') return 'eve';
    if (battleMode === 'pve') return 'pve';
    if (playerCount > 2) return 'pvpvp';
    return 'pvp';
  }

  if (hasCampaign) {
    if (isInCombat) return 'campaign_combat';
    if (!isSolo) return 'campaign_multiplayer';
    return 'campaign_exploration';
  }

  return 'dialogue';
}

// ─── Stale State Detector ───────────────────────────────────────

export interface StaleStateCheck {
  system: string;
  isStale: boolean;
  reason: string;
}

export function checkForStaleState(ctx: UnifiedContext): StaleStateCheck[] {
  const checks: StaleStateCheck[] = [];

  // Check if map state is stale relative to environment
  if (ctx.environment.environmentMemory) {
    const lastChange = ctx.environment.environmentMemory.changes?.slice(-1)[0];
    if (lastChange && ctx.ui.mapNeedsRefresh) {
      checks.push({
        system: 'map',
        isStale: true,
        reason: 'Environment changed but map not refreshed',
      });
    }
  }

  // Check if narrator context references old scene
  if (ctx.battle.battleState && ctx.environment.currentScenario) {
    const envLocation = ctx.battle.battleState.environment.locationName;
    if (envLocation && ctx.environment.currentScenario.environment !== envLocation) {
      checks.push({
        system: 'narrator',
        isStale: true,
        reason: 'Narrator scenario doesn\'t match current location',
      });
    }
  }

  return checks;
}
