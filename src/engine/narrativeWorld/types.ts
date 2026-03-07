/**
 * Narrative-Aware World Systems — Shared Types
 *
 * Types for all 9 systems that generate environments and situations
 * to help players discover who their characters are through story.
 */

import type { BiomeBase, BiomeModifier } from '../biomeComposer/types';

// ── System 1 — Biome Transition Engine ──────────────────────────

export type BiomeToneTag =
  | 'mysterious' | 'dangerous' | 'sacred' | 'desolate'
  | 'corrupted' | 'industrial' | 'peaceful' | 'chaotic'
  | 'ancient' | 'desperate' | 'hopeful' | 'oppressive';

export interface BiomeTransitionStep {
  biome: BiomeBase;
  modifiers: BiomeModifier[];
  tone: BiomeToneTag;
  narrativeHint: string;
  /** Environmental clues generated for this step */
  clues: EnvironmentalClue[];
}

export interface BiomeTransitionPath {
  steps: BiomeTransitionStep[];
  emotionalArc: string;
  /** Suggested narrator context for the transition */
  narratorContext: string;
}

// ── System 2 — Structural Stress ────────────────────────────────

export type StressState = 'stable' | 'strained' | 'cracking' | 'failing' | 'collapsed';

export interface StructuralStressRecord {
  structureId: string;
  label: string;
  zoneId: string;
  state: StressState;
  stressLevel: number; // 0–100
  /** Narrator descriptions for each threshold */
  stateDescriptions: Record<StressState, string>;
  lastUpdateTurn: number;
}

// ── System 3 — Environmental Story Clues ────────────────────────

export type ClueCategory = 'decay' | 'conflict' | 'presence' | 'mystery' | 'danger' | 'history';

export interface EnvironmentalClue {
  id: string;
  description: string;
  category: ClueCategory;
  /** Can the narrator reference this for deeper story? */
  inspectable: boolean;
  /** Optional discovery prompt if player investigates */
  discoveryPrompt?: string;
  zoneId?: string;
}

// ── System 4 — Character Discovery Prompts ──────────────────────

export type DiscoveryPromptType = 'moral' | 'curiosity' | 'risk' | 'empathy' | 'resourcefulness';

export interface CharacterDiscoveryPrompt {
  id: string;
  type: DiscoveryPromptType;
  prompt: string;
  /** Situational context that triggered this */
  trigger: string;
  /** Does not force a choice — purely optional */
  optional: true;
}

// ── System 5 — Environment Memory ───────────────────────────────

export interface EnvironmentChange {
  id: string;
  description: string;
  zoneId: string;
  turnApplied: number;
  persistent: boolean;
  /** Narrator can reference this later */
  narratorReference: string;
}

export interface EnvironmentMemoryState {
  changes: EnvironmentChange[];
  /** Zone → list of change IDs */
  zoneChanges: Record<string, string[]>;
}

// ── System 6 — Narrative Landmark Awareness ─────────────────────

export interface TrackedLandmark {
  id: string;
  name: string;
  description: string;
  zoneId: string;
  isDestroyed: boolean;
  referenceCount: number;
  lastReferencedTurn: number;
  /** Short narrator-ready phrase */
  narratorTag: string;
}

// ── System 7 — Character Signature Interactions ─────────────────

export type SignaturePattern = 'stealth' | 'investigation' | 'aggression' | 'protection' | 'diplomacy' | 'exploration' | 'destruction';

export interface CharacterSignatureProfile {
  characterId: string;
  patterns: Record<SignaturePattern, number>;
  dominantPattern: SignaturePattern;
  totalActions: number;
}

// ── System 8 — Discovery Moments ────────────────────────────────

export type DiscoveryRarity = 'uncommon' | 'rare' | 'legendary';

export interface DiscoveryMoment {
  id: string;
  type: 'hidden_entrance' | 'forgotten_item' | 'secret_path' | 'ancient_relic' | 'hidden_message' | 'buried_cache';
  name: string;
  description: string;
  rarity: DiscoveryRarity;
  /** Narrator description when found */
  revealText: string;
  zoneId?: string;
}

// ── System 9 — Emotional Environment Pressure ───────────────────

export type EmotionalPressureState = 'stable' | 'strained' | 'unstable' | 'critical' | 'collapse';

export interface EmotionalPressureMeter {
  level: number; // 0–100
  state: EmotionalPressureState;
  /** Narrative tension factors contributing */
  tensionFactors: string[];
  /** Narrator context for current state */
  narratorHint: string;
}

// ── System 10 — Narrative Pressure Engine ───────────────────────

export type { NarrativePressureType, NarrativePressureEvent, PressureConditions, NarrativePressureState } from './narrativePressureEngine';
