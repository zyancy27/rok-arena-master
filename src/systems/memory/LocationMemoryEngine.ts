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
      stability: Math.max(0, Math.min(100, snapshot.stability + (/repair|restored|secured/.test(marker) ? 5 : -7))),
    };
  },
};
