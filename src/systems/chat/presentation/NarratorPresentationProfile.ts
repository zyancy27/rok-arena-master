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

export function buildNarratorPresentationProfile(input: SpeakerPresentationProfileInput): SpeakerPresentationProfile {
  const visualPressure = derivePressureFromCues(input);
  const pulseBehavior = derivePulseBehavior(input);
  const animationTone = deriveAnimationTone(input);
  const textEmphasis = deriveTextEmphasis(input);
  const overlayBehavior = deriveOverlayBehavior(input);

  return {
    id: `narrator:${visualPressure}:${pulseBehavior}`,
    speakerRole: 'narrator',
    boxFamily: 'narrator',
    visualPressure,
    pulseBehavior,
    textEmphasis,
    cueFamilyBias: uniq([
      'narrator',
      ...toStringArray(input.sceneEffectCues).filter((entry) => /tone:|pressure:|world-audio:|ambient/.test(entry)).slice(0, 4),
    ]),
    animationTone,
    overlayBehavior,
    iconTone: 'narrator',
    surfaceClassName: 'bg-card/75 border-border/70 text-foreground shadow-sm backdrop-blur-sm',
    iconContainerClassName: 'bg-primary/12 text-primary border border-primary/20',
    labelClassName: 'text-primary',
    contentClassName: 'text-foreground/90',
  };
}
