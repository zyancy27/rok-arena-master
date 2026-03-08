/**
 * Element Disambiguation — Context-Aware Keyword Filtering
 *
 * Prevents false-positive element detection by recognising common English
 * phrases where element-related words are used in their mundane sense.
 *
 * Example: "light noises" means soft/quiet, NOT visual light/holy energy.
 *          "dark corner" means poorly-lit, NOT shadow/void power.
 *          "pulls back" means retreats, NOT gravity manipulation.
 *
 * Usage:  call `disambiguateText(moveText)` before running element regex
 *         scanning. The returned string has mundane phrases neutralised so
 *         they won't trigger element patterns.
 */

// ─── Mundane phrase patterns ─────────────────────────────────────────────────
// Each entry maps an element keyword to phrases where it is used in a
// non-power, everyday-English context. The phrases are replaced with
// neutral placeholders before element scanning.

const MUNDANE_PHRASES: { pattern: RegExp; replacement: string }[] = [
  // ── "light" used as adjective meaning soft/gentle/minor ──
  { pattern: /\blight\s+(noise|sound|tap|touch|step|footstep|breeze|drizzle|rain|scratch|knock|push|nudge|pat|press|squeeze|hum|buzz|murmur|rustle|creak|click|thud|thump|bump|jog|exercise|snack|meal|reading|sleep|nap|conversation|chat|banter|mood|tone|humor|humour|chuckle|laugh|smile|grin|sigh|cough|headache|injury|wound|bruise|cut|graze|scrape|ache|tremor|shiver|shudder|limp|wobble|sway|flicker)s?\b/gi, replacement: 'gentle $1' },
  { pattern: /\b(a |the |very |quite |rather |fairly |somewhat |relatively )light\b/gi, replacement: '$1gentle' },
  { pattern: /\blight(ly|er|est)\b/gi, replacement: 'gent$1' },
  { pattern: /\blight on (his|her|their|its) feet\b/gi, replacement: 'nimble on $1 feet' },
  { pattern: /\blight-?footed\b/gi, replacement: 'nimble-footed' },
  { pattern: /\blight-?hearted\b/gi, replacement: 'cheerful' },
  { pattern: /\blight-?weight\b/gi, replacement: 'nimble' },
  { pattern: /\bmakes? light of\b/gi, replacement: 'dismisses' },
  { pattern: /\blight up\b/gi, replacement: 'brighten' },
  { pattern: /\bcome to light\b/gi, replacement: 'become known' },
  { pattern: /\bin light of\b/gi, replacement: 'considering' },
  { pattern: /\bshed(s)? light\b/gi, replacement: 'clarif$1ies' },

  // ── "dark" used as adjective meaning dim/gloomy/mood ──
  { pattern: /\bdark\s+(corner|alley|room|hallway|corridor|tunnel|passage|cave|cellar|basement|closet|attic|forest|woods|path|street|night|sky|clouds?|humor|humour|joke|thought|mood|look|expression|glance|stare|gaze|tone|voice|laughter|chuckle|circles?|spot|mark|stain|smudge|area)\b/gi, replacement: 'dim $1' },
  { pattern: /\b(pitch|very|quite|rather|eerily|somewhat )-?dark\b/gi, replacement: '$1-dim' },
  { pattern: /\bin the dark\b/gi, replacement: 'unaware' },
  { pattern: /\bdark-?skinned\b/gi, replacement: 'deep-toned' },

  // ── "cold" used for temperature/emotion (not ice power) ──
  { pattern: /\bcold\s+(stare|look|glance|gaze|expression|tone|voice|shoulder|response|reply|silence|sweat|fear|chill|truth|reality|comfort|water|air|wind|breeze|floor|ground|metal|steel|stone|night|morning|weather)\b/gi, replacement: 'frigid $1' },
  { pattern: /\bcold-?blooded\b/gi, replacement: 'ruthless' },
  { pattern: /\bin cold blood\b/gi, replacement: 'ruthlessly' },
  { pattern: /\bcold feet\b/gi, replacement: 'hesitation' },
  { pattern: /\bgives? .{0,10}the cold shoulder\b/gi, replacement: 'ignores' },

  // ── "fire" used as verb meaning shoot/launch/dismiss ──
  { pattern: /\bfire(s|d)?\s+(back|off|away|a retort|a reply|a response|a question|a look|a glance|a warning|a shot)\b/gi, replacement: 'launch$1 $2' },
  { pattern: /\bfire(d|s)?\s+at\b/gi, replacement: 'shoot$1 at' },
  { pattern: /\bopen(s|ed)? fire\b/gi, replacement: 'open$1 attack' },
  { pattern: /\bcatch(es|ing)? fire\b/gi, replacement: 'ignit$1e' },
  { pattern: /\bunder fire\b/gi, replacement: 'under attack' },
  { pattern: /\bfire(d)? from\b/gi, replacement: 'dismiss$1ed from' },
  { pattern: /\bcross-?fire\b/gi, replacement: 'crosshail' },
  { pattern: /\bfriendly fire\b/gi, replacement: 'allied hit' },
  { pattern: /\brapid[- ]fire\b/gi, replacement: 'rapid succession' },
  { pattern: /\bsure[- ]fire\b/gi, replacement: 'certain' },

  // ── "ground" used as noun/verb meaning floor/stance (not earth power) ──
  { pattern: /\bstands?\s+(his|her|their|its)\s+ground\b/gi, replacement: 'holds $1 position' },
  { pattern: /\bhold(s|ing)?\s+(his|her|their|its|the)\s+ground\b/gi, replacement: 'hold$1 $2 position' },
  { pattern: /\b(on|to|from|hit|hits|the|across|along|into) the ground\b/gi, replacement: '$1 the floor' },
  { pattern: /\bground(s|ed)?\s+(to a halt|rules?|floor|level|zero)\b/gi, replacement: 'base $2' },
  { pattern: /\bbreak(s|ing)?\s+new ground\b/gi, replacement: 'innovate$1' },
  { pattern: /\bgain(s|ed|ing)?\s+ground\b/gi, replacement: 'advance$1' },
  { pattern: /\blose(s)?\s+ground\b/gi, replacement: 'retreat$1' },
  { pattern: /\bcommon ground\b/gi, replacement: 'agreement' },
  { pattern: /\bground(ed)?\b(?!\s*(shake|crack|split|shatter|rupture|erupt|tremble|quake))/gi, replacement: 'grounded_neutral' },

  // ── "wind" used as noun for breath/coiling (not air power) ──
  { pattern: /\bwind(s|ed|ing)?\s+(up|down|around|through|back|his|her|their|its|the|a)\b/gi, replacement: 'coil$1 $2' },
  { pattern: /\bout of wind\b/gi, replacement: 'out of breath' },
  { pattern: /\bsecond wind\b/gi, replacement: 'renewed energy' },
  { pattern: /\bwind-?swept\b/gi, replacement: 'battered' },
  { pattern: /\bwind(s)?\s+(of change|of war|of fate)\b/gi, replacement: 'force$1 $2' },

  // ── "storm" used metaphorically ──
  { pattern: /\bstorm(s|ed|ing)?\s+(off|out|away|in|into|through|over|toward|towards)\b/gi, replacement: 'rush$1 $2' },
  { pattern: /\bbrainstorm/gi, replacement: 'ideate' },
  { pattern: /\bstorm of (emotion|feeling|thought|rage|anger)\b/gi, replacement: 'surge of $1' },

  // ── "pull" / "push" used for basic physical movement (not gravity) ──
  { pattern: /\bpull(s|ed|ing)?\s+(back|away|out|up|down|closer|apart|together|through|off|over|himself|herself|themselves|itself)\b/gi, replacement: 'draw$1 $2' },
  { pattern: /\bpush(es|ed|ing)?\s+(back|away|through|past|forward|ahead|open|shut|aside|himself|herself|themselves|off)\b/gi, replacement: 'shove$1 $2' },

  // ── "crush" used metaphorically ──
  { pattern: /\bcrush(es|ed|ing)?\s+(on|hopes?|dreams?|spirits?|confidence|expectations?|morale|feelings?|ambitions?)\b/gi, replacement: 'destroy$1 $2' },

  // ── "shadow" used for literal shadow cast by objects (not dark power) ──
  { pattern: /\b(in|into|from|cast|casts|casting) (a |the )?shadow(s)?\b/gi, replacement: '$1 $2shade$3' },
  { pattern: /\bshadow(s|ed|ing)?\s+(him|her|them|the|a|closely|quietly|silently)\b/gi, replacement: 'follow$1 $2' },
  { pattern: /\b(a |the )shadow of\b/gi, replacement: '$1trace of' },
  { pattern: /\beye-?shadow\b/gi, replacement: 'cosmetic' },

  // ── "shock" used for surprise (not lightning) ──
  { pattern: /\bshock(s|ed|ing)?\s*(to|by|at|expression|look|face|silence|disbelief|realization|discovery)\b/gi, replacement: 'stun$1 $2' },
  { pattern: /\bin shock\b/gi, replacement: 'stunned' },
  { pattern: /\bshell-?shock/gi, replacement: 'trauma' },
  { pattern: /\bculture shock\b/gi, replacement: 'disorientation' },

  // ── "burn" used metaphorically ──
  { pattern: /\bburn(s|ed|ing)?\s+(with|from)?\s*(anger|rage|fury|hatred|shame|embarrassment|desire|passion|jealousy|curiosity|determination|humiliation)\b/gi, replacement: 'seethe$1 $2 $3' },
  { pattern: /\bslow burn\b/gi, replacement: 'gradual anger' },
  { pattern: /\bburn(s|ed)?\s+out\b/gi, replacement: 'exhaust$1' },

  // ── "energy" used colloquially ──
  { pattern: /\b(nervous|anxious|excited|calm|chaotic|bad|good|positive|negative|weird|strange|big|low|high|restless|frantic|manic|frenetic|wild)\s+energy\b/gi, replacement: '$1 vibe' },
  { pattern: /\benergy (drink|bar|level|boost|drain|reserve|left|remaining)\b/gi, replacement: 'stamina $1' },
  { pattern: /\bsave(s|d|ing)?\s+(his|her|their|some|any)?\s*energy\b/gi, replacement: 'conserve$1 $2 stamina' },

  // ── "mental" used colloquially ──
  { pattern: /\bmental(ly)?\s+(prepare|note|image|picture|map|math|calculation|gymnastics|health|state|fatigue|exhaustion|strain|breakdown|fortitude|toughness|resilience|strength)\b/gi, replacement: 'cognitive$1 $2' },

  // ── "air" used for manner/atmosphere ──
  { pattern: /\b(an |the )air of\b/gi, replacement: '$1aura of' },
  { pattern: /\bthin air\b/gi, replacement: 'nowhere' },
  { pattern: /\bhot air\b/gi, replacement: 'bluster' },
  { pattern: /\bclear(s|ed|ing)? the air\b/gi, replacement: 'settl$1e things' },
  { pattern: /\bin the air\b/gi, replacement: 'around' },
  { pattern: /\bup in the air\b/gi, replacement: 'uncertain' },

  // ── "weight" used metaphorically (not gravity) ──
  { pattern: /\bweight\s+(of|on)\s+(his|her|their|the|its)\s+(shoulders?|conscience|mind|heart|words?|decision|responsibility|world|situation)\b/gi, replacement: 'burden $1 $2 $3' },
  { pattern: /\bcarr(y|ies|ied|ying)\s+(the |a |some )?weight\b/gi, replacement: 'bear$1 $2 burden' },
  { pattern: /\bpull(s|ed|ing)?\s+(his|her|their|its) (own )?weight\b/gi, replacement: 'contribute$1' },

  // ── "void" used metaphorically ──
  { pattern: /\bfill(s|ed|ing)?\s+(the |a )void\b/gi, replacement: 'fill$1 $2 gap' },
  { pattern: /\bnull and void\b/gi, replacement: 'invalid' },
  { pattern: /\bvoid of\b/gi, replacement: 'devoid of' },

  // ── "time" used normally ──
  { pattern: /\b(takes?|took|taking|buys?|bought|buying|kills?|killing|wastes?|wasting|spend|spent|spending|passes?|passing|runs? out of|ran out of|in|on|over|at this|next|some|no|any|every|each|the|more|less|enough|plenty of|lots? of|much|first|last|same|one more|another|long|short|brief|little|hard|good|bad|right|wrong|perfect|spare|free|quality)\s+time\b/gi, replacement: '$1 moment' },
  { pattern: /\btime\s+(to|for|and|is|was|has|will|flies|passed|passes|ran|runs|went|goes|heals|tells|after|before|being|out)\b/gi, replacement: 'moment $1' },
  { pattern: /\bin time\b/gi, replacement: 'in the moment' },
  { pattern: /\bon time\b/gi, replacement: 'punctually' },
  { pattern: /\bat (the same |that |this |a )time\b/gi, replacement: 'at $1 moment' },
  { pattern: /\bfrom time to time\b/gi, replacement: 'occasionally' },
  { pattern: /\btime-?out\b/gi, replacement: 'pause' },

  // ── "age" used normally ──
  { pattern: /\b(his|her|their|old|young|middle|same|this|that|an|the|of|for) age\b/gi, replacement: '$1 years' },
  { pattern: /\bage(d|s|ing)?\s+(well|poorly|gracefully|rapidly|slowly|quickly|into|out|backwards|him|her|them)\b/gi, replacement: 'mature$1 $2' },

  // ── "acid" used colloquially ──
  { pattern: /\bacid\s+(tongue|wit|humor|humour|remark|comment|tone|test|trip|rain)\b/gi, replacement: 'sharp $1' },

  // ── "space" used normally ──
  { pattern: /\b(personal|open|empty|small|tight|narrow|wide|enough|more|some|no|any|the|a|living|breathing|safe|work) space\b/gi, replacement: '$1 room' },
  { pattern: /\bspace(s|d)?\s+(out|apart|between|evenly|himself|herself|themselves)\b/gi, replacement: 'spread$1 $2' },
  { pattern: /\bgive(s)?\s+(him|her|them|me|us|it) (some |more )?space\b/gi, replacement: 'give$1 $2 $3 room' },
];

/**
 * Neutralise mundane uses of element-related words so downstream regex
 * scanning only fires on genuine power/ability references.
 *
 * The returned string should ONLY be used for element detection —
 * the original player text is never modified.
 */
export function disambiguateText(moveText: string): string {
  let result = moveText;
  for (const { pattern, replacement } of MUNDANE_PHRASES) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
