export interface StoryLogicInput {
  centralConflict?: string | null;
  stakes?: string[];
  pressureSources?: string[];
  pacingCurve?: string[];
}

export const StoryLogicFramework = {
  build(input: StoryLogicInput) {
    const centralConflict = input.centralConflict || 'unstable status quo';
    const pressureSources = input.pressureSources?.length ? input.pressureSources : ['resource scarcity', 'competing agendas'];

    return {
      centralConflict,
      stakes: input.stakes?.length ? input.stakes : ['survival', 'identity', 'territory'],
      pressureSources,
      pacingCurve: input.pacingCurve?.length ? input.pacingCurve : ['hook', 'complication', 'escalation', 'reversal', 'payoff'],
    };
  },
};
