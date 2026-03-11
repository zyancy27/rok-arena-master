/**
 * Narration Sound Rules — volume, density, cooldowns, and mixing.
 */

import type { SceneIntensity } from './narration-sound-parser';

export type AmbientIntensityLevel = 'off' | 'low' | 'standard' | 'immersive';

export interface MixingRules {
  /** Maximum simultaneous persistent layers */
  maxPersistentLayers: number;
  /** Maximum simultaneous moment sounds */
  maxMomentSounds: number;
  /** Global volume multiplier (applied on top of cue-level ceilings) */
  globalVolumeMultiplier: number;
  /** Minimum ms between any two moment sound triggers */
  momentCooldownMs: number;
}

export function getMixingRules(
  intensity: SceneIntensity,
  level: AmbientIntensityLevel,
): MixingRules {
  if (level === 'off') {
    return { maxPersistentLayers: 0, maxMomentSounds: 0, globalVolumeMultiplier: 0, momentCooldownMs: Infinity };
  }

  const base: Record<AmbientIntensityLevel, { vol: number; persist: number; moment: number }> = {
    off: { vol: 0, persist: 0, moment: 0 },
    low: { vol: 0.4, persist: 1, moment: 1 },
    standard: { vol: 0.7, persist: 2, moment: 2 },
    immersive: { vol: 1.0, persist: 3, moment: 3 },
  };

  const b = base[level];

  const intensityMod: Record<SceneIntensity, { volBoost: number; persistBoost: number; cooldown: number }> = {
    quiet: { volBoost: 0, persistBoost: 0, cooldown: 6000 },
    tense: { volBoost: 0.05, persistBoost: 1, cooldown: 4000 },
    combat: { volBoost: 0.1, persistBoost: 1, cooldown: 3000 },
  };

  const im = intensityMod[intensity];

  return {
    maxPersistentLayers: Math.min(b.persist + im.persistBoost, 4),
    maxMomentSounds: Math.min(b.moment + (intensity === 'combat' ? 1 : 0), 3),
    globalVolumeMultiplier: Math.min(b.vol + im.volBoost, 1.0),
    momentCooldownMs: im.cooldown,
  };
}
