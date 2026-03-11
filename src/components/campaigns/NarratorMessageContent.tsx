/**
 * NarratorMessageContent
 *
 * Renders narrator text split by sentence. Highlights the sentence currently
 * being read aloud and lets the user click any sentence to skip the narrator
 * to that point.
 */

import { useMemo, useCallback } from 'react';

/** Split text into sentences, preserving whitespace between them. */
function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace or end
  const parts = text.match(/[^.!?]*[.!?]+[\s]*/g);
  if (!parts) return [text];
  // If there's leftover text that didn't end with punctuation, add it
  const joined = parts.join('');
  if (joined.length < text.length) {
    parts.push(text.slice(joined.length));
  }
  return parts.filter(s => s.trim().length > 0);
}

interface NarratorMessageContentProps {
  content: string;
  /** Index of sentence currently being read (-1 = none) */
  activeSentenceIndex: number;
  /** Called when user clicks a sentence to skip to it */
  onSentenceClick?: (sentenceIndex: number) => void;
  /** Whether TTS is available for click-to-skip */
  voiceEnabled?: boolean;
}

export default function NarratorMessageContent({
  content,
  activeSentenceIndex,
  onSentenceClick,
  voiceEnabled = false,
}: NarratorMessageContentProps) {
  const sentences = useMemo(() => splitSentences(content), [content]);

  const handleClick = useCallback(
    (idx: number) => {
      if (voiceEnabled && onSentenceClick) {
        onSentenceClick(idx);
      }
    },
    [voiceEnabled, onSentenceClick],
  );

  return (
    <p className="text-sm whitespace-pre-wrap break-words text-foreground/90 italic">
      {sentences.map((sentence, idx) => {
        const isActive = idx === activeSentenceIndex;
        const isClickable = voiceEnabled && !!onSentenceClick;

        return (
          <span
            key={idx}
            onClick={() => handleClick(idx)}
            className={[
              'transition-colors duration-300',
              isActive
                ? 'bg-amber-400/25 text-amber-200 rounded px-0.5'
                : '',
              isClickable
                ? 'cursor-pointer hover:bg-amber-400/10 rounded'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            title={isClickable ? 'Click to read from here' : undefined}
          >
            {sentence}
          </span>
        );
      })}
    </p>
  );
}

export { splitSentences };
