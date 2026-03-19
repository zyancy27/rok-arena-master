export const SceneEffectTagGenerator = {
  generate(tags: string[]) {
    return [...new Set([
      ...tags.filter((tag) => /(hazard|storm|ruins|fire|shadow|mystic|stealth|combat)/.test(tag)),
      ...tags.some((tag) => /(critical|high_pressure|volatile)/.test(tag)) ? ['impact_burst', 'surge_overlay'] : [],
      ...tags.some((tag) => /(guarded|quiet|stealth)/.test(tag)) ? ['muted_pulse'] : [],
      ...tags.some((tag) => /(mystic|ritual|charged)/.test(tag)) ? ['charged_glow'] : [],
    ])];
  },
};
