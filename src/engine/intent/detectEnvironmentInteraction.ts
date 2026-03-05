/**
 * Environment Interaction Detection
 *
 * Detects when player actions interact with the battlefield environment.
 */

export interface EnvironmentInteraction {
  /** Player is using terrain offensively */
  offensiveUse: boolean;
  /** Player is using terrain defensively */
  defensiveUse: boolean;
  /** Specific terrain elements referenced */
  referencedElements: string[];
  /** Creativity score (higher = more creative use) */
  creativityScore: number;
}

const OFFENSIVE_ENV_PATTERNS = [
  /throw.{0,15}(rock|boulder|debris|rubble)/i,
  /use.{0,10}(terrain|environment|surroundings)/i,
  /slam.{0,10}(into|against).{0,10}(wall|ground|floor)/i,
  /weaponize.{0,10}(terrain|environment|debris)/i,
  /rip.{0,10}(ground|floor|earth|rock)/i,
  /collapse.{0,10}(building|structure|ceiling|cave)/i,
  /redirect.{0,10}(lava|water|energy|lightning)/i,
  /manipulate.{0,10}(gravity|terrain|earth|metal)/i,
];

const DEFENSIVE_ENV_PATTERNS = [
  /hide.{0,10}(behind|in|under)/i,
  /take cover/i,
  /use.{0,10}(wall|pillar|tree|rock).{0,10}(as|for).{0,10}(cover|shield)/i,
  /duck.{0,10}(behind|under)/i,
  /terrain.{0,10}(advantage|cover|protection)/i,
];

const TERRAIN_ELEMENTS = [
  'rock', 'boulder', 'wall', 'pillar', 'tree', 'building', 'rubble',
  'debris', 'lava', 'water', 'ice', 'crystal', 'sand', 'mud',
  'cliff', 'ledge', 'bridge', 'platform', 'crater', 'pit',
];

export function detectEnvironmentInteraction(moveText: string): EnvironmentInteraction {
  const text = moveText.toLowerCase();

  const offensiveUse = OFFENSIVE_ENV_PATTERNS.some(p => p.test(text));
  const defensiveUse = DEFENSIVE_ENV_PATTERNS.some(p => p.test(text));

  const referencedElements = TERRAIN_ELEMENTS.filter(el => text.includes(el));

  // Creativity score: combo of using environment + elements + non-obvious interactions
  let creativityScore = 0;
  if (offensiveUse) creativityScore += 2;
  if (defensiveUse) creativityScore += 1;
  creativityScore += Math.min(3, referencedElements.length);
  // Bonus for combining attack with environment
  if (offensiveUse && /attack|strike|slam|throw|launch/i.test(text)) {
    creativityScore += 2;
  }

  return {
    offensiveUse,
    defensiveUse,
    referencedElements,
    creativityScore: Math.min(10, creativityScore),
  };
}
