import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  buildThemeFromLocation,
  buildThemeFromTags,
  buildCompositionFromSnapshot,
  compositionToCssVars,
  isNeutralTheme,
  type ChatBoxStyle,
  type ThemeComposition,
  type ThemeSnapshot,
  type EnvironmentTag,
} from '@/lib/theme-engine';

interface ChatBoxThemeProps {
  /** Location string to derive theme from */
  location?: string | null;
  /** Explicit tags override */
  tags?: EnvironmentTag[];
  /** Pre-composed theme override */
  composition?: ThemeComposition;
  /** Stored snapshot (highest priority — for message bubbles) */
  snapshot?: ThemeSnapshot | null;
  /** The chat message content */
  children: React.ReactNode;
  /** Additional classes */
  className?: string;
}

/**
 * Wraps a chat message with environment-aware styling.
 * Applies border style, text glow, background texture, and urgency animations
 * derived from the theme engine.
 * 
 * Supports snapshot mode for historical per-message rendering.
 */
export default function ChatBoxTheme({
  location,
  tags,
  composition: preComposed,
  snapshot,
  children,
  className,
}: ChatBoxThemeProps) {
  const theme = useMemo(() => {
    if (snapshot) return buildCompositionFromSnapshot(snapshot);
    if (preComposed) return preComposed;
    if (tags && tags.length > 0) return buildThemeFromTags(tags);
    return buildThemeFromLocation(location);
  }, [location, tags, preComposed, snapshot]);

  const chatBox = theme.chatBox;
  const isNeutral = isNeutralTheme(theme);
  const cssVars = useMemo(() => compositionToCssVars(theme), [theme]);

  return (
    <div
      className={cn(
        'relative transition-all duration-500',
        !isNeutral && 'border',
        !isNeutral && chatBox.borderStyle,
        !isNeutral && chatBox.backgroundTexture,
        !isNeutral && chatBox.urgencyAnimation,
        !isNeutral && chatBox.fontHint === 'bold' && 'font-semibold',
        !isNeutral && chatBox.fontHint === 'italic' && 'italic',
        className,
      )}
      style={{
        ...(!isNeutral && chatBox.textGlow
          ? { textShadow: chatBox.textGlow }
          : {}),
        ...(cssVars as React.CSSProperties),
      }}
    >
      {children}
    </div>
  );
}

/**
 * Hook to get chat box styles for manual application.
 */
export function useChatBoxTheme(
  location?: string | null,
  tags?: EnvironmentTag[],
): ChatBoxStyle {
  return useMemo(() => {
    const theme = tags && tags.length > 0
      ? buildThemeFromTags(tags)
      : buildThemeFromLocation(location);
    return theme.chatBox;
  }, [location, tags]);
}
