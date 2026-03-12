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
   * Now only used for tracking speech progress — actual sound triggering
   * is handled by processNarration called with the full text at narration start.
   */
  updateFromCharIndex(charIndex: number) {
    // Sound triggers are now handled by NarrationSoundManager.processNarration()
    // called from NarrationController.narrate() with the full text.
    // This method is kept for potential future per-word synchronization.
    for (const trigger of this.pending) {
      if (trigger.fired) continue;
      if (charIndex < trigger.charIndex) break;
      trigger.fired = true;
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
