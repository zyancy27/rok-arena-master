export interface LocationTickInput {
  locationId: string;
  hazardLevel: number;
  pressure: number;
}

export const LocationTickEngine = {
  tick(input: LocationTickInput) {
    const nextHazardLevel = Math.max(0, Math.min(100, input.hazardLevel + (input.pressure > 65 ? 7 : -3)));
    const event = nextHazardLevel > 70 ? 'location destabilizes' : nextHazardLevel < 30 ? 'location settles' : 'location shifts';

    return {
      hazardLevel: nextHazardLevel,
      event,
      hazardDensity: nextHazardLevel > 75 ? 'overwhelming' : nextHazardLevel > 55 ? 'dense' : nextHazardLevel > 30 ? 'present' : 'minimal',
      pressureTags: [event, `hazard:${nextHazardLevel > 75 ? 'overwhelming' : nextHazardLevel > 55 ? 'dense' : nextHazardLevel > 30 ? 'present' : 'minimal'}`],
    };
  },
};
