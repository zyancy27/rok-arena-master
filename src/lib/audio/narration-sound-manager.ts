/**
 * Narration Sound Manager — orchestrates dynamic ambient sounds
 * triggered by narrator text. Singleton per session.
 */

import { parseNarrationForSounds, classifySceneIntensity, type ParsedSoundEvent, type SceneIntensity } from './narration-sound-parser';
import { getMixingRules, type AmbientIntensityLevel, type MixingRules } from './narration-sound-rules';
import type { SoundCue } from './narration-sound-cues';

interface ActiveLayer {
  cue: SoundCue;
  audio: HTMLAudioElement;
  startedAt: number;
  /** For moment sounds, when to start fading */
  fadeOutAt?: number;
}

interface CooldownEntry {
  cueId: string;
  expiresAt: number;
}

class NarrationSoundManager {
  private persistentLayers: ActiveLayer[] = [];
  private momentLayers: ActiveLayer[] = [];
  private cooldowns: CooldownEntry[] = [];
  private audioCache = new Map<string, string>(); // cueId → blob URL
  private lastMomentTriggerAt = 0;
  private intensityLevel: AmbientIntensityLevel = 'standard';
  private masterVolume = 0.5;
  private sceneContext: string[] = []; // active cue IDs for context memory
  private enabled = true;
  private fetchingCues = new Set<string>();

  setEnabled(val: boolean) {
    this.enabled = val;
    if (!val) this.stopAll();
  }

  setIntensityLevel(level: AmbientIntensityLevel) {
    this.intensityLevel = level;
    if (level === 'off') this.stopAll();
  }

  setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    // Update all active layers
    this.updateActiveVolumes();
  }

  /**
   * Primary entry point: called when a narrator message is rendered.
   */
  processNarration(text: string) {
    if (!this.enabled || this.intensityLevel === 'off') return;

    const events = parseNarrationForSounds(text);
    const intensity = classifySceneIntensity(text);
    const rules = getMixingRules(intensity, this.intensityLevel);

    // Clean expired cooldowns
    const now = Date.now();
    this.cooldowns = this.cooldowns.filter(c => c.expiresAt > now);

    // Separate persistent vs moment
    const persistentEvents = events.filter(e => e.cue.category === 'persistent');
    const momentEvents = events.filter(e => e.cue.category === 'moment');

    // Handle persistent layers
    this.updatePersistentLayers(persistentEvents, rules, intensity);

    // Handle moment sounds with staggered delays
    this.scheduleMomentSounds(momentEvents, rules);
  }

  /**
   * Called when the scene changes significantly (new location, mode change).
   * Crossfades all persistent layers out.
   */
  onSceneChange() {
    this.sceneContext = [];
    // Fade out all persistent layers
    for (const layer of this.persistentLayers) {
      this.fadeOutAndRemove(layer, layer.cue.fadeOutMs);
    }
    this.persistentLayers = [];
  }

  stopAll() {
    for (const layer of [...this.persistentLayers, ...this.momentLayers]) {
      try {
        layer.audio.pause();
        layer.audio.volume = 0;
      } catch { }
    }
    this.persistentLayers = [];
    this.momentLayers = [];
  }

  dispose() {
    this.stopAll();
    for (const url of this.audioCache.values()) {
      URL.revokeObjectURL(url);
    }
    this.audioCache.clear();
  }

  // ── Private Methods ──

  private updatePersistentLayers(events: ParsedSoundEvent[], rules: MixingRules, intensity: SceneIntensity) {
    const activeCueIds = new Set(this.persistentLayers.map(l => l.cue.id));
    const wantedCueIds = new Set(events.map(e => e.cue.id));

    // Remove persistent layers no longer in narration context AND not in recent scene context
    for (const layer of [...this.persistentLayers]) {
      if (!wantedCueIds.has(layer.cue.id) && !this.sceneContext.includes(layer.cue.id)) {
        this.fadeOutAndRemove(layer, layer.cue.fadeOutMs);
        this.persistentLayers = this.persistentLayers.filter(l => l !== layer);
      }
    }

    // Add new persistent layers (up to cap)
    for (const event of events) {
      if (activeCueIds.has(event.cue.id)) continue;
      if (this.isOnCooldown(event.cue.id)) continue;
      if (this.persistentLayers.length >= rules.maxPersistentLayers) break;

      this.triggerCue(event.cue, rules, true);
      // Add to scene context memory
      if (!this.sceneContext.includes(event.cue.id)) {
        this.sceneContext.push(event.cue.id);
        // Keep context to last 6 cues
        if (this.sceneContext.length > 6) this.sceneContext.shift();
      }
    }
  }

  private scheduleMomentSounds(events: ParsedSoundEvent[], rules: MixingRules) {
    const now = Date.now();
    let delay = 0;

    // Active moment count check
    const activeMoments = this.momentLayers.length;

    for (const event of events) {
      if (activeMoments + delay / 1500 >= rules.maxMomentSounds) break;
      if (this.isOnCooldown(event.cue.id)) continue;
      if (now - this.lastMomentTriggerAt < rules.momentCooldownMs && delay === 0) {
        delay = rules.momentCooldownMs;
      }

      const triggerDelay = delay + 500 + Math.random() * 1000; // slight randomness
      setTimeout(() => {
        if (!this.enabled) return;
        this.triggerCue(event.cue, rules, false);
      }, triggerDelay);

      delay += 2000; // stagger
      this.setCooldown(event.cue.id, event.cue.cooldownMs);
    }
  }

  private async triggerCue(cue: SoundCue, rules: MixingRules, persistent: boolean) {
    // Prevent duplicate fetches
    if (this.fetchingCues.has(cue.id)) return;

    let audioUrl = this.audioCache.get(cue.id);

    if (!audioUrl) {
      this.fetchingCues.add(cue.id);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/narrator-ambient-sfx`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              mode: 'narration_cue',
              prompt: cue.prompt,
              duration: cue.duration,
            }),
          }
        );

        if (!response.ok) {
          this.fetchingCues.delete(cue.id);
          return;
        }

        const blob = await response.blob();
        audioUrl = URL.createObjectURL(blob);
        this.audioCache.set(cue.id, audioUrl);

        // Limit cache size
        if (this.audioCache.size > 30) {
          const firstKey = this.audioCache.keys().next().value;
          if (firstKey) {
            const oldUrl = this.audioCache.get(firstKey);
            if (oldUrl) URL.revokeObjectURL(oldUrl);
            this.audioCache.delete(firstKey);
          }
        }
      } catch {
        this.fetchingCues.delete(cue.id);
        return;
      }
      this.fetchingCues.delete(cue.id);
    }

    // Verify still enabled after async fetch
    if (!this.enabled || this.intensityLevel === 'off') return;

    const audio = new Audio(audioUrl);
    const targetVol = cue.volumeCeiling * rules.globalVolumeMultiplier * this.masterVolume;
    audio.volume = 0;
    audio.loop = persistent;

    const layer: ActiveLayer = {
      cue,
      audio,
      startedAt: Date.now(),
      fadeOutAt: persistent ? undefined : Date.now() + (cue.momentDurationMs || 3000),
    };

    if (persistent) {
      this.persistentLayers.push(layer);
    } else {
      this.momentLayers.push(layer);
      this.lastMomentTriggerAt = Date.now();
    }

    try {
      await audio.play();
      this.fadeIn(audio, targetVol, cue.fadeInMs);

      if (!persistent) {
        // Schedule fade out for moment sounds
        const momentDur = cue.momentDurationMs || 3000;
        setTimeout(() => {
          this.fadeOutAndRemove(layer, cue.fadeOutMs);
          this.momentLayers = this.momentLayers.filter(l => l !== layer);
        }, momentDur);
      }

      // Randomize playback rate slightly for persistent
      if (persistent) {
        audio.playbackRate = 0.96 + Math.random() * 0.08;
        audio.addEventListener('seeked', () => {
          audio.playbackRate = 0.94 + Math.random() * 0.12;
          // Subtle volume drift
          audio.volume = targetVol * (0.85 + Math.random() * 0.3);
        });
      }
    } catch {
      // Autoplay blocked
      if (persistent) {
        this.persistentLayers = this.persistentLayers.filter(l => l !== layer);
      } else {
        this.momentLayers = this.momentLayers.filter(l => l !== layer);
      }
    }
  }

  private fadeIn(audio: HTMLAudioElement, targetVol: number, durationMs: number) {
    const steps = Math.ceil(durationMs / 50);
    const increment = targetVol / steps;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      audio.volume = Math.min(targetVol, increment * step);
      if (step >= steps) {
        audio.volume = targetVol;
        clearInterval(interval);
      }
    }, 50);
  }

  private fadeOutAndRemove(layer: ActiveLayer, durationMs: number) {
    const audio = layer.audio;
    const startVol = audio.volume;
    const steps = Math.ceil(durationMs / 50);
    const decrement = startVol / steps;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      audio.volume = Math.max(0, startVol - decrement * step);
      if (step >= steps) {
        clearInterval(interval);
        audio.pause();
        audio.volume = 0;
      }
    }, 50);
  }

  private updateActiveVolumes() {
    const rules = getMixingRules('quiet', this.intensityLevel);
    for (const layer of [...this.persistentLayers, ...this.momentLayers]) {
      const targetVol = layer.cue.volumeCeiling * rules.globalVolumeMultiplier * this.masterVolume;
      // Smoothly adjust
      if (Math.abs(layer.audio.volume - targetVol) > 0.02) {
        layer.audio.volume = targetVol;
      }
    }
  }

  private isOnCooldown(cueId: string): boolean {
    return this.cooldowns.some(c => c.cueId === cueId && c.expiresAt > Date.now());
  }

  private setCooldown(cueId: string, durationMs: number) {
    this.cooldowns.push({ cueId, expiresAt: Date.now() + durationMs });
  }
}

// Singleton
let _instance: NarrationSoundManager | null = null;

export function getNarrationSoundManager(): NarrationSoundManager {
  if (!_instance) {
    _instance = new NarrationSoundManager();
  }
  return _instance;
}
