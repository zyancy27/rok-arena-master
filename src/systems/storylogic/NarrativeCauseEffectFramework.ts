export const NarrativeCauseEffectFramework = {
  build(cause: string, outcome: string) {
    return {
      cause,
      outcome,
      connectiveLogic: `${cause} creates pressure that plausibly results in ${outcome}`,
    };
  },
};
