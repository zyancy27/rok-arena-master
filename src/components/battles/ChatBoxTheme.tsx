import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  buildThemeFromLocation,
  buildThemeFromTags,
  isNeutralTheme,
  type ChatBoxStyle,
  type ThemeComposition,
  type EnvironmentTag,
} from '@/lib/theme-engine';

interface ChatBoxThemeProps {
  /** Location string to derive theme from */
  location?: string | null;
  /** Explicit tags override */
  tags?: EnvironmentTag[];
  /** Pre-composed theme override */
  composition?: ThemeComposition;
  /** The chat message content */
  children: React.ReactNode;
  /** Additional classes */
  className?: string;
}

/**
 * Wraps a chat message with environment-aware styling.
 * Applies border style, text glow, background texture, and urgency animations
 * derived from the theme engine.
 */
export default function ChatBoxTheme({
  location,
  tags,
  composition: preComposed,
  children,
  className,
}: ChatBoxThemeProps) {
  const theme = useMemo(() => {
    if (preComposed) return preComposed;
    if (tags && tags.length > 0) return buildThemeFromTags(tags);
    return buildThemeFromLocation(location);
  }, [location, tags, preComposed]);

  const chatBox = theme.chatBox;
  const isNeutral = isNeutralTheme(theme);

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
      style={
        !isNeutral && chatBox.textGlow
          ? { textShadow: chatBox.textGlow }
          : undefined
      }
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
