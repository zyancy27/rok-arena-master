/**
 * NarrationHighlightManager — determines which sentence to highlight
 * based on speech boundary events (character index).
 */

import { splitSentences } from '@/components/campaigns/NarratorMessageContent';

export type HighlightCallback = (sentenceIndex: number) => void;

export class NarrationHighlightManager {
  private sentences: string[] = [];
  /** charIndex where each sentence starts in the full text */
  private sentenceOffsets: number[] = [];
  private currentIndex = -1;
  private callbacks: HighlightCallback[] = [];
  private fullText = '';

  onChange(cb: HighlightCallback) {
    this.callbacks.push(cb);
    return () => { this.callbacks = this.callbacks.filter(c => c !== cb); };
  }

  /** Prepare sentence offsets for a given text */
  prepare(text: string) {
    this.fullText = text;
    this.sentences = splitSentences(text);
    this.sentenceOffsets = [];
    let offset = 0;
    for (const s of this.sentences) {
      this.sentenceOffsets.push(offset);
      offset += s.length;
    }
    this.currentIndex = -1;
  }

  /** Call with the current charIndex from SpeechManager boundary events */
  updateFromCharIndex(charIndex: number) {
    let newIndex = 0;
    for (let i = this.sentenceOffsets.length - 1; i >= 0; i--) {
      if (charIndex >= this.sentenceOffsets[i]) {
        newIndex = i;
        break;
      }
    }
    if (newIndex !== this.currentIndex) {
      this.currentIndex = newIndex;
      this.emit(newIndex);
    }
  }

  /** Get the character index where a given sentence starts */
  getCharIndexForSentence(sentenceIndex: number): number {
    return this.sentenceOffsets[sentenceIndex] ?? 0;
  }

  getSentenceCount(): number {
    return this.sentences.length;
  }

  reset() {
    this.currentIndex = -1;
    this.emit(-1);
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  private emit(index: number) {
    for (const cb of this.callbacks) cb(index);
  }
}
