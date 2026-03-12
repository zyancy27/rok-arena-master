/**
 * TapToNarrateManager — handles tap/click-to-narrate interactions.
 * Resolves tap position to a sentence index and character offset.
 */

import { splitSentences } from '@/components/campaigns/NarratorMessageContent';

export class TapToNarrateManager {
  private enabled = true;

  setEnabled(val: boolean) {
    this.enabled = val;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Given a sentence index, compute the character offset in the full text.
   */
  getCharOffsetForSentence(text: string, sentenceIndex: number): number {
    const sentences = splitSentences(text);
    let offset = 0;
    for (let i = 0; i < sentenceIndex && i < sentences.length; i++) {
      offset += sentences[i].length;
    }
    return offset;
  }
}
