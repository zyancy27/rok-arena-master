/**
 * System 6 — Narrative Landmark Awareness
 *
 * Stores generated landmarks and provides narrator-ready references.
 * Tracks how often landmarks are referenced so the narrator can
 * weave them naturally into the story.
 */

import type { TrackedLandmark } from './types';

let _landmarkId = 0;

// ── Landmark Registry ───────────────────────────────────────────

export interface LandmarkRegistry {
  landmarks: TrackedLandmark[];
  /** zoneId → landmark ids */
  byZone: Record<string, string[]>;
}

export function createLandmarkRegistry(): LandmarkRegistry {
  return { landmarks: [], byZone: {} };
}

export function registerLandmark(
  registry: LandmarkRegistry,
  name: string,
  description: string,
  zoneId: string,
  narratorTag?: string,
): LandmarkRegistry {
  const id = `landmark_${++_landmarkId}`;
  const landmark: TrackedLandmark = {
    id,
    name,
    description,
    zoneId,
    isDestroyed: false,
    referenceCount: 0,
    lastReferencedTurn: 0,
    narratorTag: narratorTag ?? `the ${name}`,
  };

  const landmarks = [...registry.landmarks, landmark];
  const byZone = { ...registry.byZone };
  byZone[zoneId] = [...(byZone[zoneId] ?? []), id];

  return { landmarks, byZone };
}

export function referenceLandmark(
  registry: LandmarkRegistry,
  landmarkId: string,
  turn: number,
): LandmarkRegistry {
  const landmarks = registry.landmarks.map((l) =>
    l.id === landmarkId
      ? { ...l, referenceCount: l.referenceCount + 1, lastReferencedTurn: turn }
      : l,
  );
  return { ...registry, landmarks };
}

export function destroyLandmark(
  registry: LandmarkRegistry,
  landmarkId: string,
): LandmarkRegistry {
  const landmarks = registry.landmarks.map((l) =>
    l.id === landmarkId ? { ...l, isDestroyed: true } : l,
  );
  return { ...registry, landmarks };
}

// ── Query ───────────────────────────────────────────────────────

export function getZoneLandmarks(
  registry: LandmarkRegistry,
  zoneId: string,
): TrackedLandmark[] {
  const ids = registry.byZone[zoneId] ?? [];
  return registry.landmarks.filter((l) => ids.includes(l.id));
}

export function getActiveLandmarks(registry: LandmarkRegistry): TrackedLandmark[] {
  return registry.landmarks.filter((l) => !l.isDestroyed);
}

/**
 * Build narrator-ready list of landmarks in a zone.
 */
export function buildLandmarkNarratorContext(
  registry: LandmarkRegistry,
  zoneId: string,
): string {
  const active = getZoneLandmarks(registry, zoneId).filter((l) => !l.isDestroyed);
  if (active.length === 0) return '';

  const tags = active.map((l) => l.narratorTag);
  if (tags.length === 1) return `Nearby: ${tags[0]}.`;
  const last = tags.pop()!;
  return `Nearby: ${tags.join(', ')}, and ${last}.`;
}

/**
 * Find landmark by partial name match (for narrator text scanning).
 */
export function findLandmarkByName(
  registry: LandmarkRegistry,
  text: string,
): TrackedLandmark | undefined {
  const lower = text.toLowerCase();
  return registry.landmarks.find(
    (l) => !l.isDestroyed && lower.includes(l.name.toLowerCase()),
  );
}
