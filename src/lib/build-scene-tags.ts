/**
 * Utility to build merged scene_tags for battle participants.
 * Combines theme-engine analysis of the location string with any
 * explicit tags from the emergency location payload.
 */

import { analyzeLocation, type EnvironmentTag } from '@/lib/theme-engine';

/**
 * Build a deduplicated set of environment tags from:
 *  1. Theme-engine keyword analysis of the location string
 *  2. Explicit tags from an emergency location payload (if any)
 *
 * Returns the array ready to store in battle_participants.scene_tags.
 */
export function buildSceneTags(
  location: string | null | undefined,
  emergencyTags?: string[] | null,
): EnvironmentTag[] {
  const analyzed = analyzeLocation(location);
  const explicit = (emergencyTags ?? []) as string[];

  // Merge + deduplicate, preserving analyzed order first
  const merged = new Set<string>(analyzed);
  for (const t of explicit) {
    merged.add(t.toLowerCase().trim());
  }

  return Array.from(merged) as EnvironmentTag[];
}
