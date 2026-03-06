/**
 * ROK Immersive Interaction Engine
 * 
 * Core detection and classification logic for all immersion systems:
 * - Character aura detection
 * - Emotional text effects
 * - Dimensional glitch detection
 * - Environmental reactions
 * - Skill mastery visuals
 * - Hidden interaction detection
 * - Inventory type detection
 * - Ambient creature selection
 * - Whisper triggers
 * - Impact detection
 * - Item personality detection
 * 
 * Priority: clarity > immersion > spectacle
 */

// ── Types ───────────────────────────────────────────────────────

export type AuraType = 'fire' | 'ice' | 'electric' | 'dark' | 'light' | 'nature' | 'psychic' | 'void' | 'cosmic' | 'metal' | 'water' | 'wind' | 'toxic' | null;

export interface CharacterAura {
  type: AuraType;
  intensity: number; // 0-1
  cssClass: string;
  particleColor: string;
}

export type EmotionType = 'fear' | 'anger' | 'confusion' | 'determination' | 'sorrow' | 'excitement' | 'calm' | null;

export interface EmotionalEffect {
  emotion: EmotionType;
  cssClass: string;
  intensity: number;
}

export type GlitchType = 'dimensional' | 'temporal' | 'reality' | 'digital' | null;

export interface GlitchEffect {
  type: GlitchType;
  cssClass: string;
  frequency: number; // 0-1, how often glitch triggers
}

export interface EnvironmentalReaction {
  trigger: string;
  effect: string;
  cssClass: string;
  duration: number; // ms
  particleType?: string;
}

export interface SkillMasteryVisual {
  level: 'expert' | 'competent' | 'unstable' | 'desperate';
  cssClass: string;
  trailEffect?: string;
}

export interface HiddenInteraction {
  phrase: string;
  responseHint: string;
  category: 'inspect' | 'listen' | 'touch' | 'search' | 'sense';
}

export type InventoryDisplayType = 'bag' | 'portal';

export interface AmbientCreature {
  name: string;
  emoji: string;
  animation: string;
  environment: string[];
}

export interface ItemPersonality {
  itemName: string;
  reaction: string;
  cssClass: string;
}

export interface ImpactEffect {
  level: 'light' | 'medium' | 'heavy' | 'devastating';
  cssClass: string;
  screenShake: boolean;
  shockwave: boolean;
  cracks: boolean;
}

// ── Aura Detection ──────────────────────────────────────────────

const AURA_PATTERNS: Array<{ type: AuraType; patterns: RegExp[]; cssClass: string; particleColor: string }> = [
  { type: 'fire', patterns: [/\b(fire|flame|pyro|burn|inferno|magma|lava|heat|ember|blaze|combustion)\b/i], cssClass: 'aura-fire', particleColor: '#FF6B35' },
  { type: 'ice', patterns: [/\b(ice|frost|cryo|freeze|cold|blizzard|glacial|arctic|snow|chill)\b/i], cssClass: 'aura-ice', particleColor: '#88D4F5' },
  { type: 'electric', patterns: [/\b(electric|lightning|thunder|volt|shock|spark|plasma|current|static)\b/i], cssClass: 'aura-electric', particleColor: '#FFE66D' },
  { type: 'dark', patterns: [/\b(dark|shadow|void|death|necrotic|corrupt|demonic|hell|abyss|curse)\b/i], cssClass: 'aura-dark', particleColor: '#6B2FA0' },
  { type: 'light', patterns: [/\b(light|holy|divine|celestial|sacred|radiant|pure|angelic|blessing)\b/i], cssClass: 'aura-light', particleColor: '#FFD93D' },
  { type: 'nature', patterns: [/\b(nature|plant|earth|forest|wood|vine|root|flora|organic|druid)\b/i], cssClass: 'aura-nature', particleColor: '#4CAF50' },
  { type: 'psychic', patterns: [/\b(psychic|mental|telepathy|telekinesis|mind|psionic|brain|thought|cognitive)\b/i], cssClass: 'aura-psychic', particleColor: '#CE93D8' },
  { type: 'void', patterns: [/\b(void|dimension|reality.?warp|spacetime|antimatter|nullif|erasure|oblivion)\b/i], cssClass: 'aura-void', particleColor: '#1A1A2E' },
  { type: 'cosmic', patterns: [/\b(cosmic|stellar|star|galaxy|nebula|celestial|astral|universal)\b/i], cssClass: 'aura-cosmic', particleColor: '#B39DDB' },
  { type: 'metal', patterns: [/\b(metal|steel|iron|mech|machine|cyber|chrome|titanium|alloy)\b/i], cssClass: 'aura-metal', particleColor: '#90A4AE' },
  { type: 'water', patterns: [/\b(water|ocean|sea|aqua|hydro|tide|wave|liquid|rain|flood)\b/i], cssClass: 'aura-water', particleColor: '#4FC3F7' },
  { type: 'wind', patterns: [/\b(wind|air|gust|tornado|hurricane|breeze|cyclone|storm|tempest)\b/i], cssClass: 'aura-wind', particleColor: '#B2EBF2' },
  { type: 'toxic', patterns: [/\b(toxic|poison|venom|acid|chemical|corrosive|plague|pestilence)\b/i], cssClass: 'aura-toxic', particleColor: '#76FF03' },
];

export function detectCharacterAura(powers: string | null, abilities: string | null, personality: string | null): CharacterAura | null {
  if (!powers && !abilities) return null;
  const combined = `${powers ?? ''} ${abilities ?? ''} ${personality ?? ''}`.toLowerCase();
  
  let bestMatch: CharacterAura | null = null;
  let bestCount = 0;
  
  for (const aura of AURA_PATTERNS) {
    let count = 0;
    for (const pattern of aura.patterns) {
      const matches = combined.match(new RegExp(pattern.source, 'gi'));
      if (matches) count += matches.length;
    }
    if (count > bestCount) {
      bestCount = count;
      bestMatch = { type: aura.type, intensity: Math.min(count / 5, 1), cssClass: aura.cssClass, particleColor: aura.particleColor };
    }
  }
  
  return bestMatch;
}

// ── Emotion Detection ───────────────────────────────────────────

const EMOTION_PATTERNS: Array<{ emotion: EmotionType; patterns: RegExp[]; cssClass: string }> = [
  { emotion: 'fear', patterns: [/\b(fear|afraid|terrif|horrif|trembl|shak|panic|dread|scar[ed])\b/i], cssClass: 'emotion-fear' },
  { emotion: 'anger', patterns: [/\b(anger|rag[ei]|fur[iy]|wrath|hatred|infuriat|seeth|livid|enraged)\b/i], cssClass: 'emotion-anger' },
  { emotion: 'confusion', patterns: [/\b(confus|daze|stagger|disoriented|bewild|perplex|dizzied|stumbl)\b/i], cssClass: 'emotion-confusion' },
  { emotion: 'determination', patterns: [/\b(determin|resolv|steeled|focus|unwaver|defiant|stand.{0,5}ground)\b/i], cssClass: 'emotion-determination' },
  { emotion: 'sorrow', patterns: [/\b(sorrow|grief|sad|mourn|despair|anguish|tears?|wept|cry|sob)\b/i], cssClass: 'emotion-sorrow' },
  { emotion: 'excitement', patterns: [/\b(excit|thrill|elat|ecstat|exhilarat|rush|adrenaline|fired.?up)\b/i], cssClass: 'emotion-excitement' },
];

export function detectEmotion(messageText: string): EmotionalEffect | null {
  const cleaned = messageText.replace(/\*/g, '').toLowerCase();
  
  for (const em of EMOTION_PATTERNS) {
    for (const pattern of em.patterns) {
      if (pattern.test(cleaned)) {
        return { emotion: em.emotion, cssClass: em.cssClass, intensity: 0.7 };
      }
    }
  }
  return null;
}

// ── Dimensional Glitch Detection ────────────────────────────────

const GLITCH_PATTERNS: Array<{ type: GlitchType; patterns: RegExp[]; cssClass: string }> = [
  { type: 'dimensional', patterns: [/\b(dimension|portal|rift|warp|fold.?space|phase.?shift|pocket.?dimension)\b/i], cssClass: 'glitch-dimensional' },
  { type: 'temporal', patterns: [/\b(time.?stop|chronol|temporal|rewind|fast.?forward|time.?loop)\b/i], cssClass: 'glitch-temporal' },
  { type: 'reality', patterns: [/\b(reality.?break|reality.?warp|reality.?bend|glitch|distort.?reality)\b/i], cssClass: 'glitch-reality' },
  { type: 'digital', patterns: [/\b(pixel|data|code|matrix|simulat|virtual|binary|digital)\b/i], cssClass: 'glitch-digital' },
];

export function detectGlitchAbility(powers: string | null, abilities: string | null): GlitchEffect | null {
  if (!powers && !abilities) return null;
  const combined = `${powers ?? ''} ${abilities ?? ''}`.toLowerCase();
  
  for (const g of GLITCH_PATTERNS) {
    for (const pattern of g.patterns) {
      if (pattern.test(combined)) {
        return { type: g.type, cssClass: g.cssClass, frequency: 0.15 };
      }
    }
  }
  return null;
}

export function shouldTriggerGlitch(glitch: GlitchEffect | null): boolean {
  if (!glitch) return false;
  return Math.random() < glitch.frequency;
}

// ── Environmental Reactions ─────────────────────────────────────

const ENV_REACTION_PATTERNS: Array<{ pattern: RegExp; effect: string; cssClass: string; duration: number; particleType: string }> = [
  { pattern: /\b(punch|slam|hit|strike|smash|pound|crash).{0,20}(wall|ground|floor|pillar|column|building|structure)\b/i, effect: 'dust_burst', cssClass: 'env-react-dust', duration: 2000, particleType: 'dust' },
  { pattern: /\b(drag|scrape|slide).{0,20}(metal|steel|stone|concrete|ground)\b/i, effect: 'sparks', cssClass: 'env-react-sparks', duration: 1500, particleType: 'sparks' },
  { pattern: /\b(land|crash|fall|drop|impact).{0,10}(heavy|hard|forceful|massive)\b/i, effect: 'debris_shake', cssClass: 'env-react-debris', duration: 2500, particleType: 'debris' },
  { pattern: /\b(heavy.?landing|crater|ground.?shak|earth.?quak|stomp)\b/i, effect: 'ground_shake', cssClass: 'env-react-shake', duration: 3000, particleType: 'debris' },
  { pattern: /\b(shatter|break|crack|splintr|fragment|demolish|destroy)\b/i, effect: 'shatter', cssClass: 'env-react-shatter', duration: 2000, particleType: 'fragments' },
  { pattern: /\b(splash|dive|submerge|plunge).{0,15}water\b/i, effect: 'splash', cssClass: 'env-react-splash', duration: 1800, particleType: 'water' },
  { pattern: /\b(tree|branch|wood).{0,15}(snap|break|crash|fall)\b/i, effect: 'wood_snap', cssClass: 'env-react-woodsnap', duration: 1500, particleType: 'splinters' },
];

export function detectEnvironmentalReaction(messageText: string): EnvironmentalReaction | null {
  const cleaned = messageText.replace(/\*/g, '');
  
  for (const er of ENV_REACTION_PATTERNS) {
    if (er.pattern.test(cleaned)) {
      return {
        trigger: cleaned.match(er.pattern)?.[0] ?? '',
        effect: er.effect,
        cssClass: er.cssClass,
        duration: er.duration,
        particleType: er.particleType,
      };
    }
  }
  return null;
}

// ── Skill Mastery Detection ─────────────────────────────────────

export function detectSkillMastery(
  skillStat: number | null | undefined,
  messageText: string,
  isInjured: boolean = false,
): SkillMasteryVisual {
  const skill = skillStat ?? 50;
  const text = messageText.replace(/\*/g, '').toLowerCase();
  const hasHaste = /\b(hasty|hasti|rush|reckless|desperat|wild|frantic)\b/i.test(text);
  const isPoorPosition = /\b(off.?balance|stumbl|trip|falling|prone|pinned)\b/i.test(text);
  
  if (isInjured || isPoorPosition) {
    return { level: 'desperate', cssClass: 'skill-desperate', trailEffect: 'unstable-flicker' };
  }
  if (hasHaste || skill < 30) {
    return { level: 'unstable', cssClass: 'skill-unstable', trailEffect: 'unstable-flicker' };
  }
  if (skill >= 80) {
    return { level: 'expert', cssClass: 'skill-expert', trailEffect: 'smooth-trail' };
  }
  return { level: 'competent', cssClass: 'skill-competent' };
}

// ── Hidden Interaction Detection ────────────────────────────────

const INTERACTION_PATTERNS: Array<{ pattern: RegExp; category: HiddenInteraction['category']; responseHint: string }> = [
  { pattern: /\b(listen|hear|attune|ear).{0,15}(careful|close|intently|surroundings?)\b/i, category: 'listen', responseHint: 'auditory_discovery' },
  { pattern: /\b(inspect|examin|study|look.?at|observe).{0,15}(wall|ground|floor|object|area|door|symbol|rune)\b/i, category: 'inspect', responseHint: 'visual_discovery' },
  { pattern: /\b(touch|feel|press|run.{0,5}hand|place.{0,5}hand|grip)\b/i, category: 'touch', responseHint: 'tactile_discovery' },
  { pattern: /\b(search|rummage|dig|look.?for|hunt.?for|check.?for)\b/i, category: 'search', responseHint: 'search_discovery' },
  { pattern: /\b(sense|feel.{0,5}energy|reach.{0,5}out|detect|probe|scan)\b/i, category: 'sense', responseHint: 'sensory_discovery' },
];

export function detectHiddenInteraction(messageText: string): HiddenInteraction | null {
  const cleaned = messageText.replace(/\*/g, '');
  
  for (const ip of INTERACTION_PATTERNS) {
    const match = cleaned.match(ip.pattern);
    if (match) {
      return {
        phrase: match[0],
        responseHint: ip.responseHint,
        category: ip.category,
      };
    }
  }
  return null;
}

// ── Inventory Display Type ──────────────────────────────────────

export function detectInventoryType(powers: string | null, abilities: string | null): InventoryDisplayType {
  if (!powers && !abilities) return 'bag';
  const combined = `${powers ?? ''} ${abilities ?? ''}`.toLowerCase();
  if (/pocket.?dimension|dimensional.?storage|void.?pocket|hammerspace|spatial.?rift|interdimensional/i.test(combined)) {
    return 'portal';
  }
  return 'bag';
}

// ── Item Personality Detection ──────────────────────────────────

const SENTIENT_ITEM_PATTERNS = [
  /\b(sentient|alive|living|conscious|sapient|reactive|self.?aware)\b/i,
  /\b(speaks?|whispers?|talks?|hums?|glows?|pulses?|responds?|reacts?)\b/i,
  /\b(bonded|symbiotic|parasitic|fused|linked|connected)\b/i,
];

export function detectItemPersonality(weaponsItems: string | null): ItemPersonality[] {
  if (!weaponsItems) return [];
  const items: ItemPersonality[] = [];
  const hasSentience = SENTIENT_ITEM_PATTERNS.some(p => p.test(weaponsItems));
  
  if (!hasSentience) return [];
  
  // Extract individual items and check for personality
  const itemLines = weaponsItems.split(/[,\n;•\-]/).filter(l => l.trim().length > 3);
  
  for (const line of itemLines) {
    const trimmed = line.trim();
    if (/hum|vibrat|pulse|glow|shift|warm|cold|react|whisper|speak/i.test(trimmed)) {
      const reactions = [
        'hums softly',
        'pulses with energy',
        'shifts restlessly',
        'glows faintly',
        'vibrates gently',
        'whispers something',
      ];
      items.push({
        itemName: trimmed.slice(0, 30),
        reaction: reactions[Math.floor(Math.random() * reactions.length)],
        cssClass: 'item-sentient',
      });
    }
  }
  
  return items;
}

// ── Ambient Creature Selection ──────────────────────────────────

const AMBIENT_CREATURES: AmbientCreature[] = [
  { name: 'bird', emoji: '🐦', animation: 'fly-across', environment: ['forest', 'outdoor', 'mountain', 'field', 'village', 'sky'] },
  { name: 'butterfly', emoji: '🦋', animation: 'flutter', environment: ['forest', 'garden', 'field', 'nature', 'outdoor'] },
  { name: 'firefly', emoji: '✨', animation: 'drift-glow', environment: ['forest', 'night', 'swamp', 'cave', 'dark'] },
  { name: 'bat', emoji: '🦇', animation: 'swoop', environment: ['cave', 'dark', 'underground', 'night', 'ruins'] },
  { name: 'fish', emoji: '🐠', animation: 'swim', environment: ['water', 'ocean', 'river', 'underwater', 'lake'] },
  { name: 'rat', emoji: '🐀', animation: 'scurry', environment: ['sewer', 'underground', 'dungeon', 'ruins', 'urban'] },
  { name: 'spider', emoji: '🕷️', animation: 'descend', environment: ['cave', 'dark', 'ruins', 'dungeon', 'abandoned'] },
  { name: 'crow', emoji: '🐦‍⬛', animation: 'circle', environment: ['battlefield', 'ruins', 'dark', 'death', 'graveyard'] },
  { name: 'jellyfish', emoji: '🪼', animation: 'float', environment: ['underwater', 'ocean', 'deep', 'alien'] },
  { name: 'moth', emoji: '🦋', animation: 'circle-light', environment: ['night', 'fire', 'light', 'lamp'] },
];

export function selectAmbientCreatures(environmentTags: string[]): AmbientCreature[] {
  if (environmentTags.length === 0) return [];
  const tagsLower = environmentTags.map(t => t.toLowerCase());
  
  return AMBIENT_CREATURES.filter(c =>
    c.environment.some(env => tagsLower.some(t => t.includes(env) || env.includes(t)))
  ).slice(0, 2);
}

// ── Whisper System ──────────────────────────────────────────────

const WHISPER_CHANCE = 0.03; // 3% per message

const WHISPER_MESSAGES = [
  'A faint whisper moves through the air...',
  'Something stirs in the distance...',
  'The shadows seem to shift on their own...',
  'A distant echo fades before you can make out the words...',
  'For a moment, the air feels heavier...',
  'A chill runs through the arena...',
  'The ground beneath hums with an unseen energy...',
  'You feel eyes watching from somewhere unseen...',
];

export function shouldTriggerWhisper(turnNumber: number): boolean {
  if (turnNumber < 4) return false; // Not in opening turns
  return Math.random() < WHISPER_CHANCE;
}

export function getWhisperMessage(): string {
  return WHISPER_MESSAGES[Math.floor(Math.random() * WHISPER_MESSAGES.length)];
}

// ── Physical Impact Detection ───────────────────────────────────

const IMPACT_KEYWORDS: Array<{ pattern: RegExp; level: ImpactEffect['level'] }> = [
  { pattern: /\b(obliterat|annihilat|devastat|cataclysm|apocaly|omega|ultimate.?attack)\b/i, level: 'devastating' },
  { pattern: /\b(massive.?impact|explosion|crater|shockwave|thunder.?strike|supernova)\b/i, level: 'heavy' },
  { pattern: /\b(powerful.?hit|strong.?punch|heavy.?blow|slam|crash|smash|crush)\b/i, level: 'medium' },
  { pattern: /\b(hit|punch|kick|strike|slap|jab|tap)\b/i, level: 'light' },
];

export function detectImpact(messageText: string): ImpactEffect | null {
  const cleaned = messageText.replace(/\*/g, '');
  
  for (const ik of IMPACT_KEYWORDS) {
    if (ik.pattern.test(cleaned)) {
      return {
        level: ik.level,
        cssClass: `impact-${ik.level}`,
        screenShake: ik.level === 'heavy' || ik.level === 'devastating',
        shockwave: ik.level === 'devastating',
        cracks: ik.level === 'devastating',
      };
    }
  }
  return null;
}

// ── Narrator Curiosity ──────────────────────────────────────────

const CURIOSITY_CHANCE = 0.04; // 4% chance

const CURIOSITY_MOMENTS = [
  'The narrator hesitates…\n\nSomething about this action feels strange.',
  'The narrator pauses, as if reconsidering…',
  'Even the arena seems to hold its breath for a moment.',
  'A brief silence fills the air, as if the world itself noticed.',
  'The narrator blinks. That was… unexpected.',
];

export function shouldTriggerNarratorCuriosity(messageText: string): boolean {
  const hasUnusualAction = /\b(never.?been.?done|impossible|unprecedented|defying|paradox|contradict)\b/i.test(messageText);
  if (hasUnusualAction) return Math.random() < 0.3;
  return Math.random() < CURIOSITY_CHANCE;
}

export function getNarratorCuriosityMessage(): string {
  return CURIOSITY_MOMENTS[Math.floor(Math.random() * CURIOSITY_MOMENTS.length)];
}

// ── Battlefield Memory ──────────────────────────────────────────

export interface BattlefieldDamage {
  id: string;
  description: string;
  location: string;
  severity: 'minor' | 'moderate' | 'severe';
  turnCreated: number;
}

export interface BattlefieldMemory {
  damages: BattlefieldDamage[];
  arenaStability: number;    // 0-100, starts at 100
  hazardLevel: number;       // 0-100, starts at 0
  environmentalPressure: number; // 0-100, starts at 0
}

export function createBattlefieldMemory(): BattlefieldMemory {
  return { damages: [], arenaStability: 100, hazardLevel: 0, environmentalPressure: 0 };
}

const DAMAGE_PATTERNS: Array<{ pattern: RegExp; description: string; severity: BattlefieldDamage['severity']; stabilityLoss: number; hazardGain: number }> = [
  { pattern: /\b(destroy|demolish|obliterat|annihilat).{0,20}(building|wall|pillar|structure|tower|bridge)\b/i, description: 'Structural collapse', severity: 'severe', stabilityLoss: 15, hazardGain: 10 },
  { pattern: /\b(crack|fracture|split|break).{0,20}(ground|floor|earth|foundation|pillar|column)\b/i, description: 'Ground fractures', severity: 'moderate', stabilityLoss: 8, hazardGain: 5 },
  { pattern: /\b(fire|flame|burn|inferno|blaze).{0,15}(spread|engulf|cover|consume)\b/i, description: 'Burning area', severity: 'moderate', stabilityLoss: 5, hazardGain: 8 },
  { pattern: /\b(flood|water|wave).{0,15}(rush|fill|rise|cover)\b/i, description: 'Flooded area', severity: 'moderate', stabilityLoss: 5, hazardGain: 6 },
  { pattern: /\b(crater|hole|pit|chasm|fissure)\b/i, description: 'Impact crater', severity: 'moderate', stabilityLoss: 10, hazardGain: 5 },
  { pattern: /\b(rubble|debris|wreckage|ruin)\b/i, description: 'Scattered debris', severity: 'minor', stabilityLoss: 3, hazardGain: 2 },
  { pattern: /\b(explosion|explod|blast|detonat)\b/i, description: 'Blast damage', severity: 'severe', stabilityLoss: 12, hazardGain: 8 },
];

export function updateBattlefieldMemory(
  memory: BattlefieldMemory,
  messageText: string,
  turnNumber: number,
): BattlefieldMemory {
  const cleaned = messageText.replace(/\*/g, '');
  const newDamages: BattlefieldDamage[] = [];
  let stabilityLoss = 0;
  let hazardGain = 0;
  
  for (const dp of DAMAGE_PATTERNS) {
    if (dp.pattern.test(cleaned)) {
      // Avoid duplicate damage descriptions
      const alreadyExists = memory.damages.some(d => d.description === dp.description);
      if (!alreadyExists) {
        newDamages.push({
          id: `dmg-${turnNumber}-${Math.random().toString(36).slice(2, 6)}`,
          description: dp.description,
          location: 'arena',
          severity: dp.severity,
          turnCreated: turnNumber,
        });
      }
      stabilityLoss += dp.stabilityLoss;
      hazardGain += dp.hazardGain;
    }
  }
  
  return {
    damages: [...memory.damages, ...newDamages].slice(-15), // Keep last 15
    arenaStability: Math.max(0, memory.arenaStability - stabilityLoss),
    hazardLevel: Math.min(100, memory.hazardLevel + hazardGain),
    environmentalPressure: Math.min(100, memory.environmentalPressure + (stabilityLoss > 0 ? 3 : 0)),
  };
}

export function getBattlefieldMemoryContext(memory: BattlefieldMemory): string {
  if (memory.damages.length === 0) return '';
  
  const recentDamages = memory.damages.slice(-5);
  const lines = recentDamages.map(d => `- ${d.description} (${d.severity})`);
  
  let context = `\nBATTLEFIELD STATE:\nArena Stability: ${memory.arenaStability}%\nHazard Level: ${memory.hazardLevel}%\n`;
  context += `Recent damage:\n${lines.join('\n')}`;
  
  if (memory.arenaStability < 30) {
    context += '\nWARNING: Arena is critically damaged and may collapse.';
  }
  
  return context;
}

// ── Rare Discovery (Campaign Only) ──────────────────────────────

const RARE_DISCOVERY_CHANCE = 0.02; // 2%

const RARE_DISCOVERIES = [
  'You reach into your bag… something unfamiliar is inside.',
  'Your fingers brush against something cold and unexpected at the bottom of your pack.',
  'A faint glow catches your eye from within your belongings.',
  'Something shifts in your inventory that wasn\'t there before…',
];

export function shouldTriggerRareDiscovery(): boolean {
  return Math.random() < RARE_DISCOVERY_CHANCE;
}

export function getRareDiscoveryMessage(): string {
  return RARE_DISCOVERIES[Math.floor(Math.random() * RARE_DISCOVERIES.length)];
}

// ── Ambient Sound Visualization Tags ────────────────────────────

export type AmbientSoundVisual = 'wind-streaks' | 'rain-drops' | 'spark-particles' | 'water-ripples' | 'fire-crackle' | 'thunder-flash' | 'sand-drift' | null;

export function getAmbientSoundVisual(environmentTags: string[]): AmbientSoundVisual {
  const tags = environmentTags.map(t => t.toLowerCase());
  if (tags.some(t => ['storm', 'wind', 'hurricane', 'tornado'].includes(t))) return 'wind-streaks';
  if (tags.some(t => ['rain', 'monsoon', 'drizzle'].includes(t))) return 'rain-drops';
  if (tags.some(t => ['electric', 'reactor', 'energy'].includes(t))) return 'spark-particles';
  if (tags.some(t => ['water', 'ocean', 'underwater', 'river'].includes(t))) return 'water-ripples';
  if (tags.some(t => ['fire', 'lava', 'volcano', 'heat'].includes(t))) return 'fire-crackle';
  if (tags.some(t => ['thunder', 'lightning', 'storm'].includes(t))) return 'thunder-flash';
  if (tags.some(t => ['desert', 'sand', 'dust'].includes(t))) return 'sand-drift';
  return null;
}
