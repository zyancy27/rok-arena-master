export interface DependencyResolution {
  tags: string[];
  added: string[];
}

const DEPENDENCY_RULES: Array<{ when: RegExp; add: string[] }> = [
  { when: /(ambush|stealth_strike|hidden_attack)/, add: ['stealth', 'watchful'] },
  { when: /(ritual|omen|sigil)/, add: ['mystic', 'charged'] },
  { when: /(siege|occupation|checkpoint)/, add: ['territorial_friction', 'authority_pressure'] },
  { when: /(firestorm|toxic_cloud|collapse)/, add: ['hazard', 'environmental_pressure'] },
  { when: /(merchant|negotiation|parley)/, add: ['social_pressure', 'guarded'] },
];

export const DependencyRules = {
  resolve(tags: string[]): DependencyResolution {
    const working = [...new Set(tags.filter(Boolean))];
    const added: string[] = [];

    for (const rule of DEPENDENCY_RULES) {
      if (!working.some((tag) => rule.when.test(tag))) continue;
      for (const tag of rule.add) {
        if (working.includes(tag)) continue;
        working.push(tag);
        added.push(tag);
      }
    }

    return {
      tags: [...new Set(working)],
      added,
    };
  },
};
