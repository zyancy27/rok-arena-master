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

export interface EnvironmentalHazard {
  name: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe';
  terrain: string[];
}

/**
 * Define possible environmental hazards by terrain type
 */
const ENVIRONMENTAL_HAZARDS: Record<string, EnvironmentalHazard[]> = {
  volcanic: [
    { name: 'Lava Eruption', description: 'A nearby fissure cracks open, spewing molten lava across the battlefield! Both fighters must dodge the spreading flow.', severity: 'severe', terrain: ['volcanic'] },
    { name: 'Ground Collapse', description: 'The unstable volcanic rock crumbles, creating a new chasm between the fighters!', severity: 'moderate', terrain: ['volcanic'] },
    { name: 'Ash Cloud', description: 'A sudden eruption releases a thick cloud of volcanic ash, obscuring vision for both combatants!', severity: 'minor', terrain: ['volcanic'] },
    { name: 'Heat Wave', description: 'A wave of superheated air blasts across the arena, forcing both fighters to shield themselves!', severity: 'moderate', terrain: ['volcanic'] },
  ],
  tundra: [
    { name: 'Ice Crack', description: 'The frozen ground splits with a thunderous crack! The ice beneath both fighters becomes treacherously unstable.', severity: 'severe', terrain: ['tundra'] },
    { name: 'Blizzard Surge', description: 'A sudden whiteout blizzard sweeps across the battlefield, reducing visibility to near zero!', severity: 'moderate', terrain: ['tundra'] },
    { name: 'Avalanche', description: 'Snow and ice cascade down from above! Both combatants must scramble to avoid being buried.', severity: 'severe', terrain: ['tundra', 'mountain'] },
    { name: 'Freezing Wind', description: 'A blast of arctic wind cuts through the battlefield, numbing exposed flesh and slowing movements.', severity: 'minor', terrain: ['tundra'] },
  ],
  desert: [
    { name: 'Sandstorm', description: 'A massive sandstorm rolls in, pelting both fighters with stinging sand and reducing visibility!', severity: 'moderate', terrain: ['desert'] },
    { name: 'Quicksand', description: 'The ground suddenly gives way to quicksand! Both fighters struggle to maintain solid footing.', severity: 'severe', terrain: ['desert'] },
    { name: 'Dust Devil', description: 'A spinning column of sand and debris sweeps between the combatants, disrupting their engagement!', severity: 'minor', terrain: ['desert'] },
    { name: 'Heat Mirage', description: 'Intense heat creates disorienting mirages, making distances and positions deceiving for both fighters.', severity: 'minor', terrain: ['desert'] },
  ],
  ocean: [
    { name: 'Tidal Surge', description: 'A massive wave crashes onto the battlefield, threatening to sweep both fighters off their feet!', severity: 'severe', terrain: ['ocean', 'coastal'] },
    { name: 'Whirlpool', description: 'The water beneath begins spinning violently, creating a dangerous vortex that pulls at both combatants!', severity: 'severe', terrain: ['ocean'] },
    { name: 'Lightning Strike', description: 'A bolt of lightning cracks down near the water, sending electrical current through the battlefield!', severity: 'moderate', terrain: ['ocean', 'storm'] },
    { name: 'Rogue Wave', description: 'An unexpected wave surges across the arena, forcing both fighters to brace or be knocked down!', severity: 'moderate', terrain: ['ocean', 'coastal'] },
  ],
  crystal: [
    { name: 'Crystal Shatter', description: 'A massive crystal formation explodes, sending razor-sharp shards flying in all directions!', severity: 'severe', terrain: ['crystal'] },
    { name: 'Resonance Wave', description: 'The crystals begin to hum and vibrate at a disorienting frequency, affecting balance and concentration!', severity: 'moderate', terrain: ['crystal'] },
    { name: 'Light Refraction', description: 'The crystals suddenly catch the light, creating blinding prismatic flashes across the battlefield!', severity: 'minor', terrain: ['crystal'] },
  ],
  floating: [
    { name: 'Platform Shift', description: 'The floating island lurches violently, throwing both fighters off balance!', severity: 'moderate', terrain: ['floating'] },
    { name: 'Platform Collision', description: 'Two floating platforms crash together, sending debris flying and creating new terrain!', severity: 'severe', terrain: ['floating'] },
    { name: 'Gravity Flux', description: 'The mysterious forces holding the islands aloft fluctuate, causing both fighters to briefly lose their footing!', severity: 'minor', terrain: ['floating'] },
  ],
  storm: [
    { name: 'Lightning Strike', description: 'A bolt of lightning crashes down between the fighters, leaving the air crackling with electricity!', severity: 'severe', terrain: ['storm'] },
    { name: 'Thunder Blast', description: 'A deafening thunderclap rocks the battlefield, momentarily stunning both combatants!', severity: 'moderate', terrain: ['storm'] },
    { name: 'Wind Gust', description: 'A powerful gust of wind sweeps across the arena, pushing both fighters and disrupting projectiles!', severity: 'minor', terrain: ['storm'] },
  ],
  generic: [
    { name: 'Seismic Tremor', description: 'The ground shakes violently beneath both fighters, making stable footing nearly impossible!', severity: 'moderate', terrain: ['any'] },
    { name: 'Meteor Strike', description: 'A small meteor crashes nearby, creating a shockwave that staggers both combatants!', severity: 'severe', terrain: ['any'] },
    { name: 'Energy Surge', description: 'A strange energy pulse ripples through the battlefield, disrupting powers and abilities momentarily!', severity: 'moderate', terrain: ['any'] },
  ],
};

/**
 * Get applicable hazards for a given terrain feature set
 */
export function getApplicableHazards(terrainFeatures: TerrainFeatures | null): EnvironmentalHazard[] {
  const hazards: EnvironmentalHazard[] = [...ENVIRONMENTAL_HAZARDS.generic];
  
  if (!terrainFeatures) return hazards;
  
  if (terrainFeatures.hasVolcanoes) {
    hazards.push(...ENVIRONMENTAL_HAZARDS.volcanic);
  }
  if (terrainFeatures.hasTundra) {
    hazards.push(...ENVIRONMENTAL_HAZARDS.tundra);
  }
  if (terrainFeatures.hasDeserts) {
    hazards.push(...ENVIRONMENTAL_HAZARDS.desert);
  }
  if (terrainFeatures.oceanCoverage > 0.3) {
    hazards.push(...ENVIRONMENTAL_HAZARDS.ocean);
  }
  if (terrainFeatures.hasCrystals) {
    hazards.push(...ENVIRONMENTAL_HAZARDS.crystal);
  }
  if (terrainFeatures.hasFloatingIslands) {
    hazards.push(...ENVIRONMENTAL_HAZARDS.floating);
  }
  // Check for storm-like conditions in lore/biome
  if (terrainFeatures.primaryBiome === 'stormy' || 
      terrainFeatures.atmosphereType === 'thick') {
    hazards.push(...ENVIRONMENTAL_HAZARDS.storm);
  }
  
  return hazards;
}

/**
 * Generate hazard event prompt for AI to incorporate
 */
export function generateHazardEventPrompt(terrainFeatures: TerrainFeatures | null): string {
  const hazards = getApplicableHazards(terrainFeatures);
  
  if (hazards.length === 0) return '';
  
  // Pick a random hazard
  const hazard = hazards[Math.floor(Math.random() * hazards.length)];
  
  return `\n\n⚠️ ENVIRONMENTAL HAZARD EVENT: ${hazard.name.toUpperCase()}\n${hazard.description}\n\nYou MUST incorporate this hazard into your response. Describe how it affects BOTH fighters and how they react to it. This hazard takes priority in your narrative - describe the event happening first, then show both characters' reactions before continuing the battle.`;
}

/**
 * Determine if a hazard should trigger (based on message count for pacing)
 */
export function shouldTriggerHazard(messageCount: number, hazardFrequency: 'low' | 'medium' | 'high' = 'medium'): boolean {
  // Don't trigger on first few exchanges
  if (messageCount < 3) return false;
  
  const thresholds = {
    low: 0.1,    // 10% chance
    medium: 0.2, // 20% chance  
    high: 0.35,  // 35% chance
  };
  
  return Math.random() < thresholds[hazardFrequency];
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
