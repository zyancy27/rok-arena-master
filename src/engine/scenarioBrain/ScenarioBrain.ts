/**
 * ScenarioBrain — Procedural Scenario Intelligence
 *
 * The main orchestrator that generates unique battle environments
 * using layered composition, contextual reasoning, and memory-based
 * deduplication. Replaces template-driven generation with a
 * reasoning-based approach.
 *
 * Usage:
 *   const brain = new ScenarioBrain();
 *   const scenario = brain.generate({ battleIntensity: 0.6, averageTier: 3, ... });
 */

import { type ScenarioContext } from './scenarioLogic';
import { composeScenario, type ComposedScenario } from './scenarioComposer';
import { ScenarioMemory, createScenarioMemory } from './scenarioMemory';
import { createSeededRandom } from './scenarioRandomizer';

export interface ScenarioBrainOptions {
  /** Optional seed for deterministic generation */
  seed?: string;
}

export class ScenarioBrain {
  private memory: ScenarioMemory;
  private rng: () => number;

  constructor(options: ScenarioBrainOptions = {}) {
    this.memory = createScenarioMemory();
    this.rng = options.seed ? createSeededRandom(options.seed) : Math.random;
  }

  /**
   * Generate a unique scenario based on battle context.
   * Automatically prevents repeats via memory.
   */
  generate(context: Partial<ScenarioContext> = {}): ComposedScenario {
    const fullContext: ScenarioContext = {
      battleIntensity: context.battleIntensity ?? 0.5,
      averageTier: context.averageTier ?? 3,
      characterAbilities: context.characterAbilities ?? [],
      locationHint: context.locationHint,
      previousHazards: context.previousHazards ?? this.getPreviousHazards(),
      escalationCount: context.escalationCount ?? 0,
      rng: this.rng,
    };

    return composeScenario(fullContext, this.memory);
  }

  /**
   * Generate a scenario formatted for the emergency location edge function.
   * Returns the data structure expected by the existing battle system.
   */
  generateEmergencyPayload(context: Partial<ScenarioContext> = {}): {
    name: string;
    description: string;
    hazards: string;
    urgency: string;
    tags: string[];
    composedFrom: ComposedScenario;
  } {
    const scenario = this.generate(context);

    return {
      name: this.formatName(scenario),
      description: scenario.narrativeHook,
      hazards: scenario.hazards.join(', '),
      urgency: this.formatUrgencyDescription(scenario),
      tags: scenario.tags,
      composedFrom: scenario,
    };
  }

  /** Get the memory instance for external inspection */
  getMemory(): ScenarioMemory {
    return this.memory;
  }

  /** Reset scenario memory (e.g., new battle session) */
  resetMemory(): void {
    this.memory.clear();
  }

  /** Get all previously used hazards for dedup */
  private getPreviousHazards(): string[] {
    return this.memory.getHistory().flatMap((fp) => fp.hazards);
  }

  /** Format a human-readable scenario name */
  private formatName(scenario: ComposedScenario): string {
    const situationWord = scenario.situation.split(' ')[0];
    const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    return `${capitalise(situationWord)} ${capitalise(scenario.environment)}`;
  }

  /** Format urgency as a narrative countdown */
  private formatUrgencyDescription(scenario: ComposedScenario): string {
    const countdowns: Record<string, string> = {
      minor: 'The situation is developing — plenty of time to act.',
      moderate: 'Conditions are worsening — act within the next few minutes.',
      severe: 'Critical failure imminent — seconds count.',
      catastrophic: 'Total collapse underway — react NOW or be consumed.',
    };
    return countdowns[scenario.urgency] ?? countdowns.moderate;
  }
}

/** Factory function */
export function createScenarioBrain(options?: ScenarioBrainOptions): ScenarioBrain {
  return new ScenarioBrain(options);
}
