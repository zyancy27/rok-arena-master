import type { ActionType, EmotionalState, IntentType } from './npcBrainTypes';

export interface NarratorInput {
  actorName: string;
  targetName?: string;
  intent: IntentType;
  action: ActionType;
  emotion: EmotionalState;
}

export interface NarratorOutput {
  text: string;
  voiceRate: number;
  voicePitch: number;
  soundCue?: string;
  animationTag?: string;
}

const STYLE = {
  MAX_WORDS: 18,
  DEFAULT_RATE: 1.15,
  FAST_RATE: 1.25,
  SLOW_RATE: 0.95,
} as const;

export function generateNarration(input: NarratorInput): NarratorOutput {
  const { actorName, targetName, intent, action, emotion } = input;
  const base = buildLine(actorName, targetName, intent, action, emotion);
  const trimmed = trimText(base, STYLE.MAX_WORDS);
  const voice = getVoiceSettings(intent, emotion);

  return {
    text: trimmed,
    voiceRate: voice.rate,
    voicePitch: voice.pitch,
    soundCue: getSound(intent),
    animationTag: getAnimation(intent),
  };
}

function buildLine(
  actor: string,
  target: string | undefined,
  intent: IntentType,
  _action: ActionType,
  _emotion: EmotionalState,
): string {
  const targetSuffix = target ? ` ${target}` : '';

  switch (intent) {
    case 'attack':
      return `${actor} strikes${targetSuffix} with force.`;
    case 'counterattack':
      return target ? `${actor} snaps back instantly at ${target}.` : `${actor} snaps back instantly.`;
    case 'flee':
      return `${actor} turns and bolts away.`;
    case 'retreat':
      return `${actor} steps back, creating space.`;
    case 'threaten':
      return target ? `${actor} glares at ${target}, voice low with warning.` : `${actor} glares, voice low with warning.`;
    case 'negotiate':
      return `${actor} raises a hand, signaling pause.`;
    case 'hide':
      return `${actor} fades from sight.`;
    case 'ambush':
      return target ? `${actor} strikes from the shadows at ${target}.` : `${actor} strikes from the shadows.`;
    case 'defend':
      return `${actor} braces for impact.`;
    case 'taunt':
      return target ? `${actor} smirks at ${target}, provoking them.` : `${actor} smirks, provoking a response.`;
    case 'observe':
      return `${actor} watches carefully.`;
    case 'surrender':
      return `${actor} drops their guard and kneels.`;
    default:
      return `${actor} pauses.`;
  }
}

function trimText(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(' ')}...`;
}

function getVoiceSettings(intent: IntentType, emotion: EmotionalState) {
  let rate = STYLE.DEFAULT_RATE;
  let pitch = 1;

  if (['attack', 'counterattack', 'ambush'].includes(intent)) {
    rate = STYLE.FAST_RATE;
    pitch = 1.1;
  }

  if (intent === 'threaten' || emotion.type === 'suspicion') {
    rate = STYLE.SLOW_RATE;
    pitch = 0.9;
  }

  if (emotion.type === 'panic') {
    rate = 1.3;
    pitch = 1.2;
  }

  return { rate, pitch };
}

function getSound(intent: IntentType): string | undefined {
  switch (intent) {
    case 'attack':
    case 'counterattack':
      return 'sword_clash';
    case 'flee':
      return 'footsteps_fast';
    case 'threaten':
      return 'low_tension';
    case 'ambush':
      return 'whoosh_strike';
    case 'hide':
      return 'shadow_shift';
    default:
      return undefined;
  }
}

function getAnimation(intent: IntentType): string | undefined {
  switch (intent) {
    case 'attack':
      return 'attack_anim';
    case 'retreat':
      return 'step_back';
    case 'flee':
      return 'run';
    case 'hide':
      return 'fade_out';
    case 'ambush':
      return 'strike_fast';
    default:
      return undefined;
  }
}
