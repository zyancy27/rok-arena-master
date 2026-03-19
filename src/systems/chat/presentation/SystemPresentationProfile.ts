import {
  deriveAnimationTone,
  deriveOverlayBehavior,
  derivePressureFromCues,
  derivePulseBehavior,
  deriveTextEmphasis,
  type SpeakerPresentationProfile,
  type SpeakerPresentationProfileInput,
  uniq,
  toStringArray,
} from './SpeakerPresentationProfile';

export function buildSystemPresentationProfile(input: SpeakerPresentationProfileInput): SpeakerPresentationProfile {
  const visualPressure = derivePressureFromCues(input);
  const pulseBehavior = derivePulseBehavior(input);
  const animationTone = deriveAnimationTone(input);
  const textEmphasis = deriveTextEmphasis(input);
  const overlayBehavior = deriveOverlayBehavior(input);

  return {
    id: `system:${visualPressure}:${pulseBehavior}`,
    speakerRole: 'system',
    boxFamily: 'system',
    visualPressure,
    pulseBehavior,
    textEmphasis,
    cueFamilyBias: uniq([
      'system',
      ...toStringArray(input.sceneEffectCues).filter((entry) => /pressure:|tone:|chat:/.test(entry)).slice(0, 4),
    ]),
    animationTone,
    overlayBehavior,
    iconTone: 'system',
    surfaceClassName: 'bg-muted/55 border-border/50 text-muted-foreground shadow-none',
    iconContainerClassName: 'bg-muted text-muted-foreground border border-border/30',
    labelClassName: 'text-muted-foreground',
    contentClassName: 'text-muted-foreground',
  };
}
