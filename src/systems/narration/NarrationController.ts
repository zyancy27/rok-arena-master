/**
 * NarrationController — central orchestrator for:
 *  • TTS playback (SpeechManager)
 *  • Sentence highlighting (NarrationHighlightManager)
 *  • Ambient/accent sound triggers (NarrationSoundTriggerSystem)
 *  • Tap-to-narrate (TapToNarrateManager)
 *
 * All systems synchronize to the speech boundary events,
 * ensuring highlighting and sounds are tied to voice progress.
 */

import { SpeechManager, type NarratorSceneContext } from './SpeechManager';
import { NarrationHighlightManager } from './NarrationHighlightManager';
import { NarrationSoundTriggerSystem } from './NarrationSoundTriggerSystem';
import { TapToNarrateManager } from './TapToNarrateManager';
import { getNarrationSoundManager } from '@/lib/audio/narration-sound-manager';
import type { AmbientIntensityLevel } from '@/lib/audio/narration-sound-rules';

export type NarrationState = 'idle' | 'playing' | 'paused';

export type NarrationStateCallback = (state: NarrationState) => void;
export type HighlightChangeCallback = (sentenceIndex: number, messageId: string | null) => void;

export class NarrationController {
  readonly speech: SpeechManager;
  readonly highlight: NarrationHighlightManager;
  readonly soundTrigger: NarrationSoundTriggerSystem;
  readonly tapManager: TapToNarrateManager;

  private state: NarrationState = 'idle';
  private activeMessageId: string | null = null;
  private fullText = '';
  private stateCallbacks: NarrationStateCallback[] = [];
  private highlightCallbacks: HighlightChangeCallback[] = [];
  private unsubBoundary: (() => void) | null = null;
  private unsubState: (() => void) | null = null;

  constructor() {
    this.speech = new SpeechManager();
    this.highlight = new NarrationHighlightManager();
    this.soundTrigger = new NarrationSoundTriggerSystem();
    this.tapManager = new TapToNarrateManager();

    // Wire speech boundary events to highlight + sound trigger
    this.unsubBoundary = this.speech.onBoundary((ev) => {
      this.highlight.updateFromCharIndex(ev.charIndex);
      this.soundTrigger.updateFromCharIndex(ev.charIndex);
    });

    // Wire speech state changes
    this.unsubState = this.speech.onStateChange((s) => {
      const ambientMgr = getNarrationSoundManager();
      if (s === 'stopped') {
        this.highlight.reset();
        this.soundTrigger.setNarratorSpeaking(false);
        ambientMgr.setNarratorSpeaking(false);
        this.setState('idle');
        this.activeMessageId = null;
      } else if (s === 'paused') {
        this.setState('paused');
      } else if (s === 'playing') {
        this.soundTrigger.setNarratorSpeaking(true);
        ambientMgr.setNarratorSpeaking(true);
        this.setState('playing');
      }
    });

    // Wire highlight changes to external callbacks
    this.highlight.onChange((idx) => {
      for (const cb of this.highlightCallbacks) cb(idx, this.activeMessageId);
    });
  }

  onStateChange(cb: NarrationStateCallback) {
    this.stateCallbacks.push(cb);
    return () => { this.stateCallbacks = this.stateCallbacks.filter(c => c !== cb); };
  }

  onHighlightChange(cb: HighlightChangeCallback) {
    this.highlightCallbacks.push(cb);
    return () => { this.highlightCallbacks = this.highlightCallbacks.filter(c => c !== cb); };
  }

  getState(): NarrationState { return this.state; }
  getActiveMessageId(): string | null { return this.activeMessageId; }

  /**
   * Configure the narration-triggered ambient sound system.
   * Call this when user settings change.
   */
  configureAmbientSounds(opts: {
    enabled: boolean;
    intensityLevel: AmbientIntensityLevel;
    masterVolume: number;
    reduceVocalSounds: boolean;
  }) {
    const mgr = getNarrationSoundManager();
    mgr.setEnabled(opts.enabled);
    mgr.setIntensityLevel(opts.intensityLevel);
    mgr.setMasterVolume(opts.masterVolume);
    mgr.setReduceVocalSounds(opts.reduceVocalSounds);
  }

  /**
   * Start narrating a text. Cancels any existing narration first.
   */
  async narrate(
    text: string,
    messageId: string,
    context?: NarratorSceneContext,
    startFromSentence = 0,
  ): Promise<void> {
    // Always cancel previous speech first — prevents overlapping voices
    this.stop();

    this.fullText = text;
    this.activeMessageId = messageId;

    // Prepare subsystems
    this.highlight.prepare(text);
    
    // Compute character offset for the starting sentence
    const startCharIndex = startFromSentence > 0
      ? this.highlight.getCharIndexForSentence(startFromSentence)
      : 0;

    // Prepare sound triggers only for text from the start point
    this.soundTrigger.prepare(text);

    // Set initial highlight
    if (startFromSentence > 0) {
      this.highlight.updateFromCharIndex(startCharIndex);
    }

    this.setState('playing');

    // Fire speech (async — completes when audio ends or errors)
    const success = await this.speech.speak(text, startCharIndex, context);

    if (!success && this.state === 'playing') {
      this.stop();
    }
  }

  /** Handle tap-to-narrate: restart from tapped sentence */
  async narrateFromSentence(
    text: string,
    messageId: string,
    sentenceIndex: number,
    context?: NarratorSceneContext,
  ): Promise<void> {
    if (!this.tapManager.isEnabled()) return;
    await this.narrate(text, messageId, context, sentenceIndex);
  }

  stop() {
    this.speech.cancelAll();
    this.highlight.reset();
    this.soundTrigger.reset();
    this.soundTrigger.setNarratorSpeaking(false);
    getNarrationSoundManager().setNarratorSpeaking(false);
    this.activeMessageId = null;
    this.fullText = '';
    this.setState('idle');
  }

  pause() {
    this.speech.pause();
  }

  resume() {
    this.speech.resume();
  }

  togglePause() {
    if (this.state === 'paused') this.resume();
    else if (this.state === 'playing') this.pause();
  }

  /** Update volumes */
  setVoiceVolume(vol: number) {
    this.speech.setVolume(vol);
  }

  setSoundVolume(vol: number) {
    this.soundTrigger.setVolume(vol);
  }

  setTapToNarrateEnabled(val: boolean) {
    this.tapManager.setEnabled(val);
  }

  dispose() {
    this.stop();
    this.unsubBoundary?.();
    this.unsubState?.();
    this.speech.dispose();
    this.stateCallbacks = [];
    this.highlightCallbacks = [];
  }

  private setState(s: NarrationState) {
    if (s === this.state) return;
    this.state = s;
    for (const cb of this.stateCallbacks) cb(s);
  }
}

// Singleton
let _controller: NarrationController | null = null;

export function getNarrationController(): NarrationController {
  if (!_controller) {
    _controller = new NarrationController();
  }
  return _controller;
}
