/**
 * Battle SFX Engine — Web Audio API layered sound system
 * Uses free CDN sounds from freesound.org-compatible sources
 */

// ─── Sound URLs (royalty-free, CDN-hosted) ───────────────────────────────────
// Using Pixabay's free audio CDN for reliable royalty-free sounds
const SFX_URLS: Record<string, string> = {
  // Impact / hit sounds
  punch: 'https://cdn.pixabay.com/audio/2022/03/10/audio_6b78656734.mp3',
  sword_clash: 'https://cdn.pixabay.com/audio/2022/03/15/audio_948e68a088.mp3',
  explosion: 'https://cdn.pixabay.com/audio/2022/03/15/audio_a69c886256.mp3',
  
  // Elemental
  fire_crackle: 'https://cdn.pixabay.com/audio/2022/10/30/audio_f5dded8917.mp3',
  ice_shatter: 'https://cdn.pixabay.com/audio/2022/03/24/audio_1f24df0464.mp3',
  thunder: 'https://cdn.pixabay.com/audio/2022/06/07/audio_1c1e023e4b.mp3',
  wind: 'https://cdn.pixabay.com/audio/2022/01/18/audio_8faf71e23d.mp3',
  water_splash: 'https://cdn.pixabay.com/audio/2021/08/04/audio_c507e83505.mp3',
  
  // Mechanical / UI
  power_up: 'https://cdn.pixabay.com/audio/2022/03/10/audio_a101795d71.mp3',
  whoosh: 'https://cdn.pixabay.com/audio/2022/03/24/audio_d2b82e4e47.mp3',
  heartbeat: 'https://cdn.pixabay.com/audio/2022/10/10/audio_ae65f1a1c1.mp3',
  
  // Ambient battlefield
  crowd_cheer: 'https://cdn.pixabay.com/audio/2021/08/04/audio_2ac42a2017.mp3',
  tension_drone: 'https://cdn.pixabay.com/audio/2022/05/16/audio_1333dfbeff.mp3',
};

export type SfxEventType =
  | 'hit_light'
  | 'hit_heavy'
  | 'hit_critical'
  | 'miss'
  | 'block'
  | 'fire'
  | 'ice'
  | 'electric'
  | 'wind'
  | 'water'
  | 'explosion'
  | 'power_up'
  | 'edge_state'
  | 'overcharge'
  | 'momentum_gain'
  | 'psych_shift'
  | 'turn_start'
  | 'charge_start'
  | 'charge_tick'
  | 'charge_release'
  | 'charge_interrupted';

/** Maps event types to sound keys + config */
interface SfxLayer {
  soundKey: string;
  volume: number;       // 0..1
  playbackRate?: number; // pitch shift
  delay?: number;        // ms delay before playing
  filterFreq?: number;   // lowpass filter Hz (undefined = no filter)
}

const EVENT_LAYERS: Record<SfxEventType, SfxLayer[]> = {
  hit_light: [
    { soundKey: 'punch', volume: 0.4 },
  ],
  hit_heavy: [
    { soundKey: 'punch', volume: 0.7, playbackRate: 0.8 },
    { soundKey: 'whoosh', volume: 0.3, delay: 50 },
  ],
  hit_critical: [
    { soundKey: 'punch', volume: 0.9, playbackRate: 0.7 },
    { soundKey: 'explosion', volume: 0.3, delay: 100 },
    { soundKey: 'crowd_cheer', volume: 0.15, delay: 300 },
  ],
  miss: [
    { soundKey: 'whoosh', volume: 0.5, playbackRate: 1.3 },
  ],
  block: [
    { soundKey: 'sword_clash', volume: 0.5 },
  ],
  fire: [
    { soundKey: 'fire_crackle', volume: 0.5 },
  ],
  ice: [
    { soundKey: 'ice_shatter', volume: 0.5 },
  ],
  electric: [
    { soundKey: 'thunder', volume: 0.4 },
  ],
  wind: [
    { soundKey: 'wind', volume: 0.3 },
  ],
  water: [
    { soundKey: 'water_splash', volume: 0.4 },
  ],
  explosion: [
    { soundKey: 'explosion', volume: 0.7 },
  ],
  power_up: [
    { soundKey: 'power_up', volume: 0.5 },
  ],
  edge_state: [
    { soundKey: 'power_up', volume: 0.6, playbackRate: 1.2 },
    { soundKey: 'tension_drone', volume: 0.2, delay: 200 },
  ],
  overcharge: [
    { soundKey: 'power_up', volume: 0.5, playbackRate: 0.7 },
    { soundKey: 'thunder', volume: 0.3, delay: 150 },
  ],
  momentum_gain: [
    { soundKey: 'whoosh', volume: 0.3, playbackRate: 1.1 },
  ],
  psych_shift: [
    { soundKey: 'heartbeat', volume: 0.25 },
  ],
  turn_start: [
    { soundKey: 'whoosh', volume: 0.2, playbackRate: 1.5 },
  ],
  charge_start: [
    { soundKey: 'power_up', volume: 0.5, playbackRate: 0.6 },
    { soundKey: 'tension_drone', volume: 0.3, delay: 200 },
  ],
  charge_tick: [
    { soundKey: 'power_up', volume: 0.25, playbackRate: 0.8 },
  ],
  charge_release: [
    { soundKey: 'explosion', volume: 0.8, playbackRate: 0.9 },
    { soundKey: 'power_up', volume: 0.6, playbackRate: 1.4, delay: 50 },
    { soundKey: 'crowd_cheer', volume: 0.2, delay: 400 },
  ],
  charge_interrupted: [
    { soundKey: 'ice_shatter', volume: 0.5 },
    { soundKey: 'whoosh', volume: 0.3, playbackRate: 0.6, delay: 100 },
  ],
};

// ─── Keyword detection from battle text ──────────────────────────────────────

interface SfxKeywordPattern {
  event: SfxEventType;
  patterns: RegExp[];
}

const SFX_KEYWORD_PATTERNS: SfxKeywordPattern[] = [
  { event: 'hit_critical', patterns: [/\b(critical|devastating|crushing|obliterat|annihilat)\w*/i] },
  { event: 'hit_heavy', patterns: [/\b(slams?|smash|pound|pummel|uppercut|haymaker|meteor)\w*/i] },
  { event: 'hit_light', patterns: [/\b(punch|kick|strike|hit|jab|swipe|slash)\w*/i] },
  { event: 'miss', patterns: [/\b(miss|dodge|evade|sidestep|duck)\w*/i] },
  { event: 'block', patterns: [/\b(block|parr|deflect|guard|shield)\w*/i] },
  { event: 'explosion', patterns: [/\b(explo|detonate|blast|bomb|erupt)\w*/i] },
  { event: 'fire', patterns: [/\b(fire|flame|burn|blaze|inferno|lava|magma|ignite)\w*/i] },
  { event: 'ice', patterns: [/\b(ice|frost|freeze|frozen|blizzard|glacier|cold)\w*/i] },
  { event: 'electric', patterns: [/\b(lightning|thunder|shock|electr|volt)\w*/i] },
  { event: 'wind', patterns: [/\b(wind|gust|tornado|cyclone|hurricane|gale)\w*/i] },
  { event: 'water', patterns: [/\b(water|wave|splash|tsunami|flood|drown|submerge)\w*/i] },
  { event: 'power_up', patterns: [/\b(power up|transform|ascend|awaken|unleash|evolve)\w*/i] },
];

/**
 * Detect SFX events from battle narration text
 */
export function detectSfxEvents(text: string): SfxEventType[] {
  const detected: SfxEventType[] = [];
  const seen = new Set<SfxEventType>();

  for (const { event, patterns } of SFX_KEYWORD_PATTERNS) {
    if (seen.has(event)) continue;
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        detected.push(event);
        seen.add(event);
        break;
      }
    }
  }

  return detected;
}

// ─── Audio Engine ────────────────────────────────────────────────────────────

class BattleSfxEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bufferCache = new Map<string, AudioBuffer>();
  private loadingPromises = new Map<string, Promise<AudioBuffer | null>>();
  private _muted = false;
  private _volume = 0.6; // master volume

  get muted() {
    return this._muted;
  }

  get volume() {
    return this._volume;
  }

  private ensureContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._muted ? 0 : this._volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setMuted(muted: boolean) {
    this._muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : this._volume;
    }
  }

  setVolume(vol: number) {
    this._volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && !this._muted) {
      this.masterGain.gain.value = this._volume;
    }
  }

  private async loadSound(key: string): Promise<AudioBuffer | null> {
    const cached = this.bufferCache.get(key);
    if (cached) return cached;

    const existing = this.loadingPromises.get(key);
    if (existing) return existing;

    const url = SFX_URLS[key];
    if (!url) return null;

    const promise = (async () => {
      try {
        const ctx = this.ensureContext();
        const response = await fetch(url, { mode: 'cors' });
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        this.bufferCache.set(key, audioBuffer);
        return audioBuffer;
      } catch (err) {
        console.warn(`[SFX] Failed to load ${key}:`, err);
        return null;
      } finally {
        this.loadingPromises.delete(key);
      }
    })();

    this.loadingPromises.set(key, promise);
    return promise;
  }

  /**
   * Preload a set of commonly used sounds
   */
  async preload() {
    const commonKeys = ['punch', 'whoosh', 'power_up', 'sword_clash', 'explosion'];
    await Promise.allSettled(commonKeys.map(k => this.loadSound(k)));
  }

  /**
   * Play a single layer
   */
  private async playLayer(layer: SfxLayer) {
    const ctx = this.ensureContext();
    const buffer = await this.loadSound(layer.soundKey);
    if (!buffer || !this.masterGain) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = layer.playbackRate ?? 1;

    // Build chain: source -> gain -> (optional filter) -> master
    const gainNode = ctx.createGain();
    gainNode.gain.value = layer.volume;

    let lastNode: AudioNode = gainNode;

    if (layer.filterFreq) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = layer.filterFreq;
      gainNode.connect(filter);
      lastNode = filter;
    }

    source.connect(gainNode);
    lastNode.connect(this.masterGain);

    const play = () => {
      source.start(0);
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
      };
    };

    if (layer.delay && layer.delay > 0) {
      setTimeout(play, layer.delay);
    } else {
      play();
    }
  }

  /**
   * Fire an SFX event — plays all layers for that event type
   */
  async playEvent(event: SfxEventType) {
    if (this._muted) return;

    const layers = EVENT_LAYERS[event];
    if (!layers) return;

    await Promise.allSettled(layers.map(l => this.playLayer(l)));
  }

  /**
   * Process battle text and trigger appropriate SFX
   */
  async processText(text: string) {
    const events = detectSfxEvents(text);
    // Play up to 3 events to avoid cacophony
    const toPlay = events.slice(0, 3);
    for (let i = 0; i < toPlay.length; i++) {
      // Stagger by 200ms per event for cleaner layering
      setTimeout(() => this.playEvent(toPlay[i]), i * 200);
    }
  }

  /**
   * Clean up
   */
  dispose() {
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    this.bufferCache.clear();
    this.loadingPromises.clear();
    this.ctx = null;
    this.masterGain = null;
  }
}

// Singleton instance
let engineInstance: BattleSfxEngine | null = null;

export function getBattleSfxEngine(): BattleSfxEngine {
  if (!engineInstance) {
    engineInstance = new BattleSfxEngine();
  }
  return engineInstance;
}

export { BattleSfxEngine };
