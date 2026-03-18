import type { MoveIntent } from '@/lib/intent-interpreter';
import type { IntentClassificationResult } from './IntentClassifier';
import type { EmotionalTone, IntentEngineContext } from './IntentEngine';

interface IntentParseResult {
  target?: string;
  tool?: string;
  method?: string;
  intensity?: number;
  precision?: number;
  riskLevel?: number;
  emotionalTone?: EmotionalTone;
  inferredValues: string[];
}

const METHOD_PATTERNS = ['swing', 'lunge', 'slash', 'stab', 'shoot', 'rush', 'sneak', 'block', 'dodge', 'grapple', 'scan', 'inspect', 'negotiate', 'taunt', 'charge'];
const HIGH_INTENSITY = /\b(all out|furious|viciously|violently|hard|full force|with everything|brutal|smash|crush)\b/i;
const LOW_INTENSITY = /\b(gently|lightly|carefully|softly|slowly|steady)\b/i;
const HIGH_PRECISION = /\b(carefully|precisely|accurately|surgically|deliberately|calculated|focused)\b/i;
const LOW_PRECISION = /\b(quickly|wildly|roughly|blindly|frantically|desperately|hastily)\b/i;
const HIGH_RISK = /\b(reckless|all in|without hesitation|blindly|desperate|wild|full speed)\b/i;
const LOW_RISK = /\b(careful|cautious|from cover|defensively|measured|patient)\b/i;

const TONE_PATTERNS: Array<{ tone: EmotionalTone; pattern: RegExp }> = [
  { tone: 'aggressive', pattern: /\b(attack|rage|furious|slam|crush|destroy|smash|rip|kill)\b/i },
  { tone: 'fearful', pattern: /\b(scared|afraid|fear|panic|hesitant|nervous|retreat)\b/i },
  { tone: 'dominant', pattern: /\b(command|dominate|intimidate|order|force|tower over|assert)\b/i },
  { tone: 'calm', pattern: /\b(calmly|quietly|gently|steady|measured|observe|study)\b/i },
];

function extractNamedTarget(rawText: string, context: IntentEngineContext): string | undefined {
  const lowered = rawText.toLowerCase();
  return context.possibleTargets?.find(target => lowered.includes(target.name.toLowerCase()))?.name;
}

function extractTool(rawText: string, legacyMoveIntent: MoveIntent): string | undefined {
  const withMatch = rawText.match(/\b(?:with|using|via|through)\s+([a-zA-Z][\w\s'-]{1,40})/i);
  if (withMatch?.[1]) {
    return withMatch[1].trim().replace(/[.,!?]+$/, '');
  }

  const firstElement = legacyMoveIntent.detectedElements[0];
  if (firstElement) {
    return firstElement.toLowerCase();
  }

  return undefined;
}

function extractMethod(rawText: string): string | undefined {
  const lowered = rawText.toLowerCase();
  return METHOD_PATTERNS.find(method => lowered.includes(method));
}

function scoreByLanguage(highPattern: RegExp, lowPattern: RegExp, fallback: number, rawText: string) {
  if (highPattern.test(rawText)) return 85;
  if (lowPattern.test(rawText)) return 30;
  return fallback;
}

export function parseIntentDetails(
  rawText: string,
  legacyMoveIntent: MoveIntent,
  classification: IntentClassificationResult,
  context: IntentEngineContext = {},
): IntentParseResult {
  const inferredValues: string[] = [];

  const target = extractNamedTarget(rawText, context);
  if (target) inferredValues.push(`target:${target}`);

  const tool = extractTool(rawText, legacyMoveIntent);
  if (tool) inferredValues.push(`tool:${tool}`);

  const method = extractMethod(rawText);
  if (method) inferredValues.push(`method:${method}`);

  const intensity = scoreByLanguage(HIGH_INTENSITY, LOW_INTENSITY, classification.isCombatAction ? 65 : 45, rawText);
  const precision = scoreByLanguage(HIGH_PRECISION, LOW_PRECISION, classification.type === 'observe' ? 75 : 55, rawText);
  const riskLevel = scoreByLanguage(HIGH_RISK, LOW_RISK, classification.isCombatAction ? 60 : 35, rawText);

  const emotionalTone = TONE_PATTERNS.find(({ pattern }) => pattern.test(rawText))?.tone
    ?? (classification.isCombatAction ? 'aggressive' : classification.type === 'speak' ? 'calm' : undefined);

  if (emotionalTone) inferredValues.push(`tone:${emotionalTone}`);

  return {
    target,
    tool,
    method,
    intensity,
    precision,
    riskLevel,
    emotionalTone,
    inferredValues,
  };
}
