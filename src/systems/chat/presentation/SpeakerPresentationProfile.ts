export type ChatSpeakerRole = 'narrator' | 'npc' | 'player' | 'system' | 'party_ally' | 'enemy_combatant';

export interface SpeakerPresentationProfile {
  id: string;
  speakerRole: ChatSpeakerRole;
  boxFamily: 'narrator' | 'npc' | 'player' | 'system' | 'ally' | 'enemy';
  visualPressure: 'low' | 'medium' | 'high' | 'critical';
  pulseBehavior: 'steady' | 'tight' | 'surge' | 'flicker';
  textEmphasis: 'restrained' | 'cinematic' | 'sharp' | 'composed' | 'frayed';
  cueFamilyBias: string[];
  animationTone: 'calm' | 'measured' | 'kinetic' | 'unstable';
  overlayBehavior: 'soft' | 'layered' | 'hard' | 'volatile';
  iconTone: 'narrator' | 'npc' | 'player' | 'system' | 'ally' | 'enemy';
  surfaceClassName: string;
  iconContainerClassName: string;
  labelClassName: string;
  contentClassName: string;
}

export interface SpeakerPresentationProfileInput {
  speakerName?: string | null;
  visualPressure?: string | null;
  identityCues?: string[];
  sceneEffectCues?: string[];
  narrationFlags?: string[];
}

export function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
}

export function uniq(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0))];
}

export function normalizePressure(value: string | null | undefined): SpeakerPresentationProfile['visualPressure'] {
  if (value === 'critical') return 'critical';
  if (value === 'high') return 'high';
  if (value === 'medium') return 'medium';
  return 'low';
}

export function derivePressureFromCues(input: SpeakerPresentationProfileInput): SpeakerPresentationProfile['visualPressure'] {
  const joined = uniq([
    input.visualPressure || null,
    ...toStringArray(input.identityCues),
    ...toStringArray(input.sceneEffectCues),
    ...toStringArray(input.narrationFlags),
  ]).join(' ');

  if (/(critical|catastrophic|killbox|overwhelming|explosive|berserker)/.test(joined)) return 'critical';
  if (/(high|hostile|surge|impact|volatile|threat|danger|combat)/.test(joined)) return 'high';
  if (/(medium|guarded|tense|tight|watchful|charged)/.test(joined)) return 'medium';
  return 'low';
}

export function derivePulseBehavior(input: SpeakerPresentationProfileInput): SpeakerPresentationProfile['pulseBehavior'] {
  const joined = uniq([
    ...toStringArray(input.identityCues),
    ...toStringArray(input.sceneEffectCues),
    ...toStringArray(input.narrationFlags),
  ]).join(' ');

  if (/(flicker|terrified|frayed|unstable|panic)/.test(joined)) return 'flicker';
  if (/(surge|burst|impact|hostile|explosive|volatile)/.test(joined)) return 'surge';
  if (/(tight|guarded|measured|cautious|narrow)/.test(joined)) return 'tight';
  return 'steady';
}

export function deriveAnimationTone(input: SpeakerPresentationProfileInput): SpeakerPresentationProfile['animationTone'] {
  const joined = uniq([
    ...toStringArray(input.identityCues),
    ...toStringArray(input.sceneEffectCues),
    ...toStringArray(input.narrationFlags),
  ]).join(' ');

  if (/(panic|terrified|unstable|frayed|flicker)/.test(joined)) return 'unstable';
  if (/(impact|surge|combat|predatory|berserker|hostile)/.test(joined)) return 'kinetic';
  if (/(measured|formal|noble|strategist|guarded|composed)/.test(joined)) return 'measured';
  return 'calm';
}

export function deriveTextEmphasis(input: SpeakerPresentationProfileInput): SpeakerPresentationProfile['textEmphasis'] {
  const joined = uniq([
    ...toStringArray(input.identityCues),
    ...toStringArray(input.sceneEffectCues),
    ...toStringArray(input.narrationFlags),
  ]).join(' ');

  if (/(frayed|panic|terrified|unstable)/.test(joined)) return 'frayed';
  if (/(sharp|threat|hostile|predatory|enemy)/.test(joined)) return 'sharp';
  if (/(formal|noble|strategist|measured|composed)/.test(joined)) return 'composed';
  if (/(cinematic|charged|dramatic|wonder)/.test(joined)) return 'cinematic';
  return 'restrained';
}

export function deriveOverlayBehavior(input: SpeakerPresentationProfileInput): SpeakerPresentationProfile['overlayBehavior'] {
  const joined = uniq([
    ...toStringArray(input.identityCues),
    ...toStringArray(input.sceneEffectCues),
    ...toStringArray(input.narrationFlags),
  ]).join(' ');

  if (/(volatile|surge|explosive|catastrophic)/.test(joined)) return 'volatile';
  if (/(hard|impact|threat|predatory)/.test(joined)) return 'hard';
  if (/(layer|charged|mystic|ritual|cinematic)/.test(joined)) return 'layered';
  return 'soft';
}
