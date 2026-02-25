export interface UserSettings {
  audio: AudioSettings;
  visual: VisualSettings;
  performance: PerformanceSettings;
  battle: BattlePreferences;
  immersion: ImmersionSettings;
  ai: AISettings;
  social: SocialSettings;
  notifications: NotificationSettings;
  accessibility: AccessibilitySettings;
}

export interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  momentumVolume: number;
  chargeSfx: boolean;
  glitchAudio: boolean;
  dimensionalBass: boolean;
  heartbeatLowHP: boolean;
  spatialAudio: boolean;
  batterySaverAudio: boolean;
}

export interface VisualSettings {
  vfxIntensity: 'low' | 'medium' | 'high';
  globalEffects: boolean;
  personalEffects: boolean;
  chargeIntensity: 'low' | 'medium' | 'high';
  momentumGlow: 'low' | 'medium' | 'high';
  glitchStrength: number;
  screenShake: boolean;
  saturationBoost: boolean;
  darkMode: boolean;
  reducedFlash: boolean;
}

export interface PerformanceSettings {
  batterySaver: boolean;
  reduceAnimations: boolean;
  particleLimit: boolean;
  capFPS: number;
  lowDataMode: boolean;
  adaptiveVFX: boolean;
  disablePhysicsVisuals: boolean;
}

export interface BattlePreferences {
  confirmOvercharge: boolean;
  showDodgeChance: boolean;
  showMomentum: boolean;
  showPsychIndicator: boolean;
  detailedLogs: boolean;
  turnTimer: boolean;
  showOpponentCharge: boolean;
  dynamicBattlefieldEffects: boolean;
  narratorFrequency: 'always' | 'key_moments' | 'off';
  diceEnabled: boolean;
  arenaModifiersEnabled: boolean;
}

export interface ImmersionSettings {
  hideOOC: boolean;
  autoScrollChat: boolean;
  cinematicMode: boolean;
  autoPlayIntro: boolean;
  showTitles: boolean;
  finalBlowCinematic: boolean;
  ambientLoreText: boolean;
}

export interface AISettings {
  adaptiveAI: boolean;
  aiDifficulty: 'easy' | 'balanced' | 'hard' | 'brutal';
  randomPersonality: boolean;
  escalationEnabled: boolean;
  surpriseNPC: boolean;
  reactionSpeedMod: number;
}

export interface SocialSettings {
  showOnline: boolean;
  allowSpectators: boolean;
  allowReplaySharing: boolean;
  allowFriendRequests: boolean;
  publicHistory: boolean;
  blockDMs: boolean;
}

export interface NotificationSettings {
  matchFound: boolean;
  turnReminder: boolean;
  rivalOnline: boolean;
  factionEvent: boolean;
  weeklyModifier: boolean;
  lowHPWarning: boolean;
}

export interface AccessibilitySettings {
  largeText: boolean;
  highContrast: boolean;
  colorblindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  reduceMotion: boolean;
  ttsLogs: boolean;
  sfxSubtitles: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  audio: {
    masterVolume: 0.8,
    sfxVolume: 0.7,
    ambientVolume: 0.5,
    momentumVolume: 0.6,
    chargeSfx: true,
    glitchAudio: true,
    dimensionalBass: true,
    heartbeatLowHP: true,
    spatialAudio: false,
    batterySaverAudio: false,
  },
  visual: {
    vfxIntensity: 'medium',
    globalEffects: true,
    personalEffects: true,
    chargeIntensity: 'medium',
    momentumGlow: 'medium',
    glitchStrength: 0.5,
    screenShake: true,
    saturationBoost: false,
    darkMode: true,
    reducedFlash: false,
  },
  performance: {
    batterySaver: false,
    reduceAnimations: false,
    particleLimit: false,
    capFPS: 60,
    lowDataMode: false,
    adaptiveVFX: true,
    disablePhysicsVisuals: false,
  },
  battle: {
    confirmOvercharge: true,
    showDodgeChance: false,
    showMomentum: true,
    showPsychIndicator: false,
    detailedLogs: true,
    turnTimer: true,
    showOpponentCharge: false,
    dynamicBattlefieldEffects: true,
    narratorFrequency: 'key_moments',
    diceEnabled: true,
    arenaModifiersEnabled: false,
  },
  immersion: {
    hideOOC: false,
    autoScrollChat: true,
    cinematicMode: false,
    autoPlayIntro: true,
    showTitles: true,
    finalBlowCinematic: true,
    ambientLoreText: true,
  },
  ai: {
    adaptiveAI: true,
    aiDifficulty: 'balanced',
    randomPersonality: true,
    escalationEnabled: true,
    surpriseNPC: false,
    reactionSpeedMod: 1.0,
  },
  social: {
    showOnline: true,
    allowSpectators: true,
    allowReplaySharing: true,
    allowFriendRequests: true,
    publicHistory: false,
    blockDMs: false,
  },
  notifications: {
    matchFound: true,
    turnReminder: true,
    rivalOnline: false,
    factionEvent: true,
    weeklyModifier: true,
    lowHPWarning: true,
  },
  accessibility: {
    largeText: false,
    highContrast: false,
    colorblindMode: 'none',
    reduceMotion: false,
    ttsLogs: false,
    sfxSubtitles: false,
  },
};
