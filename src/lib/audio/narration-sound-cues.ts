/**
 * Narration Sound Cues — keyword → sound family mappings.
 * Two categories: persistent ambience and triggered moment sounds.
 */

export type SoundCategory = 'persistent' | 'moment';

export interface SoundCue {
  id: string;
  /** Keywords (regex patterns) that trigger this cue */
  patterns: RegExp[];
  /** ElevenLabs SFX prompt */
  prompt: string;
  /** Duration in seconds for generation */
  duration: number;
  category: SoundCategory;
  /** 0-1 volume ceiling relative to master ambient volume */
  volumeCeiling: number;
  /** Cooldown in ms before this cue can fire again */
  cooldownMs: number;
  /** Fade in duration ms */
  fadeInMs: number;
  /** Fade out duration ms */
  fadeOutMs: number;
  /** For 'moment' sounds: how long the sound plays before fading */
  momentDurationMs?: number;
  /** Priority (higher = more likely to play when at density cap) */
  priority: number;
  /** Family group for overlap management */
  family: string;
}

// ── Nature ──
const NATURE_CUES: SoundCue[] = [
  {
    id: 'wind',
    patterns: [
      /\b(wind\s*(blow|howl|gust|whip|rush|sweep|moan|sigh|pick\s*up)|gust\s*of\s*wind|breeze|breezy)\b/i,
      /\b(air\s*(whip|howl|rush|whistle)|gale|squall)\b/i,
    ],
    prompt: 'gentle wind blowing through open area, natural breeze ambience',
    duration: 12, category: 'persistent', volumeCeiling: 0.35, cooldownMs: 8000,
    fadeInMs: 2000, fadeOutMs: 3000, priority: 3, family: 'weather',
  },
  {
    id: 'leaves_rustle',
    patterns: [
      /\b(leaves?\s*(rustl|crunch|whisper|stir|scatter|swirl)|foliage\s*(mov|rustl|shift)|rustling)\b/i,
      /\b(undergrowth|brush\s*(mov|rustl|part))\b/i,
    ],
    prompt: 'leaves rustling softly in wind, gentle foliage movement',
    duration: 8, category: 'persistent', volumeCeiling: 0.25, cooldownMs: 10000,
    fadeInMs: 1500, fadeOutMs: 2000, priority: 2, family: 'nature',
  },
  {
    id: 'insects',
    patterns: [
      /\b(insects?\s*(buzz|chirp|hum|drone|swarm)|cicada|cricket|buzzing|mosquito)\b/i,
      /\b(firefl|glow\s*worm|beetle[s]?\s*(click|chirp))\b/i,
    ],
    prompt: 'insects buzzing and chirping softly, nighttime crickets',
    duration: 12, category: 'persistent', volumeCeiling: 0.2, cooldownMs: 15000,
    fadeInMs: 3000, fadeOutMs: 3000, priority: 1, family: 'nature',
  },
  {
    id: 'birds',
    patterns: [
      /\b(bird[s]?\s*(sing|chirp|call|cry|screech|caw|tweet)|birdsong|songbird)\b/i,
      /\b(hawk|eagle|crow|raven|owl|falcon|vulture)\b/i,
    ],
    prompt: 'birds singing softly in distance, gentle birdsong ambience',
    duration: 10, category: 'persistent', volumeCeiling: 0.2, cooldownMs: 12000,
    fadeInMs: 2000, fadeOutMs: 2500, priority: 2, family: 'nature',
  },
  {
    id: 'dripping_water',
    patterns: [
      /\b(drip|dripping|water\s*drop|drops?\s*of\s*water)\b/i,
      /\b(condensation\s*(drip|fall)|moisture\s*(drip|gather))\b/i,
    ],
    prompt: 'water dripping slowly in cave or dark space, echoing drops',
    duration: 10, category: 'persistent', volumeCeiling: 0.2, cooldownMs: 10000,
    fadeInMs: 1500, fadeOutMs: 2000, priority: 2, family: 'water',
  },
  {
    id: 'thunder_distant',
    patterns: [
      /\b(distant\s*thunder|thunder\s*(rumbl|roll|boom|crack)|storm\s*(approach|brew|gather))\b/i,
      /\b(lightning\s*(flash|fork|strike|crack|bolt))\b/i,
    ],
    prompt: 'distant thunder rumbling softly, approaching storm atmosphere',
    duration: 6, category: 'moment', volumeCeiling: 0.35, cooldownMs: 15000,
    fadeInMs: 500, fadeOutMs: 2000, momentDurationMs: 4000, priority: 4, family: 'weather',
  },
  {
    id: 'river',
    patterns: [
      /\b(river|stream|brook|creek|rapids|waterfall|rushing\s*water|water\s*(roar|rush|echo|churn|cascade))\b/i,
      /\b(current[s]?\s*(pull|sweep|drag|churn)|white\s*water)\b/i,
    ],
    prompt: 'flowing river water, rushing stream, gentle waterfall ambience',
    duration: 12, category: 'persistent', volumeCeiling: 0.3, cooldownMs: 10000,
    fadeInMs: 2500, fadeOutMs: 3000, priority: 3, family: 'water',
  },
  {
    id: 'swamp_bubble',
    patterns: [
      /\b(swamp|marsh|bog|bubbl|mire|murky\s*water|brackish|stagnant)\b/i,
      /\b(fen|wetland|quagmire)\b/i,
    ],
    prompt: 'swamp bubbling softly, murky water, eerie wetland sounds',
    duration: 10, category: 'persistent', volumeCeiling: 0.2, cooldownMs: 12000,
    fadeInMs: 2000, fadeOutMs: 2500, priority: 2, family: 'nature',
  },
  {
    id: 'rain',
    patterns: [
      /\b(rain\s*(fall|pour|patter|drum|hit|lash|beat)|raining|downpour|drizzle)\b/i,
      /\b(wet|soaked|drenched|puddle[s]?\s*(form|splash|grow))\b/i,
    ],
    prompt: 'steady rain falling, raindrops hitting surfaces, wet ambience',
    duration: 14, category: 'persistent', volumeCeiling: 0.3, cooldownMs: 10000,
    fadeInMs: 3000, fadeOutMs: 3000, priority: 3, family: 'weather',
  },
  {
    id: 'ocean_waves',
    patterns: [
      /\b(waves?\s*(crash|lap|break|roll|pound)|surf|tide|ocean\s*(roar|spray))\b/i,
      /\b(sea\s*(spray|foam|swell|surge)|shore\s*(break|pound))\b/i,
    ],
    prompt: 'ocean waves crashing on shore, rhythmic tide, sea spray ambience',
    duration: 12, category: 'persistent', volumeCeiling: 0.3, cooldownMs: 10000,
    fadeInMs: 2500, fadeOutMs: 3000, priority: 3, family: 'water',
  },
];

// ── Urban / Human-made ──
const URBAN_CUES: SoundCue[] = [
  {
    id: 'creaking_metal',
    patterns: [
      /\b(metal\s*(groan|creak|strain|screech|bend|protest|warp)|creak(ing|s)?\s*metal|catwalk\s*groan|railing\s*vibrat)\b/i,
      /\b(iron\s*(creak|groan|strain)|steel\s*(creak|groan|flex|bend))\b/i,
    ],
    prompt: 'metal structure creaking and groaning under stress, industrial strain',
    duration: 5, category: 'moment', volumeCeiling: 0.3, cooldownMs: 8000,
    fadeInMs: 300, fadeOutMs: 1500, momentDurationMs: 3500, priority: 4, family: 'structure',
  },
  {
    id: 'distant_alarm',
    patterns: [
      /\b(alarm|siren|warning\s*(sound|signal|klaxon|horn)|alert\s*(sound|blare))\b/i,
    ],
    prompt: 'distant alarm siren, faint warning signal echoing',
    duration: 6, category: 'moment', volumeCeiling: 0.2, cooldownMs: 20000,
    fadeInMs: 500, fadeOutMs: 2000, momentDurationMs: 4000, priority: 3, family: 'urban',
  },
  {
    id: 'glass_shift',
    patterns: [
      /\b(glass\s*(shift|crack|tinkle|rattle|crunch|splinter)|window\s*(rattle|crack|shatter|break))\b/i,
    ],
    prompt: 'glass shifting and tinkling softly, unstable window',
    duration: 3, category: 'moment', volumeCeiling: 0.25, cooldownMs: 10000,
    fadeInMs: 200, fadeOutMs: 1000, momentDurationMs: 2500, priority: 2, family: 'structure',
  },
  {
    id: 'building_groan',
    patterns: [
      /\b(building\s*(groan|creak|sway|shift|shudder)|structure\s*(groan|shift|creak|buckle|fail))\b/i,
      /\b(foundation\s*(crack|shift|settle)|load-?bearing\s*(fail|crack|buckle))\b/i,
    ],
    prompt: 'large building groaning, structural creaking, deep stress sound',
    duration: 5, category: 'moment', volumeCeiling: 0.3, cooldownMs: 12000,
    fadeInMs: 500, fadeOutMs: 2000, momentDurationMs: 3500, priority: 4, family: 'structure',
  },
  {
    id: 'electrical_hum',
    patterns: [
      /\b(electric(al)?\s*(hum|buzz|crackl|arc|spark)|power\s*(hum|line|grid|surge)|neon\s*(buzz|flicker))\b/i,
      /\b(capacitor|transformer|energy\s*(field|barrier)\s*(hum|pulse|crackle))\b/i,
    ],
    prompt: 'electrical humming and buzzing softly, power line hum',
    duration: 10, category: 'persistent', volumeCeiling: 0.15, cooldownMs: 15000,
    fadeInMs: 2000, fadeOutMs: 2500, priority: 1, family: 'urban',
  },
  {
    id: 'pipe_leak',
    patterns: [
      /\b(pipe\s*(leak|hiss|burst|drip|rupture)|leaking\s*pipe|plumbing)\b/i,
    ],
    prompt: 'leaking pipe hissing softly, water dripping from pipe',
    duration: 8, category: 'persistent', volumeCeiling: 0.2, cooldownMs: 12000,
    fadeInMs: 1500, fadeOutMs: 2000, priority: 2, family: 'structure',
  },
  {
    id: 'machinery',
    patterns: [
      /\b(machine(ry)?\s*(rum|hum|grind|whir|churn)|engine\s*(rum|hum|roar|idle)|turbine|generator|factory)\b/i,
      /\b(gear[s]?\s*(grind|turn|click|mesh)|piston[s]?\s*(pump|fire|move)|mechanism\s*(click|whir|grind))\b/i,
    ],
    prompt: 'distant heavy machinery humming, industrial engine rumble',
    duration: 12, category: 'persistent', volumeCeiling: 0.2, cooldownMs: 15000,
    fadeInMs: 3000, fadeOutMs: 3000, priority: 2, family: 'urban',
  },
  {
    id: 'door_creak',
    patterns: [
      /\b(door\s*(creak|swing|open|shut|slam|close|groan)|hinge[s]?\s*(creak|squeal|groan))\b/i,
      /\b(gate\s*(creak|swing|grind|open|close)|portcullis|drawbridge)\b/i,
    ],
    prompt: 'heavy wooden door creaking open slowly, old hinges groaning',
    duration: 3, category: 'moment', volumeCeiling: 0.25, cooldownMs: 8000,
    fadeInMs: 200, fadeOutMs: 1000, momentDurationMs: 2500, priority: 3, family: 'structure',
  },
  {
    id: 'chains',
    patterns: [
      /\b(chain[s]?\s*(rattle|clank|clink|drag|swing|pull|jingle)|shackle[s]?\s*(rattle|clink|clank))\b/i,
      /\b(manacle[s]?\s*(clink|rattle)|fetters?)\b/i,
    ],
    prompt: 'metal chains rattling, iron links clinking against stone',
    duration: 4, category: 'moment', volumeCeiling: 0.2, cooldownMs: 10000,
    fadeInMs: 200, fadeOutMs: 1500, momentDurationMs: 3000, priority: 2, family: 'structure',
  },
];

// ── Industrial / Dangerous ──
const INDUSTRIAL_CUES: SoundCue[] = [
  {
    id: 'steam_hiss',
    patterns: [
      /\b(steam\s*(hiss|vent|burst|release|jet|pipe|plume|cloud)|hissing\s*steam)\b/i,
      /\b(geyser|vent\s*(hiss|spray|spew))\b/i,
    ],
    prompt: 'steam hissing from pipe, pressurized steam release',
    duration: 4, category: 'moment', volumeCeiling: 0.3, cooldownMs: 8000,
    fadeInMs: 200, fadeOutMs: 1500, momentDurationMs: 3000, priority: 3, family: 'industrial',
  },
  {
    id: 'sparks',
    patterns: [
      /\b(spark[s]?\s*(fly|shower|burst|spray|rain|cascade)|sparking|arc\s*of\s*(electricity|light))\b/i,
      /\b(short\s*circuit|wire[s]?\s*(spark|arc|snap))\b/i,
    ],
    prompt: 'electrical sparks flying, short circuit sparking',
    duration: 3, category: 'moment', volumeCeiling: 0.25, cooldownMs: 8000,
    fadeInMs: 100, fadeOutMs: 1000, momentDurationMs: 2000, priority: 3, family: 'industrial',
  },
  {
    id: 'pressure_release',
    patterns: [
      /\b(pressure\s*(release|valve|drop|blow|vent)|decompression|pneumatic)\b/i,
      /\b(hydraulic\s*(hiss|burst|release)|airlock\s*(open|hiss|seal))\b/i,
    ],
    prompt: 'pressure valve releasing, pneumatic hiss, air escaping',
    duration: 3, category: 'moment', volumeCeiling: 0.25, cooldownMs: 10000,
    fadeInMs: 100, fadeOutMs: 1500, momentDurationMs: 2500, priority: 3, family: 'industrial',
  },
  {
    id: 'reactor_hum',
    patterns: [
      /\b(reactor|core\s*(hum|pulse|glow)|power\s*core|energy\s*core)\b/i,
      /\b(crystal\s*(hum|pulse|resonate|vibrate)|arcane\s*(generator|engine|core))\b/i,
    ],
    prompt: 'deep reactor hum, pulsating energy core, low frequency drone',
    duration: 12, category: 'persistent', volumeCeiling: 0.2, cooldownMs: 20000,
    fadeInMs: 3000, fadeOutMs: 3000, priority: 2, family: 'industrial',
  },
  {
    id: 'metal_impact',
    patterns: [
      /\b(anvil|hammer\s*(strike|fall|ring|blow)|forge\s*(ring|hammer|clang))\b/i,
      /\b(metal\s*(clang|ring|bang|clash|slam)|iron\s*(clang|ring|strike))\b/i,
    ],
    prompt: 'heavy metal impact, hammer striking anvil, industrial clang',
    duration: 3, category: 'moment', volumeCeiling: 0.25, cooldownMs: 8000,
    fadeInMs: 100, fadeOutMs: 1200, momentDurationMs: 2000, priority: 3, family: 'industrial',
  },
];

// ── Living world / creatures ──
const CREATURE_CUES: SoundCue[] = [
  {
    id: 'distant_footsteps',
    patterns: [
      /\b(distant\s*(footstep|step)|footsteps?\s*(echo|approach|recede|fade)|someone\s*(approach|walk|near))\b/i,
      /\b(boots?\s*(on|echo|stomp|thud)|heel[s]?\s*(click|clack|echo))\b/i,
    ],
    prompt: 'distant footsteps echoing, someone walking far away',
    duration: 4, category: 'moment', volumeCeiling: 0.2, cooldownMs: 10000,
    fadeInMs: 500, fadeOutMs: 1500, momentDurationMs: 3000, priority: 2, family: 'living',
  },
  {
    id: 'crowd_murmur',
    patterns: [
      /\b(crowd\s*(murmur|chatter|talk|gather|noise|buzz|hum)|people\s*(talk|murmur|gather|mill|bustle))\b/i,
      /\b(murmuring|chatter|commotion|hubbub|din\s*of\s*(voices|conversation))\b/i,
    ],
    prompt: 'distant crowd murmuring softly, people talking in background',
    duration: 10, category: 'persistent', volumeCeiling: 0.2, cooldownMs: 15000,
    fadeInMs: 2500, fadeOutMs: 3000, priority: 2, family: 'living',
  },
  {
    id: 'faint_crying',
    patterns: [
      /\b(crying|weeping|sobbing|tears?\s*(fall|stream|roll))\b/i,
    ],
    prompt: 'very faint distant crying, muffled sobbing barely audible',
    duration: 4, category: 'moment', volumeCeiling: 0.05, cooldownMs: 35000,
    fadeInMs: 800, fadeOutMs: 2000, momentDurationMs: 3000, priority: 1, family: 'vocal',
  },
  {
    id: 'creature_movement',
    patterns: [
      /\b(something\s*(mov|stir|shift|lurk|creep|watch|approach)|creature\s*(mov|stir|creep|approach|emerge))\b/i,
      /\b(skitter|scurry|slither|crawl|scuttle)\b/i,
    ],
    prompt: 'subtle creature movement in darkness, something stirring nearby',
    duration: 4, category: 'moment', volumeCeiling: 0.2, cooldownMs: 12000,
    fadeInMs: 300, fadeOutMs: 1500, momentDurationMs: 3000, priority: 3, family: 'creature',
  },
  {
    id: 'wing_flaps',
    patterns: [
      /\b(wing[s]?\s*(flap|beat|spread|unfurl|snap|rustle)|takes?\s*flight|swooping|soaring)\b/i,
      /\b(flutter(ing)?|hovering\s*(wings?|creature))\b/i,
    ],
    prompt: 'wings flapping, large creature taking flight, feathered swoosh',
    duration: 3, category: 'moment', volumeCeiling: 0.25, cooldownMs: 10000,
    fadeInMs: 200, fadeOutMs: 1500, momentDurationMs: 2500, priority: 3, family: 'creature',
  },
  {
    id: 'low_growl',
    patterns: [
      /\b(growl[s]?\s*(low|deep|soft|guttural)?|low\s*growl|snarl[s]?\s*(soft|low)?|guttural)\b/i,
      /\b(menacing\s*(sound|noise|rumble)|beast\s*(snarl|growl|hiss))\b/i,
    ],
    prompt: 'deep low growl of a creature, threatening snarl in darkness',
    duration: 3, category: 'moment', volumeCeiling: 0.2, cooldownMs: 12000,
    fadeInMs: 300, fadeOutMs: 1500, momentDurationMs: 2500, priority: 3, family: 'creature',
  },
  {
    id: 'howl',
    patterns: [
      /\b(howl[sng]*|wolf|wolves|wol[fv]en)\b/i,
      /\b(distant\s*(cry|wail|call)\s*(of|from)\s*(the\s+)?(wild|beast|creature))\b/i,
    ],
    prompt: 'distant wolf howling, lonely haunting cry in the night',
    duration: 4, category: 'moment', volumeCeiling: 0.2, cooldownMs: 15000,
    fadeInMs: 300, fadeOutMs: 2000, momentDurationMs: 3000, priority: 3, family: 'creature',
  },
  {
    id: 'roar',
    patterns: [
      /\b(dragon\s*(roar|screech|cry)|monster\s*(roar|cry)|beast\s*(roar|cry))\b/i,
    ],
    prompt: 'powerful creature roar, deep bellowing beast cry',
    duration: 3, category: 'moment', volumeCeiling: 0.25, cooldownMs: 15000,
    fadeInMs: 200, fadeOutMs: 1500, momentDurationMs: 2500, priority: 4, family: 'creature',
  },
  {
    id: 'horse',
    patterns: [
      /\b(horse|stallion|mare|steed|mount|hooves?\s*(thunder|clatter|stamp|pound))\b/i,
      /\b(gallop|canter|trot|neigh|whinny)\b/i,
    ],
    prompt: 'horse hooves on ground, neighing, equine movement sounds',
    duration: 4, category: 'moment', volumeCeiling: 0.2, cooldownMs: 10000,
    fadeInMs: 300, fadeOutMs: 1500, momentDurationMs: 3000, priority: 2, family: 'creature',
  },
];

// ── Battlefield / action ──
const BATTLEFIELD_CUES: SoundCue[] = [
  {
    id: 'dust_settling',
    patterns: [
      /\b(dust\s*(settl|clear|cloud|billow|hang|thick)|sand\s*(swirl|settl|blast)|haze\s*clear)\b/i,
      /\b(particl|ash\s*(fall|rain|settl|drift))\b/i,
    ],
    prompt: 'dust settling after impact, sand and debris clearing',
    duration: 4, category: 'moment', volumeCeiling: 0.15, cooldownMs: 10000,
    fadeInMs: 500, fadeOutMs: 2000, momentDurationMs: 3000, priority: 1, family: 'battlefield',
  },
  {
    id: 'debris_shift',
    patterns: [
      /\b(debris\s*(shift|fall|tumbl|scatter|rain|cascad)|rubble\s*(fall|shift|tumbl|cascad|slide))\b/i,
      /\b(stone[s]?\s*(tumbl|fall|cascad|crumbl|break)|masonry\s*(fall|crumbl))\b/i,
    ],
    prompt: 'rubble and debris shifting, stones tumbling, material falling',
    duration: 4, category: 'moment', volumeCeiling: 0.25, cooldownMs: 8000,
    fadeInMs: 200, fadeOutMs: 1500, momentDurationMs: 3000, priority: 3, family: 'battlefield',
  },
  {
    id: 'crackling_fire',
    patterns: [
      /\b(fire\s*(crackl|burn|spread|rag|roar)|flames?\s*(crackl|lick|spread|danc|leap|engulf))\b/i,
      /\b(burning|blaze|inferno|conflagration|pyre)\b/i,
      /\b(campfire|bonfire|hearth|fireplace|torch(es)?)\b/i,
    ],
    prompt: 'fire crackling and burning, flames spreading, wood burning',
    duration: 10, category: 'persistent', volumeCeiling: 0.25, cooldownMs: 12000,
    fadeInMs: 1500, fadeOutMs: 2500, priority: 3, family: 'battlefield',
  },
  {
    id: 'distant_impact',
    patterns: [
      /\b(distant\s*(impact|explosion|crash|boom|blast)|echo(es)?\s*(of|from)\s*(impact|explosion|battle))\b/i,
      /\b(far\s*(off|away)\s*(explo|crash|boom|thunder))\b/i,
    ],
    prompt: 'distant explosion or impact echoing, far away boom',
    duration: 4, category: 'moment', volumeCeiling: 0.2, cooldownMs: 15000,
    fadeInMs: 200, fadeOutMs: 2000, momentDurationMs: 3000, priority: 3, family: 'battlefield',
  },
  {
    id: 'heavy_breathing',
    patterns: [
      /\b(heavy\s*breath|panting|gasping|out\s*of\s*breath|labored\s*breath|breath\s*(heavy|ragged)|wheez)\b/i,
      /\b(catch(es|ing)?\s*(breath|wind)|exhaust(ed|ion)|winded)\b/i,
    ],
    prompt: 'heavy labored breathing, exhausted panting',
    duration: 4, category: 'moment', volumeCeiling: 0.15, cooldownMs: 15000,
    fadeInMs: 300, fadeOutMs: 1500, momentDurationMs: 3000, priority: 1, family: 'living',
  },
  {
    id: 'unstable_ground',
    patterns: [
      /\b(ground\s*(crack|shift|split|shake|rumbl|trembl|give|buckle)|floor\s*(crack|shift|break|give|collapse))\b/i,
      /\b(earthquake|tremor|seismic|earth\s*(shake|rumbl|heave|split))\b/i,
    ],
    prompt: 'ground rumbling and cracking, unstable earth shaking',
    duration: 5, category: 'moment', volumeCeiling: 0.3, cooldownMs: 12000,
    fadeInMs: 300, fadeOutMs: 2000, momentDurationMs: 4000, priority: 4, family: 'battlefield',
  },
  {
    id: 'collapse',
    patterns: [
      /\b(collaps(e|ing|ed)|crumbl(e|ing|ed)|cave-?in|ceiling\s*(fall|drop|give|collaps))\b/i,
      /\b(toppl(e|ing)|structure\s*(fall|crash|collaps)|wall\s*(fall|crash|break|buckle))\b/i,
    ],
    prompt: 'stone structure collapsing, massive rubble falling, crumbling destruction',
    duration: 5, category: 'moment', volumeCeiling: 0.3, cooldownMs: 15000,
    fadeInMs: 200, fadeOutMs: 2000, momentDurationMs: 4000, priority: 4, family: 'battlefield',
  },
  {
    id: 'explosion',
    patterns: [
      /\b(explo(sion|de|ding)|detonate|blast|erupt(ion)?)\b/i,
    ],
    prompt: 'powerful explosion, concussive blast, destruction',
    duration: 4, category: 'moment', volumeCeiling: 0.3, cooldownMs: 10000,
    fadeInMs: 100, fadeOutMs: 2000, momentDurationMs: 3000, priority: 5, family: 'battlefield',
  },
];

// ── Magic / Supernatural ──
const MAGIC_CUES: SoundCue[] = [
  {
    id: 'magic_cast',
    patterns: [
      /\b(cast[s]?\s*(a\s+)?(spell|enchantment|hex|curse)|incantation|conjur(e|ing|ation))\b/i,
      /\b(chant(ing|s)?|invocation|ritual\s*(begin|start|complete))\b/i,
    ],
    prompt: 'mystical energy gathering, spell being cast, magical shimmer',
    duration: 4, category: 'moment', volumeCeiling: 0.25, cooldownMs: 8000,
    fadeInMs: 300, fadeOutMs: 1500, momentDurationMs: 3000, priority: 3, family: 'magic',
  },
  {
    id: 'portal',
    patterns: [
      /\b(portal\s*(open|appear|shimmer|close|seal|pulse)|rift\s*(open|tear|widen)|vortex|dimensional\s*(tear|rift|gate))\b/i,
      /\b(gateway\s*(open|appear|materialize|shimmer)|warp\s*(gate|hole|point))\b/i,
    ],
    prompt: 'dimensional portal swirling open, otherworldly energy vortex',
    duration: 5, category: 'moment', volumeCeiling: 0.25, cooldownMs: 15000,
    fadeInMs: 500, fadeOutMs: 2000, momentDurationMs: 4000, priority: 3, family: 'magic',
  },
  {
    id: 'ethereal_whisper',
    patterns: [
      /\b(whisper[sng]*\s*(echo|fill|surround|carry)|eerie\s*whisper|ghostly|spectral)\b/i,
      /\b(spirit[s]?\s*(whisper|speak|murmur)|phantom|apparition|wraith)\b/i,
    ],
    prompt: 'eerie ethereal whispers echoing, ghostly voices in the void',
    duration: 5, category: 'moment', volumeCeiling: 0.15, cooldownMs: 15000,
    fadeInMs: 1000, fadeOutMs: 2500, momentDurationMs: 4000, priority: 2, family: 'magic',
  },
  {
    id: 'energy_pulse',
    patterns: [
      /\b(energy\s*(surge|blast|pulse|crackl|wave|beam)|power\s*(surge|build|grow|release|unleash))\b/i,
      /\b(shockwave|concussive\s*(force|blast|wave)|force\s*(wave|push|blast))\b/i,
    ],
    prompt: 'energy surge building and releasing, powerful force pulse',
    duration: 3, category: 'moment', volumeCeiling: 0.25, cooldownMs: 8000,
    fadeInMs: 200, fadeOutMs: 1500, momentDurationMs: 2500, priority: 3, family: 'magic',
  },
  {
    id: 'healing',
    patterns: [
      /\b(heal(ing|s)?|restor(e|ing)|mend(ing|s)?|wounds?\s*(close|heal|mend|seal))\b/i,
      /\b(divine\s*(light|glow|energy)|blessed|sanctif|purif)\b/i,
    ],
    prompt: 'gentle healing energy, warm magical glow, restorative shimmer',
    duration: 4, category: 'moment', volumeCeiling: 0.15, cooldownMs: 12000,
    fadeInMs: 500, fadeOutMs: 2000, momentDurationMs: 3000, priority: 2, family: 'magic',
  },
];

// ── Atmosphere / Environment ──
const ATMOSPHERE_CUES: SoundCue[] = [
  {
    id: 'bell_toll',
    patterns: [
      /\b(bell\s*(toll|ring|chime|peal|clang)|church\s*bell|tolling|death\s*knell)\b/i,
      /\b(clock\s*(strike|chime|toll)|tower\s*bell)\b/i,
    ],
    prompt: 'deep bell tolling, single resonant church bell, solemn ring',
    duration: 4, category: 'moment', volumeCeiling: 0.2, cooldownMs: 15000,
    fadeInMs: 200, fadeOutMs: 2500, momentDurationMs: 3500, priority: 2, family: 'atmosphere',
  },
  {
    id: 'heartbeat',
    patterns: [
      /\b(heart\s*(pound|race|beat|thump|hammer|slam)|pulse\s*(quicken|race|pound|thunder))\b/i,
      /\b(blood\s*(pound|rush|roar)\s*(in|through)\s*(ears?|head|veins?))\b/i,
    ],
    prompt: 'tense heartbeat sound, rhythmic pulse getting faster, suspenseful',
    duration: 5, category: 'moment', volumeCeiling: 0.15, cooldownMs: 20000,
    fadeInMs: 500, fadeOutMs: 2000, momentDurationMs: 4000, priority: 2, family: 'atmosphere',
  },
  {
    id: 'eerie_silence',
    patterns: [
      /\b(silence\s*(fall|descend|press|hang|settle|stretch|thick)|dead\s*quiet|deafening\s*silence)\b/i,
      /\b(sound[s]?\s*(die|fade|vanish|cease)|all\s*(sound|noise)\s*(stop|cease|die))\b/i,
    ],
    prompt: 'very faint low drone, oppressive silence, subtle tension hum',
    duration: 6, category: 'moment', volumeCeiling: 0.08, cooldownMs: 20000,
    fadeInMs: 2000, fadeOutMs: 3000, momentDurationMs: 5000, priority: 1, family: 'atmosphere',
  },
];

export const ALL_SOUND_CUES: SoundCue[] = [
  ...NATURE_CUES,
  ...URBAN_CUES,
  ...INDUSTRIAL_CUES,
  ...CREATURE_CUES,
  ...BATTLEFIELD_CUES,
  ...MAGIC_CUES,
  ...ATMOSPHERE_CUES,
];
