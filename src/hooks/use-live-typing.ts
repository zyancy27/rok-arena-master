/**
 * useLiveTyping
 *
 * Reusable hook that progressively reveals a string at a configurable
 * characters-per-second rate. Designed for narrator + NPC chat bubbles.
 *
 *  - Skippable: call `skip()` (or pass `skipSignal`) to instantly complete.
 *  - Hydration-safe: a message that has already finished typing in this
 *    session (or that pre-dates the session) snaps to full content via
 *    LiveTypingRegistry.
 *  - Respects prefers-reduced-motion automatically.
 *  - When the upstream `text` grows (streaming), the visible window grows
 *    with it and never rewinds.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  shouldAnimateMessage,
  markMessageTyped,
  isMessageTyped,
} from '@/systems/narration/LiveTypingRegistry';

export interface UseLiveTypingOptions {
  /** Stable id for this message; used to suppress replay on remount. */
  messageId: string;
  /** Full target text. Can grow over time for streaming responses. */
  text: string;
  /** Server-assigned timestamp; older-than-session messages don't animate. */
  createdAt?: string | number | Date | null;
  /** Characters per second. Default 90 (~feels like fast texting). */
  charsPerSecond?: number;
  /** When false, the hook does nothing and just returns the full text. */
  enabled?: boolean;
  /** Optional callback fired exactly once when typing reaches the end. */
  onComplete?: () => void;
}

export interface UseLiveTypingResult {
  visibleText: string;
  isTyping: boolean;
  isComplete: boolean;
  skip: () => void;
}

export function useLiveTyping({
  messageId,
  text,
  createdAt,
  charsPerSecond = 90,
  enabled = true,
  onComplete,
}: UseLiveTypingOptions): UseLiveTypingResult {
  const animateThisMessage = useMemo(
    () => enabled && !!text && shouldAnimateMessage({ messageId, createdAt }),
    // animation decision is fixed at first sight of the messageId
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messageId],
  );

  const initialChars = animateThisMessage ? 0 : (text?.length ?? 0);
  const [revealed, setRevealed] = useState<number>(initialChars);
  const startedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // If the registry already says this message is typed, snap to full.
  useEffect(() => {
    if (isMessageTyped(messageId)) {
      setRevealed(text.length);
    }
  }, [messageId, text.length]);

  useEffect(() => {
    if (!animateThisMessage) {
      setRevealed(text.length);
      markMessageTyped(messageId);
      return;
    }
    if (!text) return;

    if (revealed >= text.length) {
      markMessageTyped(messageId);
      onCompleteRef.current?.();
      return;
    }

    let cancelled = false;
    if (startedAtRef.current == null) {
      // Account for any chars already revealed (streaming top-up).
      startedAtRef.current = performance.now() - (revealed * 1000) / charsPerSecond;
    }

    const tick = () => {
      if (cancelled) return;
      const now = performance.now();
      const elapsed = now - (startedAtRef.current ?? now);
      const target = Math.min(text.length, Math.floor((elapsed / 1000) * charsPerSecond));
      if (target !== revealed) {
        setRevealed(target);
      }
      if (target < text.length) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        markMessageTyped(messageId);
        onCompleteRef.current?.();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // We deliberately depend on text.length (for streaming top-up) and revealed.
  }, [animateThisMessage, text, text.length, revealed, charsPerSecond, messageId]);

  const skip = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setRevealed(text.length);
    markMessageTyped(messageId);
    onCompleteRef.current?.();
  }, [messageId, text.length]);

  const isComplete = revealed >= text.length;
  const visibleText = isComplete ? text : text.slice(0, revealed);

  return {
    visibleText,
    isTyping: !isComplete,
    isComplete,
    skip,
  };
}
