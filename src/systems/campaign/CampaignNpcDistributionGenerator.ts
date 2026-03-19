export interface CampaignNpcDistributionInput {
  theme?: string | null;
  environmentTags?: string[];
  pressureSources?: string[];
}

export const CampaignNpcDistributionGenerator = {
  generate(input: CampaignNpcDistributionInput) {
    const environment = (input.environmentTags || []).join(' ');
    const pressure = (input.pressureSources || []).join(' ');

    return [
      /occupation|authority|checkpoint/.test(pressure) ? 'authority figures' : 'local survivors',
      /merchant|trade|economy/.test(environment) ? 'deal brokers' : 'scouts and witnesses',
      /mystic|ritual|omen/.test(environment + pressure) ? 'occult interpreters' : 'rivals with private agendas',
      'one stabilizer, one opportunist, one escalator',
    ];
  },
};
