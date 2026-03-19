export interface SceneHazardProfile {
  hazardDensity: 'minimal' | 'present' | 'dense' | 'overwhelming';
  movementFriction: 'open' | 'contested' | 'restricted' | 'locked';
  combatVolatility: 'stable' | 'shifting' | 'volatile' | 'explosive';
}

export const SceneHazardProfileGenerator = {
  generate(tags: string[]): SceneHazardProfile {
    const joined = tags.join(' ');

    return {
      hazardDensity: /(catastrophic|overwhelming|storm|collapse|toxic_cloud)/.test(joined)
        ? 'overwhelming'
        : /(hazard|ruins|fire|toxic|contested)/.test(joined)
          ? 'dense'
          : /(pressure|watchful|unstable)/.test(joined)
            ? 'present'
            : 'minimal',
      movementFriction: /(locked|sealed|collapsed|killbox)/.test(joined)
        ? 'locked'
        : /(hazard|ruins|stealth|difficult)/.test(joined)
          ? 'restricted'
          : /(combat|contested|crowded)/.test(joined)
            ? 'contested'
            : 'open',
      combatVolatility: /(explosive|catastrophic|berserker)/.test(joined)
        ? 'explosive'
        : /(combat|hazard|ambush|high_pressure)/.test(joined)
          ? 'volatile'
          : /(tense|watchful|standoff)/.test(joined)
            ? 'shifting'
            : 'stable',
    };
  },
};
