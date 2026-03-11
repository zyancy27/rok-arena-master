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
    patterns: [/\b(wind\s*(blow|howl|gust|whip|rush|sweep)|gust\s*of\s*wind|breeze|breezy)\b/i],
    prompt: 'gentle wind blowing through open area, natural breeze ambience',
    duration: 12, category: 'persistent', volumeCeiling: 0.35, cooldownMs: 8000,
    fadeInMs: 2000, fadeOutMs: 3000, priority: 3, family: 'weather',
  },
  {
    id: 'leaves_rustle',
    patterns: [/\b(leaves?\s*(rustl|crunch|whisper|stir)|foliage\s*(mov|rustl)|rustling)\b/i],
    prompt: 'leaves rustling softly in wind, gentle foliage movement',
    duration: 8, category: 'persistent', volumeCeiling: 0.25, cooldownMs: 10000,
    fadeInMs: 1500, fadeOutMs: 2000, priority: 2, family: 'nature',
  },
  {
    id: 'insects',
    patterns: [/\b(insects?\s*(buzz|chirp|hum)|cicada|cricket|buzzing)\b/i],
    prompt: 'insects buzzing and chirping softly, nighttime crickets',
    duration: 12, category: 'persistent', volumeCeiling: 0.2, cooldownMs: 15000,
    fadeInMs: 3000, fadeOutMs: 3000, priority: 1, family: 'nature',
  },
  {
    id: 'birds',
    patterns: [/\b(bird[s]?\s*(sing|chirp|call|cry)|birdsong|songbird|hawk|eagle|crow|raven)\b/i],
    prompt: 'birds singing softly in distance, gentle birdsong ambience',
    duration: 10, category: 'persistent', volumeCeiling: 0.2, cooldownMs: 12000,
    fadeInMs: 2000, fadeOutMs: 2500, priority: 2, family: 'nature',
  },
  {
    id: 'dripping_water',
    patterns: [/\b(drip|dripping|water\s*drop|drops?\s*of\s*water)\b/i],
    prompt: 'water dripping slowly in cave or dark space, echoing drops',
    duration: 10, category: 'persistent', volumeCeiling: 0.2, cooldownMs: 10000,
    fadeInMs: 1500, fadeOutMs: 2000, priority: 2, family: 'water',
  },
  {
    id: 'thunder_distant',
    patterns: [/\b(distant\s*thunder|thunder\s*(rumbl|roll)|storm\s*(approach|brew|gather))\b/i],
    prompt: 'distant thunder rumbling softly, approaching storm atmosphere',
    duration: 6, category: 'moment', volumeCeiling: 0.35, cooldownMs: 15000,
    fadeInMs: 500, fadeOutMs: 2000, momentDurationMs: 4000, priority: 4, family: 'weather',
  },
  {
    id: 'river',
    patterns: [/\b(river|stream|brook|creek|rapids|waterfall|rushing\s*water|water\s*(roar|rush|echo))\b/i],
    prompt: 'flowing river water, rushing stream, gentle waterfall ambience',
    duration: 12, category: 'persistent', volumeCeiling: 0.3, cooldownMs: 10000,
    fadeInMs: 2500, fadeOutMs: 3000, priority: 3, family: 'water',
  },
  {
    id: 'swamp_bubble',
    patterns: [/\b(swamp|marsh|bog|bubbl|mire|murky\s*water)\b/i],
    prompt: 'swamp bubbling softly, murky water, eerie wetland sounds',
    duration: 10, category: 'persistent', volumeCeiling: 0.2, cooldownMs: 12000,
    fadeInMs: 2000, fadeOutMs: 2500, priority: 2, family: 'nature',
  },
  {
    id: 'rain',
    patterns: [/\b(rain\s*(fall|pour|patter|drum|hit)|raining|downpour|drizzle)\b/i],
    prompt: 'steady rain falling, raindrops hitting surfaces, wet ambience',
    duration: 14, category: 'persistent', volumeCeiling: 0.3, cooldownMs: 10000,
    fadeInMs: 3000, fadeOutMs: 3000, priority: 3, family: 'weather',
  },
];

// ── Urban / Human-made ──
const URBAN_CUES: SoundCue[] = [
  {
    id: 'creaking_metal',
    patterns: [/\b(metal\s*(groan|creak|strain|screech|bend)|creak(ing|s)?\s*metal|catwalk\s*groan|railing\s*vibrat)\b/i],
    prompt: 'metal structure creaking and groaning under stress, industrial strain',
    duration: 5, category: 'moment', volumeCeiling: 0.3, cooldownMs: 8000,
    fadeInMs: 300, fadeOutMs: 1500, momentDurationMs: 3500, priority: 4, family: 'structure',
  },
  {
    id: 'distant_alarm',
    patterns: [/\b(alarm|siren|warning\s*(sound|signal|klaxon))\b/i],
    prompt: 'distant alarm siren, faint warning signal echoing',
    duration: 6, category: 'moment', volumeCeiling: 0.2, cooldownMs: 20000,
    fadeInMs: 500, fadeOutMs: 2000, momentDurationMs: 4000, priority: 3, family: 'urban',
  },
  {
    id: 'glass_shift',
    patterns: [/\b(glass\s*(shift|crack|tinkle|rattle)|window\s*(rattle|crack))\b/i],
    prompt: 'glass shifting and tinkling softly, unstable window',
    duration: 3, category: 'moment', volumeCeiling: 0.25, cooldownMs: 10000,
    fadeInMs: 200, fadeOutMs: 1000, momentDurationMs: 2500, priority: 2, family: 'structure',
  },
  {
    id: 'building_groan',
    patterns: [/\b(building\s*(groan|creak|sway|shift)|structure\s*(groan|shift|creak))\b/i],
    prompt: 'large building groaning, structural creaking, deep stress sound',
    duration: 5, category: 'moment', volumeCeiling: 0.3, cooldownMs: 12000,
    fadeInMs: 500, fadeOutMs: 2000, momentDurationMs: 3500, priority: 4, family: 'structure',
  },
  {
    id: 'electrical_hum',
    patterns: [/\b(electric(al)?\s*(hum|buzz|crackl|arc|spark)|power\s*(hum|line|grid)|neon\s*(buzz|flicker))\b/i],
    prompt: 'electrical humming and buzzing softly, power line hum',
    duration: 10, category: 'persistent', volumeCeiling: 0.15, cooldownMs: 15000,
    fadeInMs: 2000, fadeOutMs: 2500, priority: 1, family: 'urban',
  },
  {
    id: 'pipe_leak',
    patterns: [/\b(pipe\s*(leak|hiss|burst|drip)|leaking\s*pipe|plumbing)\b/i],
    prompt: 'leaking pipe hissing softly, water dripping from pipe',
    duration: 8, category: 'persistent', volumeCeiling: 0.2, cooldownMs: 12000,
    fadeInMs: 1500, fadeOutMs: 2000, priority: 2, family: 'structure',
  },
  {
    id: 'machinery',
    patterns: [/\b(machine(ry)?\s*(rum|hum|grind|whir)|engine\s*(rum|hum)|turbine|generator|factory)\b/i],
    prompt: 'distant heavy machinery humming, industrial engine rumble',
    duration: 12, category: 'persistent', volumeCeiling: 0.2, cooldownMs: 15000,
    fadeInMs: 3000, fadeOutMs: 3000, priority: 2, family: 'urban',
  },
];

// ── Industrial / Dangerous ──
const INDUSTRIAL_CUES: SoundCue[] = [
  {
    id: 'steam_hiss',
    patterns: [/\b(steam\s*(hiss|vent|burst|release|jet|pipe)|hissing\s*steam)\b/i],
    prompt: 'steam hissing from pipe, pressurized steam release',
    duration: 4, category: 'moment', volumeCeiling: 0.3, cooldownMs: 8000,
    fadeInMs: 200, fadeOutMs: 1500, momentDurationMs: 3000, priority: 3, family: 'industrial',
  },
  {
    id: 'sparks',
    patterns: [/\b(spark[s]?\s*(fly|shower|burst|spray)|sparking|arc\s*of\s*(electricity|light))\b/i],
    prompt: 'electrical sparks flying, short circuit sparking',
    duration: 3, category: 'moment', volumeCeiling: 0.25, cooldownMs: 8000,
    fadeInMs: 100, fadeOutMs: 1000, momentDurationMs: 2000, priority: 3, family: 'industrial',
  },
  {
    id: 'pressure_release',
    patterns: [/\b(pressure\s*(release|valve|drop|blow)|decompression|pneumatic)\b/i],
    prompt: 'pressure valve releasing, pneumatic hiss, air escaping',
    duration: 3, category: 'moment', volumeCeiling: 0.25, cooldownMs: 10000,
    fadeInMs: 100, fadeOutMs: 1500, momentDurationMs: 2500, priority: 3, family: 'industrial',
  },
  {
    id: 'reactor_hum',
    patterns: [/\b(reactor|core\s*(hum|pulse|glow)|power\s*core|energy\s*core)\b/i],
    prompt: 'deep reactor hum, pulsating energy core, low frequency drone',
    duration: 12, category: 'persistent', volumeCeiling: 0.2, cooldownMs: 20000,
    fadeInMs: 3000, fadeOutMs: 3000, priority: 2, family: 'industrial',
  },
];

// ── Living world / creatures ──
const CREATURE_CUES: SoundCue[] = [
  {
    id: 'distant_footsteps',
    patterns: [/\b(distant\s*(footstep|step)|footsteps?\s*(echo|approach|recede)|someone\s*(approach|walk))\b/i],
    prompt: 'distant footsteps echoing, someone walking far away',
    duration: 4, category: 'moment', volumeCeiling: 0.2, cooldownMs: 10000,
    fadeInMs: 500, fadeOutMs: 1500, momentDurationMs: 3000, priority: 2, family: 'living',
  },
  {
    id: 'crowd_murmur',
    patterns: [/\b(crowd\s*(murmur|chatter|talk|gather|noise)|people\s*(talk|murmur|gather)|murmuring|chatter)\b/i],
    prompt: 'distant crowd murmuring softly, people talking in background',
    duration: 10, category: 'persistent', volumeCeiling: 0.2, cooldownMs: 15000,
    fadeInMs: 2500, fadeOutMs: 3000, priority: 2, family: 'living',
  },
  {
    id: 'faint_crying',
    patterns: [/\b(crying|weeping|sobbing|tears?\s*(fall|stream))\b/i],
    prompt: 'very faint distant crying, muffled sobbing barely audible',
    duration: 4, category: 'moment', volumeCeiling: 0.06, cooldownMs: 30000,
    fadeInMs: 800, fadeOutMs: 2000, momentDurationMs: 3000, priority: 1, family: 'vocal',
  },
  {
    id: 'distant_yelling',
    patterns: [/\b(yelling|shout(ing|s)?|call(ing|s)?\s*out|voice[s]?\s*(echo|carry|shout))\b/i],
    prompt: 'very faint distant shouting, muffled voices yelling far away',
    duration: 3, category: 'moment', volumeCeiling: 0.07, cooldownMs: 25000,
    fadeInMs: 300, fadeOutMs: 1500, momentDurationMs: 2500, priority: 2, family: 'vocal',
  },
  {
    id: 'faint_scream',
    patterns: [/\b(scream[s]?\s*(echo|ring|pierce|fill)|shriek|wail|cry\s*of\s*(pain|terror|anguish))\b/i],
    prompt: 'very faint distant scream, barely audible cry of alarm',
    duration: 3, category: 'moment', volumeCeiling: 0.1, cooldownMs: 30000,
    fadeInMs: 200, fadeOutMs: 2000, momentDurationMs: 2000, priority: 2, family: 'vocal',
  },
  {
    id: 'creature_movement',
    patterns: [/\b(something\s*(mov|stir|shift|lurk|creep)|creature\s*(mov|stir|creep)|skitter|scurry|slither)\b/i],
    prompt: 'subtle creature movement in darkness, something stirring nearby',
    duration: 4, category: 'moment', volumeCeiling: 0.2, cooldownMs: 12000,
    fadeInMs: 300, fadeOutMs: 1500, momentDurationMs: 3000, priority: 3, family: 'creature',
  },
  {
    id: 'wing_flaps',
    patterns: [/\b(wing[s]?\s*(flap|beat|spread|unfurl)|takes?\s*flight|swooping)\b/i],
    prompt: 'wings flapping, large creature taking flight, feathered swoosh',
    duration: 3, category: 'moment', volumeCeiling: 0.25, cooldownMs: 10000,
    fadeInMs: 200, fadeOutMs: 1500, momentDurationMs: 2500, priority: 3, family: 'creature',
  },
  {
    id: 'low_growl',
    patterns: [/\b(growl[s]?\s*(low|deep|soft)|low\s*growl|snarl[s]?\s*(soft|low)|guttural)\b/i],
    prompt: 'deep low growl of a creature, threatening snarl in darkness',
    duration: 3, category: 'moment', volumeCeiling: 0.2, cooldownMs: 12000,
    fadeInMs: 300, fadeOutMs: 1500, momentDurationMs: 2500, priority: 3, family: 'creature',
  },
];

// ── Battlefield / action ──
const BATTLEFIELD_CUES: SoundCue[] = [
  {
    id: 'dust_settling',
    patterns: [/\b(dust\s*(settl|clear|cloud|billow)|sand\s*(swirl|settl)|haze\s*clear)\b/i],
    prompt: 'dust settling after impact, sand and debris clearing',
    duration: 4, category: 'moment', volumeCeiling: 0.15, cooldownMs: 10000,
    fadeInMs: 500, fadeOutMs: 2000, momentDurationMs: 3000, priority: 1, family: 'battlefield',
  },
  {
    id: 'debris_shift',
    patterns: [/\b(debris\s*(shift|fall|tumbl|scatter|rain)|rubble\s*(fall|shift|tumbl|cascad)|stone[s]?\s*(tumbl|fall|cascad))\b/i],
    prompt: 'rubble and debris shifting, stones tumbling, material falling',
    duration: 4, category: 'moment', volumeCeiling: 0.25, cooldownMs: 8000,
    fadeInMs: 200, fadeOutMs: 1500, momentDurationMs: 3000, priority: 3, family: 'battlefield',
  },
  {
    id: 'crackling_fire',
    patterns: [/\b(fire\s*(crackl|burn|spread|rag)|flames?\s*(crackl|lick|spread|danc)|burning|blaze|inferno)\b/i],
    prompt: 'fire crackling and burning, flames spreading, wood burning',
    duration: 10, category: 'persistent', volumeCeiling: 0.25, cooldownMs: 12000,
    fadeInMs: 1500, fadeOutMs: 2500, priority: 3, family: 'battlefield',
  },
  {
    id: 'distant_impact',
    patterns: [/\b(distant\s*(impact|explosion|crash|boom)|echo(es)?\s*(of|from)\s*(impact|explosion))\b/i],
    prompt: 'distant explosion or impact echoing, far away boom',
    duration: 4, category: 'moment', volumeCeiling: 0.2, cooldownMs: 15000,
    fadeInMs: 200, fadeOutMs: 2000, momentDurationMs: 3000, priority: 3, family: 'battlefield',
  },
  {
    id: 'heavy_breathing',
    patterns: [/\b(heavy\s*breath|panting|gasping|out\s*of\s*breath|labored\s*breath|breath\s*(heavy|ragged))\b/i],
    prompt: 'heavy labored breathing, exhausted panting',
    duration: 4, category: 'moment', volumeCeiling: 0.15, cooldownMs: 15000,
    fadeInMs: 300, fadeOutMs: 1500, momentDurationMs: 3000, priority: 1, family: 'living',
  },
  {
    id: 'unstable_ground',
    patterns: [/\b(ground\s*(crack|shift|split|shake|rumbl|trembl|give)|floor\s*(crack|shift|break|give)|earthquake|tremor)\b/i],
    prompt: 'ground rumbling and cracking, unstable earth shaking',
    duration: 5, category: 'moment', volumeCeiling: 0.3, cooldownMs: 12000,
    fadeInMs: 300, fadeOutMs: 2000, momentDurationMs: 4000, priority: 4, family: 'battlefield',
  },
];

export const ALL_SOUND_CUES: SoundCue[] = [
  ...NATURE_CUES,
  ...URBAN_CUES,
  ...INDUSTRIAL_CUES,
  ...CREATURE_CUES,
  ...BATTLEFIELD_CUES,
];
