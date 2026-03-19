export const NpcPressureFramework = {
  build(role?: string | null, activity?: string | null) {
    const haystack = `${role || ''} ${activity || ''}`.toLowerCase();
    return {
      combatPressureStyle: [
        /assassin|ambush/.test(haystack) ? 'ambush pressure' : /guard|soldier/.test(haystack) ? 'frontline pressure' : 'situational pressure',
      ],
      relationshipPosture: [
        /investigate|watch|patrol/.test(haystack) ? 'suspicious distance' : 'conditional openness',
      ],
    };
  },
};
