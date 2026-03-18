import { interpretMove, type MoveIntent } from '@/lib/intent-interpreter';
import { classifyIntent } from './IntentClassifier';
import { parseIntentDetails } from './IntentParser';
import { resolveIntentContext } from './IntentContextResolver';

export type IntentType = 'attack' | 'move' | 'interact' | 'speak' | 'observe' | 'ability';
export type EmotionalTone = 'calm' | 'aggressive' | 'fearful' | 'dominant';

export type Intent = {
  type: IntentType;
  subType?: string;
  target?: string;
  tool?: string;
  method?: string;
  intensity?: number;
  precision?: number;
  riskLevel?: number;
  emotionalTone?: EmotionalTone;
  isCombatAction: boolean;
  requiresRoll: boolean;
  rawText: string;
};

export interface IntentEntity {
  id?: string;
  name: string;
  kind?: 'enemy' | 'npc' | 'object' | 'ally' | 'player';
}

export interface IntentEngineContext {
  mode?: 'battle' | 'campaign' | 'dialogue' | 'world';
  actorName?: string;
  possibleTargets?: IntentEntity[];
  nearbyEnemies?: IntentEntity[];
  nearbyNpcs?: IntentEntity[];
  nearbyObjects?: IntentEntity[];
  defaultTool?: string | null;
}

export interface IntentClassificationDebug {
  type: IntentType;
  confidence: number;
  isCombatAction: boolean;
  requiresRoll: boolean;
  sourceHints: string[];
}

export interface IntentDebugPayload {
  intent: Intent;
  classification: IntentClassificationDebug;
  inferredValues: string[];
  fallbackNotes: string[];
}

export interface IntentEngineResult {
  intent: Intent;
  legacyMoveIntent: MoveIntent;
  confidence: number;
  debug: IntentDebugPayload;
}

const createFallbackIntent = (rawText: string): Intent => ({
  type: 'observe',
  isCombatAction: false,
  requiresRoll: false,
  rawText,
});

export const IntentEngine = {
  resolve(rawText: string, context: IntentEngineContext = {}): IntentEngineResult {
    const normalizedText = rawText.trim();
    const legacyMoveIntent = interpretMove(normalizedText);
    const classified = classifyIntent(normalizedText, legacyMoveIntent, context);
    const parsed = parseIntentDetails(normalizedText, legacyMoveIntent, classified, context);
    const resolved = resolveIntentContext({
      ...createFallbackIntent(normalizedText),
      type: classified.type,
      subType: classified.subType,
      isCombatAction: classified.isCombatAction,
      requiresRoll: classified.requiresRoll,
      ...parsed,
      rawText: normalizedText,
    }, context);

    const intent: Intent = {
      ...createFallbackIntent(normalizedText),
      ...resolved.intent,
      rawText: normalizedText,
    };

    return {
      intent,
      legacyMoveIntent,
      confidence: classified.confidence,
      debug: {
        intent,
        classification: {
          type: classified.type,
          confidence: classified.confidence,
          isCombatAction: classified.isCombatAction,
          requiresRoll: classified.requiresRoll,
          sourceHints: classified.sourceHints,
        },
        inferredValues: parsed.inferredValues,
        fallbackNotes: resolved.fallbackNotes,
      },
    };
  },
};
