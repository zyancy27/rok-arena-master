import type { MoveIntent } from '@/lib/intent-interpreter';
import type { NarrationVoiceSettings, NarratorSceneContext } from '@/systems/narration/SpeechManager';
import type { ResolvedCharacterContext } from '@/systems/character/CharacterContextResolver';
import type { StructuredCombatResult } from '@/systems/combat/CombatResolver';
import type { Intent, IntentDebugPayload } from '@/systems/intent/IntentEngine';
import type { ActionResult } from '@/systems/resolution/ActionResolver';

export interface MemoryContextEntry {
  subjectId?: string;
  type: string;
  intensity: number;
  valence?: number;
  timestamp?: number;
  notes?: string;
}

export interface MemoryContextPacket {
  entries: MemoryContextEntry[];
  summary: string[];
}

export interface RelationshipContextEntry {
  entityId: string;
  disposition?: string;
  trustLevel: number;
  notes?: string;
  tags: string[];
}

export interface RelationshipContextPacket {
  entries: RelationshipContextEntry[];
  summary: string[];
}

export interface ContextTargetPacket {
  id?: string;
  name: string;
  kind?: 'enemy' | 'npc' | 'object' | 'ally' | 'player';
  context?: ResolvedCharacterContext | null;
  metadata?: Record<string, unknown>;
}

export interface ContextPacket {
  mode: 'battle' | 'campaign';
  actor: ResolvedCharacterContext;
  targets: ContextTargetPacket[];
  primaryTarget: ContextTargetPacket | null;
  zone: string | null;
  environmentTags: string[];
  activeHazards: string[];
  worldState?: Record<string, unknown> | null;
  partyContext?: string[];
  relationshipContext: RelationshipContextPacket;
  memoryContext: MemoryContextPacket;
  narratorSceneContext: NarratorSceneContext;
  sceneState: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ResolvedActionPacket {
  rawText: string;
  intent: Intent;
  intentDebug: IntentDebugPayload;
  legacyMoveIntent: MoveIntent;
  confidence: number;
  actorContext: ResolvedCharacterContext;
  targetContext?: ResolvedCharacterContext | null;
  actionResult: ActionResult;
  combatResult?: StructuredCombatResult | null;
  structuredAction: string;
  context: ContextPacket;
}

export interface NpcReactionPacket {
  summary: string;
  focusTargetId?: string;
  narration?: {
    text: string;
    voiceRate?: number;
    voicePitch?: number;
    soundCue?: string;
    animationTag?: string;
  } | null;
  rawTurn?: unknown;
  metadata?: Record<string, unknown>;
}

export interface SceneEffectPacket {
  zoneShiftTags: string[];
  hazardPulseTags: string[];
  enemyPresenceTags: string[];
  environmentalPressureTags: string[];
  metadata?: Record<string, unknown>;
}

export interface NarrationPacket {
  narratorText: string | null;
  context: NarratorSceneContext;
  metadata?: Record<string, unknown>;
  voiceSettings?: NarrationVoiceSettings;
  soundCue?: string;
  animationTag?: string;
  diceMetadata?: Record<string, unknown> | null;
  npcReactionSummary?: string | null;
  mapEffectTags?: string[];
}

export interface ActionPipelineResult {
  context: ContextPacket;
  resolvedAction: ResolvedActionPacket;
  npcReaction: NpcReactionPacket | null;
  sceneEffects: SceneEffectPacket;
  narrationPacket: NarrationPacket;
  generatedPackets?: {
    actorIdentity?: unknown;
    worldState?: unknown;
    campaignSeed?: unknown;
    npcIdentity?: unknown;
    encounter?: unknown;
    sceneState?: unknown;
    effectState?: unknown;
  };
}
