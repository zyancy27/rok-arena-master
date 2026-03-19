import { BlueprintComposer } from '@/systems/blueprints/BlueprintComposer';
import { TaxonomyComposer } from '@/systems/taxonomy/TaxonomyComposer';
import type { BlueprintComposeInput } from '@/systems/blueprints/BlueprintTypes';

export interface CompositionRuntimePacket {
  tags: string[];
  anchors: string[];
  modules: string[];
  conflicts: string[];
  softSignals: string[];
  pressureIdentity: string[];
  narrativeImplications: string[];
  effectTags: string[];
  chatPresentationTags: string[];
  sceneOutputs: {
    scenePressure: 'low' | 'medium' | 'high' | 'critical';
    emotionalTone: string[];
    visualIntensity: 'subtle' | 'grounded' | 'elevated' | 'volatile';
    hazardDensity: 'minimal' | 'present' | 'dense' | 'overwhelming';
    movementFriction: 'open' | 'contested' | 'restricted' | 'locked';
    combatVolatility: 'stable' | 'shifting' | 'volatile' | 'explosive';
    npcSocialReadiness: 'open' | 'guarded' | 'tense' | 'hostile';
    environmentalPressure: string[];
    narrationToneFlags: string[];
  };
}

function uniq(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function hasPattern(tags: string[], pattern: RegExp) {
  return tags.some((tag) => pattern.test(tag));
}

function deriveScenePressure(tags: string[]) {
  if (hasPattern(tags, /(crisis|boss|catastrophic|overwhelming|volatile|hazardous)/)) return 'critical' as const;
  if (hasPattern(tags, /(pressure|combat|hostile|danger|ambush|unstable)/)) return 'high' as const;
  if (hasPattern(tags, /(contested|tense|watchful|mystic)/)) return 'medium' as const;
  return 'low' as const;
}

function deriveVisualIntensity(tags: string[]) {
  if (hasPattern(tags, /(explosive|catastrophic|boss|volatile)/)) return 'volatile' as const;
  if (hasPattern(tags, /(mystic|combat|hazard|pressure|storm)/)) return 'elevated' as const;
  if (hasPattern(tags, /(stealth|quiet|grounded|cautious)/)) return 'subtle' as const;
  return 'grounded' as const;
}

function deriveHazardDensity(tags: string[]) {
  if (hasPattern(tags, /(catastrophic|overwhelming|storm|collapsing)/)) return 'overwhelming' as const;
  if (hasPattern(tags, /(hazard|ruins|radiation|fire|toxic|contested)/)) return 'dense' as const;
  if (hasPattern(tags, /(pressure|unstable|rough|weather)/)) return 'present' as const;
  return 'minimal' as const;
}

function deriveMovementFriction(tags: string[]) {
  if (hasPattern(tags, /(locked|siege|collapsed|sealed)/)) return 'locked' as const;
  if (hasPattern(tags, /(hazard|ruins|stealth|ambush|difficult)/)) return 'restricted' as const;
  if (hasPattern(tags, /(combat|contested|crowded|defended)/)) return 'contested' as const;
  return 'open' as const;
}

function deriveCombatVolatility(tags: string[]) {
  if (hasPattern(tags, /(explosive|berserker|catastrophic)/)) return 'explosive' as const;
  if (hasPattern(tags, /(combat|hazard|pressure|ambush|high_force)/)) return 'volatile' as const;
  if (hasPattern(tags, /(tense|watchful|standoff)/)) return 'shifting' as const;
  return 'stable' as const;
}

function deriveNpcSocialReadiness(tags: string[]) {
  if (hasPattern(tags, /(hostile|ambush|boss|berserker)/)) return 'hostile' as const;
  if (hasPattern(tags, /(guard|distrust|watchful|combat)/)) return 'tense' as const;
  if (hasPattern(tags, /(cautious|merchant|checkpoint|formal)/)) return 'guarded' as const;
  return 'open' as const;
}

export const CompositionEngine = {
  compose(input: BlueprintComposeInput) {
    const blueprint = BlueprintComposer.compose(input);
    const taxonomy = TaxonomyComposer.compose({
      tags: blueprint.tags,
      traits: blueprint.traits.map((trait) => trait.key),
    });
    const runtimeTags = uniq([...blueprint.tags, ...taxonomy.tags, ...blueprint.metadata.derivedTags]);
    const scenePressure = deriveScenePressure(runtimeTags);
    const visualIntensity = deriveVisualIntensity(runtimeTags);
    const hazardDensity = deriveHazardDensity(runtimeTags);
    const movementFriction = deriveMovementFriction(runtimeTags);
    const combatVolatility = deriveCombatVolatility(runtimeTags);
    const npcSocialReadiness = deriveNpcSocialReadiness(runtimeTags);

    const runtime: CompositionRuntimePacket = {
      tags: runtimeTags,
      anchors: blueprint.metadata.anchors,
      modules: blueprint.metadata.modules,
      conflicts: blueprint.metadata.conflicts,
      softSignals: blueprint.metadata.softSignals,
      pressureIdentity: uniq([
        scenePressure,
        ...runtimeTags.filter((tag) => /(pressure|hazard|survival|control|stealth|tempo|social)/.test(tag)),
      ]),
      narrativeImplications: uniq([
        scenePressure === 'critical' ? 'irreversible consequences likely' : null,
        scenePressure === 'high' ? 'momentum swings likely' : null,
        hasPattern(runtimeTags, /(mystic|ritual|omen)/) ? 'hidden logic shapes the scene' : 'cause and effect remain visible',
        hasPattern(runtimeTags, /(occupation|guard|checkpoint)/) ? 'authority pressure is active' : null,
      ]),
      effectTags: uniq([
        ...runtimeTags.filter((tag) => /(mystic|storm|hazard|stealth|combat|pressure|ruins|fire|shadow)/.test(tag)),
        `scene-pressure:${scenePressure}`,
        `visual-intensity:${visualIntensity}`,
      ]),
      chatPresentationTags: uniq([
        npcSocialReadiness === 'hostile' ? 'chat-impact-heavy' : null,
        npcSocialReadiness === 'guarded' ? 'chat-tight-pacing' : null,
        visualIntensity === 'subtle' ? 'chat-muted-emphasis' : 'chat-cinematic-emphasis',
      ]),
      sceneOutputs: {
        scenePressure,
        emotionalTone: uniq([
          hasPattern(runtimeTags, /(fear|hazard|dread|storm)/) ? 'anxious tension' : null,
          hasPattern(runtimeTags, /(mystic|ritual|omen)/) ? 'charged wonder' : null,
          hasPattern(runtimeTags, /(combat|hostile|ambush)/) ? 'combat urgency' : 'grounded focus',
        ]),
        visualIntensity,
        hazardDensity,
        movementFriction,
        combatVolatility,
        npcSocialReadiness,
        environmentalPressure: uniq([
          hasPattern(runtimeTags, /(hazard|storm|ruins|toxic)/) ? 'environment pushes every choice' : 'environment frames the choice',
          hasPattern(runtimeTags, /(stealth|watchful|ambush)/) ? 'visibility pressure' : null,
          hasPattern(runtimeTags, /(survival|scarcity|occupation)/) ? 'resource pressure' : null,
        ]),
        narrationToneFlags: uniq([
          `tone:${scenePressure}`,
          `tone:${npcSocialReadiness}`,
          combatVolatility === 'explosive' ? 'tone:kinetic' : 'tone:grounded',
          hasPattern(runtimeTags, /(mystic|ritual|omen)/) ? 'tone:charged' : null,
        ]),
      },
    };

    return {
      blueprint,
      taxonomy,
      runtime,
    };
  },
};
