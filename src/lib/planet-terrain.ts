/**
 * Planet Terrain Parser
 * 
 * Analyzes planet lore/description to extract terrain features
 * and generate visual properties for 3D rendering.
 * 
 * The description/lore HEAVILY shapes the planet's appearance.
 */

export interface TerrainFeatures {
  // Water features (0-1 scale)
  oceanCoverage: number;
  hasRivers: boolean;
  hasLakes: boolean;
  oceanColor: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'dark' | 'acidic';
  
  // Land features
  continentType: 'single' | 'dual' | 'multiple' | 'archipelago' | 'none' | 'pangea';
  hasMountains: boolean;
  mountainScale: 'small' | 'medium' | 'large' | 'massive' | 'colossal';
  hasDeserts: boolean;
  hasForests: boolean;
  forestType: 'temperate' | 'jungle' | 'dark' | 'alien' | 'dead' | 'crystal' | 'none';
  hasTundra: boolean;
  hasVolcanoes: boolean;
  volcanoIntensity: 'dormant' | 'active' | 'extreme';
  hasSwamps: boolean;
  hasGrasslands: boolean;
  hasCanyons: boolean;
  
  // Special features
  hasCrystals: boolean;
  crystalColor: string;
  hasFloatingIslands: boolean;
  hasCaves: boolean;
  isBarren: boolean;
  isToxic: boolean;
  hasRuins: boolean;
  hasCities: boolean;
  hasGlowingFeatures: boolean;
  glowColor: string;
  hasMagicAura: boolean;
  hasStorms: boolean;
  stormType: 'sand' | 'lightning' | 'acid' | 'fire' | 'ice' | 'none';
  hasFungal: boolean;
  hasAlienVegetation: boolean;
  hasScarredTerrain: boolean;
  
  // Gravity effects on terrain
  highGravity: boolean;
  lowGravity: boolean;
  variableGravity: boolean;
  
  // Time effects
  tideLocked: boolean;
  
  // Atmosphere hints
  atmosphereType: 'none' | 'thin' | 'normal' | 'thick' | 'toxic' | 'magical';
  atmosphereColor: string;
  primaryBiome: string;
  
  // Color overrides from description
  dominantColor: string | null;
  secondaryDominantColor: string | null;
  
  // Planet shape modifiers
  planetShape: 'sphere' | 'oblate' | 'tidally-stretched' | 'irregular';
  axialTilt: 'normal' | 'extreme' | 'tilted';
}

export interface TerrainVisuals {
  // Colors derived from terrain
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  oceanColor: string;
  atmosphereColor: string;
  
  // Material properties
  roughness: number;
  metalness: number;
  emissiveIntensity: number;
  emissiveColor: string;
  
  // Visual effects
  hasOceanShimmer: boolean;
  hasIceCaps: boolean;
  hasCloudLayer: boolean;
  cloudDensity: number;
  cloudColor: string;
  hasDustStorms: boolean;
  dustColor: string;
  hasLavaGlow: boolean;
  lavaIntensity: number;
  hasCrystalShine: boolean;
  hasMagicGlow: boolean;
  hasAurorae: boolean;
  
  // Pattern suggestions
  surfacePattern: 'smooth' | 'cratered' | 'striped' | 'mottled' | 'fractured' | 'hexagonal' | 'spiral' | 'scarred';
  
  // Terrain generation params
  continentFrequency: number;
  mountainFrequency: number;
  detailLevel: number;
  
  // Description for character creation
  physiologyHints: string[];
}

// Extended keywords for comprehensive terrain detection
const TERRAIN_KEYWORDS = {
  // Water bodies
  ocean: ['ocean', 'sea', 'oceanic', 'water world', 'aquatic', 'maritime', 'marine', 'waters', 'depths', 'abyss'],
  river: ['river', 'rivers', 'streams', 'waterways', 'delta', 'creek', 'flowing water', 'flow down', 'tributaries'],
  lake: ['lake', 'lakes', 'inland sea', 'freshwater', 'pond', 'reservoir'],
  swamp: ['swamp', 'marsh', 'bog', 'wetland', 'bayou', 'fen', 'mire'],
  
  // Ocean colors
  oceanColors: {
    green: ['green ocean', 'algae', 'verdant waters', 'emerald sea'],
    red: ['red ocean', 'blood sea', 'crimson waters', 'iron-rich'],
    purple: ['purple ocean', 'violet sea', 'alien ocean'],
    orange: ['orange ocean', 'rust sea', 'copper waters'],
    dark: ['dark ocean', 'black sea', 'obsidian depths', 'void waters', 'the dark lives'],
    acidic: ['acid ocean', 'corrosive sea', 'toxic waters'],
  },
  
  // Mountains and terrain
  mountain: ['mountain', 'mountains', 'peaks', 'ranges', 'highlands', 'alpine', 'volcanic peaks', 'mountain peeks', 'high enough'],
  massiveMountain: ['massive mountain', 'towering peaks', 'enormous ranges', 'sky-piercing', 'colossal', 'titanic peaks'],
  canyon: ['canyon', 'gorge', 'ravine', 'chasm', 'rift', 'valley'],
  
  // Climate zones
  desert: ['desert', 'arid', 'dunes', 'sand', 'wasteland', 'dry', 'barren sands', 'tombs of the dead', 'sand bloated'],
  forest: ['forest', 'woodland', 'trees', 'vegetation', 'lush', 'verdant', 'grove', 'thicket'],
  jungle: ['jungle', 'rainforest', 'tropical', 'dense vegetation', 'foliage', 'the jungle'],
  darkForest: ['dark forest', 'dead forest', 'haunted wood', 'dying', 'disgraceful', 'dead trees', 'appear dead'],
  tundra: ['tundra', 'frozen', 'ice', 'arctic', 'polar', 'glacial', 'permafrost', 'polar cap', 'n. king', 'northern'],
  grassland: ['grassland', 'prairie', 'savanna', 'plains', 'steppe', 'meadow'],
  
  // Volcanic features
  volcano: ['volcano', 'volcanic', 'lava', 'magma', 'eruption', 'molten', 'scorching hot', 'scorched'],
  extremeVolcano: ['constant eruption', 'hellscape', 'rivers of lava', 'molten landscape', 'volcanic hellfire'],
  
  // Special features
  crystal: ['crystal', 'crystalline', 'gems', 'mineral', 'quartz', 'geode', 'shard'],
  floating: ['floating', 'levitating', 'suspended', 'gravity-defying', 'airborne islands'],
  cave: ['cave', 'cavern', 'underground', 'subterranean', 'tunnels', 'cave systems', 'deep below'],
  barren: ['barren', 'desolate', 'lifeless', 'dead', 'empty', 'sterile', 'uninhabited', 'mostly barren'],
  toxic: ['toxic', 'poisonous', 'acidic', 'corrosive', 'hazardous', 'dangerous fruit', 'kill anyone'],
  ruins: ['ruins', 'ancient', 'abandoned', 'temple', 'temples', 'relic', 'artifact', 'civilisation', 'monuments'],
  city: ['city', 'metropolis', 'urban', 'civilization', 'advanced', 'teck', 'tech', 'technological'],
  glowing: ['glowing', 'luminous', 'bioluminescent', 'radiant', 'shimmering', 'light'],
  magical: ['magical', 'mystic', 'enchanted', 'arcane', 'supernatural', 'powers', 'abilities'],
  storms: ['storm', 'tempest', 'hurricane', 'cyclone', 'blizzard', 'sandstorm', 'lightning'],
  fungal: ['fungal', 'mushroom', 'spore', 'mycelium', 'fungus'],
  alien: ['alien', 'strange', 'bizarre', 'otherworldly', 'exotic', 'unique', 'not normal', 'isn\'t normal'],
  scarred: ['scarred', 'war-torn', 'devastated', 'crater', 'impact', 'bombardment', 'moving castles'],
  
  // Gravity keywords
  highGravity: ['high gravity', 'heavy gravity', 'crushing', 'dense', 'strong gravity', 'g-force is 300x', 'strong gravity at'],
  lowGravity: ['low gravity', 'light gravity', 'floating', 'bouncy', 'little to no impact', 'gravity has little'],
  variableGravity: ['variable gravity', 'unstable gravity', 'gravity fluctuates', 'different gravity'],
  
  // Time/orbit
  tideLocked: ['tide-locked', 'tidal lock', 'one side', 'eternal day', 'eternal night', 'rolled around the sun', 'tilted away', 'tether'],
  
  // Continents
  continent: ['continent', 'landmass', 'mainland'],
  island: ['island', 'islands', 'archipelago', 'isles', 'atoll'],
  
  // Atmosphere types
  atmosphere: {
    none: ['no atmosphere', 'vacuum', 'airless'],
    thin: ['thin atmosphere', 'low pressure', 'sparse air'],
    thick: ['thick atmosphere', 'dense air', 'heavy atmosphere', 'pressure'],
    toxic: ['toxic atmosphere', 'poisonous air', 'unbreathable'],
    magical: ['magical aura', 'mystic atmosphere', 'enchanted air'],
  },
  
  // Color keywords for direct color detection
  colors: {
    red: ['red', 'crimson', 'scarlet', 'ruby', 'blood'],
    orange: ['orange', 'amber', 'rust', 'copper', 'fire'],
    yellow: ['yellow', 'gold', 'golden', 'sun-colored', 'bright'],
    green: ['green', 'emerald', 'verdant', 'jade', 'forest-green'],
    blue: ['blue', 'azure', 'sapphire', 'cobalt', 'navy'],
    purple: ['purple', 'violet', 'amethyst', 'lavender', 'indigo'],
    pink: ['pink', 'rose', 'magenta', 'fuchsia'],
    white: ['white', 'snow', 'ivory', 'pale', 'bleached'],
    black: ['black', 'obsidian', 'void', 'dark', 'shadow', 'the dark'],
    brown: ['brown', 'earthen', 'muddy', 'chocolate', 'umber'],
    gray: ['gray', 'grey', 'silver', 'ash', 'slate'],
  },
  
  // Biome-specific creatures/life
  life: {
    aquatic: ['fish', 'whale', 'dolphin', 'shark', 'leviathan', 'kraken'],
    forest: ['beast', 'wildlife', 'predator', 'creature'],
    desert: ['sand worm', 'scorpion', 'serpent'],
    undead: ['skeleton', 'undead', 'ghost', 'spirit', 'reaper', 'dead god', 'reapers'],
  },
};

// Color palette for different biomes
const BIOME_COLORS: Record<string, { primary: string; secondary: string; accent: string }> = {
  oceanic: { primary: '#1E40AF', secondary: '#0D47A1', accent: '#60A5FA' },
  arctic: { primary: '#E0F2FE', secondary: '#7DD3FC', accent: '#38BDF8' },
  desert: { primary: '#D97706', secondary: '#B45309', accent: '#FCD34D' },
  forested: { primary: '#166534', secondary: '#15803D', accent: '#4ADE80' },
  jungle: { primary: '#14532D', secondary: '#166534', accent: '#22C55E' },
  volcanic: { primary: '#7F1D1D', secondary: '#991B1B', accent: '#F97316' },
  barren: { primary: '#78716C', secondary: '#57534E', accent: '#A8A29E' },
  toxic: { primary: '#365314', secondary: '#3F6212', accent: '#BEF264' },
  tundra: { primary: '#A8C0B0', secondary: '#94A3B8', accent: '#E2E8F0' },
  crystal: { primary: '#8B5CF6', secondary: '#7C3AED', accent: '#C4B5FD' },
  magical: { primary: '#7C3AED', secondary: '#6D28D9', accent: '#DDD6FE' },
  haunted: { primary: '#1F2937', secondary: '#374151', accent: '#6B7280' },
  hellscape: { primary: '#450A0A', secondary: '#7F1D1D', accent: '#FF4500' },
  grassland: { primary: '#65A30D', secondary: '#84CC16', accent: '#D9F99D' },
  swamp: { primary: '#365314', secondary: '#3F6212', accent: '#84CC16' },
  fungal: { primary: '#9D174D', secondary: '#BE185D', accent: '#F9A8D4' },
  alien: { primary: '#6D28D9', secondary: '#7C3AED', accent: '#C4B5FD' },
  urban: { primary: '#475569', secondary: '#64748B', accent: '#94A3B8' },
  diverse: { primary: '#059669', secondary: '#10B981', accent: '#6EE7B7' },
};

/**
 * Parse lore text to extract terrain features with deep analysis
 */
export function parseTerrainFromLore(lore: string): TerrainFeatures {
  const text = lore.toLowerCase();
  
  // Helper function to check keywords
  const hasKeyword = (keywords: string[]) => keywords.some(k => text.includes(k));
  const countKeywords = (keywords: string[]) => keywords.filter(k => text.includes(k)).length;
  
  // === WATER FEATURES ===
  const hasOcean = hasKeyword(TERRAIN_KEYWORDS.ocean);
  const hasRivers = hasKeyword(TERRAIN_KEYWORDS.river);
  const hasLakes = hasKeyword(TERRAIN_KEYWORDS.lake);
  const hasSwamps = hasKeyword(TERRAIN_KEYWORDS.swamp);
  
  // Determine ocean color
  let oceanColor: TerrainFeatures['oceanColor'] = 'blue';
  if (hasKeyword(TERRAIN_KEYWORDS.oceanColors.green)) oceanColor = 'green';
  else if (hasKeyword(TERRAIN_KEYWORDS.oceanColors.red)) oceanColor = 'red';
  else if (hasKeyword(TERRAIN_KEYWORDS.oceanColors.purple)) oceanColor = 'purple';
  else if (hasKeyword(TERRAIN_KEYWORDS.oceanColors.orange)) oceanColor = 'orange';
  else if (hasKeyword(TERRAIN_KEYWORDS.oceanColors.dark)) oceanColor = 'dark';
  else if (hasKeyword(TERRAIN_KEYWORDS.oceanColors.acidic)) oceanColor = 'acidic';
  
  // Estimate ocean coverage
  let oceanCoverage = 0;
  if (text.includes('water world') || text.includes('oceanic planet')) oceanCoverage = 0.9;
  else if (text.includes('vast ocean') || text.includes('large ocean')) oceanCoverage = 0.7;
  else if (hasOcean) oceanCoverage = 0.5;
  else if (hasLakes || hasRivers) oceanCoverage = 0.25;
  else if (hasSwamps) oceanCoverage = 0.3;
  
  // Reduce ocean coverage for desert/barren worlds
  if (hasKeyword(TERRAIN_KEYWORDS.desert)) oceanCoverage = Math.min(oceanCoverage, 0.15);
  if (hasKeyword(TERRAIN_KEYWORDS.barren)) oceanCoverage = Math.min(oceanCoverage, 0.05);
  
  // === LAND FEATURES ===
  const hasMountains = hasKeyword(TERRAIN_KEYWORDS.mountain);
  const hasMassiveMountains = hasKeyword(TERRAIN_KEYWORDS.massiveMountain);
  const hasDeserts = hasKeyword(TERRAIN_KEYWORDS.desert);
  const hasForests = hasKeyword(TERRAIN_KEYWORDS.forest);
  const hasJungle = hasKeyword(TERRAIN_KEYWORDS.jungle);
  const hasDarkForest = hasKeyword(TERRAIN_KEYWORDS.darkForest);
  const hasTundra = hasKeyword(TERRAIN_KEYWORDS.tundra);
  const hasVolcanoes = hasKeyword(TERRAIN_KEYWORDS.volcano);
  const hasExtremeVolcanoes = hasKeyword(TERRAIN_KEYWORDS.extremeVolcano);
  const hasGrasslands = hasKeyword(TERRAIN_KEYWORDS.grassland);
  const hasCanyons = hasKeyword(TERRAIN_KEYWORDS.canyon);
  
  // === SPECIAL FEATURES ===
  const hasCrystals = hasKeyword(TERRAIN_KEYWORDS.crystal);
  const hasFloatingIslands = hasKeyword(TERRAIN_KEYWORDS.floating);
  const hasCaves = hasKeyword(TERRAIN_KEYWORDS.cave);
  const isBarren = hasKeyword(TERRAIN_KEYWORDS.barren);
  const isToxic = hasKeyword(TERRAIN_KEYWORDS.toxic);
  const hasRuins = hasKeyword(TERRAIN_KEYWORDS.ruins);
  const hasCities = hasKeyword(TERRAIN_KEYWORDS.city);
  const hasGlowingFeatures = hasKeyword(TERRAIN_KEYWORDS.glowing);
  const hasMagicAura = hasKeyword(TERRAIN_KEYWORDS.magical);
  const hasStorms = hasKeyword(TERRAIN_KEYWORDS.storms);
  const hasFungal = hasKeyword(TERRAIN_KEYWORDS.fungal);
  const hasAlienVegetation = hasKeyword(TERRAIN_KEYWORDS.alien);
  const hasScarredTerrain = hasKeyword(TERRAIN_KEYWORDS.scarred);
  
  // Gravity
  const highGravity = hasKeyword(TERRAIN_KEYWORDS.highGravity);
  const lowGravity = hasKeyword(TERRAIN_KEYWORDS.lowGravity);
  const variableGravity = hasKeyword(TERRAIN_KEYWORDS.variableGravity);
  
  // Time effects
  const tideLocked = hasKeyword(TERRAIN_KEYWORDS.tideLocked);
  
  // Determine forest type
  let forestType: TerrainFeatures['forestType'] = 'none';
  if (hasDarkForest) forestType = 'dead';
  else if (hasJungle) forestType = 'jungle';
  else if (hasCrystals && hasForests) forestType = 'crystal';
  else if (hasAlienVegetation) forestType = 'alien';
  else if (hasForests) forestType = 'temperate';
  
  // Determine volcano intensity
  let volcanoIntensity: TerrainFeatures['volcanoIntensity'] = 'dormant';
  if (hasExtremeVolcanoes) volcanoIntensity = 'extreme';
  else if (hasVolcanoes && (text.includes('active') || text.includes('erupting') || text.includes('scorching'))) volcanoIntensity = 'active';
  
  // Determine storm type
  let stormType: TerrainFeatures['stormType'] = 'none';
  if (hasStorms) {
    if (hasDeserts) stormType = 'sand';
    else if (hasVolcanoes) stormType = 'fire';
    else if (hasTundra) stormType = 'ice';
    else if (isToxic) stormType = 'acid';
    else stormType = 'lightning';
  }
  
  // Determine continent type
  let continentType: TerrainFeatures['continentType'] = 'multiple';
  if (text.includes('single continent') || text.includes('one landmass') || text.includes('supercontinent')) {
    continentType = 'single';
  } else if (text.includes('pangea') || text.includes('all land connected')) {
    continentType = 'pangea';
  } else if (text.includes('two continent') || text.includes('dual continent') || text.includes('twin landmass')) {
    continentType = 'dual';
  } else if (hasKeyword(TERRAIN_KEYWORDS.island)) {
    continentType = 'archipelago';
  } else if (oceanCoverage > 0.85 || isBarren) {
    continentType = 'none';
  }
  
  // Mountain scale
  let mountainScale: TerrainFeatures['mountainScale'] = 'medium';
  if (text.includes('colossal') || text.includes('impossibly tall')) mountainScale = 'colossal';
  else if (hasMassiveMountains || text.includes('towering') || text.includes('enormous')) mountainScale = 'massive';
  else if (text.includes('large mountain') || text.includes('great peaks')) mountainScale = 'large';
  else if (text.includes('small hill') || text.includes('gentle slopes')) mountainScale = 'small';
  
  // Atmosphere
  let atmosphereType: TerrainFeatures['atmosphereType'] = 'normal';
  if (hasKeyword(TERRAIN_KEYWORDS.atmosphere.none)) atmosphereType = 'none';
  else if (hasKeyword(TERRAIN_KEYWORDS.atmosphere.thin)) atmosphereType = 'thin';
  else if (hasKeyword(TERRAIN_KEYWORDS.atmosphere.thick)) atmosphereType = 'thick';
  else if (hasKeyword(TERRAIN_KEYWORDS.atmosphere.toxic) || isToxic) atmosphereType = 'toxic';
  else if (hasKeyword(TERRAIN_KEYWORDS.atmosphere.magical) || hasMagicAura) atmosphereType = 'magical';
  
  // Determine atmosphere color based on features
  let atmosphereColor = '#87CEEB'; // Default sky blue
  if (isToxic) atmosphereColor = '#9ACD32';
  else if (hasVolcanoes && volcanoIntensity === 'extreme') atmosphereColor = '#FF6347';
  else if (hasMagicAura) atmosphereColor = '#9370DB';
  else if (hasDeserts) atmosphereColor = '#DEB887';
  else if (hasTundra) atmosphereColor = '#B0E0E6';
  
  // Determine crystal color
  let crystalColor = '#E879F9'; // Default pink
  if (text.includes('blue crystal') || text.includes('sapphire')) crystalColor = '#60A5FA';
  else if (text.includes('green crystal') || text.includes('emerald')) crystalColor = '#4ADE80';
  else if (text.includes('red crystal') || text.includes('ruby')) crystalColor = '#F87171';
  else if (text.includes('dark crystal') || text.includes('obsidian')) crystalColor = '#4B5563';
  
  // Determine glow color
  let glowColor = '#FFFFFF';
  if (hasGlowingFeatures || hasMagicAura) {
    if (text.includes('blue glow') || text.includes('azure')) glowColor = '#60A5FA';
    else if (text.includes('green glow') || text.includes('emerald light')) glowColor = '#4ADE80';
    else if (text.includes('purple glow') || text.includes('violet')) glowColor = '#A855F7';
    else if (text.includes('golden glow') || text.includes('golden light')) glowColor = '#FCD34D';
    else if (hasKeyword(TERRAIN_KEYWORDS.life.undead)) glowColor = '#6B7280';
  }
  
  // Detect dominant colors from description
  let dominantColor: string | null = null;
  let secondaryDominantColor: string | null = null;
  
  const colorScores: Record<string, number> = {};
  for (const [colorName, keywords] of Object.entries(TERRAIN_KEYWORDS.colors)) {
    colorScores[colorName] = countKeywords(keywords);
  }
  
  const sortedColors = Object.entries(colorScores)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  
  if (sortedColors.length > 0) {
    dominantColor = getColorHex(sortedColors[0][0]);
  }
  if (sortedColors.length > 1) {
    secondaryDominantColor = getColorHex(sortedColors[1][0]);
  }
  
  // Planet shape modifiers
  let planetShape: TerrainFeatures['planetShape'] = 'sphere';
  if (text.includes('oblate') || text.includes('flattened')) planetShape = 'oblate';
  else if (tideLocked) planetShape = 'tidally-stretched';
  else if (text.includes('irregular') || text.includes('odd shape')) planetShape = 'irregular';
  
  // Axial tilt
  let axialTilt: TerrainFeatures['axialTilt'] = 'normal';
  if (text.includes('extreme tilt') || text.includes('sideways') || text.includes('tilted away') || text.includes('rolled around')) {
    axialTilt = 'extreme';
  } else if (text.includes('tilted') || text.includes('angled')) {
    axialTilt = 'tilted';
  }
  
  // Determine primary biome based on all features (order matters for priority)
  let primaryBiome = 'temperate';
  if (hasKeyword(TERRAIN_KEYWORDS.life.undead)) primaryBiome = 'haunted';
  else if (hasExtremeVolcanoes) primaryBiome = 'hellscape';
  else if (oceanCoverage > 0.7) primaryBiome = 'oceanic';
  else if (hasFungal) primaryBiome = 'fungal';
  else if (hasAlienVegetation) primaryBiome = 'alien';
  else if (hasCrystals) primaryBiome = 'crystal';
  else if (hasMagicAura) primaryBiome = 'magical';
  else if (hasTundra && !hasDeserts) primaryBiome = 'tundra';
  else if (hasVolcanoes) primaryBiome = 'volcanic';
  else if (hasDeserts && !hasForests) primaryBiome = 'desert';
  else if (hasSwamps) primaryBiome = 'swamp';
  else if (hasJungle || hasDarkForest) primaryBiome = 'jungle';
  else if (hasForests) primaryBiome = 'forested';
  else if (hasGrasslands) primaryBiome = 'grassland';
  else if (hasCities) primaryBiome = 'urban';
  else if (isBarren) primaryBiome = 'barren';
  else if (isToxic) primaryBiome = 'toxic';
  // Check for diverse ecosystems
  const biomeCount = [hasDeserts, hasForests, hasTundra, hasVolcanoes, hasSwamps, hasGrasslands, hasJungle].filter(Boolean).length;
  if (biomeCount >= 3 || text.includes('diverse')) primaryBiome = 'diverse';
  
  return {
    oceanCoverage,
    hasRivers,
    hasLakes,
    oceanColor,
    continentType,
    hasMountains,
    mountainScale,
    hasDeserts,
    hasForests,
    forestType,
    hasTundra,
    hasVolcanoes,
    volcanoIntensity,
    hasSwamps,
    hasGrasslands,
    hasCanyons,
    hasCrystals,
    crystalColor,
    hasFloatingIslands,
    hasCaves,
    isBarren,
    isToxic,
    hasRuins,
    hasCities,
    hasGlowingFeatures,
    glowColor,
    hasMagicAura,
    hasStorms,
    stormType,
    hasFungal,
    hasAlienVegetation,
    hasScarredTerrain,
    highGravity,
    lowGravity,
    variableGravity,
    tideLocked,
    atmosphereType,
    atmosphereColor,
    primaryBiome,
    dominantColor,
    secondaryDominantColor,
    planetShape,
    axialTilt,
  };
}

/**
 * Convert color name to hex
 */
function getColorHex(colorName: string): string {
  const colorMap: Record<string, string> = {
    red: '#DC2626',
    orange: '#D97706',
    yellow: '#CA8A04',
    green: '#16A34A',
    blue: '#2563EB',
    purple: '#7C3AED',
    pink: '#DB2777',
    white: '#F5F5F5',
    black: '#1F2937',
    brown: '#78350F',
    gray: '#6B7280',
  };
  return colorMap[colorName] || '#6B7280';
}

/**
 * Generate visual properties from terrain features
 */
export function generateTerrainVisuals(features: TerrainFeatures, baseColor: string): TerrainVisuals {
  // Start with biome colors
  const biomeColors = BIOME_COLORS[features.primaryBiome] || BIOME_COLORS.temperate;
  
  let primaryColor = features.dominantColor || biomeColors.primary;
  let secondaryColor = features.secondaryDominantColor || biomeColors.secondary;
  let accentColor = biomeColors.accent;
  
  // Ocean color based on type
  let oceanColor = '#1E40AF';
  switch (features.oceanColor) {
    case 'green': oceanColor = '#065F46'; break;
    case 'red': oceanColor = '#7F1D1D'; break;
    case 'purple': oceanColor = '#5B21B6'; break;
    case 'orange': oceanColor = '#9A3412'; break;
    case 'dark': oceanColor = '#0F172A'; break;
    case 'acidic': oceanColor = '#4D7C0F'; break;
  }
  
  let roughness = 0.7;
  let metalness = 0.2;
  let emissiveIntensity = 0;
  let emissiveColor = '#000000';
  let surfacePattern: TerrainVisuals['surfacePattern'] = 'mottled';
  let cloudDensity = 0.5;
  let cloudColor = '#FFFFFF';
  let dustColor = '#D97706';
  let lavaIntensity = 0;
  
  // Terrain generation params
  let continentFrequency = 1.2;
  let mountainFrequency = 3;
  let detailLevel = 1;
  
  // Adjust based on biome
  switch (features.primaryBiome) {
    case 'oceanic':
      roughness = 0.3;
      surfacePattern = 'smooth';
      cloudDensity = 0.7;
      continentFrequency = 0.8;
      break;
    case 'arctic':
    case 'tundra':
      roughness = 0.4;
      metalness = 0.4;
      surfacePattern = 'fractured';
      cloudDensity = 0.3;
      cloudColor = '#E0F2FE';
      break;
    case 'desert':
      roughness = 0.9;
      surfacePattern = 'striped';
      cloudDensity = 0.1;
      dustColor = '#D97706';
      continentFrequency = 2;
      break;
    case 'forested':
    case 'jungle':
      roughness = 0.65;
      surfacePattern = 'mottled';
      cloudDensity = features.primaryBiome === 'jungle' ? 0.8 : 0.5;
      detailLevel = 1.5;
      break;
    case 'volcanic':
    case 'hellscape':
      roughness = 0.85;
      metalness = 0.3;
      surfacePattern = 'fractured';
      lavaIntensity = features.volcanoIntensity === 'extreme' ? 1 : features.volcanoIntensity === 'active' ? 0.6 : 0.2;
      emissiveIntensity = lavaIntensity * 0.5;
      emissiveColor = '#FF4500';
      cloudDensity = 0.2;
      cloudColor = '#4B5563';
      continentFrequency = 1.5;
      mountainFrequency = 5;
      break;
    case 'barren':
      roughness = 0.95;
      metalness = 0.1;
      surfacePattern = 'cratered';
      cloudDensity = 0;
      continentFrequency = 0.5;
      break;
    case 'toxic':
      roughness = 0.6;
      surfacePattern = 'mottled';
      cloudDensity = 0.6;
      cloudColor = '#BEF264';
      break;
    case 'crystal':
      roughness = 0.2;
      metalness = 0.7;
      surfacePattern = 'hexagonal';
      emissiveIntensity = 0.3;
      emissiveColor = features.crystalColor;
      accentColor = features.crystalColor;
      break;
    case 'magical':
      roughness = 0.5;
      metalness = 0.4;
      surfacePattern = 'spiral';
      emissiveIntensity = 0.4;
      emissiveColor = features.glowColor;
      cloudColor = '#DDD6FE';
      break;
    case 'haunted':
      roughness = 0.8;
      metalness = 0.1;
      surfacePattern = 'scarred';
      cloudDensity = 0.7;
      cloudColor = '#4B5563';
      emissiveIntensity = 0.2;
      emissiveColor = '#6B7280';
      break;
    case 'fungal':
      roughness = 0.6;
      surfacePattern = 'mottled';
      cloudDensity = 0.4;
      cloudColor = '#F9A8D4';
      detailLevel = 2;
      break;
    case 'alien':
      roughness = 0.5;
      metalness = 0.5;
      surfacePattern = 'spiral';
      emissiveIntensity = 0.2;
      emissiveColor = '#A855F7';
      detailLevel = 1.5;
      break;
    case 'urban':
      roughness = 0.7;
      metalness = 0.5;
      surfacePattern = 'hexagonal';
      cloudDensity = 0.3;
      break;
    case 'diverse':
      roughness = 0.65;
      surfacePattern = 'mottled';
      cloudDensity = 0.5;
      detailLevel = 1.5;
      continentFrequency = 1.4;
      break;
  }
  
  // Crystal adjustments
  if (features.hasCrystals) {
    metalness = Math.max(metalness, 0.6);
    accentColor = features.crystalColor;
    emissiveIntensity = Math.max(emissiveIntensity, 0.2);
    emissiveColor = features.crystalColor;
  }
  
  // Gravity effects on terrain
  if (features.highGravity) {
    mountainFrequency *= 0.5;
    detailLevel *= 0.7;
    roughness = Math.min(roughness + 0.1, 1);
  }
  if (features.lowGravity) {
    mountainFrequency *= 1.5;
    detailLevel *= 1.3;
  }
  
  // Storm effects
  if (features.hasStorms) {
    cloudDensity = Math.max(cloudDensity, 0.6);
    switch (features.stormType) {
      case 'sand': dustColor = '#D97706'; break;
      case 'acid': cloudColor = '#BEF264'; break;
      case 'fire': cloudColor = '#F97316'; break;
      case 'ice': cloudColor = '#BFDBFE'; break;
    }
  }
  
  // Scarred terrain
  if (features.hasScarredTerrain) {
    surfacePattern = 'scarred';
    roughness = Math.max(roughness, 0.8);
  }
  
  // Generate physiology hints
  const physiologyHints: string[] = [];
  
  if (features.oceanCoverage > 0.6) {
    physiologyHints.push('Aquatic or amphibious adaptations (gills, webbed appendages, pressure resistance)');
  }
  if (features.hasTundra) {
    physiologyHints.push('Cold resistance, thick insulation (fur, blubber, slow metabolism)');
  }
  if (features.hasDeserts) {
    physiologyHints.push('Heat tolerance, water conservation (efficient kidneys, nocturnal behavior)');
  }
  if (features.hasMountains && (features.mountainScale === 'massive' || features.mountainScale === 'colossal')) {
    physiologyHints.push('High altitude adaptation (enhanced lung capacity, efficient oxygen use)');
  }
  if (features.highGravity) {
    physiologyHints.push('Dense musculature, compact stature, reinforced skeletal structure');
  }
  if (features.lowGravity) {
    physiologyHints.push('Elongated limbs, light bones, possibly flight capability');
  }
  if (features.atmosphereType === 'thick') {
    physiologyHints.push('Pressure-resistant bodies, possibly smaller stature');
  } else if (features.atmosphereType === 'thin') {
    physiologyHints.push('Enhanced respiratory systems, larger lung capacity');
  } else if (features.atmosphereType === 'toxic') {
    physiologyHints.push('Toxin filtering organs, resistant membranes, external protection');
  }
  if (features.hasVolcanoes) {
    physiologyHints.push('Heat-resistant skin or exoskeleton, sulfur-tolerant biology');
  }
  if (features.hasCaves) {
    physiologyHints.push('Enhanced low-light vision or echolocation, compact builds');
  }
  if (features.hasFloatingIslands) {
    physiologyHints.push('Light bodies or natural flight, magnetic sensitivity');
  }
  if (features.hasCrystals) {
    physiologyHints.push('Crystalline growths, resonance sensitivity, mineral-based diet');
  }
  if (features.hasFungal) {
    physiologyHints.push('Spore-based reproduction, symbiotic relationships with fungi');
  }
  if (features.hasAlienVegetation) {
    physiologyHints.push('Unusual biology adapted to exotic plant life');
  }
  if (features.forestType === 'dark' || features.forestType === 'dead') {
    physiologyHints.push('Dark vision, resilience to decay or negative energy');
  }
  if (features.hasMagicAura) {
    physiologyHints.push('Natural magical attunement, arcane sensitivity');
  }
  if (features.tideLocked) {
    physiologyHints.push('Extreme temperature tolerance, circadian rhythm differences');
  }
  if (physiologyHints.length === 0) {
    physiologyHints.push('Standard terrestrial physiology suitable');
  }
  
  return {
    primaryColor,
    secondaryColor,
    accentColor,
    oceanColor,
    atmosphereColor: features.atmosphereColor,
    roughness,
    metalness,
    emissiveIntensity,
    emissiveColor,
    hasOceanShimmer: features.oceanCoverage > 0.2,
    hasIceCaps: features.hasTundra || features.primaryBiome === 'arctic' || features.primaryBiome === 'tundra',
    hasCloudLayer: features.atmosphereType !== 'none',
    cloudDensity,
    cloudColor,
    hasDustStorms: features.hasStorms && features.stormType === 'sand',
    dustColor,
    hasLavaGlow: features.hasVolcanoes,
    lavaIntensity,
    hasCrystalShine: features.hasCrystals,
    hasMagicGlow: features.hasMagicAura || features.hasGlowingFeatures,
    hasAurorae: features.hasMagicAura || features.primaryBiome === 'tundra',
    surfacePattern,
    continentFrequency,
    mountainFrequency,
    detailLevel,
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
    case 'pangea': parts.push('Unified landmass'); break;
    case 'none': parts.push('No landmasses'); break;
  }
  
  // Water
  if (features.oceanCoverage > 0.7) parts.push('ocean-dominated');
  else if (features.oceanCoverage > 0.4) parts.push('substantial oceans');
  else if (features.oceanCoverage > 0.1) parts.push('some water bodies');
  
  if (features.oceanColor !== 'blue') parts.push(`${features.oceanColor} waters`);
  
  // Key features
  if (features.hasMountains) parts.push(`${features.mountainScale} mountain ranges`);
  if (features.hasVolcanoes) {
    parts.push(features.volcanoIntensity === 'extreme' ? 'extreme volcanic activity' : 'volcanic activity');
  }
  if (features.hasTundra) parts.push('polar regions');
  if (features.hasDeserts) parts.push('arid zones');
  if (features.hasForests) parts.push(`${features.forestType !== 'none' ? features.forestType + ' ' : ''}forests`);
  if (features.hasSwamps) parts.push('wetlands');
  if (features.hasCrystals) parts.push('crystalline formations');
  if (features.hasFloatingIslands) parts.push('floating landmasses');
  if (features.hasCaves) parts.push('cave systems');
  if (features.hasRuins) parts.push('ancient ruins');
  if (features.hasCities) parts.push('urban centers');
  if (features.hasMagicAura) parts.push('magical presence');
  if (features.hasFungal) parts.push('fungal ecosystems');
  if (features.highGravity) parts.push('high gravity');
  if (features.lowGravity) parts.push('low gravity');
  if (features.tideLocked) parts.push('tidally locked');
  
  return parts.join(', ') || 'Unknown terrain';
}
