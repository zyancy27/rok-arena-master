import { splitSentences } from '@/components/campaigns/NarratorMessageContent';

export interface TapNarrationTarget {
  sentenceIndex: number;
  charIndex: number;
  preview: string;
}

export class TapToNarrateController {
  private enabled = true;
  private askBeforeStart = true;

  setEnabled(value: boolean) {
    this.enabled = value;
  }

  setAskBeforeStart(value: boolean) {
    this.askBeforeStart = value;
  }

  isEnabled() {
    return this.enabled;
  }

  shouldConfirm() {
    return this.askBeforeStart;
  }

  resolveSentenceTarget(text: string, sentenceIndex: number): TapNarrationTarget {
    const sentences = splitSentences(text);
    const boundedIndex = Math.max(0, Math.min(sentenceIndex, Math.max(sentences.length - 1, 0)));
    let charIndex = 0;

    for (let index = 0; index < boundedIndex; index += 1) {
      charIndex += sentences[index]?.length ?? 0;
    }

    return {
      sentenceIndex: boundedIndex,
      charIndex,
      preview: (sentences[boundedIndex] ?? text).trim(),
    };
  }
}
