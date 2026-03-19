export interface LocationMemorySnapshot {
  locationId: string;
  hazardHistory: string[];
  changeMarkers: string[];
  stability: number;
}

export const LocationMemoryEngine = {
  update(snapshot: LocationMemorySnapshot, marker: string) {
    return {
      ...snapshot,
      hazardHistory: [...new Set([...snapshot.hazardHistory, marker])].slice(-12),
      changeMarkers: [...new Set([...snapshot.changeMarkers, marker])].slice(-10),
      stability: Math.max(0, Math.min(100, snapshot.stability + (/repair|restored|secured|settles/.test(marker) ? 5 : -7))),
    };
  },

  summarize(snapshot: LocationMemorySnapshot) {
    const recentMarker = snapshot.changeMarkers[snapshot.changeMarkers.length - 1] || null;
    const hazardBias = recentMarker && /destabil|hazard|collapse|burn|shift/.test(recentMarker)
      ? 'volatile'
      : recentMarker && /restored|secured|settles/.test(recentMarker)
        ? 'stabilizing'
        : 'lingering';

    return {
      hazardBias,
      stabilityBand: snapshot.stability < 35 ? 'fragile' : snapshot.stability > 70 ? 'stable' : 'shifting',
      recentMarker,
    };
  },
};
