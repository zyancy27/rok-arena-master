import { NpcCompositionEngine } from '@/systems/composition/NpcCompositionEngine';
import { AnchorPass } from '@/systems/composition/passes/AnchorPass';
import { CompatibilityPass } from '@/systems/composition/passes/CompatibilityPass';
import { GapFillPass } from '@/systems/composition/passes/GapFillPass';
import { NarrativeImplicationPass } from '@/systems/composition/passes/NarrativeImplicationPass';
import { NormalizationPass } from '@/systems/composition/passes/NormalizationPass';
import { PressurePass } from '@/systems/composition/passes/PressurePass';
import type { NpcBlueprintAdapterInput } from '@/systems/adapters/NpcBlueprintAdapter';

export const NpcIdentityGenerator = {
  generate(input: NpcBlueprintAdapterInput) {
    const base = NpcCompositionEngine.compose(input);
    const passInput = {
      kind: 'npc',
      tags: [...base.tags, ...base.socialPosture, ...base.combatPressureStyle, ...base.factionAlignment],
      anchors: [base.name, base.role],
      traits: [...base.personalityCluster, ...base.motivations],
    };

    const anchored = AnchorPass.run(passInput);
    const gapFilled = GapFillPass.run({ ...passInput, tags: anchored.tags, anchors: anchored.anchors, traits: anchored.traits });
    const compatible = CompatibilityPass.run({ ...passInput, tags: gapFilled.tags, anchors: gapFilled.anchors, traits: gapFilled.traits });
    const pressured = PressurePass.run({ ...passInput, tags: compatible.tags, anchors: compatible.anchors, traits: compatible.traits });
    const narrative = NarrativeImplicationPass.run({ ...passInput, tags: pressured.tags, anchors: pressured.anchors, traits: pressured.traits });
    const normalized = NormalizationPass.run({ ...passInput, tags: narrative.tags, anchors: narrative.anchors, traits: narrative.traits });

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
          normalization: normalized.metadata,
        },
      },
    };
  },
};
