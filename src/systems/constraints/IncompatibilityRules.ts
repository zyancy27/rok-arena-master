export interface IncompatibilityResolution {
  tags: string[];
  conflicts: string[];
  removed: string[];
}

const HARD_INCOMPATIBILITIES: Array<{
  left: RegExp;
  right: RegExp;
  remove: 'left' | 'right';
  reason: string;
}> = [
  { left: /(stealth|quiet|cautious)/, right: /(loud|berserker|explosive)/, remove: 'right', reason: 'stealth posture rejects loud escalation' },
  { left: /(low_tech|grounded|rustic)/, right: /(cosmic|godlike|reality_break)/, remove: 'right', reason: 'grounded worlds reject unsupported cosmic descriptors' },
  { left: /(calm_social|formal_exchange|merchant)/, right: /(aggressive_pulse|combat_surge|hostile_burst)/, remove: 'right', reason: 'calm social scenes reject aggressive presentation defaults' },
  { left: /(guarded|cautious)/, right: /(berserker|reckless_charge)/, remove: 'right', reason: 'guarded posture rejects berserker defaults' },
];

export const IncompatibilityRules = {
  resolve(tags: string[]): IncompatibilityResolution {
    const working = [...new Set(tags.filter(Boolean))];
    const conflicts: string[] = [];
    const removed: string[] = [];

    for (const rule of HARD_INCOMPATIBILITIES) {
      const leftIndex = working.findIndex((tag) => rule.left.test(tag));
      const rightIndex = working.findIndex((tag) => rule.right.test(tag));
      if (leftIndex === -1 || rightIndex === -1) continue;

      const removedIndex = rule.remove === 'left' ? leftIndex : rightIndex;
      const removedTag = working[removedIndex];
      working.splice(removedIndex, 1);
      removed.push(removedTag);
      conflicts.push(`${rule.reason}: removed ${removedTag}`);
    }

    return {
      tags: [...new Set(working)],
      conflicts,
      removed,
    };
  },
};
