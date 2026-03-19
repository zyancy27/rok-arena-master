export interface CharacterCombatProfileFrameworkInput {
  powers?: string | null;
  abilities?: string | null;
  weaponsItems?: string | null;
  stats?: Record<string, number | null | undefined>;
}

const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export const CharacterCombatProfileFramework = {
  build(input: CharacterCombatProfileFrameworkInput) {
    const stats = input.stats || {};
    const speed = Number(stats.stat_speed ?? 50);
    const strength = Number(stats.stat_strength ?? 50);
    const power = Number(stats.stat_power ?? 50);
    const skill = Number(stats.stat_skill ?? 50);
    const battleIq = Number(stats.stat_battle_iq ?? 50);
    const haystack = `${input.powers || ''} ${input.abilities || ''} ${input.weaponsItems || ''}`.toLowerCase();
    const offensiveAverage = average([strength, power, skill]);

    return {
      combatIdentity: [
        offensiveAverage >= 70 ? 'high-pressure finisher' : 'measured skirmisher',
        battleIq >= 65 ? 'tactical processor' : 'instinct-led combatant',
      ],
      movementStyle: [
        speed >= 70 ? 'rapid repositioning' : 'anchored footwork',
        /stealth|dagger|assassin/.test(haystack) ? 'angle-seeking movement' : 'front-facing movement',
      ],
      dangerProfile: [
        power >= 70 ? 'burst danger' : 'attrition danger',
        /fire|lightning|energy|beam/.test(haystack) ? 'ranged threat' : 'contact threat',
      ],
      pressureStyle: [
        /shield|guard|defend/.test(haystack) ? 'space denial' : 'forward compression',
        battleIq >= 65 ? 'calculated pressure' : 'momentum pressure',
      ],
      tags: [
        speed >= 65 ? 'ranged' : 'melee',
        power >= 65 ? 'survival_pressure' : 'audio_reactive',
      ],
    };
  },
};
