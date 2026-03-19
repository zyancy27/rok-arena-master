export interface RelationshipPersistenceSnapshot {
  entityId: string;
  trust: number;
  disposition: string;
  definingMoments: string[];
}

export const RelationshipPersistenceEngine = {
  update(snapshot: RelationshipPersistenceSnapshot, signal: string) {
    const trustDelta = /protect|save|keep_word|repair/.test(signal)
      ? 8
      : /betray|abandon|threaten|humiliate/.test(signal)
        ? -12
        : /trade|talk|negotiate/.test(signal)
          ? 3
          : 0;

    return {
      ...snapshot,
      trust: Math.max(0, Math.min(100, snapshot.trust + trustDelta)),
      disposition: trustDelta > 0 ? 'warming' : trustDelta < 0 ? 'fraying' : snapshot.disposition,
      definingMoments: [...new Set([...snapshot.definingMoments, signal])].slice(-10),
    };
  },
};
