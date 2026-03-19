export interface CampaignEncounterDensityInput {
  pressureSources?: string[];
  environmentTags?: string[];
}

export const CampaignEncounterDensityGenerator = {
  generate(input: CampaignEncounterDensityInput): 'low' | 'medium' | 'high' {
    const joined = [...(input.pressureSources || []), ...(input.environmentTags || [])].join(' ');
    if (/(critical|high|war|siege|hazard|collapse|hostile)/.test(joined)) return 'high';
    if (/(guarded|watchful|contested|scarcity|mystic)/.test(joined)) return 'medium';
    return 'low';
  },
};
