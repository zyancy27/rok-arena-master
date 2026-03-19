import type { SpeakerPresentationProfile } from './SpeakerPresentationProfile';

type ChatBoxAlign = 'left' | 'right' | 'center';

interface ChatBoxSurfaceOptions {
  align?: ChatBoxAlign;
  pending?: boolean;
  includeEntranceAnimation?: boolean;
}

export function getChatBoxMotionTextureClasses(profile: SpeakerPresentationProfile | null | undefined) {
  switch (profile?.animationTone) {
    case 'kinetic':
      return 'motion-safe:transition-transform motion-safe:duration-150 hover:-translate-y-0.5';
    case 'unstable':
      return 'motion-safe:transition-transform motion-safe:duration-200 hover:translate-x-px';
    case 'measured':
      return 'motion-safe:transition-all motion-safe:duration-200';
    case 'calm':
    default:
      return 'motion-safe:transition-all motion-safe:duration-300';
  }
}

export function getChatBoxWrapperClasses(
  profile: SpeakerPresentationProfile | null | undefined,
  options: { includeEntranceAnimation?: boolean } = {},
) {
  const entranceClassName = options.includeEntranceAnimation === false ? '' : 'animate-fade-in';
  const pulseClassName = profile?.pulseBehavior === 'surge' || profile?.pulseBehavior === 'flicker'
    ? 'animate-pulse'
    : '';

  return [
    entranceClassName,
    pulseClassName,
    getChatBoxMotionTextureClasses(profile),
  ].filter(Boolean).join(' ');
}

export function getChatBoxSurfaceClasses(
  profile: SpeakerPresentationProfile | null | undefined,
  options: ChatBoxSurfaceOptions = {},
) {
  const align = options.align ?? 'left';
  const alignClassName = align === 'right' ? 'ml-8' : align === 'center' ? 'mx-2' : 'mr-8';
  const pressureClassName = profile?.visualPressure === 'critical'
    ? 'shadow-lg ring-2 ring-border/70'
    : profile?.visualPressure === 'high'
      ? 'shadow-md ring-1 ring-border/50'
      : 'shadow-sm';
  const overlayClassName = profile?.overlayBehavior === 'volatile'
    ? 'bg-gradient-to-br from-background/20 via-background/10 to-primary/10'
    : profile?.overlayBehavior === 'layered'
      ? 'bg-gradient-to-br from-background/10 via-background/5 to-secondary/10'
      : profile?.overlayBehavior === 'hard'
        ? 'border-2'
        : '';
  const pendingClassName = options.pending ? 'opacity-70' : '';
  const entranceClassName = options.includeEntranceAnimation === false ? '' : 'animate-fade-in';

  return [
    'env-scope relative overflow-hidden p-3 rounded-lg border backdrop-blur-sm',
    alignClassName,
    profile?.surfaceClassName ?? 'bg-card/75 border-border/70 text-foreground',
    pressureClassName,
    overlayClassName,
    getChatBoxMotionTextureClasses(profile),
    entranceClassName,
    pendingClassName,
  ].filter(Boolean).join(' ');
}

export function getChatBoxLabelClasses(profile: SpeakerPresentationProfile | null | undefined) {
  return [
    'text-xs font-semibold uppercase',
    profile?.textEmphasis === 'sharp' ? 'tracking-[0.16em]' : 'tracking-wider',
    profile?.textEmphasis === 'frayed' ? 'italic' : '',
    profile?.labelClassName ?? 'text-foreground',
  ].filter(Boolean).join(' ');
}

export function getChatBoxContentClasses(profile: SpeakerPresentationProfile | null | undefined) {
  return [
    'text-sm whitespace-pre-wrap break-words',
    profile?.textEmphasis === 'composed' ? 'tracking-[0.01em]' : '',
    profile?.textEmphasis === 'frayed' ? 'italic' : '',
    profile?.contentClassName ?? 'text-foreground/90',
  ].filter(Boolean).join(' ');
}
