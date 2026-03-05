/**
 * Ambient Effects
 *
 * Audio and visual atmosphere modifiers for battle environments.
 */

export interface AmbientEffect {
  id: string;
  name: string;
  /** Audio cue keywords (for the ambient sound engine) */
  audioCues: string[];
  /** Visual effect keywords (for battlefield effects overlay) */
  visualCues: string[];
  /** Narrator description prompt */
  narratorPrompt: string;
}

export const AMBIENT_EFFECTS: AmbientEffect[] = [
  {
    id: 'wind',
    name: 'Wind',
    audioCues: ['wind', 'howling', 'gust'],
    visualCues: ['particles_drift', 'cloth_flutter'],
    narratorPrompt: 'Wind whips through the arena, carrying dust and debris.',
  },
  {
    id: 'rain',
    name: 'Rain',
    audioCues: ['rain', 'dripping', 'splashing'],
    visualCues: ['rain_particles', 'wet_surfaces'],
    narratorPrompt: 'Rain hammers down, making surfaces slick and visibility poor.',
  },
  {
    id: 'fire_crackle',
    name: 'Nearby Fire',
    audioCues: ['fire', 'crackling', 'roaring'],
    visualCues: ['fire_glow', 'smoke_wisps'],
    narratorPrompt: 'Flames lick at the edges of the battlefield, casting flickering orange light.',
  },
  {
    id: 'thunder',
    name: 'Thunder',
    audioCues: ['thunder', 'rumbling', 'boom'],
    visualCues: ['flash_lightning', 'dark_clouds'],
    narratorPrompt: 'Thunder rolls across the sky, each crack shaking the air.',
  },
  {
    id: 'energy_hum',
    name: 'Energy Hum',
    audioCues: ['humming', 'buzzing', 'vibrating'],
    visualCues: ['energy_particles', 'glow_pulse'],
    narratorPrompt: 'A persistent energy hum vibrates through the air, setting teeth on edge.',
  },
  {
    id: 'water_flow',
    name: 'Water Flow',
    audioCues: ['water', 'rushing', 'waves'],
    visualCues: ['water_surface', 'mist'],
    narratorPrompt: 'Water rushes nearby, its constant sound filling the arena.',
  },
  {
    id: 'metal_stress',
    name: 'Metal Under Stress',
    audioCues: ['creaking', 'groaning', 'scraping'],
    visualCues: ['dust_falling', 'vibrating_structures'],
    narratorPrompt: 'Metal groans and creaks under unseen strain. The structure could give at any moment.',
  },
  {
    id: 'void_silence',
    name: 'Void Silence',
    audioCues: ['silence', 'tinnitus', 'void'],
    visualCues: ['darkness_encroach', 'star_field'],
    narratorPrompt: 'Absolute silence presses in. Sound itself seems to be consumed by the void.',
  },
  {
    id: 'crystal_resonance',
    name: 'Crystal Resonance',
    audioCues: ['chiming', 'resonating', 'ringing'],
    visualCues: ['prismatic_light', 'crystal_glow'],
    narratorPrompt: 'Crystals hum with an otherworldly resonance, refracting light into rainbow shards.',
  },
  {
    id: 'lava_bubble',
    name: 'Lava Bubbling',
    audioCues: ['bubbling', 'hissing', 'popping'],
    visualCues: ['heat_distortion', 'orange_glow'],
    narratorPrompt: 'Lava bubbles and pops nearby, sending up gouts of superheated gas.',
  },
];

/**
 * Get ambient effects matching audio/visual cue keywords
 */
export function getAmbientEffectsForCues(cues: string[]): AmbientEffect[] {
  return AMBIENT_EFFECTS.filter(effect =>
    cues.some(cue =>
      effect.audioCues.includes(cue) || effect.visualCues.includes(cue)
    )
  );
}

/**
 * Get ambient effects for a location's ambient sound list
 */
export function getAmbientEffectsForLocation(ambientSounds: string[]): AmbientEffect[] {
  return AMBIENT_EFFECTS.filter(effect =>
    ambientSounds.some(sound =>
      effect.audioCues.some(cue => sound.toLowerCase().includes(cue))
    )
  );
}
