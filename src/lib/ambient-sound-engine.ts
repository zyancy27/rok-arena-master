/**
 * Ambient Sound Engine — Procedural Web Audio API environment soundscapes
 * 
 * Generates subtle, dynamic ambient audio that matches environment context.
 * Uses oscillators, noise generators, and filters — no external audio files needed.
 * Sounds fade naturally when environment changes and never loop aggressively.
 */

import type { EnvironmentTag } from '@/lib/theme-engine';

// ── Types ───────────────────────────────────────────────────────

interface AmbientLayer {
  /** Unique id for this layer */
  id: string;
  /** Create the audio nodes for this layer */
  create: (ctx: AudioContext, dest: AudioNode) => AmbientLayerInstance;
}

interface AmbientLayerInstance {
  /** Start playback */
  start: () => void;
  /** Stop with fade-out (returns promise that resolves when done) */
  stop: (fadeMs?: number) => Promise<void>;
  /** Set volume (0-1) */
  setVolume: (v: number) => void;
}

type AmbientProfile = {
  layers: AmbientLayer[];
};

// ── Noise Generators ────────────────────────────────────────────

function createNoiseBuffer(ctx: AudioContext, seconds: number, type: 'white' | 'pink' | 'brown'): AudioBuffer {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);

  if (type === 'white') {
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  } else if (type === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else {
    // Brown noise
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
  }
  return buf;
}

// ── Layer Factories ─────────────────────────────────────────────

function windLayer(intensity: number = 0.15, filterFreq: number = 400): AmbientLayer {
  return {
    id: 'wind',
    create: (ctx, dest) => {
      const buf = createNoiseBuffer(ctx, 4, 'brown');
      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      filter.Q.value = 0.7;

      // LFO for volume modulation (wind gusts)
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.15 + Math.random() * 0.1;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = intensity * 0.3;

      const gain = ctx.createGain();
      gain.gain.value = intensity;

      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      return {
        start: () => { source.start(); lfo.start(); },
        stop: async (fadeMs = 2000) => {
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeMs / 1000);
          await new Promise(r => setTimeout(r, fadeMs));
          try { source.stop(); lfo.stop(); } catch {}
        },
        setVolume: (v) => { gain.gain.value = v * intensity; },
      };
    },
  };
}

function forestLayer(): AmbientLayer {
  return {
    id: 'forest',
    create: (ctx, dest) => {
      // Gentle pink noise for rustling leaves
      const buf = createNoiseBuffer(ctx, 3, 'pink');
      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2000;
      filter.Q.value = 0.5;

      const gain = ctx.createGain();
      gain.gain.value = 0.06;

      // Bird chirp oscillators (intermittent)
      const birdOsc = ctx.createOscillator();
      birdOsc.type = 'sine';
      birdOsc.frequency.value = 2800;
      const birdGain = ctx.createGain();
      birdGain.gain.value = 0;

      // Schedule intermittent chirps
      const scheduleChirps = () => {
        const now = ctx.currentTime;
        for (let i = 0; i < 20; i++) {
          const t = now + 2 + Math.random() * 30;
          const freq = 2200 + Math.random() * 1600;
          birdOsc.frequency.setValueAtTime(freq, t);
          birdGain.gain.setValueAtTime(0, t);
          birdGain.gain.linearRampToValueAtTime(0.03, t + 0.05);
          birdGain.gain.linearRampToValueAtTime(0, t + 0.15);
          // Second chirp
          birdOsc.frequency.setValueAtTime(freq * 1.2, t + 0.2);
          birdGain.gain.setValueAtTime(0, t + 0.2);
          birdGain.gain.linearRampToValueAtTime(0.025, t + 0.25);
          birdGain.gain.linearRampToValueAtTime(0, t + 0.35);
        }
      };

      source.connect(filter);
      filter.connect(gain);
      birdOsc.connect(birdGain);
      birdGain.connect(gain);
      gain.connect(dest);

      return {
        start: () => { source.start(); birdOsc.start(); scheduleChirps(); },
        stop: async (fadeMs = 2000) => {
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeMs / 1000);
          await new Promise(r => setTimeout(r, fadeMs));
          try { source.stop(); birdOsc.stop(); } catch {}
        },
        setVolume: (v) => { gain.gain.value = v * 0.06; },
      };
    },
  };
}

function stormLayer(): AmbientLayer {
  return {
    id: 'storm',
    create: (ctx, dest) => {
      // Heavy rain = white noise through bandpass
      const buf = createNoiseBuffer(ctx, 4, 'white');
      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1000;

      const gain = ctx.createGain();
      gain.gain.value = 0.08;

      // Thunder: low rumble scheduled intermittently
      const thunderBuf = createNoiseBuffer(ctx, 3, 'brown');
      const thunderSource = ctx.createBufferSource();
      thunderSource.buffer = thunderBuf;
      thunderSource.loop = true;

      const thunderFilter = ctx.createBiquadFilter();
      thunderFilter.type = 'lowpass';
      thunderFilter.frequency.value = 100;

      const thunderGain = ctx.createGain();
      thunderGain.gain.value = 0;

      // Schedule thunder rumbles
      const scheduleThunder = () => {
        const now = ctx.currentTime;
        for (let i = 0; i < 8; i++) {
          const t = now + 5 + Math.random() * 40;
          thunderGain.gain.setValueAtTime(0, t);
          thunderGain.gain.linearRampToValueAtTime(0.15, t + 0.1);
          thunderGain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
        }
      };

      source.connect(filter);
      filter.connect(gain);
      thunderSource.connect(thunderFilter);
      thunderFilter.connect(thunderGain);
      thunderGain.connect(gain);
      gain.connect(dest);

      return {
        start: () => { source.start(); thunderSource.start(); scheduleThunder(); },
        stop: async (fadeMs = 2000) => {
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeMs / 1000);
          await new Promise(r => setTimeout(r, fadeMs));
          try { source.stop(); thunderSource.stop(); } catch {}
        },
        setVolume: (v) => { gain.gain.value = v * 0.08; },
      };
    },
  };
}

function underwaterLayer(): AmbientLayer {
  return {
    id: 'underwater',
    create: (ctx, dest) => {
      // Muffled brown noise
      const buf = createNoiseBuffer(ctx, 4, 'brown');
      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      filter.Q.value = 2;

      // Bubble sounds: high-pitched blips
      const bubbleOsc = ctx.createOscillator();
      bubbleOsc.type = 'sine';
      bubbleOsc.frequency.value = 800;
      const bubbleGain = ctx.createGain();
      bubbleGain.gain.value = 0;

      const scheduleBubbles = () => {
        const now = ctx.currentTime;
        for (let i = 0; i < 30; i++) {
          const t = now + 1 + Math.random() * 25;
          const freq = 600 + Math.random() * 800;
          bubbleOsc.frequency.setValueAtTime(freq, t);
          bubbleOsc.frequency.linearRampToValueAtTime(freq * 1.5, t + 0.08);
          bubbleGain.gain.setValueAtTime(0, t);
          bubbleGain.gain.linearRampToValueAtTime(0.015, t + 0.02);
          bubbleGain.gain.linearRampToValueAtTime(0, t + 0.1);
        }
      };

      const gain = ctx.createGain();
      gain.gain.value = 0.1;

      source.connect(filter);
      filter.connect(gain);
      bubbleOsc.connect(bubbleGain);
      bubbleGain.connect(gain);
      gain.connect(dest);

      return {
        start: () => { source.start(); bubbleOsc.start(); scheduleBubbles(); },
        stop: async (fadeMs = 2000) => {
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeMs / 1000);
          await new Promise(r => setTimeout(r, fadeMs));
          try { source.stop(); bubbleOsc.stop(); } catch {}
        },
        setVolume: (v) => { gain.gain.value = v * 0.1; },
      };
    },
  };
}

function cavernLayer(): AmbientLayer {
  return {
    id: 'cavern',
    create: (ctx, dest) => {
      // Reverberant dripping: sparse high pings with convolver-like delay
      const buf = createNoiseBuffer(ctx, 3, 'brown');
      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200;

      // Drip sounds
      const dripOsc = ctx.createOscillator();
      dripOsc.type = 'sine';
      dripOsc.frequency.value = 1200;
      const dripGain = ctx.createGain();
      dripGain.gain.value = 0;

      // Delay for echo
      const delay = ctx.createDelay(1);
      delay.delayTime.value = 0.4;
      const delayGain = ctx.createGain();
      delayGain.gain.value = 0.3;

      const scheduleDrips = () => {
        const now = ctx.currentTime;
        for (let i = 0; i < 15; i++) {
          const t = now + 3 + Math.random() * 30;
          const freq = 1000 + Math.random() * 600;
          dripOsc.frequency.setValueAtTime(freq, t);
          dripOsc.frequency.linearRampToValueAtTime(freq * 0.7, t + 0.05);
          dripGain.gain.setValueAtTime(0, t);
          dripGain.gain.linearRampToValueAtTime(0.04, t + 0.01);
          dripGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        }
      };

      const gain = ctx.createGain();
      gain.gain.value = 0.08;

      source.connect(filter);
      filter.connect(gain);
      dripOsc.connect(dripGain);
      dripGain.connect(delay);
      delay.connect(delayGain);
      delayGain.connect(delay); // feedback loop
      dripGain.connect(gain);
      delayGain.connect(gain);
      gain.connect(dest);

      return {
        start: () => { source.start(); dripOsc.start(); scheduleDrips(); },
        stop: async (fadeMs = 2000) => {
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeMs / 1000);
          await new Promise(r => setTimeout(r, fadeMs));
          try { source.stop(); dripOsc.stop(); } catch {}
        },
        setVolume: (v) => { gain.gain.value = v * 0.08; },
      };
    },
  };
}

function cityLayer(): AmbientLayer {
  return {
    id: 'city',
    create: (ctx, dest) => {
      // Low rumble (traffic)
      const buf = createNoiseBuffer(ctx, 4, 'brown');
      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 250;

      // Distant siren: modulated sine
      const sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 600;
      const sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;

      const scheduleSirens = () => {
        const now = ctx.currentTime;
        for (let i = 0; i < 4; i++) {
          const t = now + 10 + Math.random() * 50;
          sirenGain.gain.setValueAtTime(0, t);
          sirenGain.gain.linearRampToValueAtTime(0.012, t + 0.5);
          // Siren warble
          for (let j = 0; j < 6; j++) {
            sirenOsc.frequency.setValueAtTime(600, t + 0.5 + j * 0.6);
            sirenOsc.frequency.linearRampToValueAtTime(800, t + 0.8 + j * 0.6);
          }
          sirenGain.gain.linearRampToValueAtTime(0, t + 4);
        }
      };

      const gain = ctx.createGain();
      gain.gain.value = 0.07;

      source.connect(filter);
      filter.connect(gain);
      sirenOsc.connect(sirenGain);
      sirenGain.connect(gain);
      gain.connect(dest);

      return {
        start: () => { source.start(); sirenOsc.start(); scheduleSirens(); },
        stop: async (fadeMs = 2000) => {
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeMs / 1000);
          await new Promise(r => setTimeout(r, fadeMs));
          try { source.stop(); sirenOsc.stop(); } catch {}
        },
        setVolume: (v) => { gain.gain.value = v * 0.07; },
      };
    },
  };
}

function lavaLayer(): AmbientLayer {
  return {
    id: 'lava',
    create: (ctx, dest) => {
      const buf = createNoiseBuffer(ctx, 4, 'brown');
      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 150;
      filter.Q.value = 3;

      // LFO for rumbling modulation
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.3;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.04;

      const gain = ctx.createGain();
      gain.gain.value = 0.1;

      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      return {
        start: () => { source.start(); lfo.start(); },
        stop: async (fadeMs = 2000) => {
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeMs / 1000);
          await new Promise(r => setTimeout(r, fadeMs));
          try { source.stop(); lfo.stop(); } catch {}
        },
        setVolume: (v) => { gain.gain.value = v * 0.1; },
      };
    },
  };
}

function explosionsLayer(): AmbientLayer {
  return {
    id: 'explosions',
    create: (ctx, dest) => {
      const buf = createNoiseBuffer(ctx, 2, 'brown');
      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 80;

      const gain = ctx.createGain();
      gain.gain.value = 0;

      // Schedule distant booms
      const scheduleBooms = () => {
        const now = ctx.currentTime;
        for (let i = 0; i < 6; i++) {
          const t = now + 5 + Math.random() * 30;
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.12, t + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
        }
      };

      source.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      return {
        start: () => { source.start(); scheduleBooms(); },
        stop: async (fadeMs = 2000) => {
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeMs / 1000);
          await new Promise(r => setTimeout(r, fadeMs));
          try { source.stop(); } catch {}
        },
        setVolume: () => {},
      };
    },
  };
}

function creakingLayer(): AmbientLayer {
  return {
    id: 'creaking',
    create: (ctx, dest) => {
      // Low structural creaks using filtered oscillator
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 60;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 80;
      filter.Q.value = 10;

      const gain = ctx.createGain();
      gain.gain.value = 0;

      // Schedule intermittent creaks
      const scheduleCreaks = () => {
        const now = ctx.currentTime;
        for (let i = 0; i < 10; i++) {
          const t = now + 4 + Math.random() * 25;
          const baseFreq = 40 + Math.random() * 40;
          osc.frequency.setValueAtTime(baseFreq, t);
          osc.frequency.linearRampToValueAtTime(baseFreq * 1.3, t + 0.3);
          osc.frequency.linearRampToValueAtTime(baseFreq * 0.8, t + 0.6);
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.03, t + 0.1);
          gain.gain.linearRampToValueAtTime(0, t + 0.8);
        }
      };

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      return {
        start: () => { osc.start(); scheduleCreaks(); },
        stop: async (fadeMs = 2000) => {
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeMs / 1000);
          await new Promise(r => setTimeout(r, fadeMs));
          try { osc.stop(); } catch {}
        },
        setVolume: () => {},
      };
    },
  };
}

function spaceLayer(): AmbientLayer {
  return {
    id: 'space',
    create: (ctx, dest) => {
      // Deep sub-bass drone
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 40;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 5;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const gain = ctx.createGain();
      gain.gain.value = 0.04;

      osc.connect(gain);
      gain.connect(dest);

      return {
        start: () => { osc.start(); lfo.start(); },
        stop: async (fadeMs = 3000) => {
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeMs / 1000);
          await new Promise(r => setTimeout(r, fadeMs));
          try { osc.stop(); lfo.stop(); } catch {}
        },
        setVolume: (v) => { gain.gain.value = v * 0.04; },
      };
    },
  };
}

// ── Environment Profiles ────────────────────────────────────────

const AMBIENT_PROFILES: Partial<Record<EnvironmentTag, AmbientProfile>> = {
  forest: { layers: [forestLayer(), windLayer(0.04, 300)] },
  desert: { layers: [windLayer(0.12, 500)] },
  storm: { layers: [stormLayer(), windLayer(0.15, 600)] },
  blizzard: { layers: [windLayer(0.18, 350), stormLayer()] },
  underwater: { layers: [underwaterLayer()] },
  sky: { layers: [windLayer(0.2, 800)] },
  space: { layers: [spaceLayer()] },
  lava: { layers: [lavaLayer()] },
  inferno: { layers: [lavaLayer(), explosionsLayer()] },
  crystal: { layers: [cavernLayer()] },
  underground: { layers: [cavernLayer(), windLayer(0.03, 180)] },
  ruins: { layers: [windLayer(0.05, 250), creakingLayer()] },
  cyberpunk: { layers: [cityLayer()] },
  mech: { layers: [cityLayer(), creakingLayer()] },
  void: { layers: [spaceLayer()] },
  haunted: { layers: [windLayer(0.03, 200)] },
  emergency: { layers: [explosionsLayer(), creakingLayer()] },
  wind: { layers: [windLayer(0.1, 500)] },
  rain: { layers: [stormLayer()] },
  tremor: { layers: [creakingLayer()] },
  // Ship / nautical — hull creaks + wind + subtle water-like rumble
  ship: { layers: [creakingLayer(), windLayer(0.06, 280), underwaterLayer()] },
  // Indoor / structural environments
  office: { layers: [cityLayer()] },
  library: { layers: [windLayer(0.02, 150)] },
  prison: { layers: [creakingLayer(), windLayer(0.03, 200)] },
  hospital: { layers: [cityLayer()] },
  laboratory: { layers: [cityLayer(), creakingLayer()] },
  tower: { layers: [windLayer(0.12, 600)] },
  corridor: { layers: [windLayer(0.03, 180), creakingLayer()] },
  rooftop: { layers: [windLayer(0.15, 700)] },
  lobby: { layers: [cityLayer()] },
  // Additional environment types
  toxic: { layers: [cavernLayer(), windLayer(0.04, 250)] },
  radiation: { layers: [spaceLayer(), creakingLayer()] },
  celestial: { layers: [spaceLayer(), windLayer(0.03, 400)] },
  bloodmoon: { layers: [windLayer(0.06, 300)] },
  urban: { layers: [cityLayer()] },
};

// ── Engine ──────────────────────────────────────────────────────

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeLayers: AmbientLayerInstance[] = [];
  private activeProfile: string = '';
  private _volume = 0.5;
  private _muted = false;
  private _unlocked = false;

  get muted() { return this._muted; }
  get volume() { return this._volume; }
  get unlocked() { return this._unlocked; }

  async unlock(): Promise<void> {
    if (this._unlocked) return;
    const ctx = this.getOrCreateContext();
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch { return; }
    }
    // Silent buffer to unlock iOS
    try {
      const b = ctx.createBuffer(1, 1, ctx.sampleRate);
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.connect(ctx.destination);
      s.start(0);
      s.stop(0.001);
    } catch {}
    this._unlocked = true;
  }

  private getOrCreateContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._muted ? 0 : this._volume;
      this.masterGain.connect(this.ctx.destination);
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

  /**
   * Transition to a new ambient soundscape based on environment tags.
   * Fades out old layers and fades in new ones.
   */
  async setEnvironment(tags: EnvironmentTag[]): Promise<void> {
    if (!this._unlocked || this._muted) return;

    // Build profile key from relevant tags
    const relevantTags = tags.filter(t => AMBIENT_PROFILES[t]);
    const profileKey = relevantTags.sort().join('+') || 'none';

    // Skip if same environment
    if (profileKey === this.activeProfile) return;
    this.activeProfile = profileKey;

    // Fade out existing layers
    const stopPromises = this.activeLayers.map(l => l.stop(2000));
    this.activeLayers = [];
    await Promise.allSettled(stopPromises);

    if (relevantTags.length === 0) return;

    const ctx = this.getOrCreateContext();
    if (!this.masterGain) return;

    // Collect unique layers (deduplicate by id)
    const seenIds = new Set<string>();
    const layerDefs: AmbientLayer[] = [];
    for (const tag of relevantTags) {
      const profile = AMBIENT_PROFILES[tag];
      if (!profile) continue;
      for (const layer of profile.layers) {
        if (!seenIds.has(layer.id)) {
          seenIds.add(layer.id);
          layerDefs.push(layer);
        }
      }
    }

    // Limit to 3 simultaneous layers for performance
    const selectedLayers = layerDefs.slice(0, 3);

    for (const def of selectedLayers) {
      try {
        const instance = def.create(ctx, this.masterGain);
        instance.start();
        this.activeLayers.push(instance);
      } catch (err) {
        console.warn('[Ambient] Failed to create layer:', def.id, err);
      }
    }
  }

  /** Stop all ambient sounds */
  async stop(): Promise<void> {
    const stops = this.activeLayers.map(l => l.stop(1000));
    this.activeLayers = [];
    this.activeProfile = '';
    await Promise.allSettled(stops);
  }

  dispose() {
    this.stop();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    this.ctx = null;
    this.masterGain = null;
    this._unlocked = false;
  }
}

// ── Singleton ───────────────────────────────────────────────────

let instance: AmbientSoundEngine | null = null;

export function getAmbientSoundEngine(): AmbientSoundEngine {
  if (!instance) instance = new AmbientSoundEngine();
  return instance;
}

export { AmbientSoundEngine };
