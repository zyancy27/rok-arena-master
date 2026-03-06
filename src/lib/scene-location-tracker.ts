/**
 * Scene Location Tracker
 * 
 * Detects when battle messages describe a location/environment change
 * (e.g. "the fight crashes through the wall into a sewer", "they fall off the rooftop into the street")
 * and returns the new scene description so the chat background can update dynamically.
 *
 * The tracker keeps the *most recent* detected scene; the background stays
 * until a newer scene is detected from subsequent messages.
 */

import { analyzeLocation, type EnvironmentTag } from '@/lib/theme-engine';

// ── Location-shift trigger phrases ──────────────────────────────
const LOCATION_SHIFT_PATTERNS: RegExp[] = [
  // Explicit movement / transition
  /(?:crash|burst|fall|tumble|slam|break|smash|plunge|dive|drop|leap|jump|blast|fly|roll|stumble|dash|charge|flee|escape|run|retreat|push|pull|drag|throw|hurl|launch|eject|teleport|warp|phase|shift|portal|transport)\w*\s+(?:into|through|onto|over|off|out of|down into|up into|across|beneath|below|above|inside|outside|toward)\s+(?:the\s+|a\s+|an\s+)?(.{8,80})/i,
  // "They end up in / arrive at / land in"
  /(?:end up|arrive|land|emerge|appear|step out|climb out|crawl out|surface|reach)\w*\s+(?:in|at|on|inside|onto)\s+(?:the\s+|a\s+|an\s+)?(.{8,80})/i,
  // "The arena shifts / transforms / becomes"
  /(?:arena|battlefield|surroundings?|environment|ground|landscape|terrain|area|world|scene)\s+(?:shift|transform|change|morph|dissolve|melt|crack|crumble|flood|freeze|ignite|explode|collapse|open)\w*\s+(?:into|to|becoming)?\s*(?:the\s+|a\s+|an\s+)?(.{5,80})/i,
  // "now standing in / now surrounded by"
  /now\s+(?:standing|fighting|battling|surrounded|engulfed|submerged|floating|falling)\s+(?:in|by|on|inside|above|within)\s+(?:the\s+|a\s+|an\s+)?(.{8,80})/i,
];

// Strip trailing punctuation / trailing clause after comma
function cleanExtracted(raw: string): string {
  return raw
    .replace(/[.,;:!?"')\]]+$/, '')
    .replace(/,.*$/, '')
    .trim();
}

export interface SceneShift {
  /** The raw extracted location phrase */
  newLocation: string;
  /** Tags derived from the new location */
  tags: EnvironmentTag[];
}

/**
 * Analyze a single message for a location/environment shift.
 * Returns null if no shift detected.
 */
export function detectSceneShift(messageText: string): SceneShift | null {
  if (!messageText || messageText.length < 20) return null;

  // Strip markdown action markers for cleaner matching
  const cleaned = messageText.replace(/\*/g, '');

  for (const pattern of LOCATION_SHIFT_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match && match[1]) {
      const newLocation = cleanExtracted(match[1]);
      if (newLocation.length < 5) continue; // too short to be meaningful

      const tags = analyzeLocation(newLocation);
      // Only count as a real shift if we get at least one recognized environment tag
      if (tags.length > 0) {
        return { newLocation, tags };
      }
    }
  }

  return null;
}

/**
 * Scan an array of recent messages (newest last) and return the most
 * recent scene shift, or null if no shift has occurred.
 */
export function findLatestSceneShift(
  messages: { content: string; role: string; channel?: string }[],
): SceneShift | null {
  // Walk backwards to find the most recent shift
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    // Only check in-universe messages
    if (msg.channel && msg.channel !== 'in_universe') continue;
    const shift = detectSceneShift(msg.content);
    if (shift) return shift;
  }
  return null;
}
