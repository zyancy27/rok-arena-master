/**
 * LiveTypingText
 *
 * Lightweight wrapper that renders a string with a "swift texting" reveal.
 * Tap/click anywhere on the bubble to skip to the end.
 *
 * Hydration-safe: messages older than the current session OR already typed
 * once render fully without animation (see LiveTypingRegistry).
 */

import { type ReactNode } from 'react';
import { useLiveTyping } from '@/hooks/use-live-typing';

interface LiveTypingTextProps {
  messageId: string;
  text: string;
  createdAt?: string | number | Date | null;
  charsPerSecond?: number;
  enabled?: boolean;
  className?: string;
  /** If provided, render via children with the visible substring. */
  render?: (visibleText: string, isTyping: boolean, skip: () => void) => ReactNode;
  /** Show a tiny ▍ caret while typing. */
  showCaret?: boolean;
  onComplete?: () => void;
}

export default function LiveTypingText({
  messageId,
  text,
  createdAt,
  charsPerSecond,
  enabled = true,
  className,
  render,
  showCaret = true,
  onComplete,
}: LiveTypingTextProps) {
  const { visibleText, isTyping, skip } = useLiveTyping({
    messageId,
    text,
    createdAt,
    charsPerSecond,
    enabled,
    onComplete,
  });

  if (render) {
    return <>{render(visibleText, isTyping, skip)}</>;
  }

  return (
    <span
      className={className}
      onClick={(e) => {
        if (isTyping) {
          e.stopPropagation();
          skip();
        }
      }}
      data-typing={isTyping ? 'true' : 'false'}
      title={isTyping ? 'Tap to reveal full message' : undefined}
    >
      {visibleText}
      {isTyping && showCaret && (
        <span className="inline-block w-[0.5ch] -mb-px ml-px text-primary/70 animate-pulse select-none">
          ▍
        </span>
      )}
    </span>
  );
}
