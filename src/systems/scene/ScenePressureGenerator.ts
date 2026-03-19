export interface ScenePressureInput {
  tags: string[];
}

export const ScenePressureGenerator = {
  generate(input: ScenePressureInput): 'low' | 'medium' | 'high' | 'critical' {
    const joined = input.tags.join(' ');
    if (/(critical|crisis|catastrophic|overwhelming|killbox|explosive)/.test(joined)) return 'critical';
    if (/(high|hostile|combat|ambush|hazard|collapse|volatile)/.test(joined)) return 'high';
    if (/(guarded|watchful|mystic|contested)/.test(joined)) return 'medium';
    return 'low';
  },
};
