import { CharacterCompositionEngine } from '@/systems/composition/CharacterCompositionEngine';
import { AnchorPass } from '@/systems/composition/passes/AnchorPass';
import { CompatibilityPass } from '@/systems/composition/passes/CompatibilityPass';
import { EffectDerivationPass } from '@/systems/composition/passes/EffectDerivationPass';
import { GapFillPass } from '@/systems/composition/passes/GapFillPass';
import { NarrativeImplicationPass } from '@/systems/composition/passes/NarrativeImplicationPass';
import { NormalizationPass } from '@/systems/composition/passes/NormalizationPass';
import { PressurePass } from '@/systems/composition/passes/PressurePass';
import type { CharacterBlueprintAdapterInput } from '@/systems/adapters/CharacterBlueprintAdapter';

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

    return {
      ...base,
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
