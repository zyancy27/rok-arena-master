export interface FactionTickInput {
  factionId: string;
  currentPressure: number;
  activeConflicts: string[];
}

export const FactionTickEngine = {
  tick(input: FactionTickInput) {
    const pressure = Math.max(0, Math.min(100, input.currentPressure + (input.activeConflicts.length > 1 ? 8 : -2)));
    const event = pressure > 70 ? 'faction escalation' : pressure < 30 ? 'faction regroup' : 'faction maneuver';

    return {
      pressure,
      event,
    };
  },
};
