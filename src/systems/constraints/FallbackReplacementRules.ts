export interface FallbackReplacementResolution {
  tags: string[];
  replacements: string[];
}

const DEFAULT_BY_KIND: Record<string, string[]> = {
  character: ['grounded_focus', 'distinct_signature'],
  npc: ['guarded', 'role_pressure'],
  world: ['grounded_region', 'environmental_pressure'],
  campaign: ['sparse_hook', 'progressive_pressure'],
  encounter: ['contested_exchange', 'tactical_pressure'],
  effect: ['ambient_pulse', 'contextual_overlay'],
};

export const FallbackReplacementRules = {
  resolve(tags: string[], kind?: string): FallbackReplacementResolution {
    const working = [...new Set(tags.filter(Boolean))];
    const replacements: string[] = [];
    const defaults = kind ? (DEFAULT_BY_KIND[kind] || []) : [];

    for (const fallback of defaults) {
      if (working.some((tag) => tag === fallback || tag.includes(fallback.split('_')[0]))) continue;
      working.push(fallback);
      replacements.push(fallback);
    }

    if (!working.some((tag) => /(pressure|hazard|social|combat|stealth|mystic)/.test(tag))) {
      working.push('grounded_pressure');
      replacements.push('grounded_pressure');
    }

    return {
      tags: [...new Set(working)],
      replacements,
    };
  },
};
