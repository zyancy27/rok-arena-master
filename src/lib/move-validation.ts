// Move validation system for PvP battles
// Ensures players use moves consistent with their character's abilities

export interface CharacterAbilities {
  powers: string | null;
  abilities: string | null;
  name: string;
}

export interface MoveValidationResult {
  isValid: boolean;
  warningMessage: string | null;
  suggestedFix: string | null;
  violationType: 'element_mismatch' | 'ability_not_found' | 'unclear' | null;
}

// Extract element/ability types from character powers/abilities
export function extractAbilityTypes(powers: string | null, abilities: string | null): string[] {
  const text = `${powers || ''} ${abilities || ''}`.toLowerCase();
  const types: string[] = [];
  
  // Element types
  const elementPatterns: Record<string, RegExp> = {
    fire: /fire|flame|burn|heat|inferno|blaze|magma|lava|combustion|pyro/i,
    ice: /ice|freeze|frost|cold|snow|blizzard|cryo|frozen|winter|glacial/i,
    water: /water|aqua|ocean|sea|wave|flood|hydro|liquid|rain|tide/i,
    lightning: /lightning|thunder|electric|shock|volt|static|storm/i,
    earth: /earth|rock|stone|ground|terra|metal|mineral|seismic/i,
    wind: /wind|air|gust|tornado|hurricane|breeze|aero|cyclone/i,
    light: /light|holy|radiant|solar|sun|divine|celestial|luminous/i,
    dark: /dark|shadow|void|abyss|night|black|umbra|shade/i,
    psychic: /psychic|mental|mind|telekinesis|telepathy|psionic|brain/i,
    poison: /poison|toxic|venom|acid|corrosive|noxious/i,
    nature: /nature|plant|forest|wood|vine|leaf|organic|bio/i,
    gravity: /gravity|weight|mass|force|pull|crush/i,
    time: /time|temporal|chrono|speed|slow|fast|age/i,
    space: /space|dimension|portal|warp|teleport|void/i,
    sound: /sound|sonic|music|noise|vibration|echo|frequency/i,
    energy: /energy|ki|chi|chakra|aura|power|force/i,
  };
  
  // Combat styles
  const stylePatterns: Record<string, RegExp> = {
    martial: /martial|combat|fighting|karate|kung fu|boxing|wrestling|judo/i,
    sword: /sword|blade|katana|rapier|saber|slash|cut|cleave/i,
    ranged: /gun|bow|arrow|sniper|shoot|projectile|bullet/i,
    stealth: /stealth|ninja|assassin|shadow|sneak|invisible/i,
    magic: /magic|spell|sorcery|wizard|mage|arcane|mystic/i,
    tech: /tech|robot|cyber|machine|mechanical|gadget|device/i,
    beast: /beast|animal|creature|wild|feral|transform/i,
    divine: /divine|god|deity|sacred|holy|blessing/i,
    demonic: /demon|devil|infernal|hellfire|curse|corruption/i,
  };
  
  Object.entries(elementPatterns).forEach(([element, pattern]) => {
    if (pattern.test(text)) types.push(element);
  });
  
  Object.entries(stylePatterns).forEach(([style, pattern]) => {
    if (pattern.test(text)) types.push(style);
  });
  
  // Add generic physical if no specific abilities found
  if (types.length === 0 && text.length > 0) {
    types.push('physical');
  }
  
  return types;
}

// Check if a move aligns with character abilities
export function validateMove(
  moveText: string,
  characterAbilities: CharacterAbilities
): MoveValidationResult {
  const move = moveText.toLowerCase();
  const characterTypes = extractAbilityTypes(
    characterAbilities.powers, 
    characterAbilities.abilities
  );
  
  // Extract what type of move the player is attempting
  const moveTypes = extractAbilityTypes(move, null);
  
  // Check for conflicting elements
  const conflictingPairs: [string, string][] = [
    ['fire', 'ice'],
    ['light', 'dark'],
    ['water', 'lightning'], // special case - water + lightning can be dangerous to self
  ];
  
  // Find if the move uses an element the character doesn't have
  const missingElements: string[] = [];
  const conflictElements: string[] = [];
  
  moveTypes.forEach(moveType => {
    // Check if character has this ability type
    const hasAbility = characterTypes.includes(moveType) || 
      characterTypes.includes('magic') || // Magic users can do anything
      characterTypes.includes('energy') || // Energy manipulators are versatile
      moveType === 'physical'; // Everyone can do physical
    
    if (!hasAbility) {
      // Check for direct conflicts (ice user using fire, etc.)
      const hasConflict = conflictingPairs.some(([a, b]) => {
        return (characterTypes.includes(a) && moveType === b) ||
               (characterTypes.includes(b) && moveType === a);
      });
      
      if (hasConflict) {
        conflictElements.push(moveType);
      } else {
        missingElements.push(moveType);
      }
    }
  });
  
  // Generate warning message
  if (conflictElements.length > 0) {
    return {
      isValid: false,
      warningMessage: `⚠️ Move Conflict: ${characterAbilities.name} has ${characterTypes.join('/')} abilities, but this move uses ${conflictElements.join(', ')}. These elements directly conflict with your character's power set.`,
      suggestedFix: `Either explain how your character can use ${conflictElements.join('/')} moves despite their ${characterTypes.join('/')} abilities, or revise your move to use your actual powers.`,
      violationType: 'element_mismatch',
    };
  }
  
  if (missingElements.length > 0) {
    return {
      isValid: false,
      warningMessage: `⚠️ Ability Question: ${characterAbilities.name} uses ${characterTypes.join('/')} abilities. This move appears to use ${missingElements.join(', ')}, which isn't in their base power set.`,
      suggestedFix: `Explain how your character can perform this action with their existing abilities, or revise the move to match your character's powers.`,
      violationType: 'ability_not_found',
    };
  }
  
  return {
    isValid: true,
    warningMessage: null,
    suggestedFix: null,
    violationType: null,
  };
}

// Generate the unfair matchup message
export function generateMatchupMessage(
  playerTier: number,
  opponentTier: number,
  playerName: string,
  opponentName: string
): string | null {
  const tierGap = Math.abs(playerTier - opponentTier);
  
  if (tierGap < 2) return null; // No significant gap
  
  const isPlayerStronger = playerTier > opponentTier;
  const weakerName = isPlayerStronger ? opponentName : playerName;
  const strongerName = isPlayerStronger ? playerName : opponentName;
  
  return `⚖️ **Uneven Matchup Detected** (${tierGap} tier difference)

${weakerName} (Tier ${isPlayerStronger ? opponentTier : playerTier}) vs ${strongerName} (Tier ${isPlayerStronger ? playerTier : opponentTier})

**Remember:** The goal of R.O.K. isn't always to defeat your opponent—it's to see how your character adapts to challenging situations.

Sometimes your character bites off more than they can chew. Your goal is to show just how creative, cool (or uncool!) your character can be in these moments. This builds organic, dynamic stories.

💡 **Don't take a "loss" too seriously.** The best stories come from adversity!`;
}

// Check if a move is a mental/psychic attack
export function isMentalAttack(moveText: string): boolean {
  const mentalKeywords = [
    'mind', 'mental', 'psychic', 'telepathy', 'telekinesis', 'illusion',
    'hallucination', 'read', 'thoughts', 'brain', 'perception', 'control',
    'manipulate', 'fear', 'terror', 'nightmare', 'dream', 'memory', 'forget',
    'confusion', 'daze', 'hypnosis', 'hypnotize', 'mesmerize', 'charm',
    'dominate', 'possess', 'soul', 'spirit', 'will', 'willpower',
    'psionic', 'psychokinesis', 'mindbreak', 'mindfray',
  ];
  
  const text = moveText.toLowerCase();
  return mentalKeywords.some(keyword => text.includes(keyword));
}

// Parse the explanation from a disputed move
export function parseExplanation(text: string): { hasExplanation: boolean; explanation: string } {
  // Look for explanation patterns
  const explanationPatterns = [
    /because\s+(.+)/i,
    /since\s+(.+)/i,
    /due to\s+(.+)/i,
    /my character can\s+(.+)/i,
    /this works because\s+(.+)/i,
    /explanation:\s*(.+)/i,
    /I can do this because\s+(.+)/i,
  ];
  
  for (const pattern of explanationPatterns) {
    const match = text.match(pattern);
    if (match) {
      return { hasExplanation: true, explanation: match[1].trim() };
    }
  }
  
  // Check if the text is long enough to potentially be an explanation
  if (text.split(' ').length > 20) {
    return { hasExplanation: true, explanation: text };
  }
  
  return { hasExplanation: false, explanation: '' };
}

// Detect moves that would cause severe environmental/area damage
export interface AreaDamageWarning {
  isSevere: boolean;
  warningText: string | null;
  damageType: 'explosive' | 'elemental' | 'seismic' | 'cosmic' | 'widespread' | null;
  flavorText: string | null;
}

export function detectAreaDamage(moveText: string): AreaDamageWarning {
  const text = moveText.toLowerCase();
  
  // Explosive/blast attacks
  const explosivePatterns = /\b(explo|blast|bomb|detona|nuke|missile|grenade|eruption|burst|nova|big bang|final flash|kamehameha|spirit bomb|galick gun|rasengan)\b/i;
  
  // Elemental destruction
  const elementalPatterns = /\b(inferno|wildfire|tsunami|earthquake|avalanche|volcano|meteor|asteroid|hurricane|cyclone|tornado|lightning storm|blizzard|flood|hellfire|apocalyp)\b/i;
  
  // Seismic/ground attacks
  const seismicPatterns = /\b(shatter|crack|split|break|destroy|demolish|obliterate|level|raze|quake|tremor|rupture|crush|smash|pulverize)\b.*\b(ground|earth|terrain|area|city|building|mountain|landscape)\b/i;
  
  // Cosmic/reality-warping
  const cosmicPatterns = /\b(dimension|reality|void|black hole|singularity|warp|rift|tear|collapse|annihilat|erase|delete|eradicate|unmake|disintegrat)\b/i;
  
  // Wide-area indicators
  const widespreadIndicators = /\b(everything|everywhere|all around|entire|whole|massive|gigantic|enormous|colossal|titan|city.?wide|country.?wide|planet.?level|continental)\b/i;
  
  // Scale modifiers that increase severity
  const scaleModifiers = /\b(full power|maximum|ultimate|final|strongest|100%|all.?out|with everything|unleash|release)\b/i;
  
  let damageType: AreaDamageWarning['damageType'] = null;
  let severity = 0;
  
  if (explosivePatterns.test(text)) {
    damageType = 'explosive';
    severity += 2;
  }
  if (elementalPatterns.test(text)) {
    damageType = damageType || 'elemental';
    severity += 2;
  }
  if (seismicPatterns.test(text)) {
    damageType = damageType || 'seismic';
    severity += 2;
  }
  if (cosmicPatterns.test(text)) {
    damageType = 'cosmic';
    severity += 3;
  }
  if (widespreadIndicators.test(text)) {
    damageType = damageType || 'widespread';
    severity += 2;
  }
  if (scaleModifiers.test(text)) {
    severity += 1;
  }
  
  // Need at least severity 2 to trigger warning
  if (severity < 2) {
    return { isSevere: false, warningText: null, damageType: null, flavorText: null };
  }
  
  // Generate flavor text based on damage type
  const flavorTexts: Record<string, string[]> = {
    explosive: [
      "🔥 The air itself seems to hold its breath...",
      "💥 This attack will reshape the battlefield.",
      "⚠️ Shockwaves will ripple for miles.",
      "🌋 The ground trembles in anticipation.",
    ],
    elemental: [
      "🌊 Nature itself recoils from this power.",
      "⚡ The elements surge beyond control.",
      "🔥 Environmental devastation imminent.",
      "❄️ The very atmosphere will transform.",
    ],
    seismic: [
      "🌍 The earth groans under this force.",
      "⛰️ Terrain will never be the same.",
      "💔 Fissures will scar the landscape.",
      "🏔️ Mountains would crumble before this.",
    ],
    cosmic: [
      "🌌 Reality itself bends at the seams.",
      "✨ Space-time warps around this attack.",
      "🕳️ The fabric of existence strains.",
      "💫 Dimensions shudder at this power.",
    ],
    widespread: [
      "📍 Collateral damage: Extreme.",
      "🗺️ The entire area will be affected.",
      "⚠️ No corner will be left untouched.",
      "🎯 Wide-area devastation incoming.",
    ],
  };
  
  const warnings: Record<string, string> = {
    explosive: "⚠️ **AREA IMPACT WARNING** — This attack will cause explosive devastation to the surrounding battlefield.",
    elemental: "⚠️ **ENVIRONMENTAL ALERT** — Elemental forces of this magnitude will permanently alter the terrain.",
    seismic: "⚠️ **SEISMIC WARNING** — Ground-level destruction will reshape the combat area.",
    cosmic: "⚠️ **REALITY STRAIN** — An attack of this nature may tear at the fabric of the battlefield itself.",
    widespread: "⚠️ **WIDE-AREA IMPACT** — This move will affect the entire combat zone.",
  };
  
  const typeKey = damageType || 'widespread';
  const flavorOptions = flavorTexts[typeKey] || flavorTexts.widespread;
  const randomFlavor = flavorOptions[Math.floor(Math.random() * flavorOptions.length)];
  
  return {
    isSevere: true,
    warningText: warnings[typeKey],
    damageType,
    flavorText: randomFlavor,
  };
}
