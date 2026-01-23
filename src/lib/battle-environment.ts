/**
 * Battle Environment Effects
 * 
 * Generates context strings for AI to describe how planetary conditions
 * affect combat actions (gravity, atmosphere, terrain, etc.)
 */

import { getGravityClass, calculateGravityStatModifiers } from './planet-physics';
import { parseTerrainFromLore, TerrainFeatures } from './planet-terrain';

export interface BattleEnvironment {
  planetName: string;
  gravity: number;
  gravityClass: { name: string; color: string; description: string };
  terrainFeatures: TerrainFeatures | null;
  effectsPrompt: string;
  shortSummary: string;
}

/**
 * Generate battle environment context from planet data
 */
export function generateBattleEnvironment(
  planetName: string,
  gravity: number | null,
  lore: string | null
): BattleEnvironment {
  const effectiveGravity = gravity ?? 1.0;
  const gravityClass = getGravityClass(effectiveGravity);
  const terrainFeatures = lore ? parseTerrainFromLore(lore) : null;
  
  // Build effects prompt for AI
  const effects: string[] = [];
  
  // Gravity effects
  if (effectiveGravity < 0.5) {
    effects.push(`LOW GRAVITY (${effectiveGravity.toFixed(2)}g): Objects float longer, jumps go much higher/farther. Thrown objects travel greater distances but with less force. Characters may struggle with fine motor control. Heavy impacts are reduced.`);
  } else if (effectiveGravity < 0.8) {
    effects.push(`REDUCED GRAVITY (${effectiveGravity.toFixed(2)}g): Movement feels lighter. Jumps and throws go further than normal. Falls are less dangerous.`);
  } else if (effectiveGravity > 2.0) {
    effects.push(`CRUSHING GRAVITY (${effectiveGravity.toFixed(2)}g): Every movement is exhausting. Lifting objects is extremely difficult - a car would be nearly immovable. Jumps are very short. Projectiles fall quickly. Stamina drains rapidly.`);
  } else if (effectiveGravity > 1.5) {
    effects.push(`HIGH GRAVITY (${effectiveGravity.toFixed(2)}g): Objects feel much heavier. Throwing things requires more effort and they don't go as far. Running is tiring. Jumping is limited. Falls hit harder.`);
  }
  
  // Terrain effects
  if (terrainFeatures) {
    if (terrainFeatures.oceanCoverage > 0.6) {
      effects.push('AQUATIC ENVIRONMENT: Water surrounds the battlefield. Swimming may be required. Electrical attacks conduct through water. Fire attacks are weakened.');
    }
    
    if (terrainFeatures.hasVolcanoes) {
      effects.push('VOLCANIC TERRAIN: Lava flows pose constant danger. The ground may crack and shift. Heat is extreme - metal weapons become hot to touch. Ash clouds reduce visibility.');
    }
    
    if (terrainFeatures.hasTundra) {
      effects.push('FROZEN TERRAIN: Ice makes footing treacherous. Metal becomes brittle. Cold drains stamina over time. Breath is visible. Water-based attacks may freeze.');
    }
    
    if (terrainFeatures.hasDeserts) {
      effects.push('DESERT CONDITIONS: Sandstorms may reduce visibility. Heat causes fatigue. Metal surfaces become burning hot. Mirages may confuse perception.');
    }
    
    if (terrainFeatures.atmosphereType === 'thin') {
      effects.push('THIN ATMOSPHERE: Breathing is difficult - exertion causes faster fatigue. Sound travels poorly. Fire burns weakly or not at all.');
    } else if (terrainFeatures.atmosphereType === 'thick') {
      effects.push('DENSE ATMOSPHERE: Movement through air feels sluggish. Sound is amplified. Pressure affects the ears. Flying/jumping is harder.');
    } else if (terrainFeatures.atmosphereType === 'toxic') {
      effects.push('TOXIC ATMOSPHERE: Every breath is dangerous without protection. Exposed skin may burn. Visibility may be reduced by haze.');
    }
    
    if (terrainFeatures.hasCrystals) {
      effects.push('CRYSTALLINE ENVIRONMENT: Crystal formations may reflect/refract energy attacks. Crystals can shatter into sharp fragments. Resonance may affect certain powers.');
    }
    
    if (terrainFeatures.hasFloatingIslands) {
      effects.push('FLOATING TERRAIN: Platforms may shift or rotate. Gaps between islands require jumping or flight. Falling means a long drop.');
    }
    
    if (terrainFeatures.hasMountains && terrainFeatures.mountainScale === 'massive') {
      effects.push('EXTREME ALTITUDE: Thin air at high elevations. Avalanche risk from loud sounds or impacts. Steep terrain limits movement options.');
    }
  }
  
  // Build short summary
  const summaryParts: string[] = [gravityClass.name];
  if (terrainFeatures?.primaryBiome && terrainFeatures.primaryBiome !== 'temperate') {
    summaryParts.push(terrainFeatures.primaryBiome);
  }
  
  const effectsPrompt = effects.length > 0 
    ? `\n\nENVIRONMENTAL EFFECTS ON ${planetName.toUpperCase()}:\n${effects.join('\n\n')}\n\nIMPORTANT: When describing combat actions, explain how these environmental conditions affect the moves. For example, if someone tries to throw a heavy object in high gravity, describe the struggle and reduced distance. If someone jumps in low gravity, describe them floating higher than expected.`
    : '';
  
  return {
    planetName,
    gravity: effectiveGravity,
    gravityClass,
    terrainFeatures,
    effectsPrompt,
    shortSummary: summaryParts.join(' • '),
  };
}

/**
 * Get stat modifiers description for display
 */
export function getEnvironmentStatImpact(gravity: number): string {
  const mods = calculateGravityStatModifiers(gravity);
  const impacts: string[] = [];
  
  if (mods.strength !== 0) {
    impacts.push(`Strength ${mods.strength > 0 ? '+' : ''}${mods.strength}`);
  }
  if (mods.speed !== 0) {
    impacts.push(`Speed ${mods.speed > 0 ? '+' : ''}${mods.speed}`);
  }
  if (mods.durability !== 0) {
    impacts.push(`Durability ${mods.durability > 0 ? '+' : ''}${mods.durability}`);
  }
  if (mods.stamina !== 0) {
    impacts.push(`Stamina ${mods.stamina > 0 ? '+' : ''}${mods.stamina}`);
  }
  
  return impacts.length > 0 ? impacts.join(', ') : 'No modifiers';
}
