/**
 * Blueprint Similarity Validator
 *
 * Compares a candidate blueprint against recently-used ones along multiple
 * axes (family, dominant imagery, tags, scope). Used by the multi-axis
 * selector to reject "same-but-slightly-different" picks before they reach
 * the AI prompt.
 *
 * Pure / dependency-free — Deno + browser compatible.
 */

import type { EmergencyBlueprint } from './emergencyBlueprints.ts';
import {
  inferFamily,
  inferImagery,
  type DangerFamily,
  type DangerTaxonomyFields,
} from './dangerTaxonomy.ts';

export type Candidate = EmergencyBlueprint & DangerTaxonomyFields;

export interface RecentEntry {
  id: string;
  family: DangerFamily;
  imagery: string[];
  tags: string[];
  scope: string;
}

/** 0 = identical, 1 = totally different */
export function similarityScore(a: Candidate, b: RecentEntry): number {
  if (a.id === b.id) return 0;
  let score = 1;

  // family penalty (heaviest)
  if (inferFamily(a) === b.family) score -= 0.45;

  // scope match (medium)
  if (a.scope === b.scope) score -= 0.10;

  // imagery overlap (medium)
  const aImg = new Set(inferImagery(a).map((x) => x.toLowerCase()));
  const bImg = new Set(b.imagery.map((x) => x.toLowerCase()));
  const imgOverlap = intersectionSize(aImg, bImg);
  if (aImg.size && bImg.size) {
    score -= 0.25 * (imgOverlap / Math.min(aImg.size, bImg.size));
  }

  // tag overlap (light)
  const aTags = new Set(a.tags.map((x) => x.toLowerCase()));
  const bTags = new Set(b.tags.map((x) => x.toLowerCase()));
  const tagOverlap = intersectionSize(aTags, bTags);
  if (aTags.size && bTags.size) {
    score -= 0.20 * (tagOverlap / Math.min(aTags.size, bTags.size));
  }

  return Math.max(0, Math.min(1, score));
}

function intersectionSize<T>(a: Set<T>, b: Set<T>): number {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}

/**
 * Average distinctness against the most recent N entries.
 * Higher = more distinct from the recent window.
 */
export function distinctnessAgainstRecent(
  candidate: Candidate,
  recent: RecentEntry[],
  windowSize = 8,
): number {
  if (recent.length === 0) return 1;
  const window = recent.slice(-windowSize);
  let total = 0;
  for (const r of window) total += similarityScore(candidate, r);
  return total / window.length;
}

export function toRecentEntry(b: Candidate): RecentEntry {
  return {
    id: b.id,
    family: inferFamily(b),
    imagery: inferImagery(b),
    tags: b.tags,
    scope: b.scope,
  };
}
