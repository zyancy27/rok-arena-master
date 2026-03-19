export const ThreatCompositionFramework = {
  build(enemyCount = 1, tags: string[] = []) {
    return {
      threatComposition: [
        enemyCount > 3 ? 'swarm pressure' : enemyCount > 1 ? 'layered threat' : 'focused threat',
        tags.includes('occupation_force') ? 'organized opposition' : 'situational opposition',
      ],
    };
  },
};
