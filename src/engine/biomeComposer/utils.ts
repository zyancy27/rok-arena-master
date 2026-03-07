/**
 * BiomeComposer shared utilities
 */

/** Deterministic seeded random (0-1) from any numeric seed */
export function seeded(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Hash a string to a numeric seed */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Vary a base value by a percentage range */
export function vary(base: number, range: number, seed: number): number {
  return base * (1 + (seeded(seed) - 0.5) * range);
}
