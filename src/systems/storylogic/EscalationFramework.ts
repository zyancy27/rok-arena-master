export const EscalationFramework = {
  build(tags: string[] = []) {
    const steps = ['signal', 'complication', 'cost', 'forced choice'];
    if (tags.includes('hazardous')) steps.splice(2, 0, 'environmental shift');
    if (tags.includes('distrust')) steps.splice(2, 0, 'relationship fracture');
    return steps;
  },
};
