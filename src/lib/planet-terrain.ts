/**
 * Planet Terrain Parser
 * 
 * Analyzes planet lore/description to extract terrain features
 * and generate visual properties for 3D rendering.
 */

export interface TerrainFeatures {
  // Water features (0-1 scale)
  oceanCoverage: number;      // Large oceans
  hasRivers: boolean;
  hasLakes: boolean;
  
  // Land features
  continentType: 'single' | 'dual' | 'multiple' | 'archipelago' | 'none';
  hasMountains: boolean;
  mountainScale: 'small' | 'medium' | 'large' | 'massive';
  hasDeserts: boolean;
  hasForests: boolean;
  hasTundra: boolean;
  hasVolcanoes: boolean;
  
  // Special features
  hasCrystals: boolean;
  hasFloatingIslands: boolean;
  hasCaves: boolean;
  isBarren: boolean;
  isToxic: boolean;
  
  // Atmosphere hints
  atmosphereType: 'none' | 'thin' | 'normal' | 'thick' | 'toxic';
  primaryBiome: string;
}

export interface TerrainVisuals {
  // Colors derived from terrain
  secondaryColor: string;
  accentColor: string;
  
  // Material properties
  roughness: number;
  metalness: number;
  
  // Visual effects
  hasOceanShimmer: boolean;
  hasIceCaps: boolean;
  hasCloudLayer: boolean;
  hasDustStorms: boolean;
  hasLavaGlow: boolean;
  
  // Pattern suggestions
  surfacePattern: 'smooth' | 'cratered' | 'striped' | 'mottled' | 'fractured';
  
  // Description for character creation
  physiologyHints: string[];
}

// Keywords to detect terrain features
const TERRAIN_KEYWORDS = {
  ocean: ['ocean', 'sea', 'oceanic', 'water world', 'aquatic', 'maritime', 'marine'],
  river: ['river', 'rivers', 'streams', 'waterways', 'delta'],
  lake: ['lake', 'lakes', 'inland sea', 'freshwater'],
  mountain: ['mountain', 'mountains', 'peaks', 'ranges', 'highlands', 'alpine', 'volcanic peaks'],
  massiveMountain: ['massive mountain', 'towering peaks', 'enormous ranges', 'sky-piercing', 'colossal'],
  desert: ['desert', 'arid', 'dunes', 'sand', 'wasteland', 'dry'],
  forest: ['forest', 'jungle', 'woodland', 'trees', 'vegetation', 'lush', 'verdant'],
  tundra: ['tundra', 'frozen', 'ice', 'arctic', 'polar', 'glacial', 'permafrost'],
  volcano: ['volcano', 'volcanic', 'lava', 'magma', 'eruption', 'molten'],
  crystal: ['crystal', 'crystalline', 'gems', 'mineral', 'quartz'],
  floating: ['floating', 'levitating', 'suspended', 'gravity-defying'],
  cave: ['cave', 'cavern', 'underground', 'subterranean', 'tunnels'],
  barren: ['barren', 'desolate', 'lifeless', 'dead', 'empty', 'sterile'],
  toxic: ['toxic', 'poisonous', 'acidic', 'corrosive', 'hazardous'],
  continent: ['continent', 'landmass', 'mainland'],
  island: ['island', 'islands', 'archipelago', 'isles', 'atoll'],
  atmosphere: {
    none: ['no atmosphere', 'vacuum', 'airless'],
    thin: ['thin atmosphere', 'low pressure', 'sparse air'],
    thick: ['thick atmosphere', 'dense air', 'heavy atmosphere', 'pressure'],
    toxic: ['toxic atmosphere', 'poisonous air', 'unbreathable'],
  },
};

/**
 * Parse lore text to extract terrain features
 */
export function parseTerrainFromLore(lore: string): TerrainFeatures {
  const text = lore.toLowerCase();
  
  // Detect water features
  const hasOcean = TERRAIN_KEYWORDS.ocean.some(k => text.includes(k));
  const hasRivers = TERRAIN_KEYWORDS.river.some(k => text.includes(k));
  const hasLakes = TERRAIN_KEYWORDS.lake.some(k => text.includes(k));
  
  // Estimate ocean coverage from keywords
  let oceanCoverage = 0;
  if (text.includes('water world') || text.includes('oceanic planet')) oceanCoverage = 0.9;
  else if (text.includes('vast ocean') || text.includes('large ocean')) oceanCoverage = 0.7;
  else if (hasOcean) oceanCoverage = 0.5;
  else if (hasLakes || hasRivers) oceanCoverage = 0.2;
  
  // Detect land features
  const hasMountains = TERRAIN_KEYWORDS.mountain.some(k => text.includes(k));
  const hasMassiveMountains = TERRAIN_KEYWORDS.massiveMountain.some(k => text.includes(k));
  const hasDeserts = TERRAIN_KEYWORDS.desert.some(k => text.includes(k));
  const hasForests = TERRAIN_KEYWORDS.forest.some(k => text.includes(k));
  const hasTundra = TERRAIN_KEYWORDS.tundra.some(k => text.includes(k));
  const hasVolcanoes = TERRAIN_KEYWORDS.volcano.some(k => text.includes(k));
  
  // Detect special features
  const hasCrystals = TERRAIN_KEYWORDS.crystal.some(k => text.includes(k));
  const hasFloatingIslands = TERRAIN_KEYWORDS.floating.some(k => text.includes(k));
  const hasCaves = TERRAIN_KEYWORDS.cave.some(k => text.includes(k));
  const isBarren = TERRAIN_KEYWORDS.barren.some(k => text.includes(k));
  const isToxic = TERRAIN_KEYWORDS.toxic.some(k => text.includes(k));
  
  // Determine continent type
  let continentType: TerrainFeatures['continentType'] = 'multiple';
  if (text.includes('single continent') || text.includes('one landmass')) continentType = 'single';
  else if (text.includes('two continent') || text.includes('dual continent') || text.includes('twin landmass')) continentType = 'dual';
  else if (TERRAIN_KEYWORDS.island.some(k => text.includes(k))) continentType = 'archipelago';
  else if (oceanCoverage > 0.8 || isBarren) continentType = 'none';
  
  // Mountain scale
  let mountainScale: TerrainFeatures['mountainScale'] = 'medium';
  if (hasMassiveMountains || text.includes('towering') || text.includes('enormous')) mountainScale = 'massive';
  else if (text.includes('large mountain') || text.includes('great peaks')) mountainScale = 'large';
  else if (text.includes('small hill') || text.includes('gentle slopes')) mountainScale = 'small';
  
  // Atmosphere
  let atmosphereType: TerrainFeatures['atmosphereType'] = 'normal';
  if (TERRAIN_KEYWORDS.atmosphere.none.some(k => text.includes(k))) atmosphereType = 'none';
  else if (TERRAIN_KEYWORDS.atmosphere.thin.some(k => text.includes(k))) atmosphereType = 'thin';
  else if (TERRAIN_KEYWORDS.atmosphere.thick.some(k => text.includes(k))) atmosphereType = 'thick';
  else if (TERRAIN_KEYWORDS.atmosphere.toxic.some(k => text.includes(k)) || isToxic) atmosphereType = 'toxic';
  
  // Determine primary biome
  let primaryBiome = 'temperate';
  if (oceanCoverage > 0.7) primaryBiome = 'oceanic';
  else if (hasTundra) primaryBiome = 'arctic';
  else if (hasDeserts && !hasForests) primaryBiome = 'desert';
  else if (hasForests && !hasDeserts) primaryBiome = 'forested';
  else if (hasVolcanoes) primaryBiome = 'volcanic';
  else if (isBarren) primaryBiome = 'barren';
  else if (isToxic) primaryBiome = 'toxic';
  
  return {
    oceanCoverage,
    hasRivers,
    hasLakes,
    continentType,
    hasMountains,
    mountainScale,
    hasDeserts,
    hasForests,
    hasTundra,
    hasVolcanoes,
    hasCrystals,
    hasFloatingIslands,
    hasCaves,
    isBarren,
    isToxic,
    atmosphereType,
    primaryBiome,
  };
}

/**
 * Generate visual properties from terrain features
 */
export function generateTerrainVisuals(features: TerrainFeatures, baseColor: string): TerrainVisuals {
  let secondaryColor = baseColor;
  let accentColor = '#FFFFFF';
  let roughness = 0.7;
  let metalness = 0.3;
  let surfacePattern: TerrainVisuals['surfacePattern'] = 'mottled';
  
  // Adjust colors based on primary biome
  switch (features.primaryBiome) {
    case 'oceanic':
      secondaryColor = '#1E40AF'; // Deep blue
      accentColor = '#60A5FA'; // Light blue
      roughness = 0.3;
      surfacePattern = 'smooth';
      break;
    case 'arctic':
      secondaryColor = '#E0F2FE'; // Ice white
      accentColor = '#7DD3FC'; // Cyan
      roughness = 0.2;
      metalness = 0.5;
      surfacePattern = 'fractured';
      break;
    case 'desert':
      secondaryColor = '#D97706'; // Amber
      accentColor = '#FCD34D'; // Yellow
      roughness = 0.9;
      surfacePattern = 'striped';
      break;
    case 'forested':
      secondaryColor = '#166534'; // Forest green
      accentColor = '#4ADE80'; // Light green
      roughness = 0.6;
      surfacePattern = 'mottled';
      break;
    case 'volcanic':
      secondaryColor = '#991B1B'; // Dark red
      accentColor = '#F97316'; // Orange
      roughness = 0.8;
      metalness = 0.4;
      surfacePattern = 'fractured';
      break;
    case 'barren':
      secondaryColor = '#78716C'; // Gray
      accentColor = '#A8A29E'; // Light gray
      roughness = 0.9;
      metalness = 0.1;
      surfacePattern = 'cratered';
      break;
    case 'toxic':
      secondaryColor = '#65A30D'; // Lime
      accentColor = '#BEF264'; // Yellow-green
      roughness = 0.5;
      surfacePattern = 'mottled';
      break;
  }
  
  // Crystal planets get metallic sheen
  if (features.hasCrystals) {
    metalness = 0.7;
    accentColor = '#E879F9'; // Pink crystal
  }
  
  // Generate physiology hints for character creation
  const physiologyHints: string[] = [];
  
  if (features.oceanCoverage > 0.6) {
    physiologyHints.push('Aquatic or amphibious adaptations likely (gills, webbed appendages, pressure resistance)');
  }
  
  if (features.hasTundra) {
    physiologyHints.push('Cold resistance, thick insulation (fur, blubber, or slow metabolism)');
  }
  
  if (features.hasDeserts) {
    physiologyHints.push('Heat tolerance, water conservation (efficient kidneys, nocturnal behavior)');
  }
  
  if (features.hasMountains && features.mountainScale === 'massive') {
    physiologyHints.push('High altitude adaptation (enhanced lung capacity, efficient oxygen use)');
  }
  
  if (features.atmosphereType === 'thick') {
    physiologyHints.push('Pressure-resistant bodies, possibly smaller stature');
  } else if (features.atmosphereType === 'thin') {
    physiologyHints.push('Enhanced respiratory systems, possibly larger lung capacity');
  } else if (features.atmosphereType === 'toxic') {
    physiologyHints.push('Toxin filtering organs, resistant membranes, or external protection');
  }
  
  if (features.hasVolcanoes) {
    physiologyHints.push('Heat-resistant skin or exoskeleton, sulfur-tolerant biology');
  }
  
  if (features.hasCaves) {
    physiologyHints.push('Enhanced low-light vision or echolocation, compact builds');
  }
  
  if (features.hasFloatingIslands) {
    physiologyHints.push('Light bodies or natural flight capability, magnetic sensitivity');
  }
  
  if (features.hasCrystals) {
    physiologyHints.push('Possible crystalline growths, resonance sensitivity, mineral-based diet');
  }
  
  if (features.isBarren) {
    physiologyHints.push('Extreme resilience, possibly silicon-based or inorganic life');
  }
  
  if (physiologyHints.length === 0) {
    physiologyHints.push('Standard terrestrial physiology suitable');
  }
  
  return {
    secondaryColor,
    accentColor,
    roughness,
    metalness,
    hasOceanShimmer: features.oceanCoverage > 0.3,
    hasIceCaps: features.hasTundra || features.primaryBiome === 'arctic',
    hasCloudLayer: features.atmosphereType === 'thick' || features.atmosphereType === 'normal',
    hasDustStorms: features.hasDeserts && features.atmosphereType !== 'none',
    hasLavaGlow: features.hasVolcanoes,
    surfacePattern,
    physiologyHints,
  };
}

/**
 * Get a summary of terrain for display
 */
export function getTerrainSummary(features: TerrainFeatures): string {
  const parts: string[] = [];
  
  // Continent description
  switch (features.continentType) {
    case 'single': parts.push('Single supercontinent'); break;
    case 'dual': parts.push('Two major continents'); break;
    case 'multiple': parts.push('Multiple continents'); break;
    case 'archipelago': parts.push('Island archipelago'); break;
    case 'none': parts.push('No landmasses'); break;
  }
  
  // Water
  if (features.oceanCoverage > 0.7) parts.push('ocean-dominated');
  else if (features.oceanCoverage > 0.4) parts.push('substantial oceans');
  else if (features.oceanCoverage > 0.1) parts.push('some water bodies');
  
  // Key features
  if (features.hasMountains) {
    parts.push(`${features.mountainScale} mountain ranges`);
  }
  if (features.hasVolcanoes) parts.push('volcanic activity');
  if (features.hasTundra) parts.push('polar regions');
  if (features.hasDeserts) parts.push('arid zones');
  if (features.hasForests) parts.push('forested areas');
  if (features.hasCrystals) parts.push('crystalline formations');
  if (features.hasFloatingIslands) parts.push('floating landmasses');
  
  return parts.join(', ') || 'Unknown terrain';
}
