export interface FactionMemorySnapshot {
  factionId: string;
  pressureHistory: string[];
  activeConflicts: string[];
  stability: number;
}

export const FactionMemoryEngine = {
  update(snapshot: FactionMemorySnapshot, event: string) {
    return {
      ...snapshot,
      pressureHistory: [...new Set([...snapshot.pressureHistory, event])].slice(-12),
      activeConflicts: [...new Set([...snapshot.activeConflicts, event])].slice(-6),
      stability: Math.max(0, Math.min(100, snapshot.stability + (/truce|repair|supply|regroup/.test(event) ? 6 : -8))),
    };
  },

  summarize(snapshot: FactionMemorySnapshot) {
    const recentEvent = snapshot.pressureHistory[snapshot.pressureHistory.length - 1] || null;
    const pressureBias = recentEvent && /escalation|maneuver|offensive|conflict/.test(recentEvent)
      ? 'escalating'
      : recentEvent && /truce|repair|supply|regroup/.test(recentEvent)
        ? 'recovering'
        : 'holding';

    return {
      pressureBias,
      stabilityBand: snapshot.stability < 35 ? 'fractured' : snapshot.stability > 70 ? 'stable' : 'contested',
      recentEvent,
    };
  },
};
