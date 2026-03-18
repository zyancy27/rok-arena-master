import type { Intent } from '@/systems/intent/IntentEngine';
import type { ResolvedCharacterContext } from '@/systems/character/CharacterContextResolver';

export type ActionResult = {
  success: boolean;
  effectiveness: number;
  impact: string;
  consequences: string[];
};

export interface ActionResolutionContext {
  environmentTags?: string[];
  activeHazards?: string[];
  environmentStability?: number;
  hasActiveThreat?: boolean;
  currentZone?: string | null;
}

const RELEVANT_STATS: Record<Intent['type'], Array<keyof ResolvedCharacterContext['stats']>> = {
  attack: ['stat_skill', 'stat_strength', 'stat_battle_iq'],
  move: ['stat_speed', 'stat_stamina', 'stat_battle_iq'],
  interact: ['stat_skill', 'stat_intelligence', 'stat_strength'],
  speak: ['stat_intelligence', 'stat_battle_iq', 'stat_luck'],
  observe: ['stat_intelligence', 'stat_battle_iq', 'stat_skill'],
  ability: ['stat_power', 'stat_skill', 'stat_intelligence'],
};

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 50;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function getImpact(intent: Intent, success: boolean, effectiveness: number) {
  const targetText = intent.target ? ` on ${intent.target}` : '';
  if (success) {
    if (intent.type === 'observe') return `Gains clear situational read${targetText}.`;
    if (intent.type === 'speak') return `Pushes the social exchange${targetText} with control.`;
    if (intent.type === 'move') return `Repositions effectively${targetText}.`;
    if (intent.type === 'interact') return `Manipulates the scene${targetText} successfully.`;
    if (intent.type === 'ability') return `Channels power${targetText} with ${effectiveness >= 75 ? 'strong' : 'measured'} effect.`;
    return `Applies pressure${targetText} successfully.`;
  }

  if (intent.type === 'move') return `The reposition falters${targetText}.`;
  if (intent.type === 'speak') return `The exchange loses momentum${targetText}.`;
  if (intent.type === 'observe') return `Only a partial read is gained${targetText}.`;
  return `The action fails to land cleanly${targetText}.`;
}

export function formatActionForNarrator(intent: Intent, actionResult: ActionResult, rawText?: string) {
  const details = [
    `intent=${intent.type}`,
    intent.subType ? `subType=${intent.subType}` : null,
    intent.target ? `target=${intent.target}` : null,
    intent.tool ? `tool=${intent.tool}` : null,
    intent.method ? `method=${intent.method}` : null,
    typeof intent.intensity === 'number' ? `intensity=${intent.intensity}` : null,
    typeof intent.precision === 'number' ? `precision=${intent.precision}` : null,
    typeof intent.riskLevel === 'number' ? `risk=${intent.riskLevel}` : null,
    intent.emotionalTone ? `tone=${intent.emotionalTone}` : null,
    `combat=${intent.isCombatAction}`,
    `requiresRoll=${intent.requiresRoll}`,
    `success=${actionResult.success}`,
    `effectiveness=${actionResult.effectiveness}`,
    `impact=${actionResult.impact}`,
    actionResult.consequences.length ? `consequences=${actionResult.consequences.join('; ')}` : null,
    rawText ? `rawTextReference=${rawText}` : null,
  ].filter(Boolean);

  return details.join(' | ');
}

export const ActionResolver = {
  resolve(intent: Intent, characterContext: ResolvedCharacterContext, context: ActionResolutionContext = {}): ActionResult {
    const relevantStats = RELEVANT_STATS[intent.type].map(statKey => characterContext.stats[statKey]);
    const statBase = average(relevantStats);
    const precisionFactor = 0.75 + ((intent.precision ?? 55) / 200);
    const intensityFactor = 0.8 + ((intent.intensity ?? 50) / 250);
    const riskFactor = intent.riskLevel && intent.riskLevel > 70 ? 0.93 : 1;
    const staminaFactor = 0.65 + (characterContext.stamina / 200);
    const stabilityFactor = 0.85 + Math.max(0, Math.min(0.2, context.environmentStability ?? 0.15));
    const hazardPenalty = (context.activeHazards?.length || 0) * 4;
    const threatBonus = context.hasActiveThreat && (intent.type === 'attack' || intent.type === 'ability') ? 6 : 0;

    const effectiveness = clamp(Math.round((statBase * precisionFactor * intensityFactor * riskFactor * staminaFactor * stabilityFactor) - hazardPenalty + threatBonus));
    const successThreshold = intent.type === 'observe' ? 30 : intent.type === 'speak' ? 40 : intent.type === 'move' ? 45 : 50;
    const success = effectiveness >= successThreshold;

    const consequences: string[] = [];
    if (intent.riskLevel && intent.riskLevel > 70) consequences.push('Leaves an opening because of risky execution.');
    if (characterContext.staminaState === 'drained') consequences.push('Low stamina limits follow-through.');
    if ((context.activeHazards?.length || 0) > 0) consequences.push('Environmental hazards complicate the action.');
    if (!success && intent.type === 'speak') consequences.push('Tension rises after the failed read.');
    if (success && intent.type === 'observe') consequences.push('Creates better positional awareness for the next beat.');

    return {
      success,
      effectiveness,
      impact: getImpact(intent, success, effectiveness),
      consequences,
    };
  },
};
