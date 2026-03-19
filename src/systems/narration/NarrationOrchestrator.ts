import { NarrationHighlightManager, type NarrationHighlightRange } from './NarrationHighlightManager';
import { NarrationSoundSync, type NarrationSoundCheckpoint } from './NarrationSoundSync';
import { SpeechPlaybackManager } from './SpeechPlaybackManager';
import { TapToNarrateController } from './TapToNarrateController';
import type { NarrationVoiceSettings, NarratorSceneContext } from './SpeechManager';
import type { AmbientIntensityLevel } from '@/lib/audio/narration-sound-rules';

export type NarrationPlaybackState = 'idle' | 'starting' | 'playing' | 'paused' | 'stopping' | 'finished';
export type NarrationState = NarrationPlaybackState;
export type RestartOrigin = 'initial' | 'tap' | 'replay';

export interface NarrationSnapshot {
  messageId: string | null;
  state: NarrationPlaybackState;
  charIndex: number;
  currentPhrase: string | null;
  highlightRange: NarrationHighlightRange | null;
  restartOrigin: RestartOrigin | null;
  triggeredCheckpointIds: string[];
}

export type NarrationSnapshotCallback = (snapshot: NarrationSnapshot) => void;
export type NarrationStateCallback = (state: NarrationPlaybackState) => void;
export type HighlightChangeCallback = (sentenceIndex: number, messageId: string | null, range?: NarrationHighlightRange | null) => void;

export class NarrationOrchestrator {
  readonly speech = new SpeechPlaybackManager();
  readonly highlight = new NarrationHighlightManager();
  readonly soundSync = new NarrationSoundSync();
  readonly tapController = new TapToNarrateController();

  private snapshot: NarrationSnapshot = {
    messageId: null,
    state: 'idle',
    charIndex: 0,
    currentPhrase: null,
    highlightRange: null,
    restartOrigin: null,
    triggeredCheckpointIds: [],
  };

  private highlightEnabled = true;
  private debugEnabled = false;
  private manuallyResetting = false;
  private ambientConfig = {
    enabled: true,
    intensityLevel: 'standard' as AmbientIntensityLevel,
    masterVolume: 0.5,
    reduceVocalSounds: false,
  };
  private snapshotCallbacks: NarrationSnapshotCallback[] = [];
  private stateCallbacks: NarrationStateCallback[] = [];
  private highlightCallbacks: HighlightChangeCallback[] = [];

  constructor() {
    this.speech.onBoundary((event) => {
      this.snapshot.charIndex = event.charIndex;
      const activeRange = this.highlight.updateFromCharIndex(event.charIndex);
      this.snapshot.highlightRange = this.highlightEnabled ? activeRange : null;
      this.snapshot.currentPhrase = activeRange?.text ?? null;
      this.soundSync.updateFromCharIndex(event.charIndex);
      this.debug('boundary');
      this.emitSnapshot();
    });

    this.speech.onStateChange((state) => {
      if (state === 'playing') {
        this.soundSync.setNarratorSpeaking(true);
        this.setState('playing');
        return;
      }

      if (state === 'paused') {
        this.setState('paused');
        return;
      }

      this.soundSync.setNarratorSpeaking(false);

      if (this.manuallyResetting) return;

      if (this.snapshot.state === 'starting' || this.snapshot.state === 'playing' || this.snapshot.state === 'paused') {
        this.highlight.reset();
        this.snapshot.highlightRange = null;
        this.snapshot.currentPhrase = null;
        this.snapshot.messageId = null;
        this.snapshot.charIndex = 0;
        this.setState('finished');
        return;
      }

      this.setState('idle');
    });

    this.highlight.onChange((range) => {
      this.snapshot.highlightRange = this.highlightEnabled ? range : null;
      this.snapshot.currentPhrase = range?.text ?? null;
      const sentenceIndex = this.snapshot.highlightRange?.sentenceIndex ?? -1;
      for (const callback of this.highlightCallbacks) {
        callback(sentenceIndex, this.snapshot.messageId, this.snapshot.highlightRange);
      }
    });

    this.soundSync.onCheckpointTriggered((checkpoint) => {
      this.snapshot.triggeredCheckpointIds = [...new Set([...this.snapshot.triggeredCheckpointIds, checkpoint.id])];
      this.debug('checkpoint', checkpoint);
      this.emitSnapshot();
    });
  }

  configure(options: {
    voiceVolume: number;
    ambientEnabled: boolean;
    ambientIntensity: AmbientIntensityLevel;
    ambientVolume: number;
    reduceVocalSounds: boolean;
    tapToNarrateEnabled: boolean;
    askBeforeTapToNarrate: boolean;
    highlightEnabled: boolean;
    debugEnabled: boolean;
  }) {
    this.speech.setVolume(options.voiceVolume);
    this.ambientConfig = {
      enabled: options.ambientEnabled,
      intensityLevel: options.ambientIntensity,
      masterVolume: options.ambientVolume,
      reduceVocalSounds: options.reduceVocalSounds,
    };
    this.soundSync.configure(this.ambientConfig);
    this.tapController.setEnabled(options.tapToNarrateEnabled);
    this.tapController.setAskBeforeStart(options.askBeforeTapToNarrate);
    this.highlightEnabled = options.highlightEnabled;
    this.debugEnabled = options.debugEnabled;

    if (!this.highlightEnabled && this.snapshot.highlightRange) {
      this.snapshot.highlightRange = null;
      this.emitSnapshot();
    }
  }

  setVoiceVolume(volume: number) {
    this.speech.setVolume(volume);
  }

  setSoundVolume(volume: number) {
    this.ambientConfig.masterVolume = volume;
    this.soundSync.configure(this.ambientConfig);
  }

  setTapToNarrateEnabled(enabled: boolean) {
    this.tapController.setEnabled(enabled);
  }

  configureAmbientSounds(options: {
    enabled: boolean;
    intensityLevel: AmbientIntensityLevel;
    masterVolume: number;
    reduceVocalSounds: boolean;
  }) {
    this.ambientConfig = {
      enabled: options.enabled,
      intensityLevel: options.intensityLevel,
      masterVolume: options.masterVolume,
      reduceVocalSounds: options.reduceVocalSounds,
    };
    this.soundSync.configure(this.ambientConfig);
  }

  onSnapshotChange(callback: NarrationSnapshotCallback) {
    this.snapshotCallbacks.push(callback);
    callback(this.getSnapshot());
    return () => {
      this.snapshotCallbacks = this.snapshotCallbacks.filter(entry => entry !== callback);
    };
  }

  onStateChange(callback: NarrationStateCallback) {
    this.stateCallbacks.push(callback);
    callback(this.snapshot.state);
    return () => {
      this.stateCallbacks = this.stateCallbacks.filter(entry => entry !== callback);
    };
  }

  onHighlightChange(callback: HighlightChangeCallback) {
    this.highlightCallbacks.push(callback);
    callback(this.snapshot.highlightRange?.sentenceIndex ?? -1, this.snapshot.messageId, this.snapshot.highlightRange);
    return () => {
      this.highlightCallbacks = this.highlightCallbacks.filter(entry => entry !== callback);
    };
  }

  getSnapshot() {
    return {
      ...this.snapshot,
      triggeredCheckpointIds: [...this.snapshot.triggeredCheckpointIds],
      highlightRange: this.snapshot.highlightRange ? { ...this.snapshot.highlightRange } : null,
    };
  }

  getState() {
    return this.snapshot.state;
  }

  getActiveMessageId() {
    return this.snapshot.messageId;
  }

  async narrate(text: string, messageId: string, context?: NarratorSceneContext, startCharIndex = 0, restartOrigin: RestartOrigin = 'initial') {
    if (!text.trim()) return;

    this.hardReset(false);

    this.snapshot.messageId = messageId;
    this.snapshot.state = 'starting';
    this.snapshot.charIndex = startCharIndex;
    this.snapshot.currentPhrase = null;
    this.snapshot.highlightRange = null;
    this.snapshot.restartOrigin = restartOrigin;
    this.snapshot.triggeredCheckpointIds = [];

    this.highlight.prepare(text);
    this.soundSync.prepare(text, startCharIndex);

    this.debug('start');
    this.emitSnapshot();
    this.emitState();

    const success = await this.speech.speak(text, startCharIndex, context);

    if (!success && this.snapshot.state === 'starting') {
      this.hardReset();
    }
  }

  async narrateFromSentence(text: string, messageId: string, sentenceIndex: number, context?: NarratorSceneContext) {
    if (!this.tapController.isEnabled()) return;
    const target = this.tapController.resolveSentenceTarget(text, sentenceIndex);
    await this.narrate(text, messageId, context, target.charIndex, 'tap');
  }

  pause() {
    this.speech.pause();
  }

  resume() {
    this.speech.resume();
  }

  togglePause() {
    if (this.snapshot.state === 'paused') {
      this.resume();
      return;
    }

    if (this.snapshot.state === 'playing') {
      this.pause();
    }
  }

  stop() {
    this.hardReset();
  }

  onSceneChange() {
    this.hardReset();
    this.soundSync.onSceneChange();
  }

  dispose() {
    this.hardReset();
    this.speech.dispose();
    this.snapshotCallbacks = [];
    this.stateCallbacks = [];
    this.highlightCallbacks = [];
  }

  private hardReset(emitState = true) {
    this.manuallyResetting = true;
    this.snapshot.state = 'stopping';
    if (emitState) {
      this.debug('stop');
      this.emitSnapshot();
      this.emitState();
    }

    this.speech.cancelAll();
    this.soundSync.stopAll();
    this.highlight.reset();

    this.snapshot = {
      messageId: null,
      state: 'idle',
      charIndex: 0,
      currentPhrase: null,
      highlightRange: null,
      restartOrigin: null,
      triggeredCheckpointIds: [],
    };

    this.manuallyResetting = false;
    this.emitSnapshot();
    this.emitState();
  }

  private setState(state: NarrationPlaybackState) {
    if (this.snapshot.state === state) return;
    this.snapshot.state = state;
    this.debug('state');
    this.emitSnapshot();
    this.emitState();
  }

  private emitSnapshot() {
    const snapshot = this.getSnapshot();
    for (const callback of this.snapshotCallbacks) callback(snapshot);
  }

  private emitState() {
    for (const callback of this.stateCallbacks) callback(this.snapshot.state);
  }

  private debug(reason: string, checkpoint?: NarrationSoundCheckpoint) {
    if (!this.debugEnabled) return;

    console.debug('[NarrationOrchestrator]', {
      reason,
      messageId: this.snapshot.messageId,
      playbackState: this.snapshot.state,
      spokenCharIndex: this.snapshot.charIndex,
      currentPhrase: this.snapshot.currentPhrase,
      triggeredSoundCheckpoints: this.snapshot.triggeredCheckpointIds,
      restartOrigin: this.snapshot.restartOrigin,
      checkpoint,
    });
  }
}

let orchestrator: NarrationOrchestrator | null = null;

export function getNarrationOrchestrator() {
  if (!orchestrator) {
    orchestrator = new NarrationOrchestrator();
  }

  return orchestrator;
}
