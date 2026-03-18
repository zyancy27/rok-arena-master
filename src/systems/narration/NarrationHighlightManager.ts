/**
 * NarrationHighlightManager — maps speech progress to phrase-first highlight ranges
 * with sentence-level fallback when phrase confidence is low.
 */

import { splitSentences } from '@/components/campaigns/NarratorMessageContent';

export interface NarrationHighlightRange {
  sentenceIndex: number;
  start: number;
  end: number;
  text: string;
  confidence: number;
  mode: 'phrase' | 'sentence';
}

export type HighlightCallback = (range: NarrationHighlightRange | null) => void;

function splitIntoPhrases(sentence: string): string[] {
  const matches = sentence.match(/[^,;:!?]+(?:[,;:!?]+[\s]*)*/g);
  if (!matches || matches.length <= 1) return [sentence];
  return matches.filter(part => part.trim().length > 0);
}

export class NarrationHighlightManager {
  private sentences: string[] = [];
  private sentenceOffsets: number[] = [];
  private sentenceRanges: NarrationHighlightRange[] = [];
  private phraseRanges: NarrationHighlightRange[] = [];
  private currentRange: NarrationHighlightRange | null = null;
  private callbacks: HighlightCallback[] = [];

  onChange(callback: HighlightCallback) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(entry => entry !== callback);
    };
  }

  prepare(text: string) {
    this.sentences = splitSentences(text);
    this.sentenceOffsets = [];
    this.sentenceRanges = [];
    this.phraseRanges = [];
    this.currentRange = null;

    let globalOffset = 0;

    this.sentences.forEach((sentence, sentenceIndex) => {
      const sentenceStart = globalOffset;
      const sentenceEnd = sentenceStart + sentence.length;
      this.sentenceOffsets.push(sentenceStart);
      this.sentenceRanges.push({
        sentenceIndex,
        start: sentenceStart,
        end: sentenceEnd,
        text: sentence.trim(),
        confidence: 0.45,
        mode: 'sentence',
      });

      let localOffset = 0;
      const phrases = splitIntoPhrases(sentence);
      const highConfidence = phrases.length > 1;

      phrases.forEach((phrase) => {
        const phraseStart = sentence.indexOf(phrase, localOffset);
        const safeStart = phraseStart >= 0 ? phraseStart : localOffset;
        const start = sentenceStart + safeStart;
        const end = start + phrase.length;
        localOffset = safeStart + phrase.length;

        this.phraseRanges.push({
          sentenceIndex,
          start,
          end,
          text: phrase.trim(),
          confidence: highConfidence ? 0.92 : 0.45,
          mode: highConfidence ? 'phrase' : 'sentence',
        });
      });

      globalOffset = sentenceEnd;
    });
  }

  updateFromCharIndex(charIndex: number) {
    const nextRange = this.findBestRange(charIndex);
    if (!this.isSameRange(nextRange, this.currentRange)) {
      this.currentRange = nextRange;
      this.emit(this.currentRange);
    }
    return this.currentRange;
  }

  getCharIndexForSentence(sentenceIndex: number) {
    return this.sentenceOffsets[sentenceIndex] ?? 0;
  }

  getNearestPhraseBoundary(charIndex: number) {
    const boundary = this.phraseRanges.reduce<number | null>((closest, range) => {
      if (closest == null) return range.start;
      return Math.abs(range.start - charIndex) < Math.abs(closest - charIndex) ? range.start : closest;
    }, null);

    return boundary ?? 0;
  }

  getSentenceCount() {
    return this.sentences.length;
  }

  getCurrentRange() {
    return this.currentRange;
  }

  reset() {
    this.currentRange = null;
    this.emit(null);
  }

  private findBestRange(charIndex: number) {
    if (this.sentenceRanges.length === 0) return null;

    const matchingPhrase = [...this.phraseRanges]
      .reverse()
      .find(range => charIndex >= range.start);

    if (matchingPhrase && matchingPhrase.confidence >= 0.75) {
      return matchingPhrase;
    }

    return [...this.sentenceRanges]
      .reverse()
      .find(range => charIndex >= range.start) ?? this.sentenceRanges[0];
  }

  private emit(range: NarrationHighlightRange | null) {
    for (const callback of this.callbacks) callback(range ? { ...range } : null);
  }

  private isSameRange(nextRange: NarrationHighlightRange | null, currentRange: NarrationHighlightRange | null) {
    if (!nextRange && !currentRange) return true;
    if (!nextRange || !currentRange) return false;
    return nextRange.start === currentRange.start && nextRange.end === currentRange.end;
  }
}
