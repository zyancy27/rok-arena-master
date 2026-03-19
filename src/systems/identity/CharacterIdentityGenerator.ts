import type { CharacterBlueprintAdapterInput } from '@/systems/adapters/CharacterBlueprintAdapter';
import { CharacterCompositionEngine } from '@/systems/composition/CharacterCompositionEngine';
import { AnchorPass } from '@/systems/composition/passes/AnchorPass';
import { CompatibilityPass } from '@/systems/composition/passes/CompatibilityPass';
import { EffectDerivationPass } from '@/systems/composition/passes/EffectDerivationPass';
import { GapFillPass } from '@/systems/composition/passes/GapFillPass';
import { NarrativeImplicationPass } from '@/systems/composition/passes/NarrativeImplicationPass';
import { NormalizationPass } from '@/systems/composition/passes/NormalizationPass';
import { PressurePass } from '@/systems/composition/passes/PressurePass';

function uniq(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0))];
}

export const CharacterIdentityGenerator = {
  generate(input: CharacterBlueprintAdapterInput) {
    const base = CharacterCompositionEngine.compose(input);
    const passInput = {
      kind: 'character',
      tags: [...base.tags, ...base.traits, ...base.pressureStyle, ...base.signatureBehaviorPatterns],
      anchors: [base.name],
      traits: base.traits,
    };

    const anchored = AnchorPass.run(passInput);
    const gapFilled = GapFillPass.run({ ...passInput, tags: anchored.tags, anchors: anchored.anchors, traits: anchored.traits });
    const compatible = CompatibilityPass.run({ ...passInput, tags: gapFilled.tags, anchors: gapFilled.anchors, traits: gapFilled.traits });
    const pressured = PressurePass.run({ ...passInput, tags: compatible.tags, anchors: compatible.anchors, traits: compatible.traits });
    const narrative = NarrativeImplicationPass.run({ ...passInput, tags: pressured.tags, anchors: pressured.anchors, traits: pressured.traits });
    const effected = EffectDerivationPass.run({ ...passInput, tags: narrative.tags, anchors: narrative.anchors, traits: narrative.traits });
    const normalized = NormalizationPass.run({ ...passInput, tags: effected.tags, anchors: effected.anchors, traits: effected.traits });

    const joined = normalized.tags.join(' ');
    const pressureIdentity = uniq([
      ...base.pressureStyle,
      ...normalized.tags.filter((tag) => /(pressure|tempo|control|force|survival|social)/.test(tag)),
    ]);
    const movementIdentity = uniq([
      ...base.movementStyle,
      ...normalized.tags.filter((tag) => /(movement|speed|stealth|flow|locked|restricted|open|contested)/.test(tag)),
    ]);
    const signaturePatternIdentity = uniq([
      ...base.signatureBehaviorPatterns,
      ...normalized.tags.filter((tag) => /(pattern|ritual|ambush|duel|command|protect)/.test(tag)),
    ]);
    const narrationBias = uniq([
      ...base.narrativeTone,
      ...base.expressionIdentity.filter((entry) => /(controlled|volatile|measured|muted|cinematic)/.test(entry)),
      joined.match(/mystic|ritual|charged/) ? 'charged description bias' : null,
      joined.match(/stealth|quiet|guarded/) ? 'hushed description bias' : null,
      joined.match(/combat|duelist|aggressive|relentless/) ? 'kinetic description bias' : 'grounded description bias',
    ]);
    const effectBias = uniq([
      ...pressureIdentity.filter((entry) => /(aggressive|relentless|control|tempo)/.test(entry)).map((entry) => `effect:${entry}`),
      ...movementIdentity.map((entry) => `motion:${entry}`),
      ...base.expressionIdentity.filter((entry) => /(muted|cinematic|charged)/.test(entry)).map((entry) => `presentation:${entry}`),
      joined.match(/mystic|ritual|charged/) ? 'effect:charged_glow' : null,
      joined.match(/stealth|quiet|guarded/) ? 'effect:muted_pulse' : null,
    ]);
    const environmentalFit = uniq([
      ...normalized.tags.filter((tag) => /(ruins|storm|fire|toxic|shadow|mystic|urban|wild|occupation)/.test(tag)),
      base.traits.find((trait) => /(cautious|reckless|protective|curious)/.test(trait)) || null,
    ]);
    const rolePosture = uniq([
      ...base.socialIdentity.filter((entry) => /(guarded|open|tense|hostile)/.test(entry)),
      ...base.combatIdentity.filter((entry) => /(duelist|vanguard|sniper|controller|support)/.test(entry)),
      joined.match(/leader|commander|authority/) ? 'command posture' : null,
      joined.match(/protective|guardian/) ? 'protective posture' : null,
      joined.match(/stealth|assassin/) ? 'ambush posture' : null,
    ]);

    return {
      ...base,
      pressureIdentity,
      movementIdentity,
      signaturePatternIdentity,
      narrationBias,
      effectBias,
      environmentalFit,
      rolePosture,
      tags: normalized.tags,
      metadata: {
        ...(base.metadata || {}),
        generatedPasses: {
          anchors: anchored.metadata,
          gapFill: gapFilled.metadata,
          compatibility: compatible.metadata,
          pressure: pressured.metadata,
          narrative: narrative.metadata,
          effects: effected.metadata,
          normalization: normalized.metadata,
        },
      },
    };
  },
};
