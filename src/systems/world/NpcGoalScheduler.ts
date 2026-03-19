export interface NpcGoalSchedulerInput {
  npcId: string;
  motivations: string[];
  pressureLevel: 'low' | 'medium' | 'high' | 'critical';
}

export const NpcGoalScheduler = {
  schedule(input: NpcGoalSchedulerInput) {
    const pressureGoal = input.pressureLevel === 'critical'
      ? 'secure immediate advantage'
      : input.pressureLevel === 'high'
        ? 'protect position under strain'
        : 'advance private objective';

    return {
      npcId: input.npcId,
      nextGoals: [...new Set([pressureGoal, ...input.motivations.slice(0, 2)])],
      postureBias: input.pressureLevel === 'critical' ? 'aggressive' : input.pressureLevel === 'high' ? 'tense' : 'measured',
    };
  },
};
