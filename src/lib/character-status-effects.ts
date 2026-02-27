/**
 * Character Status Effects Detection System
 * Detects status effects affecting individual characters from battle messages
 * and triggers visual effects in their chat input box
 */

export type CharacterStatusType = 
  | 'paralyzed'    // lightning/electricity - can't move freely
  | 'blinded'      // darkness/flash - can't see
  | 'submerged'    // underwater/drowning
  | 'burning'      // on fire/burning
  | 'frozen'       // encased in ice/frost
  | 'poisoned'     // toxic/venomous
  | 'stunned'      // dazed/confused
  | 'restrained'   // bound/trapped/webbed
  | 'slowed'       // sluggish/heavy/weighted
  | 'exhausted'    // fatigued/tired/drained
  | 'aerial'       // flying/airborne
  | 'smokescreen'  // surrounded by smoke/fog
  | 'bleeding'     // bleeding/hemorrhaging
  | 'electrified'  // coursing with electricity
  | 'magnetized'   // static/glitch interference
  | 'cosmicVacuum' // being pulled into a void
  | 'buried';      // underground/buried/trapped below

export interface CharacterStatusEffect {
  type: CharacterStatusType;
  intensity: 'light' | 'moderate' | 'severe';
  duration: number; // milliseconds
  startTime: number;
  source: string; // Brief description of what caused it
}

interface StatusPattern {
  type: CharacterStatusType;
  patterns: RegExp[];
  intensity: 'light' | 'moderate' | 'severe';
  duration: number;
}

// Patterns that indicate a character is AFFECTED BY a status (not causing it)
const STATUS_PATTERNS: StatusPattern[] = [
  // Paralysis - electricity, stunning
  {
    type: 'paralyzed',
    patterns: [
      /\b(paralyz|paralyse|paralys)\w*/i,
      /\b(electric|electr|shock)\w*.{0,20}(through|courses?|surges?|jolts?)/i,
      /\b(can'?t|cannot|unable).{0,15}move/i,
      /\b(muscles?|body|limbs?).{0,15}(seize|lock|freeze|spasm)/i,
      /\b(stunned|immobilized|incapacitated)\b/i,
      /\blightning.{0,15}(strikes?|hits?|connects?)/i,
      /\b(nerve|nerves).{0,15}(damaged?|fried|overloaded)/i,
    ],
    intensity: 'moderate',
    duration: 12000,
  },
  {
    type: 'paralyzed',
    patterns: [
      /\b(completely|fully|totally).{0,10}(paralyz|immobili|incapacitat)/i,
      /\b(massive|powerful|devastating).{0,10}(shock|jolt|surge)/i,
    ],
    intensity: 'severe',
    duration: 18000,
  },

  // Blinded - can't see
  {
    type: 'blinded',
    patterns: [
      /\b(blind|blinded|blinding)\b/i,
      /\b(can'?t|cannot|unable).{0,15}see/i,
      /\b(vision|sight|eyes?).{0,15}(gone|lost|fail|obscured)/i,
      /\b(flash|light).{0,15}(blinds?|blinded|dazzl)/i,
      /\beyes?.{0,15}(burn|sting|water|shut)/i,
      /\b(darkness|shadow).{0,15}(covers?|engulfs?|surrounds?).{0,10}(you|your|eyes?)/i,
    ],
    intensity: 'moderate',
    duration: 8000,
  },
  {
    type: 'blinded',
    patterns: [
      /\b(completely|totally|permanently).{0,10}blind/i,
      /\bworld.{0,10}(goes?|turns?|becomes?).{0,5}(dark|black)/i,
    ],
    intensity: 'severe',
    duration: 15000,
  },

  // Submerged - underwater
  {
    type: 'submerged',
    patterns: [
      /\b(submerge|underwater|drowning|drown)\w*/i,
      /\b(water|wave|flood|tide).{0,15}(engulfs?|swallows?|covers?)/i,
      /\b(can'?t|cannot|unable|struggling).{0,15}(breathe|breath)/i,
      /\b(lungs?).{0,15}(fill|burn|ache)/i,
      /\b(drag|pull|push).{0,15}(under|beneath|down).{0,10}water/i,
      /\b(trapped|caught).{0,15}(water|current|wave)/i,
    ],
    intensity: 'moderate',
    duration: 10000,
  },
  {
    type: 'submerged',
    patterns: [
      /\b(completely|fully).{0,10}(submerged|underwater)/i,
      /\bdrowned?\b/i,
    ],
    intensity: 'severe',
    duration: 15000,
  },

  // Burning - on fire
  {
    type: 'burning',
    patterns: [
      /\b(on fire|ablaze|burning|ignited)\b/i,
      /\b(flames?|fire).{0,15}(engulf|spread|consume|wrap)/i,
      /\b(skin|body|clothes?|armor).{0,15}(burns?|burning|scorching|searing)/i,
      /\b(intense|searing).{0,10}(heat|pain|burn)/i,
    ],
    intensity: 'moderate',
    duration: 10000,
  },
  {
    type: 'burning',
    patterns: [
      /\b(completely|entirely|fully).{0,10}(engulfed|covered).{0,10}(flame|fire)/i,
      /\b(incinerat|charr)\w*/i,
    ],
    intensity: 'severe',
    duration: 15000,
  },

  // Frozen - encased in ice
  {
    type: 'frozen',
    patterns: [
      /\b(frozen|freeze|frost|encased).{0,15}(ice|cold|frost)?/i,
      /\b(ice|frost).{0,15}(covers?|spreads?|encases?|traps?)/i,
      /\b(body|limbs?|legs?|arms?).{0,15}(frozen|frosting|freezing)/i,
      /\b(shivering|hypotherm|frostbit)/i,
      /\b(cold|chill).{0,15}(seeps?|spreads?|penetrat)/i,
    ],
    intensity: 'moderate',
    duration: 12000,
  },
  {
    type: 'frozen',
    patterns: [
      /\b(completely|solid|entirely).{0,10}frozen/i,
      /\b(trapped|encased).{0,10}(block|prison).{0,5}ice/i,
    ],
    intensity: 'severe',
    duration: 18000,
  },

  // Poisoned - toxic
  {
    type: 'poisoned',
    patterns: [
      /\b(poison|venom|toxin)\w*.{0,15}(spreads?|courses?|enters?|flows?)/i,
      /\b(feel|feeling).{0,15}(sick|nauseous|weak|dizzy)/i,
      /\b(veins?|blood).{0,15}(burn|tainted|corrupted)/i,
      /\b(losing|draining).{0,15}strength/i,
    ],
    intensity: 'moderate',
    duration: 15000,
  },
  {
    type: 'poisoned',
    patterns: [
      /\b(deadly|lethal|fatal).{0,10}(poison|venom|toxin)/i,
      /\b(poison|toxin).{0,15}(overwhelm|consumes?)/i,
    ],
    intensity: 'severe',
    duration: 20000,
  },

  // Stunned - dazed
  {
    type: 'stunned',
    patterns: [
      /\b(stunned|dazed|disoriented|confused)\b/i,
      /\b(head|skull).{0,15}(ringing|spinning|throbbing)/i,
      /\b(seeing|see).{0,10}(stars|double)/i,
      /\b(can'?t|cannot|unable).{0,15}(think|focus|concentrate)/i,
      /\b(world|room|vision).{0,15}(spins?|spinning|blur)/i,
    ],
    intensity: 'moderate',
    duration: 8000,
  },
  {
    type: 'stunned',
    patterns: [
      /\b(completely|totally).{0,10}(stunned|dazed)/i,
      /\bknocked.{0,10}(senseless|silly)/i,
    ],
    intensity: 'severe',
    duration: 12000,
  },

  // Restrained - bound/trapped
  {
    type: 'restrained',
    patterns: [
      /\b(restrained|bound|trapped|webbed|tangled|wrapped)\b/i,
      /\b(chains?|rope|vines?|webs?|tendrils?).{0,15}(bind|wrap|trap|hold|restrain)/i,
      /\b(can'?t|cannot|unable).{0,15}(break|escape|move|free)/i,
      /\b(grip|grasp|hold).{0,15}(tightens?|crushes?|squeezes?)/i,
    ],
    intensity: 'moderate',
    duration: 12000,
  },
  {
    type: 'restrained',
    patterns: [
      /\b(completely|fully|totally).{0,10}(restrained|bound|immobilized)/i,
      /\b(no escape|no way out|trapped completely)/i,
    ],
    intensity: 'severe',
    duration: 18000,
  },

  // Slowed - sluggish movement
  {
    type: 'slowed',
    patterns: [
      /\b(slowed|sluggish|heavy|weighted)\b/i,
      /\b(movements?|limbs?|body).{0,15}(heavy|slow|sluggish)/i,
      /\b(gravity|weight).{0,15}(increases?|crushing|pressing)/i,
      /\b(barely|hardly|struggling).{0,15}move/i,
      /\b(mud|quicksand|tar).{0,15}(drags?|pulls?|slows?)/i,
    ],
    intensity: 'moderate',
    duration: 10000,
  },

  // Exhausted - fatigue
  {
    type: 'exhausted',
    patterns: [
      /\b(exhausted|fatigued|drained|spent)\b/i,
      /\b(energy|stamina|strength).{0,15}(depleted|drained|fading|gone)/i,
      /\b(can'?t|cannot|barely).{0,15}(stand|move|continue|fight)/i,
      /\b(muscles?|body).{0,15}(screaming|aching|failing)/i,
      /\b(breathing|breath).{0,15}(heavy|labored|ragged)/i,
    ],
    intensity: 'moderate',
    duration: 12000,
  },
  {
    type: 'exhausted',
    patterns: [
      /\b(completely|totally|utterly).{0,10}(exhausted|drained|spent)/i,
      /\b(nothing|no energy|no strength).{0,10}left/i,
    ],
    intensity: 'severe',
    duration: 18000,
  },

  // === NEW EFFECTS FROM PDF ===

  // Aerial/Flying - character is airborne
  {
    type: 'aerial',
    patterns: [
      /\b(flying|airborne|soaring|hovering|levitat)\w*/i,
      /\b(takes?\s+(?:to\s+)?(?:the\s+)?(?:sky|air|flight))\b/i,
      /\b(lifts?\s+off|rises?\s+(?:into|above))\b/i,
      /\b(float|glide|ascend)\w*.{0,10}(air|sky|above)/i,
    ],
    intensity: 'moderate',
    duration: 15000,
  },
  {
    type: 'aerial',
    patterns: [
      /\b(high\s+above|far\s+above|stratosphere)\b/i,
      /\b(soaring|flying).{0,10}(high|far)/i,
    ],
    intensity: 'severe',
    duration: 20000,
  },

  // Smokescreen - surrounded by smoke/fog individually
  {
    type: 'smokescreen',
    patterns: [
      /\b(smoke|fog|mist).{0,15}(surrounds?|engulfs?|envelops?|wraps?)/i,
      /\b(can'?t|cannot).{0,15}(see\s+through|find)/i,
      /\b(hidden|concealed|obscured).{0,10}(in|by).{0,10}(smoke|fog|mist)/i,
      /\b(smoke\s*screen|smokescreen)\b/i,
    ],
    intensity: 'moderate',
    duration: 12000,
  },
  {
    type: 'smokescreen',
    patterns: [
      /\b(thick|dense|impenetrable).{0,10}(smoke|fog|mist)/i,
    ],
    intensity: 'severe',
    duration: 18000,
  },

  // Bleeding - hemorrhaging
  {
    type: 'bleeding',
    patterns: [
      /\b(bleeding|bleed|hemorrhag)\w*/i,
      /\b(blood).{0,15}(pours?|flows?|drips?|gushes?|seeps?)/i,
      /\b(wound|cut|gash|laceration).{0,15}(deep|open|bleeding)/i,
      /\b(blood|crimson).{0,15}(pools?|stains?|spreads?)/i,
    ],
    intensity: 'moderate',
    duration: 12000,
  },
  {
    type: 'bleeding',
    patterns: [
      /\b(massive|severe|uncontrollable).{0,10}(bleeding|hemorrhag)/i,
      /\b(blood).{0,10}everywhere\b/i,
    ],
    intensity: 'severe',
    duration: 18000,
  },

  // Electrified - coursing with electricity (different from paralysis - active crackling)
  {
    type: 'electrified',
    patterns: [
      /\b(electrified|charged|crackling)\b/i,
      /\b(electricity|current).{0,15}(arcs?|courses?|flows?)/i,
      /\b(sparks?|arcs?).{0,15}(dance|fly|crackle|jump)/i,
      /\b(body|form).{0,15}(crackles?|hums?|buzzes?).{0,10}(electric|energy)/i,
    ],
    intensity: 'moderate',
    duration: 10000,
  },
  {
    type: 'electrified',
    patterns: [
      /\b(massive|overwhelming).{0,10}(electric|voltage|current)/i,
      /\b(lightning).{0,10}(courses?|wraps?|envelops?)/i,
    ],
    intensity: 'severe',
    duration: 15000,
  },

  // Magnetized/Static - glitch interference
  {
    type: 'magnetized',
    patterns: [
      /\b(magnetiz|magnetic)\w*/i,
      /\b(static).{0,15}(interference|charge|field)/i,
      /\b(emp|electromagnetic)\b/i,
      /\b(disrupted?|distorted?|interfere)\w*.{0,10}(field|energy|signal)/i,
    ],
    intensity: 'moderate',
    duration: 10000,
  },

  // Cosmic Vacuum - being pulled into a void
  {
    type: 'cosmicVacuum',
    patterns: [
      /\b(cosmic|space|void).{0,15}(vacuum|pull|suck|drain)/i,
      /\b(black\s*hole|singularity|event\s*horizon)\b/i,
      /\b(reality|space).{0,15}(warps?|bends?|tears?|rips?)/i,
      /\b(pulled|drawn|dragged).{0,15}(void|nothingness|darkness|singularity)/i,
      /\b(dimensional|spatial).{0,10}(rift|tear|distortion)/i,
    ],
    intensity: 'moderate',
    duration: 12000,
  },
  {
    type: 'cosmicVacuum',
    patterns: [
      /\b(consumed|swallowed).{0,10}(void|nothingness|black\s*hole)/i,
      /\b(reality).{0,10}(shatters?|collapses?|breaks?)/i,
    ],
    intensity: 'severe',
    duration: 18000,
  },

  // Buried / Underground – trapped beneath rubble or earth
  {
    type: 'buried',
    patterns: [
      /\b(buried|bury|buries)\w*/i,
      /\b(trapped|caught|stuck).{0,15}(underground|rubble|debris|earth|rock|dirt)/i,
      /\b(ground|floor|earth).{0,15}(swallows?|collapses?|caves?\s+in|opens?\s+up)/i,
      /\b(dragged?|pulled?|sunk?|sinking).{0,15}(underground|below|beneath|down\s+into)/i,
      /\b(cave.?in|caved?\s+in|collapsed?\s+on)\b/i,
      /\b(underground|subterranean|tunnel).{0,15}(traps?|seals?|collapses?)/i,
    ],
    intensity: 'moderate',
    duration: 14000,
  },
  {
    type: 'buried',
    patterns: [
      /\b(completely|fully|totally).{0,10}buried\b/i,
      /\b(entombed|sealed).{0,10}(underground|beneath|below)/i,
    ],
    intensity: 'severe',
    duration: 20000,
  },
];

/**
 * Detect status effects targeting a specific character from a message
 */
export function detectCharacterStatusEffects(
  message: string,
  targetName?: string
): CharacterStatusEffect[] {
  const detectedEffects: CharacterStatusEffect[] = [];
  const now = Date.now();
  
  const foundTypes = new Map<CharacterStatusType, 'light' | 'moderate' | 'severe'>();
  const intensityOrder = { light: 1, moderate: 2, severe: 3 };
  
  const isTargetingCharacter = !targetName || 
    message.toLowerCase().includes(targetName.toLowerCase()) ||
    message.toLowerCase().includes('you ') ||
    message.toLowerCase().includes('your ');
  
  if (!isTargetingCharacter) {
    return detectedEffects;
  }
  
  for (const pattern of STATUS_PATTERNS) {
    const existingIntensity = foundTypes.get(pattern.type);
    if (existingIntensity && intensityOrder[existingIntensity] >= intensityOrder[pattern.intensity]) {
      continue;
    }
    
    for (const regex of pattern.patterns) {
      if (regex.test(message)) {
        const existingIndex = detectedEffects.findIndex(e => e.type === pattern.type);
        if (existingIndex !== -1) {
          detectedEffects.splice(existingIndex, 1);
        }
        
        detectedEffects.push({
          type: pattern.type,
          intensity: pattern.intensity,
          duration: pattern.duration,
          startTime: now,
          source: message.slice(0, 80),
        });
        
        foundTypes.set(pattern.type, pattern.intensity);
        break;
      }
    }
  }
  
  return detectedEffects;
}

/**
 * Check if an effect is still active
 */
export function isStatusEffectActive(effect: CharacterStatusEffect): boolean {
  return Date.now() - effect.startTime < effect.duration;
}

/**
 * Merge new effects with existing ones
 */
export function mergeStatusEffects(
  existing: CharacterStatusEffect[],
  newEffects: CharacterStatusEffect[]
): CharacterStatusEffect[] {
  const result = [...existing.filter(isStatusEffectActive)];
  const intensityOrder = { light: 1, moderate: 2, severe: 3 };
  
  for (const newEffect of newEffects) {
    const existingIndex = result.findIndex(e => e.type === newEffect.type);
    
    if (existingIndex !== -1) {
      const existing = result[existingIndex];
      result[existingIndex] = {
        ...existing,
        intensity: intensityOrder[newEffect.intensity] > intensityOrder[existing.intensity]
          ? newEffect.intensity
          : existing.intensity,
        duration: Math.min(existing.duration + newEffect.duration / 2, 25000),
        source: newEffect.source,
      };
    } else {
      result.push(newEffect);
    }
  }
  
  return result;
}

/**
 * Get CSS animation class for a status effect
 */
export function getStatusEffectClass(type: CharacterStatusType): string {
  return `status-effect-${type}`;
}

/**
 * Get a visual description for tooltip/accessibility
 */
export function getStatusEffectDescription(effect: CharacterStatusEffect): string {
  const descriptions: Record<CharacterStatusType, string> = {
    paralyzed: 'Paralyzed - electrical interference',
    blinded: 'Blinded - vision impaired',
    submerged: 'Submerged - underwater',
    burning: 'Burning - on fire',
    frozen: 'Frozen - encased in ice',
    poisoned: 'Poisoned - toxins spreading',
    stunned: 'Stunned - disoriented',
    restrained: 'Restrained - movement restricted',
    slowed: 'Slowed - movement hindered',
    exhausted: 'Exhausted - energy depleted',
    aerial: 'Aerial - airborne/flying',
    smokescreen: 'Smoke - surrounded by fog',
    bleeding: 'Bleeding - hemorrhaging',
    electrified: 'Electrified - crackling with energy',
    magnetized: 'Magnetized - static interference',
    cosmicVacuum: 'Cosmic Vacuum - spatial distortion',
    buried: 'Buried - trapped underground',
  };
  
  return `${descriptions[effect.type]} (${effect.intensity})`;
}

/**
 * Effect priority map for layering/suppression
 * Higher priority effects can suppress lower ones when redundant
 */
export const EFFECT_PRIORITY: Record<CharacterStatusType, number> = {
  cosmicVacuum: 100,
  burning: 60,
  frozen: 60,
  electrified: 55,
  paralyzed: 50,
  bleeding: 45,
  submerged: 40,
  aerial: 40,
  magnetized: 35,
  poisoned: 35,
  stunned: 30,
  blinded: 30,
  restrained: 25,
  smokescreen: 20,
  slowed: 15,
  exhausted: 10,
  buried: 45,
};
