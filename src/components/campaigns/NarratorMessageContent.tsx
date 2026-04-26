/**
 * NarratorMessageContent
 *
 * Renders narrator prose content while keeping playback-synced concerns local
 * to this component. The outer chat box owns all render-time presentation,
 * profile styling, and scene/effect-driven box effects.
 */

import { useMemo, useCallback, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { NarrationHighlightRange } from '@/systems/narration/NarrationHighlightManager';
import { useLiveTyping } from '@/hooks/use-live-typing';

/** Split text into sentences, preserving whitespace between them. */
function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?]*[.!?]+[\s]*/g);
  if (!parts) return [text];
  const joined = parts.join('');
  if (joined.length < text.length) {
    parts.push(text.slice(joined.length));
  }
  return parts.filter(s => s.trim().length > 0);
}

interface NarratorMessageContentProps {
  content: string;
  activeSentenceIndex: number;
  activeRange?: NarrationHighlightRange | null;
  onSentenceClick?: (sentenceIndex: number) => void;
  voiceEnabled?: boolean;
  requireTapConfirmation?: boolean;
  onConfirmSentenceClick?: () => void;
  onCancelSentenceClick?: () => void;
  hasPendingTapConfirmation?: boolean;
  contentClassName?: string;
  playbackClassName?: string;
  /** @deprecated Use playbackClassName to make playback-only styling explicit. */
  animationClassName?: string;
  /** Stable id for live-typing reveal. When provided, fresh narrator messages
   *  reveal progressively. Older / re-hydrated messages render fully. */
  messageId?: string;
  /** Server timestamp — older-than-session messages render without animation. */
  createdAt?: string | number | Date | null;
  /** Disable live typing entirely (e.g. for system / error placeholders). */
  liveTypingEnabled?: boolean;
}

export default function NarratorMessageContent({
  content,
  activeSentenceIndex,
  activeRange = null,
  onSentenceClick,
  voiceEnabled = false,
  requireTapConfirmation = false,
  onConfirmSentenceClick,
  onCancelSentenceClick,
  hasPendingTapConfirmation = false,
  contentClassName = 'text-sm whitespace-pre-wrap break-words text-foreground/90 italic',
  playbackClassName = '',
  animationClassName = '',
  messageId,
  createdAt,
  liveTypingEnabled = true,
}: NarratorMessageContentProps) {
  const { visibleText, isTyping, skip } = useLiveTyping({
    messageId: messageId ?? `nar-static-${content.length}`,
    text: content,
    createdAt,
    enabled: liveTypingEnabled && !!messageId,
  });
  const renderedContent = isTyping ? visibleText : content;
  const sentences = useMemo(() => splitSentences(renderedContent), [renderedContent]);
  const [localPendingSentence, setLocalPendingSentence] = useState<number | null>(null);

  const handleClick = useCallback(
    (idx: number) => {
      if (!voiceEnabled || !onSentenceClick) return;
      setLocalPendingSentence(idx);
      onSentenceClick(idx);
    },
    [voiceEnabled, onSentenceClick],
  );

  const pendingOpen = requireTapConfirmation && hasPendingTapConfirmation && localPendingSentence !== null;
  const resolvedPlaybackClassName = playbackClassName || animationClassName;

  return (
    <>
      <p className={[contentClassName, resolvedPlaybackClassName].filter(Boolean).join(' ')}>
        {sentences.map((sentence, idx) => {
          const isActiveSentence = idx === activeSentenceIndex;
          const isClickable = voiceEnabled && !!onSentenceClick;
          const shouldUseRange = !!activeRange && activeRange.sentenceIndex === idx && activeRange.confidence >= 0.75;

          if (shouldUseRange) {
            const sentenceStart = sentences.slice(0, idx).join('').length;
            const localStart = Math.max(0, activeRange.start - sentenceStart);
            const localEnd = Math.max(localStart, Math.min(sentence.length, activeRange.end - sentenceStart));
            const before = sentence.slice(0, localStart);
            const highlighted = sentence.slice(localStart, localEnd);
            const after = sentence.slice(localEnd);

            return (
              <span
                key={idx}
                onClick={() => handleClick(idx)}
                className={[
                  'transition-colors duration-300 rounded',
                  isClickable ? 'cursor-pointer hover:bg-accent/30' : '',
                ].filter(Boolean).join(' ')}
                title={isClickable ? 'Click to read from here' : undefined}
              >
                {before}
                <span className="bg-accent/40 text-foreground rounded px-0.5">{highlighted || sentence}</span>
                {after}
              </span>
            );
          }

          return (
            <span
              key={idx}
              onClick={() => handleClick(idx)}
              className={[
                'transition-colors duration-300',
                isActiveSentence ? 'bg-accent/40 text-foreground rounded px-0.5' : '',
                isClickable ? 'cursor-pointer hover:bg-accent/20 rounded' : '',
              ].filter(Boolean).join(' ')}
              title={isClickable ? 'Click to read from here' : undefined}
            >
              {sentence}
            </span>
          );
        })}
      </p>

      <AlertDialog open={pendingOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start narration from here?</AlertDialogTitle>
            <AlertDialogDescription>
              The current narration will stop and restart from the tapped point.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setLocalPendingSentence(null);
              onCancelSentenceClick?.();
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setLocalPendingSentence(null);
              onConfirmSentenceClick?.();
            }}>
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export { splitSentences };
