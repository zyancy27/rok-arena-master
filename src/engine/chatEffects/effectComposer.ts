/**
 * Effect Composer
 *
 * Combines environment-driven and action-driven chat effects
 * with randomized variation to ensure no two moments look identical.
 */

import {
  type ChatEffect,
  EFFECT_CATALOG,
  detectActionCategories,
  findMatchingEffects,
  getEnvironmentEffects,
} from './effectLogic';

// ── Composed Effect Output ──────────────────────────────────────

export interface ComposedChatEffect {
  /** The base effect definition */
  effect: ChatEffect;
  /** Randomized intensity (0-1) */
  intensity: number;
  /** Randomized animation speed multiplier */
  speed: number;
  /** Randomized opacity */
  opacity: number;
  /** Source: what triggered this effect */
  source: 'environment' | 'action' | 'status' | 'combined';
}

export interface EffectCompositionResult {
  /** Active composed effects */
  effects: ComposedChatEffect[];
  /** CSS class string for easy application */
  cssClasses: string;
  /** CSS variables for variation parameters */
  cssVars: Record<string, string>;
}

// ── Variation Engine ────────────────────────────────────────────

function applyVariation(
  effect: ChatEffect,
  rng: () => number = Math.random,
): ComposedChatEffect {
  // Apply ±30% random variation to base parameters
  const vary = (base: number, range: number = 0.3) => {
    const delta = (rng() - 0.5) * 2 * range;
    return Math.max(0, Math.min(1, base + delta));
  };

  return {
    effect,
    intensity: vary(effect.intensity),
    speed: Math.max(0.3, effect.speed + (rng() - 0.5) * 0.6),
    opacity: vary(effect.opacity, 0.2),
    source: 'combined',
  };
}

// ── Composition Functions ───────────────────────────────────────

/**
 * Compose chat effects from environment tags + player action text.
 * This is the main entry point for the ChatEffectBrain.
 */
export function composeEffects(
  environmentTags: string[],
  actionText?: string,
  statusEffects?: string[],
  maxEffects: number = 4,
  rng: () => number = Math.random,
): EffectCompositionResult {
  const candidates: ChatEffect[] = [];
  const sources = new Map<string, 'environment' | 'action' | 'status'>();

  // 1. Environment-driven effects
  const envEffects = getEnvironmentEffects(environmentTags);
  for (const e of envEffects) {
    candidates.push(e);
    sources.set(e.id, 'environment');
  }

  // 2. Action-driven effects
  if (actionText) {
    const actionCategories = detectActionCategories(actionText);
    const actionEffects = findMatchingEffects(actionCategories, 3);
    for (const e of actionEffects) {
      if (!candidates.find((c) => c.id === e.id)) {
        candidates.push(e);
        sources.set(e.id, 'action');
      }
    }
  }

  // 3. Status-driven effects
  if (statusEffects && statusEffects.length > 0) {
    const statusCats = statusEffects.flatMap((s) => {
      // Map status names to categories
      const map: Record<string, string[]> = {
        burning: ['fire', 'heat'],
        frozen: ['ice', 'cold'],
        poisoned: ['toxic', 'biological'],
        electrified: ['electric', 'energy'],
        irradiated: ['reactor', 'energy'],
        blinded: ['light', 'darkness'],
        cursed: ['void', 'darkness'],
        blessed: ['celestial', 'light'],
      };
      return map[s] ?? [];
    });
    const statusFx = findMatchingEffects(statusCats, 2);
    for (const e of statusFx) {
      if (!candidates.find((c) => c.id === e.id)) {
        candidates.push(e);
        sources.set(e.id, 'status');
      }
    }
  }

  // 4. Apply variation and limit count
  const composed: ComposedChatEffect[] = candidates
    .slice(0, maxEffects)
    .map((effect) => {
      const varied = applyVariation(effect, rng);
      varied.source = sources.get(effect.id) ?? 'combined';
      return varied;
    });

  // 5. Build CSS output
  const cssClasses = composed.map((c) => c.effect.cssClass).join(' ');
  const cssVars: Record<string, string> = {};
  composed.forEach((c, i) => {
    cssVars[`--effect-${i}-intensity`] = c.intensity.toFixed(2);
    cssVars[`--effect-${i}-speed`] = `${c.speed.toFixed(2)}s`;
    cssVars[`--effect-${i}-opacity`] = c.opacity.toFixed(2);
  });
  cssVars['--effect-count'] = String(composed.length);

  return { effects: composed, cssClasses, cssVars };
}

/**
 * Quick compose — environment only (no action text).
 */
export function composeEnvironmentEffects(
  environmentTags: string[],
): EffectCompositionResult {
  return composeEffects(environmentTags);
}

/**
 * Quick compose — action only (no environment).
 */
export function composeActionEffects(
  actionText: string,
): EffectCompositionResult {
  return composeEffects([], actionText);
}
