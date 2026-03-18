export {
  NarrationController,
  getNarrationController,
  type NarrationState,
  type NarrationSnapshot,
  type NarrationSnapshotCallback,
  type NarrationStateCallback,
  type HighlightChangeCallback,
} from './NarrationController';
export { SpeechManager, type NarratorSceneContext, type SpeechBoundaryEvent } from './SpeechManager';
export { NarrationHighlightManager } from './NarrationHighlightManager';
export { NarrationSoundTriggerSystem } from './NarrationSoundTriggerSystem';
export { TapToNarrateManager } from './TapToNarrateManager';
