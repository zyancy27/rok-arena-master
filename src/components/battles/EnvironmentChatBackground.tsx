import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  buildThemeFromLocation,
  buildThemeFromTags,
  buildCompositionFromSnapshot,
  compositionToCssVars,
  backgroundLayerToCSS,
  isNeutralTheme,
  type ThemeComposition,
  type ThemeSnapshot,
  type EnvironmentTag,
} from '@/lib/theme-engine';

// Re-export for backward compatibility
export type EnvironmentTheme = EnvironmentTag;
export { buildThemeFromLocation as detectEnvironmentTheme };

interface EnvironmentChatBackgroundProps {
  /** The location string from the battle (chosen_location) */
  location?: string | null;
  /** Optional: explicit tags to compose a theme (overrides location) */
  tags?: EnvironmentTag[];
  /** Optional: a pre-composed theme (overrides both location and tags) */
  composition?: ThemeComposition;
  /** Optional: a stored ThemeSnapshot (highest priority, used for message bubbles) */
  snapshot?: ThemeSnapshot | null;
  /** Optional: apply only to a specific player scope ('full' = entire chat area, 'bubble' = message bubble) */
  scope?: 'full' | 'player-only' | 'bubble';
  className?: string;
}

/**
 * Persistent environment background overlay for the battle chat area.
 * Uses the modular Theme Engine to compose visual effects from building blocks.
 * Supports two rendering modes:
 *   - "full" / "player-only": current scene theme for the chat container
 *   - "bubble": per-message snapshot theme for historical messages
 */
export default function EnvironmentChatBackground({
  location,
  tags,
  composition: preComposed,
  snapshot,
  scope = 'full',
  className,
}: EnvironmentChatBackgroundProps) {
  const theme = useMemo(() => {
    // Snapshot takes highest priority (historical message rendering)
    if (snapshot) return buildCompositionFromSnapshot(snapshot);
    if (preComposed) return preComposed;
    if (tags && tags.length > 0) return buildThemeFromTags(tags);
    return buildThemeFromLocation(location);
  }, [location, tags, preComposed, snapshot]);

  const cssVars = useMemo(() => compositionToCssVars(theme), [theme]);

  if (isNeutralTheme(theme)) return null;

  return (
    <div
      className={cn(
        'env-layer overflow-hidden z-0 transition-opacity duration-1000',
        scope === 'player-only' && 'rounded-lg',
        scope === 'bubble' && 'rounded-lg',
        className,
      )}
      style={cssVars as React.CSSProperties}
      aria-hidden
    >
      <ComposedThemeRenderer composition={theme} />
    </div>
  );
}

/**
 * Data-driven theme renderer — no switch/case needed.
 * Renders stacked background layers, overlay modules, and ambient glow.
 */
function ComposedThemeRenderer({ composition }: { composition: ThemeComposition }) {
  // Merge all background layers into a single CSS background
  const backgroundCSS = useMemo(() => {
    if (composition.backgrounds.length === 0) return undefined;
    return composition.backgrounds.map(backgroundLayerToCSS).join(', ');
  }, [composition.backgrounds]);

  return (
    <>
      {/* Background gradient layers (merged into one div for performance) */}
      {backgroundCSS && (
        <div
          className="env-layer"
          style={{ background: backgroundCSS }}
        />
      )}

      {/* Overlay effect modules (each is its own CSS-animated div) */}
      {composition.overlays.map((overlay) => (
        <div
          key={overlay.className}
          className={cn('env-layer', overlay.className)}
        />
      ))}

      {/* Ambient glow via inset box-shadow */}
      {composition.ambientGlow && (
        <div
          className="env-layer"
          style={{ boxShadow: composition.ambientGlow }}
        />
      )}
    </>
  );
}
