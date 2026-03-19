export interface DominanceResolution {
  tags: string[];
  removed: string[];
}

const DOMINANCE_GROUPS: Array<{ dominant: RegExp; suppressed: RegExp[] }> = [
  { dominant: /(critical|crisis|catastrophic)/, suppressed: [/(low|medium|stable|open)/] },
  { dominant: /(hostile|ambush|killbox)/, suppressed: [/(open|friendly|calm_social|formal_exchange)/] },
  { dominant: /(volatile|explosive)/, suppressed: [/(subtle|quiet|stable)/] },
  { dominant: /(locked|collapsed|sealed)/, suppressed: [/(open|free_movement)/] },
];

export const DominanceRules = {
  resolve(tags: string[]): DominanceResolution {
    const working = [...new Set(tags.filter(Boolean))];
    const removed: string[] = [];

    for (const group of DOMINANCE_GROUPS) {
      if (!working.some((tag) => group.dominant.test(tag))) continue;
      for (const pattern of group.suppressed) {
        for (const tag of [...working]) {
          if (!pattern.test(tag)) continue;
          working.splice(working.indexOf(tag), 1);
          removed.push(tag);
        }
      }
    }

    return {
      tags: [...new Set(working)],
      removed,
    };
  },
};
