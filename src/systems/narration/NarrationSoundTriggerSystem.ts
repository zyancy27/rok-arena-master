/**
 * NarrationSoundTriggerSystem — triggers ambient/accent sounds
 * synchronized to narrator speech progress, NOT text rendering.
 *
 * Extends the existing narration-sound-parser & manager — does NOT replace them.
 */

import { parseNarrationForSounds, classifySceneIntensity, type ParsedSoundEvent } from '@/lib/audio/narration-sound-parser';
import { getNarrationSoundManager } from '@/lib/audio/narration-sound-manager';

interface PendingTrigger {
  event: ParsedSoundEvent;
  /** Character index in text where this cue should fire */
  charIndex: number;
  fired: boolean;
}

export class NarrationSoundTriggerSystem {
  private pending: PendingTrigger[] = [];
  private ambientManager = getNarrationSoundManager();
  private currentText = '';
  private volume = 0.5;
  /** Max simultaneous accent sounds on mobile */
  private maxConcurrent = 3;
  private activeSounds = 0;
  private lastTriggerAt = 0;
  private throttleMs = 2000;

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.ambientManager.setMasterVolume(vol);
  }

  setNarratorSpeaking(speaking: boolean) {
    this.ambientManager.setNarratorSpeaking(speaking);
  }

  /**
   * Parse text and prepare trigger points.
   * Does NOT fire any sounds yet — that happens via updateFromCharIndex.
   */
  prepare(text: string) {
    this.currentText = text;
    this.pending = [];

    const events = parseNarrationForSounds(text);

    for (const event of events) {
      this.pending.push({
        event,
        charIndex: event.textOffset,
        fired: false,
      });
    }

    // Sort by character position
    this.pending.sort((a, b) => a.charIndex - b.charIndex);
  }

  /**
   * Called by the controller when speech progresses.
   * Fires any pending triggers whose charIndex has been passed.
   */
  updateFromCharIndex(charIndex: number) {
    const now = Date.now();

    for (const trigger of this.pending) {
      if (trigger.fired) continue;
      if (charIndex < trigger.charIndex) break; // sorted, so stop early

      // Throttle: prevent too many sounds stacking
      if (now - this.lastTriggerAt < this.throttleMs && this.activeSounds >= this.maxConcurrent) continue;

      trigger.fired = true;
      this.lastTriggerAt = now;
      this.activeSounds++;

      // Let the existing manager handle the actual audio fetch & playback
      // We call processNarration with just the relevant phrase so it triggers the right cue
      const phraseEnd = Math.min(trigger.charIndex + 80, this.currentText.length);
      const phrase = this.currentText.slice(trigger.charIndex, phraseEnd);
      
      // Use the ambient manager's processNarration for the cue at this offset
      // but only the segment around this trigger
      this.ambientManager.processNarration(phrase);

      // Track completion (approximate)
      setTimeout(() => { this.activeSounds = Math.max(0, this.activeSounds - 1); }, 4000);
    }
  }

  /** Reset all triggers (e.g. when narration stops or restarts) */
  reset() {
    this.pending = [];
    this.currentText = '';
    this.activeSounds = 0;
  }

  /** Stop all ambient sounds */
  stopAll() {
    this.ambientManager.stopAll();
    this.reset();
  }

  onSceneChange() {
    this.ambientManager.onSceneChange();
    this.reset();
  }
}
