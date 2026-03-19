import type { NpcBlueprintAdapterInput } from '@/systems/adapters/NpcBlueprintAdapter';
import { NpcCompositionEngine } from '@/systems/composition/NpcCompositionEngine';
import { AnchorPass } from '@/systems/composition/passes/AnchorPass';
import { CompatibilityPass } from '@/systems/composition/passes/CompatibilityPass';
import { GapFillPass } from '@/systems/composition/passes/GapFillPass';
import { NarrativeImplicationPass } from '@/systems/composition/passes/NarrativeImplicationPass';
import { NormalizationPass } from '@/systems/composition/passes/NormalizationPass';
import { PressurePass } from '@/systems/composition/passes/PressurePass';

function uniq(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0))];
}

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

    const joined = normalized.tags.join(' ');
    const rolePosture = uniq([
      base.role,
      ...base.socialPosture,
      joined.match(/guard|authority|checkpoint/) ? 'authoritative posture' : null,
      joined.match(/merchant|broker/) ? 'transactional posture' : null,
      joined.match(/assassin|ambush/) ? 'ambush posture' : null,
    ]);
    const threatPosture = uniq([
      ...base.combatPressureStyle,
      ...base.powerStyle,
      joined.match(/boss|overwhelming|killbox/) ? 'dominant threat posture' : null,
      joined.match(/stealth|ambush/) ? 'predatory threat posture' : null,
      joined.match(/guarded|defensive/) ? 'containment threat posture' : null,
    ]);
    const emotionalDefault = uniq([
      ...base.fearProfile.filter((entry) => /(fear|panic|unease)/.test(entry)),
      ...base.personalityCluster.filter((entry) => /(calm|hardline|curious|aggressive|merciful)/.test(entry)),
      joined.match(/hostile|aggressive/) ? 'anger' : null,
      joined.match(/guarded|watchful/) ? 'suspicion' : 'focus',
    ]);
    const factionPosture = uniq([
      ...base.factionAlignment,
      ...base.loyaltyProfile,
      joined.match(/authority|occupation/) ? 'institutional loyalty' : null,
    ]);
    const interactionStyle = uniq([
      ...base.socialPosture,
      ...base.personalityCluster,
      joined.match(/merchant|noble/) ? 'measured interaction' : null,
      joined.match(/assassin|ambush/) ? 'minimal interaction' : null,
      joined.match(/guard|authority/) ? 'command interaction' : null,
    ]);
    const pressureStyle = uniq([
      ...base.combatPressureStyle,
      ...base.powerStyle,
      ...normalized.tags.filter((tag) => /(pressure|tempo|ambush|control|overwhelm)/.test(tag)),
    ]);
    const dangerStyle = uniq([
      ...base.fearProfile,
      ...threatPosture,
      joined.match(/volatile|explosive|berserker/) ? 'volatile danger style' : null,
      joined.match(/guarded|watchful/) ? 'watchful danger style' : null,
    ]);
    const memoryPosture = uniq([
      ...base.relationshipPosture,
      ...base.loyaltyProfile,
      joined.match(/vengeful|grudge|predatory/) ? 'grudge memory posture' : null,
      joined.match(/loyal|protective/) ? 'protective memory posture' : null,
    ]);
    const narrationBias = uniq([
      ...interactionStyle,
      ...emotionalDefault,
      joined.match(/hostile|predatory/) ? 'sharp narration bias' : null,
      joined.match(/guarded|authority/) ? 'measured narration bias' : null,
      joined.match(/mystic|ritual/) ? 'unnerving narration bias' : null,
    ]);
    const effectBias = uniq([
      ...pressureStyle.map((entry) => `effect:${entry}`),
      ...dangerStyle.map((entry) => `danger:${entry}`),
      joined.match(/stealth|assassin/) ? 'effect:shadow_shear' : null,
      joined.match(/hostile|aggressive/) ? 'effect:impact_burst' : null,
      joined.match(/guarded|authority/) ? 'effect:contained_pulse' : null,
    ]);

    return {
      ...base,
      rolePosture,
      threatPosture,
      emotionalDefault,
      factionPosture,
      interactionStyle,
      pressureStyle,
      dangerStyle,
      memoryPosture,
      narrationBias,
      effectBias,
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
