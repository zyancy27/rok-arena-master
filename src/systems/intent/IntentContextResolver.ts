import type { Intent, IntentEngineContext } from './IntentEngine';

interface IntentContextResolutionResult {
  intent: Intent;
  fallbackNotes: string[];
}

function pickEntityName(kind: Intent['type'], context: IntentEngineContext): string | undefined {
  if (kind === 'attack' || kind === 'ability') {
    return context.nearbyEnemies?.[0]?.name || context.possibleTargets?.find(target => target.kind === 'enemy')?.name;
  }

  if (kind === 'speak') {
    return context.nearbyNpcs?.[0]?.name || context.possibleTargets?.find(target => target.kind === 'npc' || target.kind === 'ally')?.name;
  }

  if (kind === 'interact' || kind === 'observe') {
    return context.nearbyObjects?.[0]?.name || context.possibleTargets?.find(target => target.kind === 'object')?.name;
  }

  return context.possibleTargets?.[0]?.name;
}

export function resolveIntentContext(intent: Intent, context: IntentEngineContext = {}): IntentContextResolutionResult {
  const fallbackNotes: string[] = [];
  const resolved: Intent = { ...intent };

  if (!resolved.target) {
    const inferredTarget = pickEntityName(resolved.type, context);
    if (inferredTarget) {
      resolved.target = inferredTarget;
      fallbackNotes.push(`Resolved target from ${resolved.type} context: ${inferredTarget}`);
    }
  }

  if (!resolved.tool && context.defaultTool && (resolved.type === 'attack' || resolved.type === 'ability' || resolved.type === 'interact')) {
    resolved.tool = context.defaultTool;
    fallbackNotes.push(`Inferred tool from equipped/default loadout: ${context.defaultTool}`);
  }

  if (!resolved.method && resolved.type === 'observe') {
    resolved.method = 'scan';
    fallbackNotes.push('Defaulted observe method to scan');
  }

  if (!resolved.target && resolved.type !== 'observe' && resolved.type !== 'move') {
    fallbackNotes.push('No explicit target found; action remains context-open');
  }

  return { intent: resolved, fallbackNotes };
}
