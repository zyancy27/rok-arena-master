import { classifySceneIntensity, parseNarrationForSounds, type SceneIntensity } from '@/lib/audio/narration-sound-parser';
import { getNarrationSoundManager } from '@/lib/audio/narration-sound-manager';
import type { AmbientIntensityLevel } from '@/lib/audio/narration-sound-rules';
import type { SoundCue } from '@/lib/audio/narration-sound-cues';

export interface NarrationSoundCheckpoint {
  id: string;
  phrase: string;
  triggerIndex: number;
  soundType: string;
  volume: number;
  persistent: boolean;
  cooldownMs: number;
  triggered: boolean;
  confidence: number;
}

interface InternalCheckpoint extends NarrationSoundCheckpoint {
  cue: SoundCue;
}

export type SoundCheckpointCallback = (checkpoint: NarrationSoundCheckpoint) => void;

function extractPhraseWindow(text: string, offset: number) {
  const boundedOffset = Math.max(0, Math.min(offset, text.length));
  const before = text.slice(0, boundedOffset);
  const after = text.slice(boundedOffset);

  const sentenceStart = Math.max(
    before.lastIndexOf('.'),
    before.lastIndexOf('!'),
    before.lastIndexOf('?'),
    before.lastIndexOf('\n'),
  );
  const sentenceEndCandidates = [after.indexOf('.'), after.indexOf('!'), after.indexOf('?'), after.indexOf('\n')]
    .filter(index => index >= 0);
  const sentenceEnd = sentenceEndCandidates.length > 0
    ? boundedOffset + Math.min(...sentenceEndCandidates) + 1
    : text.length;

  return text.slice(sentenceStart + 1, sentenceEnd).trim();
}

export class NarrationSoundSync {
  private checkpoints: InternalCheckpoint[] = [];
  private readonly callbacks: SoundCheckpointCallback[] = [];
  private readonly manager = getNarrationSoundManager();
  private sceneIntensity: SceneIntensity = 'quiet';

  configure(options: {
    enabled: boolean;
    intensityLevel: AmbientIntensityLevel;
    masterVolume: number;
    reduceVocalSounds: boolean;
  }) {
    this.manager.setEnabled(options.enabled);
    this.manager.setIntensityLevel(options.intensityLevel);
    this.manager.setMasterVolume(options.masterVolume);
    this.manager.setReduceVocalSounds(options.reduceVocalSounds);
  }

  onCheckpointTriggered(callback: SoundCheckpointCallback) {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index >= 0) this.callbacks.splice(index, 1);
    };
  }

  prepare(text: string, startCharIndex = 0) {
    this.sceneIntensity = classifySceneIntensity(text);
    this.checkpoints = parseNarrationForSounds(text).map((event, index) => ({
      id: `${event.cue.id}-${event.textOffset}-${index}`,
      phrase: extractPhraseWindow(text, event.textOffset),
      triggerIndex: event.textOffset,
      soundType: event.cue.family,
      volume: event.cue.volumeCeiling,
      persistent: event.cue.category === 'persistent',
      cooldownMs: event.cue.cooldownMs,
      triggered: event.textOffset < startCharIndex,
      confidence: event.confidence,
      cue: event.cue,
    }));
  }

  updateFromCharIndex(charIndex: number) {
    for (const checkpoint of this.checkpoints) {
      if (checkpoint.triggered) continue;
      if (charIndex < checkpoint.triggerIndex) break;

      checkpoint.triggered = true;
      this.manager.playCueFromNarration(checkpoint.cue, this.sceneIntensity);
      this.emit(checkpoint);
    }
  }

  getCheckpoints(): NarrationSoundCheckpoint[] {
    return this.checkpoints.map(({ cue: _cue, ...checkpoint }) => ({ ...checkpoint }));
  }

  setNarratorSpeaking(speaking: boolean) {
    this.manager.setNarratorSpeaking(speaking);
  }

  reset() {
    this.checkpoints = [];
  }

  stopAll() {
    this.manager.stopAll();
    this.reset();
  }

  onSceneChange() {
    this.manager.onSceneChange();
    this.reset();
  }

  private emit(checkpoint: InternalCheckpoint) {
    const { cue: _cue, ...payload } = checkpoint;
    for (const callback of this.callbacks) callback({ ...payload });
  }
}
