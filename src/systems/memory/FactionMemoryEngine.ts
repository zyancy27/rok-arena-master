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
      stability: Math.max(0, Math.min(100, snapshot.stability + (/truce|repair|supply/.test(event) ? 6 : -8))),
    };
  },
};
