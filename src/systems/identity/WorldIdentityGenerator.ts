import { WorldCompositionEngine, type WorldCompositionInput } from '@/systems/composition/WorldCompositionEngine';
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

export const WorldIdentityGenerator = {
  generate(input: WorldCompositionInput) {
    const base = WorldCompositionEngine.compose(input);
    const passInput = {
      kind: 'world',
      tags: [...base.tags, ...base.hazardFamilies, ...base.travelPressure, ...base.culturalFlavor],
      anchors: [base.regionType],
      traits: [...base.terrainLogic, ...base.dangerLogic],
    };

    const anchored = AnchorPass.run(passInput);
    const gapFilled = GapFillPass.run({ ...passInput, tags: anchored.tags, anchors: anchored.anchors, traits: anchored.traits });
    const compatible = CompatibilityPass.run({ ...passInput, tags: gapFilled.tags, anchors: gapFilled.anchors, traits: gapFilled.traits });
    const pressured = PressurePass.run({ ...passInput, tags: compatible.tags, anchors: compatible.anchors, traits: compatible.traits });
    const narrative = NarrativeImplicationPass.run({ ...passInput, tags: pressured.tags, anchors: pressured.anchors, traits: pressured.traits });
    const effected = EffectDerivationPass.run({ ...passInput, tags: narrative.tags, anchors: narrative.anchors, traits: narrative.traits });
    const normalized = NormalizationPass.run({ ...passInput, tags: effected.tags, anchors: effected.anchors, traits: effected.traits });

    const joined = normalized.tags.join(' ');
    const environmentalIdentity = uniq([
      base.regionType,
      ...base.terrainLogic,
      ...base.dangerLogic,
      ...normalized.tags.filter((tag) => /(ruins|storm|fire|toxic|shadow|mystic|occupation|urban|wild)/.test(tag)),
    ]);
    const socialToneIdentity = uniq([
      base.socialDensity,
      base.economicTone,
      ...base.factionPresence,
      joined.match(/authority|occupation|checkpoint/) ? 'controlled social tone' : null,
      joined.match(/merchant|trade/) ? 'transactional social tone' : null,
    ]);
    const travelPressureIdentity = uniq([
      ...base.travelPressure,
      ...normalized.tags.filter((tag) => /(restricted|locked|open|rerouting|tempo|scarcity)/.test(tag)),
    ]);
    const hazardPosture = uniq([
      ...base.hazardFamilies,
      ...base.dangerLogic,
      joined.match(/catastrophic|overwhelming|volatile/) ? 'volatile hazard posture' : null,
      joined.match(/watchful|guarded/) ? 'contained hazard posture' : null,
    ]);
    const visualEffectProfile = uniq([
      ...base.hazardFamilies.map((entry) => `visual:${entry}`),
      ...base.culturalFlavor.map((entry) => `visual-flavor:${entry}`),
      joined.match(/mystic|ritual|charged/) ? 'visual:charged_glow' : null,
      joined.match(/ruins|shadow/) ? 'visual:shadow_veil' : null,
      joined.match(/fire|storm/) ? 'visual:surge_overlay' : null,
    ]);
    const audioPressureProfile = uniq([
      ...base.weatherPressure.map((entry) => `audio:${entry}`),
      ...base.travelPressure.map((entry) => `cadence:${entry}`),
      joined.match(/authority|occupation/) ? 'audio:martial_drone' : null,
      joined.match(/mystic|ritual/) ? 'audio:mystic_hum' : null,
      joined.match(/fire|storm|collapse/) ? 'audio:hazard_surge' : null,
    ]);
    const volatilityProfile = uniq([
      ...base.weatherPressure,
      ...base.hazardFamilies,
      joined.match(/catastrophic|overwhelming|collapse|volatile/) ? 'critical volatility' : null,
      joined.match(/guarded|controlled/) ? 'contained volatility' : null,
    ]);
    const factionDensityProfile = uniq([
      ...base.factionPresence,
      base.socialDensity,
      base.factionPresence.length > 2 ? 'crowded faction field' : 'localized faction field',
    ]);

    return {
      ...base,
      environmentalIdentity,
      socialToneIdentity,
      travelPressureIdentity,
      hazardPosture,
      visualEffectProfile,
      audioPressureProfile,
      volatilityProfile,
      factionDensityProfile,
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
