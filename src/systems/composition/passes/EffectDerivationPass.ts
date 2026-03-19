import type { CompositionPassInput, CompositionPassOutput } from './AnchorPass';

export const EffectDerivationPass = {
  run(input: CompositionPassInput): CompositionPassOutput {
    const effectTags = [
      ...input.tags.some((tag) => /(high_pressure|volatile|explosive|critical)/.test(tag)) ? ['impact_burst', 'combat_surge'] : [],
      ...input.tags.some((tag) => /(stealth|quiet|guarded)/.test(tag)) ? ['muted_pulse', 'whisper_tension'] : [],
      ...input.tags.some((tag) => /(mystic|ritual|charged)/.test(tag)) ? ['charged_glow', 'mystic_hum'] : [],
      ...input.tags.some((tag) => /(ruins|ash|fire|toxic|storm)/.test(tag)) ? ['environmental_distortion'] : [],
    ];

    return {
      tags: [...new Set([...input.tags, ...effectTags])],
      anchors: input.anchors,
      traits: input.traits,
      metadata: {
        effectTags,
      },
    };
  },
};
