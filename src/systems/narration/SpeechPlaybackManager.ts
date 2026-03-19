import { SpeechManager, type BoundaryCallback, type NarrationVoiceSettings, type NarratorSceneContext, type StateCallback } from './SpeechManager';

export class SpeechPlaybackManager {
  private readonly speech = new SpeechManager();

  setVolume(volume: number) {
    this.speech.setVolume(volume);
  }

  onBoundary(callback: BoundaryCallback) {
    return this.speech.onBoundary(callback);
  }

  onStateChange(callback: StateCallback) {
    return this.speech.onStateChange(callback);
  }

  speak(text: string, startCharIndex = 0, context?: NarratorSceneContext, voiceSettings?: NarrationVoiceSettings) {
    return this.speech.speak(text, startCharIndex, context, voiceSettings);
  }

  cancelAll() {
    this.speech.cancelAll();
  }

  pause() {
    this.speech.pause();
  }

  resume() {
    this.speech.resume();
  }

  getProgress() {
    return this.speech.getProgress();
  }

  getCurrentCharIndex() {
    return this.speech.getCurrentCharIndex();
  }

  get isPlaying() {
    return this.speech.isPlaying;
  }

  get isPaused() {
    return this.speech.isPaused;
  }

  dispose() {
    this.speech.dispose();
  }
}
