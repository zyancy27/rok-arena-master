/**
 * ChatEffectBrain — Dynamic Visual Chat Effect Generator
 *
 * Analyzes player actions, environment state, and battle context
 * to produce dynamic visual effects for the chat interface.
 * Replaces fixed pattern lists with contextual reasoning.
 *
 * Usage:
 *   const brain = new ChatEffectBrain();
 *   brain.setEnvironment(['fire', 'industrial']);
 *   const result = brain.processAction("I slam my blade into the reactor core");
 *   // result.effects → [energySparks, alarmFlash, screenShake, sparks]
 *   // result.cssClasses → "env-electric-sparks env-alarm env-shake env-sparks"
 */

import {
  composeEffects,
  composeEnvironmentEffects,
  type EffectCompositionResult,
  type ComposedChatEffect,
} from './effectComposer';

export class ChatEffectBrain {
  private environmentTags: string[] = [];
  private activeStatusEffects: string[] = [];
  private effectHistory: ComposedChatEffect[] = [];
  private rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  /** Update current environment tags (from theme engine or ScenarioBrain) */
  setEnvironment(tags: string[]): void {
    this.environmentTags = [...tags];
  }

  /** Update active character status effects */
  setStatusEffects(effects: string[]): void {
    this.activeStatusEffects = [...effects];
  }

  /**
   * Process a player action and generate appropriate chat effects.
   * Combines environment context + action detection + status effects.
   */
  processAction(actionText: string): EffectCompositionResult {
    const result = composeEffects(
      this.environmentTags,
      actionText,
      this.activeStatusEffects,
      4,
      this.rng,
    );

    // Track effect history for potential future variation
    this.effectHistory.push(...result.effects);
    if (this.effectHistory.length > 30) {
      this.effectHistory = this.effectHistory.slice(-30);
    }

    return result;
  }

  /**
   * Get ambient effects based on current environment only (no action).
   * Useful for idle/between-turn visuals.
   */
  getAmbientEffects(): EffectCompositionResult {
    return composeEnvironmentEffects(this.environmentTags);
  }

  /**
   * Get effects from the catalog matching specific categories.
   */
  getEffectsForCategories(categories: string[]): EffectCompositionResult {
    return composeEffects(categories);
  }

  /** Get recent effect history */
  getHistory(): readonly ComposedChatEffect[] {
    return this.effectHistory;
  }

  /** Clear state */
  reset(): void {
    this.environmentTags = [];
    this.activeStatusEffects = [];
    this.effectHistory = [];
  }
}

/** Factory function */
export function createChatEffectBrain(rng?: () => number): ChatEffectBrain {
  return new ChatEffectBrain(rng);
}
