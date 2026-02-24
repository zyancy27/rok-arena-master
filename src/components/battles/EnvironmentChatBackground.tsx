import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export type EnvironmentTheme =
  | 'lava'
  | 'underwater'
  | 'sky'
  | 'nuclear'
  | 'space'
  | 'blizzard'
  | 'forest'
  | 'desert'
  | 'volcanic'
  | 'crystal'
  | 'void'
  | 'storm'
  | 'ruins'
  | 'neutral';

interface EnvironmentChatBackgroundProps {
  /** The location string from the battle (chosen_location) */
  location: string | null | undefined;
  /** Optional: apply only to a specific player scope ('full' = entire chat area) */
  scope?: 'full' | 'player-only';
  className?: string;
}

/**
 * Maps a location string to an EnvironmentTheme by keyword matching.
 */
export function detectEnvironmentTheme(location: string | null | undefined): EnvironmentTheme {
  if (!location) return 'neutral';
  const l = location.toLowerCase();

  if (/lava|magma|molten|volcano|volcanic|eruption|caldera/.test(l)) return 'lava';
  if (/underwat|ocean|sea\b|deep.*trench|hull.*breach|aquatic|coral|abyss.*water|submar/.test(l)) return 'underwater';
  if (/sky|free.?fall|fall.*from|30.*000|plane|airborne|cloud|stratosphere/.test(l)) return 'sky';
  if (/nuclear|reactor|radiation|melt.*down|chernobyl|power.*plant|radioactive/.test(l)) return 'nuclear';
  if (/space|orbit|station|vacuum|asteroid|star.*ship|cosmos|galaxy|re.?entry|warp/.test(l)) return 'space';
  if (/blizzard|snow|ice.*storm|arctic|frozen.*waste|tundra|frost|glacier|polar/.test(l)) return 'blizzard';
  if (/forest|jungle|swamp|marsh|grove|canopy|woodland/.test(l)) return 'forest';
  if (/desert|sand|dune|oasis|arid|sahara|wasteland/.test(l)) return 'desert';
  if (/crystal|cave|cavern|gem|mine|underground|grotto/.test(l)) return 'crystal';
  if (/void|dimension.*tear|collaps|rift|dark.*realm|shadow.*realm|nether/.test(l)) return 'void';
  if (/storm|thunder|lightning|hurricane|tornado|cyclone|tempest/.test(l)) return 'storm';
  if (/ruin|temple|ancient|colosseum|arena|fortress|castle|citadel/.test(l)) return 'ruins';

  return 'neutral';
}

/**
 * Persistent environment background overlay for the battle chat area.
 * Renders layered CSS effects tied to the current battle location.
 * Effects remain as long as the location is active.
 */
export default function EnvironmentChatBackground({
  location,
  scope = 'full',
  className,
}: EnvironmentChatBackgroundProps) {
  const theme = useMemo(() => detectEnvironmentTheme(location), [location]);

  if (theme === 'neutral') return null;

  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none overflow-hidden z-0 transition-opacity duration-1000',
        scope === 'player-only' && 'rounded-lg',
        className,
      )}
      aria-hidden
    >
      <ThemeRenderer theme={theme} />
    </div>
  );
}

function ThemeRenderer({ theme }: { theme: EnvironmentTheme }) {
  switch (theme) {
    case 'lava':
      return <LavaTheme />;
    case 'underwater':
      return <UnderwaterTheme />;
    case 'sky':
      return <SkyTheme />;
    case 'nuclear':
      return <NuclearTheme />;
    case 'space':
      return <SpaceTheme />;
    case 'blizzard':
      return <BlizzardTheme />;
    case 'forest':
      return <ForestTheme />;
    case 'desert':
      return <DesertTheme />;
    case 'crystal':
      return <CrystalTheme />;
    case 'void':
      return <VoidTheme />;
    case 'storm':
      return <StormTheme />;
    case 'ruins':
      return <RuinsTheme />;
    default:
      return null;
  }
}

/* ── Environment Themes ────────────────────────────────────── */

function LavaTheme() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, hsl(15 90% 25% / 0.35) 0%, hsl(30 80% 30% / 0.2) 40%, hsl(0 60% 15% / 0.1) 100%)',
        }}
      />
      <div className="absolute inset-0 env-lava-glow" />
      <div
        className="absolute inset-0"
        style={{
          boxShadow: 'inset 0 -40px 60px -20px hsl(15 100% 40% / 0.25)',
        }}
      />
    </>
  );
}

function UnderwaterTheme() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, hsl(200 70% 30% / 0.3) 0%, hsl(210 60% 25% / 0.25) 50%, hsl(220 50% 20% / 0.3) 100%)',
        }}
      />
      <div className="absolute inset-0 env-underwater-caustics" />
      <div
        className="absolute inset-0"
        style={{
          boxShadow: 'inset 0 0 80px hsl(200 60% 40% / 0.15)',
        }}
      />
    </>
  );
}

function SkyTheme() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, hsl(210 50% 50% / 0.15) 0%, hsl(200 40% 60% / 0.1) 50%, transparent 100%)',
        }}
      />
      <div className="absolute inset-0 env-wind-streaks" />
    </>
  );
}

function NuclearTheme() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, hsl(60 80% 50% / 0.08) 0%, hsl(120 40% 30% / 0.12) 50%, hsl(80 30% 15% / 0.15) 100%)',
        }}
      />
      <div className="absolute inset-0 env-radiation-flicker" />
      <div
        className="absolute inset-0"
        style={{
          boxShadow: 'inset 0 0 40px hsl(100 70% 40% / 0.12)',
        }}
      />
    </>
  );
}

function SpaceTheme() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, hsl(240 20% 5% / 0.5) 0%, hsl(260 15% 3% / 0.6) 100%)',
        }}
      />
      <div className="absolute inset-0 env-stars" />
    </>
  );
}

function BlizzardTheme() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, hsl(200 30% 70% / 0.15) 0%, hsl(210 20% 80% / 0.1) 50%, hsl(200 40% 90% / 0.08) 100%)',
        }}
      />
      <div className="absolute inset-0 env-frost-overlay" />
      <div className="absolute inset-0 env-snow-particles" />
    </>
  );
}

function ForestTheme() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, hsl(120 30% 15% / 0.25) 0%, hsl(140 25% 20% / 0.15) 50%, transparent 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          boxShadow: 'inset 0 40px 60px -20px hsl(120 20% 10% / 0.3)',
        }}
      />
    </>
  );
}

function DesertTheme() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, hsl(35 50% 50% / 0.12) 0%, hsl(40 40% 55% / 0.08) 50%, hsl(30 30% 40% / 0.15) 100%)',
        }}
      />
      <div className="absolute inset-0 env-heat-shimmer" />
    </>
  );
}

function CrystalTheme() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 30% 40%, hsl(280 40% 50% / 0.1) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, hsl(200 50% 60% / 0.08) 0%, transparent 50%)',
        }}
      />
      <div className="absolute inset-0 env-crystal-glint" />
    </>
  );
}

function VoidTheme() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at center, hsl(270 30% 5% / 0.6) 0%, hsl(0 0% 0% / 0.7) 100%)',
        }}
      />
      <div className="absolute inset-0 env-void-distortion" />
    </>
  );
}

function StormTheme() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, hsl(220 30% 20% / 0.3) 0%, hsl(230 20% 15% / 0.2) 100%)',
        }}
      />
      <div className="absolute inset-0 env-storm-rain" />
    </>
  );
}

function RuinsTheme() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, hsl(30 15% 15% / 0.2) 0%, hsl(25 10% 20% / 0.1) 50%, transparent 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          boxShadow: 'inset 0 0 60px hsl(30 20% 10% / 0.2)',
        }}
      />
    </>
  );
}
