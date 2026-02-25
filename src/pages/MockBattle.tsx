import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { getTierName } from '@/lib/game-constants';
import { generateBattleEnvironment, getEnvironmentStatImpact, BattleEnvironment, shouldTriggerHazard, generateHazardEventPrompt } from '@/lib/battle-environment';
import { generatePhysicsContext, generateSkillContext, shouldTriggerSkillMishap, shouldTriggerCritical } from '@/lib/battle-physics';
import {
  determineHit,
  determineMentalHit,
  initializeBattleState,
  useConcentration,
  useOffensiveConcentration,
  CONCENTRATION_GAP_THRESHOLD,
  createConstruct,
  attackConstruct,
  repairConstructWithConcentration,
  updateConstructDurability,
  addConstructToBattle,
  getCharacterConstructs,
  detectConstructCreation,
  detectConstructAttack,
  type HitDetermination,
  type ConcentrationResult,
  type OffensiveConcentrationResult,
  type BattleState,
  type Construct,
  type ConstructDefenseResult,
  type ConstructRepairResult,
} from '@/lib/battle-dice';
import {
  validateDefense,
  generateDefenseEnforcementPrompt,
  getDamageLevel,
} from '@/lib/defense-validation';
import SkillProficiencyBar from '@/components/battles/SkillProficiencyBar';
import TurnOrderIndicator from '@/components/battles/TurnOrderIndicator';
import ConcentrationButton from '@/components/battles/ConcentrationButton';
import DiceRollChatMessage from '@/components/battles/DiceRollChatMessage';
import ConstructPanel from '@/components/battles/ConstructPanel';
import ConstructDiceMessage from '@/components/battles/ConstructDiceMessage';
import TurnIndicatorWrapper from '@/components/battles/TurnIndicatorWrapper';
import BattleTurnColorPicker from '@/components/battles/BattleTurnColorPicker';
import BattlefieldEffectsOverlay from '@/components/battles/BattlefieldEffectsOverlay';
import EnvironmentChatBackground from '@/components/battles/EnvironmentChatBackground';
import { CharacterStatusOverlay } from '@/components/battles/CharacterStatusOverlay';
import { useBattleTurnColor } from '@/hooks/use-battle-turn-color';
import { useBattlefieldEffects } from '@/components/battles/useBattlefieldEffects';
import { useCharacterStatusEffects } from '@/hooks/use-character-status-effects';
import type { ActiveBattlefieldEffect } from '@/lib/battlefield-effects';
import { detectCharacterStatusEffects } from '@/lib/character-status-effects';
import {
  createMomentumState,
  applyMomentumEvents,
  detectMomentumEvents,
  tickEdgeState,
  getMomentumContext,
  EDGE_STATE_PRECISION_BONUS,
  EDGE_STATE_RISK_REDUCTION,
  type MomentumState,
} from '@/lib/battle-momentum';
import {
  createPsychologicalState,
  applyPsychEvent,
  detectPsychEvents,
  getDominantPsychCue,
  getRiskChanceModifier,
  getAccuracyModifier,
  getPsychologyContext,
  type PsychologicalState,
} from '@/lib/battle-psychology';
import {
  resolveOvercharge,
  getOverchargeContext,
} from '@/lib/battle-overcharge';
import MomentumMeter from '@/components/battles/MomentumMeter';
import ChargeIndicator from '@/components/battles/ChargeIndicator';
import OverchargeToggle from '@/components/battles/OverchargeToggle';
import PsychCueIndicator from '@/components/battles/PsychCueIndicator';
import ArenaModifierBadge from '@/components/battles/ArenaModifierBadge';
import SfxToggle from '@/components/battles/SfxToggle';
import { getActiveArenaModifiers, type ActiveArenaModifiers } from '@/lib/arena-modifiers';
import { useBattleSfx } from '@/hooks/use-battle-sfx';
import {
  createPlayerPattern,
  recordPlayerAction,
  deriveStrategy,
  shouldAdapt,
  getAdaptiveAIContext,
  type PlayerPattern,
  type AdaptiveStrategy,
} from '@/lib/battle-ai-adaptation';
import BattleOnboarding, { isOnboardingComplete, resetOnboarding } from '@/components/battles/BattleOnboarding';
import EmergencyLocationGenerator from '@/components/battles/EmergencyLocationGenerator';
import SaveLocationPrompt from '@/components/battles/SaveLocationPrompt';
import AICharacterNotePanel from '@/components/battles/AICharacterNotePanel';
import { useCharacterAINotes } from '@/hooks/use-character-ai-notes';
import {
  createChargeState,
  detectChargeInitiation,
  initiateCharge,
  validateChargeAction,
  tickChargeTurn,
  checkChargeInterruption,
  interruptCharge,
  resolveChargeAttack,
  completeCharge,
  tickChargeCooldown,
  getChargeContext,
  getChargeDefenseMultiplier,
  checkChargeRisk,
  type ChargeState,
} from '@/lib/battle-charge';
import { 
  ArrowLeft, 
  Swords, 
  Bot, 
  Send, 
  MessageSquare, 
  Sparkles,
  Mic,
  RefreshCw,
  User,
  MapPin,
  Globe,
  Zap,
  Atom,
  AlertTriangle,
  Info,
  Dices,
  HelpCircle
} from 'lucide-react';

interface UserCharacter {
  id: string;
  name: string;
  level: number;
  image_url: string | null;
  powers: string | null;
  abilities: string | null;
  stat_skill?: number | null;
  stat_strength?: number | null;
  stat_power?: number | null;
  stat_speed?: number | null;
  stat_durability?: number | null;
  stat_stamina?: number | null;
  stat_intelligence?: number | null;
  stat_battle_iq?: number | null;
  stat_luck?: number | null;
  personality?: string | null;
  mentality?: string | null;
}

interface DiceRollMessage {
  id: string;
  hitDetermination: HitDetermination;
  concentrationResult?: ConcentrationResult;
  attackerName: string;
  defenderName: string;
  timestamp: Date;
  channel: 'in_universe';
  isAIRoll?: boolean; // Indicates this is an AI opponent's attack roll
}

interface ConstructEventMessage {
  id: string;
  type: 'attack' | 'repair' | 'create';
  construct: Construct;
  attackResult?: ConstructDefenseResult;
  repairResult?: ConstructRepairResult;
  attackerName?: string;
  defenderName?: string;
  timestamp: Date;
  channel: 'in_universe';
}

interface StatusEffectsSnapshot {
  [key: string]: { type: string; intensity: string } | undefined;
}

interface Message {
  id: string;
  role: 'user' | 'ai' | 'narrator' | 'system';
  content: string;
  channel: 'in_universe' | 'out_of_universe';
  characterName?: string;
  statusEffectsSnapshot?: StatusEffectsSnapshot;
}

interface AIOpponent {
  id: string;
  name: string;
  level: number;
  personality: string;
  powers: string;
  category: string;
  skill?: number;
  tierReason: string; // Explains why this character is at this tier
}

interface PlanetData {
  planet_name: string;
  display_name: string | null;
  gravity: number | null;
  description: string | null;
}

// Original AI opponent templates with skill levels
// Tier System:
// 1 - Common Human: No special abilities whatsoever
// 2 - Enhanced Human: Peak human abilities (Batman, Captain America)
// 3 - Super Human: Superhuman powers, can include object-dependent powers (weapons, armor, rings)
// 4 - Legend: Control over mass/energy, powers are INTRINSIC (no objects needed)
// 5 - Title of Titan: Reality warpers, dimension lords - powers are part of their being
// 6 - Logic Bending: Can do anything with phrase/thought
// 7 - Logic Resorts: Functions as Tier 1, ignores Tier 6 commands, can die from normal wounds
// 
// IMPORTANT: If a character needs an object (armor, weapon, ring) for their powers,
// and removing that object makes them vulnerable to normal threats, they are Tier 3 MAX.
// Tier 4+ means you've transcended the need for objects - your power IS you.

const ORIGINAL_OPPONENTS: AIOpponent[] = [
  {
    id: 'training-bot',
    name: 'Training Sentinel',
    level: 2,
    personality: 'A stoic training construct designed to help warriors hone their skills. Speaks formally and provides tactical feedback.',
    powers: 'Adaptive Combat Analysis - can analyze and counter fighting styles',
    category: 'original',
    skill: 75,
    tierReason: 'Enhanced construct with peak combat analysis but no supernatural abilities.',
  },
  {
    id: 'chaos-imp',
    name: 'Zyx the Chaos Imp',
    level: 3,
    personality: 'A mischievous trickster who enjoys wordplay and unconventional attacks. Playful but cunning.',
    powers: 'Reality Pranks - minor reality distortions for comedic and tactical effect',
    category: 'original',
    skill: 55,
    tierReason: 'Intrinsic magical abilities allow minor reality distortion.',
  },
  {
    id: 'ancient-guardian',
    name: 'Aethon the Eternal',
    level: 4,
    personality: 'An ancient guardian who speaks in riddles and tests worthy challengers. Wise and patient.',
    powers: 'Cosmic Wisdom - manipulation of celestial energies and precognition',
    category: 'original',
    skill: 90,
    tierReason: 'Legendary being with intrinsic control over celestial energy.',
  },
];

// Iconic comic book character AI opponents with skill levels
const ICONIC_OPPONENTS: AIOpponent[] = [
  {
    id: 'hulk',
    name: 'The Hulk',
    level: 4,
    personality: 'HULK IS STRONGEST ONE THERE IS! Speaks in third person, simple sentences. Gets angrier as fight goes on. Surprisingly protective of innocent.',
    powers: 'Limitless Strength - grows stronger with rage, regeneration, thunderclap shockwaves, gamma radiation immunity',
    category: 'iconic',
    skill: 35,
    tierReason: 'Gamma mutation is intrinsic to his being. Power scales infinitely with rage.',
  },
  {
    id: 'wolverine',
    name: 'Wolverine',
    level: 3,
    personality: 'Gruff, sarcastic Canadian mutant. Calls everyone "bub." Has a code of honor despite his feral nature. Cigar-chomping anti-hero.',
    powers: 'Adamantium Claws - indestructible skeleton, superhuman senses, regenerative healing factor that makes him nearly unkillable',
    category: 'iconic',
    skill: 85,
    tierReason: 'Mutant healing factor is intrinsic, but adamantium skeleton is an enhancement. Without claws, still superhuman.',
  },
  {
    id: 'deadpool',
    name: 'Deadpool',
    level: 3,
    personality: 'Fourth-wall breaking merc with a mouth. Makes pop culture references, talks to the audience, chaotic and unpredictable. Maximum effort!',
    powers: 'Regenerative Healing - extreme regeneration, expert marksman and swordsman, unpredictable fighting style',
    category: 'iconic',
    skill: 70,
    tierReason: 'Healing factor is intrinsic mutation. Fourth-wall awareness is supernatural but doesn\'t grant combat advantage.',
  },
  {
    id: 'mr-fantastic',
    name: 'Mr. Fantastic',
    level: 3,
    personality: 'Brilliant scientist Reed Richards. Speaks technically, always calculating. Sometimes oblivious to social cues. Will explain the science.',
    powers: 'Elasticity - can stretch, reshape, and expand body infinitely. Genius-level intellect, one of the smartest beings alive',
    category: 'iconic',
    skill: 55,
    tierReason: 'Cosmic ray mutation is intrinsic. Elasticity is part of his cellular structure.',
  },
  {
    id: 'thor',
    name: 'Thor Odinson',
    level: 4,
    personality: 'Asgardian God of Thunder. Speaks in archaic, noble manner. Honorable warrior who respects worthy opponents. "Have at thee!"',
    powers: 'Thunder God - Mjolnir control, lightning manipulation, superhuman strength, flight, near-immortality',
    category: 'iconic',
    skill: 88,
    tierReason: 'Asgardian physiology is intrinsic. Can summon lightning without Mjolnir. Godhood is his nature.',
  },
  {
    id: 'magneto',
    name: 'Magneto',
    level: 4,
    personality: 'Master of magnetism and mutant supremacist. Eloquent, philosophical, sees himself as mutant savior. Holocaust survivor with complex morality.',
    powers: 'Magnetokinesis - control over all magnetic fields and metal, force fields, electromagnetic pulse generation',
    category: 'iconic',
    skill: 82,
    tierReason: 'Mutant power is intrinsic. Magnetic control is part of his biology, not derived from objects.',
  },
  {
    id: 'doctor-doom',
    name: 'Doctor Doom',
    level: 5,
    personality: 'Ruler of Latveria. Refers to himself in third person as "Doom." Arrogant genius who believes only he can save the world. Theatrical villain.',
    powers: 'Sorcery & Technology - genius inventor, powerful sorcerer, armored suit with vast weaponry, diplomatic immunity',
    category: 'iconic',
    skill: 92,
    tierReason: 'Mastered sorcery to reality-warping levels. Magic is intrinsic knowledge. Armor enhances but isn\'t required.',
  },
  {
    id: 'spider-man',
    name: 'Spider-Man',
    level: 3,
    personality: 'Friendly neighborhood wall-crawler. Cracks jokes constantly during fights. Great power, great responsibility. Queens accent optional.',
    powers: 'Spider Powers - wall-crawling, superhuman agility and strength, spider-sense danger detection, web-slinging',
    category: 'iconic',
    skill: 72,
    tierReason: 'Spider mutation is intrinsic. Web-shooters are gadgets but his core powers are biological.',
  },
];

// Anime & Manga character AI opponents with skill levels
const ANIME_OPPONENTS: AIOpponent[] = [
  {
    id: 'goku',
    name: 'Son Goku',
    level: 5,
    personality: 'Pure-hearted Saiyan warrior who lives for the thrill of battle. Cheerful, naive about non-combat things. Always seeking stronger opponents. "Kamehameha!"',
    powers: 'Saiyan Might - Super Saiyan transformations, Ki manipulation, Instant Transmission, Kamehameha, Ultra Instinct',
    category: 'anime',
    skill: 95,
    tierReason: 'Ki manipulation and transformations are intrinsic Saiyan biology. Can warp reality at highest forms.',
  },
  {
    id: 'naruto',
    name: 'Naruto Uzumaki',
    level: 4,
    personality: 'Hyperactive ninja who never gives up. Says "Believe it!" and "Dattebayo!" Wants to be acknowledged. Will talk-no-jutsu you into friendship.',
    powers: 'Nine-Tails Jinchuriki - Massive chakra reserves, Shadow Clone Jutsu, Rasengan, Sage Mode, Six Paths power',
    category: 'anime',
    skill: 78,
    tierReason: 'Kurama is sealed within him (intrinsic). Sage Mode and Six Paths are mastered abilities, not objects.',
  },
  {
    id: 'ichigo',
    name: 'Ichigo Kurosaki',
    level: 4,
    personality: 'Orange-haired Soul Reaper with a scowl. Protective of friends, reluctant hero. Sarcastic but has a strong moral code.',
    powers: 'Shinigami Powers - Zangetsu sword, Bankai transformation, Hollow powers, Quincy abilities, Getsuga Tensho',
    category: 'anime',
    skill: 70,
    tierReason: 'Zangetsu is a manifestation of his soul, not a separate weapon. Powers are intrinsic heritage.',
  },
  {
    id: 'luffy',
    name: 'Monkey D. Luffy',
    level: 5,
    personality: 'Rubber pirate captain who will be King of the Pirates! Simple-minded, loves meat, fiercely loyal to crew. Gear transformations mid-fight.',
    powers: 'Gum-Gum Fruit - Rubber body, Gear Second/Third/Fourth/Fifth, Haki mastery, Nika awakening',
    category: 'anime',
    skill: 75,
    tierReason: 'Devil Fruit permanently altered his body. Nika awakening grants reality-warping cartoon physics.',
  },
  {
    id: 'saitama',
    name: 'Saitama',
    level: 6,
    personality: 'Bored hero who defeats everything in one punch. Deadpan, obsessed with supermarket sales. Broke his limiter through training alone.',
    powers: 'Limitless Strength - One punch knockout, immeasurable speed, invulnerability, Serious Series techniques',
    category: 'anime',
    skill: 50,
    tierReason: 'Human who broke his natural limiter. Power is intrinsic - no objects, mutations, or magic. Pure self-achieved godhood.',
  },
  {
    id: 'vegeta',
    name: 'Vegeta',
    level: 5,
    personality: 'Prince of all Saiyans! Arrogant, prideful warrior with a rivalry complex. Has grown from villain to anti-hero. "Its over 9000!"',
    powers: 'Saiyan Pride - Super Saiyan forms, Final Flash, Big Bang Attack, Ultra Ego, intense training discipline',
    category: 'anime',
    skill: 93,
    tierReason: 'Ki manipulation and transformations are intrinsic Saiyan biology. Ultra Ego approaches reality-warping.',
  },
  {
    id: 'zoro',
    name: 'Roronoa Zoro',
    level: 3,
    personality: 'Three-sword style master who gets lost constantly. Stoic, loves sake and naps. Dreams of being worlds greatest swordsman.',
    powers: 'Santoryu - Three Sword Style, Haki mastery, Asura technique, superhuman endurance and strength',
    category: 'anime',
    skill: 94,
    tierReason: 'Relies on swords (object-dependent), but Haki and Asura manifestation are intrinsic abilities.',
  },
  {
    id: 'gojo',
    name: 'Gojo Satoru',
    level: 5,
    personality: 'Blindfolded sorcerer whos the strongest. Playful and arrogant, loves teasing people. Actually cares deeply but hides it behind jokes.',
    powers: 'Infinity & Six Eyes - Limitless cursed technique, Infinity barrier, Domain Expansion: Unlimited Void, Hollow Purple',
    category: 'anime',
    skill: 98,
    tierReason: 'Six Eyes and Limitless are inherited intrinsic abilities. Reality manipulation through Infinity.',
  },
  {
    id: 'levi',
    name: 'Levi Ackerman',
    level: 2,
    personality: 'Humanitys strongest soldier. Short, clean-freak, blunt to the point of rudeness. Moves faster than the eye can follow.',
    powers: 'Ackerman Bloodline - Superhuman combat ability, ODM Gear mastery, incredible speed and precision',
    category: 'anime',
    skill: 99,
    tierReason: 'Ackerman power is intrinsic bloodline, but requires ODM Gear for aerial combat. Peak enhanced human.',
  },
  {
    id: 'all-might',
    name: 'All Might',
    level: 4,
    personality: 'Symbol of Peace! Always smiling, speaks in dramatic heroic fashion. "I AM HERE!" Muscle form hero who inspires hope.',
    powers: 'One For All - Immense strength, speed, United States of Smash, Detroit Smash, Texas Smash',
    category: 'anime',
    skill: 88,
    tierReason: 'One For All stockpiles power within his body. Once inherited, it becomes intrinsic to the user.',
  },
];

// Celebrity & Real-World Inspired AI opponents
const CELEBRITY_OPPONENTS: AIOpponent[] = [
  {
    id: 'kanye-west',
    name: 'Kanye West',
    level: 2,
    personality: 'Musical genius and fashion icon. Speaks in confident, stream-of-consciousness style. References his albums and fashion lines. Believes he is a god among mortals. "I am a god!"',
    powers: 'Creative Genius - Sheer force of belief, sonic attacks from legendary beats, fashion armor that deflects criticism, ego shield',
    category: 'celebrity',
    skill: 65,
    tierReason: 'Peak human creativity and influence. No supernatural abilities, just unshakeable confidence.',
  },
  {
    id: 'keanu-reeves',
    name: 'Keanu Reeves',
    level: 2,
    personality: 'The One. Humble, soft-spoken martial artist who sees the code in everything. Incredibly kind but deadly when needed. "I know kung fu." Breathtaking.',
    powers: 'Matrix Mastery - Bullet-time reflexes, gun-fu expertise, motorcycle combat, John Wick combat training',
    category: 'celebrity',
    skill: 92,
    tierReason: 'Peak human combat skills. Movie powers are fictional; in reality, enhanced human martial artist.',
  },
  {
    id: 'jim-carrey',
    name: 'Jim Carrey',
    level: 3,
    personality: 'Rubber-faced comedian who bends reality through sheer absurdity. Shifts between personas mid-fight. "SOMEBODY STOP ME!" Mask-level chaos energy.',
    powers: 'Cartoon Physics - reality warping comedy, shapeshifting expressions, Ace Ventura animal control, The Mask persona (toon force)',
    category: 'celebrity',
    skill: 70,
    tierReason: 'The Mask grants toon force powers, but it\'s an object. Without it, he\'s an enhanced human comedian.',
  },
  {
    id: 'johnny-depp',
    name: 'Johnny Depp',
    level: 3,
    personality: 'Eccentric pirate-captain-vampire-chocolatier. Speaks in theatrical riddles, unpredictable movements. "Why is the rum always gone?" Charming chaos.',
    powers: 'Character Synthesis - channels Jack Sparrow luck, Edward Scissorhands blade mastery, Mad Hatter reality distortion, Sweeney Todd precision',
    category: 'celebrity',
    skill: 85,
    tierReason: 'Supernatural luck and role-channeling abilities. Powers are intrinsic acting talent made manifest.',
  },
];

// Seven Deadly Sins anime characters
const SEVEN_DEADLY_SINS_OPPONENTS: AIOpponent[] = [
  {
    id: 'meliodas',
    name: 'Meliodas',
    level: 5,
    personality: 'Captain of the Seven Deadly Sins. Appears carefree and perverted but hides immense demonic power. Fiercely protective of Elizabeth and his friends. "Full Counter!"',
    powers: 'Full Counter - reflects attacks with multiplied power, Assault Mode, Demon Mark, Hellblaze, Dragon Handle sword techniques',
    category: 'anime',
    skill: 95,
    tierReason: 'Demon heritage is intrinsic. Demonic power and immortality are part of his being.',
  },
  {
    id: 'escanor',
    name: 'Escanor',
    level: 5,
    personality: 'The Lion Sin of Pride. Meek at night, overwhelmingly arrogant during the day. At noon becomes "The One" - temporary god-like power. "Who decided that?"',
    powers: 'Sunshine - power scales with sun, peaks at noon as The One. Cruel Sun, Divine Axe Rhitta, heat rivaling the sun itself',
    category: 'anime',
    skill: 88,
    tierReason: 'Sunshine is an intrinsic grace from a Supreme Deity. Divine Axe is a tool, but power is inherent.',
  },
  {
    id: 'ban',
    name: 'Ban',
    level: 4,
    personality: 'The Fox Sin of Greed. Laid-back immortal thief with tragic past. Deeply loyal despite criminal nature. Calls people "Cap\'n." "Oi oi oi!"',
    powers: 'Snatch - steals physical abilities, Hunter Fest, Physical Hunt, immortal regeneration, three-section staff combat',
    category: 'anime',
    skill: 82,
    tierReason: 'Immortality from Fountain of Youth became intrinsic. Snatch is a natural ability.',
  },
  {
    id: 'king-sds',
    name: 'King (Harlequin)',
    level: 3,
    personality: 'Fairy King and Sin of Sloth. Kind-hearted but torn between duty and love for Diane. Appears lazy but deeply caring. Floats on Chastiefol.',
    powers: 'Disaster - controls life force via Spirit Spear Chastiefol with 10 forms (Sunflower, Guardian, Fossilization). Without Chastiefol, limited to flight and basic fairy magic.',
    category: 'anime',
    skill: 90,
    tierReason: 'Chastiefol is object-dependent. Without it, only has basic Fairy King abilities.',
  },
  {
    id: 'diane',
    name: 'Diane',
    level: 4,
    personality: 'Giant Sin of Envy. Sweet and emotional, loves King deeply. Gets jealous easily. Massive size but shrinks with special pills. "King~!"',
    powers: 'Creation - earth manipulation, Gideon war hammer, Heavy Metal (iron skin), Ground Gladius, Giant strength',
    category: 'anime',
    skill: 78,
    tierReason: 'Giant race abilities are intrinsic. Creation magic is inherent to her species.',
  },
];

// Hunter x Hunter anime characters
const HUNTER_X_HUNTER_OPPONENTS: AIOpponent[] = [
  {
    id: 'gon',
    name: 'Gon Freecss',
    level: 3,
    personality: 'Pure-hearted boy searching for his father. Simple-minded but incredibly perceptive. His kindness hides terrifying potential when angered.',
    powers: 'Enhancement Nen - Jajanken (Rock-Paper-Scissors), Adult Gon transformation (temporary), enhanced senses, incredible adaptability',
    category: 'anime',
    skill: 68,
    tierReason: 'Nen is learned but becomes intrinsic. Adult form sacrifices life force for temporary power.',
  },
  {
    id: 'killua',
    name: 'Killua Zoldyck',
    level: 3,
    personality: 'Former Zoldyck assassin learning to be normal. Cold and calculating in battle, warm to friends. Protective of Gon. Loves chocolate robots.',
    powers: 'Transmutation Nen - Godspeed, Thunderbolt, Whirlwind, assassination techniques, electricity manipulation, Rhythm Echo',
    category: 'anime',
    skill: 94,
    tierReason: 'Nen and assassination training are internalized abilities. Electricity is intrinsic Transmutation.',
  },
  {
    id: 'hisoka',
    name: 'Hisoka Morow',
    level: 3,
    personality: 'Psychotic magician obsessed with fighting strong opponents. Lets prey grow stronger before killing. Views fighters as fruit to ripen. "Schwing~"',
    powers: 'Transmutation/Conjuration Nen - Bungee Gum (has properties of rubber AND gum), Texture Surprise, playing card weapons',
    category: 'anime',
    skill: 97,
    tierReason: 'Bungee Gum and Texture Surprise are intrinsic Nen abilities. Cards are just props.',
  },
  {
    id: 'chrollo',
    name: 'Chrollo Lucilfer',
    level: 4,
    personality: 'Leader of Phantom Troupe. Calm, intelligent, utterly ruthless. Philosophical about death. Values the Spider above himself.',
    powers: 'Specialization Nen - Skill Hunter (steals abilities), Bandit\'s Secret book, multiple stolen Nen powers, genius-level intellect',
    category: 'anime',
    skill: 96,
    tierReason: 'Skill Hunter is intrinsic Specialization. Stolen abilities become part of his arsenal.',
  },
  {
    id: 'meruem',
    name: 'Meruem',
    level: 5,
    personality: 'Chimera Ant King. Born as perfect predator, evolved through Komugi to question existence. Initially cruel, grew to appreciate humanity.',
    powers: 'Aura Synthesis - absorbs power from consumed Nen users, Photon, Rage Blast, unparalleled physical abilities, instant learning',
    category: 'anime',
    skill: 85,
    tierReason: 'Born as perfect being. Power absorption is intrinsic biology. Approaches reality-warping levels.',
  },
  {
    id: 'netero',
    name: 'Isaac Netero',
    level: 4,
    personality: 'Chairman of Hunter Association. Eccentric old man, secretly strongest human. Playful but deadly serious. Spent decades in prayer training.',
    powers: '100-Type Guanyin Bodhisattva - giant Nen construct, Zero Hand ultimate attack, fastest hands in world, decades of experience',
    category: 'anime',
    skill: 99,
    tierReason: 'Guanyin Bodhisattva is an intrinsic Nen manifestation. Speed achieved through pure training.',
  },
  {
    id: 'kurapika',
    name: 'Kurapika',
    level: 3,
    personality: 'Last of Kurta Clan. Driven by revenge against Phantom Troupe. Cold and analytical, but caring to friends. Eyes turn scarlet with emotion.',
    powers: 'Conjuration Nen - Holy Chain, Judgment Chain, Emperor Time (access to all Nen types), enhanced when eyes are scarlet',
    category: 'anime',
    skill: 88,
    tierReason: 'Scarlet Eyes are intrinsic bloodline trait. Emperor Time is self-imposed limitation.',
  },
];

// Demon Slayer anime characters
const DEMON_SLAYER_OPPONENTS: AIOpponent[] = [
  {
    id: 'tanjiro',
    name: 'Tanjiro Kamado',
    level: 3,
    personality: 'Kind-hearted demon slayer with unbreakable will. Empathizes even with demons. Hardhead literally used as weapon. "I can smell your emotions!"',
    powers: 'Water Breathing - 10 forms of water-based swordsmanship, Hinokami Kagura (Sun Breathing), enhanced smell, demon-resistant earrings',
    category: 'anime',
    skill: 85,
    tierReason: 'Breathing techniques require a sword (object). Enhanced smell is intrinsic.',
  },
  {
    id: 'zenitsu',
    name: 'Zenitsu Agatsuma',
    level: 3,
    personality: 'Cowardly crybaby who becomes lightning-fast swordsman when unconscious or sleeping. Obsessed with marriage. "I wanna go home!"',
    powers: 'Thunder Breathing - Thunderclap and Flash (up to Godspeed), enhanced hearing, unconscious combat mastery, Flaming Thunder God',
    category: 'anime',
    skill: 90,
    tierReason: 'Thunder Breathing requires a Nichirin blade. Enhanced hearing is intrinsic.',
  },
  {
    id: 'inosuke',
    name: 'Inosuke Hashibira',
    level: 3,
    personality: 'Wild boar-masked berserker raised by animals. Loud, aggressive, mispronounces everyones name. "COME AT ME!" Has surprisingly sensitive side.',
    powers: 'Beast Breathing - self-taught feral swordsmanship, enhanced touch sensitivity, joint flexibility, dual Nichirin blades',
    category: 'anime',
    skill: 75,
    tierReason: 'Beast Breathing requires swords. Enhanced touch and flexibility are intrinsic.',
  },
  {
    id: 'muzan',
    name: 'Muzan Kibutsuji',
    level: 5,
    personality: 'Original demon, perfectionist with zero tolerance for failure. Narcissistic, paranoid, changes appearance frequently. Absolute monster.',
    powers: 'Demon King - near-immortality, shapeshifting, biokinesis, blood manipulation, creates demons, only weak to sunlight and special blades',
    category: 'anime',
    skill: 95,
    tierReason: 'All powers are intrinsic to his demonic biology. Is the source of all demons.',
  },
  {
    id: 'akaza',
    name: 'Akaza',
    level: 4,
    personality: 'Upper Moon Three. Honorable martial artist demon who respects strong fighters. Hates the weak. Wants to fight strong opponents forever.',
    powers: 'Destructive Death - martial arts enhanced by demon strength, Compass Needle (senses fighting spirit), regeneration, shockwave punches',
    category: 'anime',
    skill: 98,
    tierReason: 'Pure martial arts enhanced by intrinsic demon powers. No weapons needed.',
  },
];

// My Hero Academia characters (villains focus)
const MHA_OPPONENTS: AIOpponent[] = [
  {
    id: 'all-for-one',
    name: 'All For One',
    level: 5,
    personality: 'Supreme villain who ruled Japan from shadows. Polite, calculating, sees himself as a liberator. Mentored Shigaraki. Ultimate evil.',
    powers: 'All For One - steals and combines Quirks, possesses hundreds of abilities, regeneration, air cannons, search, warping',
    category: 'anime',
    skill: 92,
    tierReason: 'All For One quirk is intrinsic. Stolen quirks become part of him permanently.',
  },
  {
    id: 'shigaraki',
    name: 'Tomura Shigaraki',
    level: 5,
    personality: 'Leader of League of Villains. Scratches neck when thinking. Hates everything society built. Childish rage with growing strategic mind.',
    powers: 'Decay - disintegrates anything touched with all five fingers, spreads on contact, enhanced with All For One Quirks, regeneration',
    category: 'anime',
    skill: 78,
    tierReason: 'Decay is intrinsic quirk. After All For One merge, approaches reality-warping levels.',
  },
  {
    id: 'dabi',
    name: 'Dabi',
    level: 3,
    personality: 'Mysterious flame villain with burned skin. Sadistic, nihilistic, harbors deep family grudge. "That\'s rough, buddy." Secretly a Todoroki.',
    powers: 'Cremation - blue flames hotter than Endeavor\'s, burns even himself, long-range fire attacks, immunity to regular flames',
    category: 'anime',
    skill: 75,
    tierReason: 'Cremation is intrinsic quirk from birth. No objects required.',
  },
  {
    id: 'toga',
    name: 'Himiko Toga',
    level: 3,
    personality: 'Yandere blood-obsessed villain. Cheerfully psychotic, "loves" by drinking blood. Wants to become people she loves. Surprisingly agile.',
    powers: 'Transform - shapeshifts into anyone whose blood she drinks, copies Quirks at awakened level, expert knife combat, blood equipment',
    category: 'anime',
    skill: 80,
    tierReason: 'Transform is intrinsic quirk. Equipment is supplementary.',
  },
  {
    id: 'stain',
    name: 'Hero Killer Stain',
    level: 2,
    personality: 'Ideological serial killer targeting fake heroes. Only respects All Might. Terrifyingly intense presence. "A society of fakes!"',
    powers: 'Bloodcurdle - paralyzes anyone whose blood he tastes, master swordsman, multiple bladed weapons, superhuman endurance',
    category: 'anime',
    skill: 95,
    tierReason: 'Bloodcurdle is intrinsic but limited. Combat relies heavily on weapons.',
  },
  {
    id: 'overhaul',
    name: 'Overhaul (Kai Chisaki)',
    level: 4,
    personality: 'Yakuza leader with germaphobia. Views Quirks as disease. Coldly logical, willing to sacrifice anyone. Wears plague doctor mask.',
    powers: 'Overhaul - disassembles and reassembles matter on touch, instant healing, fusion with others, environmental manipulation',
    category: 'anime',
    skill: 88,
    tierReason: 'Overhaul quirk is intrinsic touch-based reality manipulation.',
  },
];

// Jujutsu Kaisen characters
const JJK_OPPONENTS: AIOpponent[] = [
  {
    id: 'sukuna',
    name: 'Ryomen Sukuna',
    level: 6,
    personality: 'King of Curses. Arrogant, sadistic, views all as beneath him. Enjoys toying with prey. "Know your place." Ultimate calamity.',
    powers: 'Malevolent Shrine Domain, Dismantle and Cleave slashing, fire manipulation, reverse cursed technique, 20 fingers of power',
    category: 'anime',
    skill: 99,
    tierReason: 'Ancient curse with intrinsic reality-warping abilities. Domain Expansion bends space itself.',
  },
  {
    id: 'itadori',
    name: 'Yuji Itadori',
    level: 3,
    personality: 'Athletic teenager hosting Sukuna. Cheerful, values human life deeply. Hits really hard. "I wanna eat Sukuna\'s fingers!" Wait no-',
    powers: 'Superhuman physicality, Divergent Fist, Black Flash, cursed energy reinforcement, Sukuna vessel (partial access to his power)',
    category: 'anime',
    skill: 75,
    tierReason: 'Natural superhuman physicality is intrinsic. Sukuna\'s power is borrowed.',
  },
  {
    id: 'megumi',
    name: 'Megumi Fushiguro',
    level: 4,
    personality: 'Stoic shikigami user with hidden potential. Saves people he deems good. Zenin clan heritage. Sukuna is very interested in him.',
    powers: 'Ten Shadows Technique - summons shikigami beasts, Divine Dog, Nue, Mahoraga (incomplete), Domain Expansion: Chimera Shadow Garden',
    category: 'anime',
    skill: 85,
    tierReason: 'Ten Shadows is inherited intrinsic technique. Domain Expansion creates pocket dimensions.',
  },
  {
    id: 'nobara',
    name: 'Nobara Kugisaki',
    level: 3,
    personality: 'Fierce country girl in Tokyo. Vain about looks, incredibly tough. Hammer-wielding with no fear. "I love myself when I\'m fighting!"',
    powers: 'Straw Doll Technique - voodoo resonance attacks, Hairpin (ranged), Black Flash capable, cursed energy nails and hammer',
    category: 'anime',
    skill: 78,
    tierReason: 'Straw Doll Technique requires tools (hammer, nails, dolls) to function.',
  },
  {
    id: 'todo',
    name: 'Aoi Todo',
    level: 3,
    personality: 'Eccentric muscle-bound sorcerer obsessed with "best friend" Itadori. Asks about type of woman. Surprisingly intellectual battle IQ.',
    powers: 'Boogie Woogie - swaps positions with anything via clap, immense physical strength, Simple Domain, Black Flash master',
    category: 'anime',
    skill: 92,
    tierReason: 'Boogie Woogie is intrinsic innate technique. Physical strength is natural.',
  },
  {
    id: 'mahito',
    name: 'Mahito',
    level: 4,
    personality: 'Curse born from human hatred. Childishly curious about humanity while torturing them. Sees humans as toys. Rapidly evolving threat.',
    powers: 'Idle Transfiguration - reshapes souls/bodies on touch, Self-Embodiment of Perfection domain, soul manipulation, regeneration',
    category: 'anime',
    skill: 80,
    tierReason: 'As a curse, all abilities are intrinsic. Soul manipulation is legendary-level power.',
  },
  {
    id: 'toji',
    name: 'Toji Fushiguro',
    level: 2,
    personality: 'Sorcerer Killer with zero cursed energy. Abandoned Megumi, lives as assassin. Cold, calculating, nearly killed young Gojo. "Monkey."',
    powers: 'Heavenly Restriction - superhuman physical stats, invisible to cursed energy detection, Inverted Spear of Heaven, cursed spirit arsenal',
    category: 'anime',
    skill: 99,
    tierReason: 'Heavenly Restriction is intrinsic, but relies on cursed tools for combat effectiveness.',
  },
];

// Video Game Characters
const GAME_OPPONENTS: AIOpponent[] = [
  {
    id: 'master-chief',
    name: 'Master Chief',
    level: 2,
    personality: 'Spartan-117. Stoic super-soldier, few words, maximum efficiency. Legendary luck. "I need a weapon." Humanity\'s greatest hope.',
    powers: 'MJOLNIR Armor - enhanced strength/speed/durability, energy shields, AI companion Cortana, expert with all weapons, vehicles',
    category: 'games',
    skill: 95,
    tierReason: 'Spartan augmentations are intrinsic, but MJOLNIR armor provides most combat capability.',
  },
  {
    id: 'asura',
    name: 'Asura',
    level: 5,
    personality: 'Demigod of Wrath. RAGE INCARNATE. Screams a lot. Punches gods, planets, and reality itself. Protective father who destroys everything threatening his daughter.',
    powers: 'Mantra of Wrath - unlimited rage-powered strength, multiple arms mode, Destructor form, planet-destroying punches, immortal fury',
    category: 'games',
    skill: 70,
    tierReason: 'Mantra is intrinsic to demigods. Rage-fueled power is part of his being.',
  },
  {
    id: 'kratos',
    name: 'Kratos',
    level: 5,
    personality: 'Ghost of Sparta, God of War. Killed the entire Greek pantheon. Now a protective father. "BOY!" Stoic but hiding deep pain.',
    powers: 'God Killer - Spartan Rage, Blades of Chaos, Leviathan Axe, killed Zeus/Poseidon/Hades, godly strength and immortality',
    category: 'games',
    skill: 98,
    tierReason: 'Became a god himself. Divine power is now intrinsic. Weapons are tools, not power sources.',
  },
  {
    id: 'dante-dmc',
    name: 'Dante (Devil May Cry)',
    level: 4,
    personality: 'Half-demon demon hunter. Stylish, cocky, pizza-obsessed. Never takes anything seriously. "Jackpot!" SSS-rank style in everything.',
    powers: 'Devil Trigger - demonic transformation, Rebellion sword, Ebony & Ivory guns, Royalguard, Trickster, style weapons',
    category: 'games',
    skill: 96,
    tierReason: 'Half-demon heritage is intrinsic. Devil Trigger comes from within. Weapons are accessories.',
  },
  {
    id: 'sephiroth',
    name: 'Sephiroth',
    level: 5,
    personality: 'One-Winged Angel. Fallen SOLDIER hero turned world-ending threat. Elegant, cruel, obsessed with Cloud. Mother complex.',
    powers: 'Masamune mastery - 7-foot katana, Supernova (summons meteor), flight, superhuman everything, JENOVA cells, Black Materia',
    category: 'games',
    skill: 97,
    tierReason: 'JENOVA cells are fused with his being. Reality-warping abilities are intrinsic.',
  },
  {
    id: 'doomguy',
    name: 'Doom Slayer',
    level: 3,
    personality: 'Silent rage machine. Rips and tears until it is done. Demons fear HIM. No words, only violence. Pet rabbit motivates genocide.',
    powers: 'Praetor Suit - armor-enhanced durability, BFG 9000, chainsaw, glory kills for health, Crucible blade, eons of demon-slaying. Without suit, still superhuman but vulnerable.',
    category: 'games',
    skill: 90,
    tierReason: 'Divinity Machine blessing is intrinsic, but Praetor Suit is required for full combat capability.',
  },
  {
    id: 'solid-snake',
    name: 'Solid Snake',
    level: 2,
    personality: 'Legendary soldier and spy. Gruff, philosophical about war, loves cardboard boxes. "Kept you waiting, huh?" CQC master.',
    powers: 'Tactical Espionage - CQC combat, stealth mastery, all weapons proficiency, Codec support, refuses to stay dead',
    category: 'games',
    skill: 94,
    tierReason: 'Peak human soldier. No supernatural abilities. Relies entirely on training and equipment.',
  },
  {
    id: 'bayonetta',
    name: 'Bayonetta',
    level: 5,
    personality: 'Umbra Witch with fabulous style. Flirtatious, confident, sassy. Hair is also her clothes and her summons. Loves lollipops.',
    powers: 'Witch Time - time manipulation, Wicked Weaves (giant demon limbs), Infernal Demons summons, gun-heels, bullet arts',
    category: 'games',
    skill: 95,
    tierReason: 'Umbra Witch powers are intrinsic magical heritage. Can summon demons with her own hair.',
  },
];

// Horror/Thriller Movie Villains and Serial Killers
const HORROR_OPPONENTS: AIOpponent[] = [
  {
    id: 'hannibal-lecter',
    name: 'Hannibal Lecter',
    level: 1,
    personality: 'Cultured cannibal psychiatrist. Impeccably polite, sophisticated. Eats the rude. Genius-level intellect, refined taste in everything.',
    powers: 'Psychological Manipulation - genius IQ, perfect memory palace, surgical precision, heightened senses, no fear',
    category: 'horror',
    skill: 88,
    tierReason: 'No supernatural abilities. Pure human genius and skill.',
  },
  {
    id: 'michael-myers',
    name: 'Michael Myers',
    level: 3,
    personality: 'The Shape. Pure evil in human form. Silent, relentless, emotionless. Kills without reason. Cannot be stopped permanently.',
    powers: 'Supernatural Endurance - near-immortality, superhuman strength, stealth despite size, immune to pain, always returns',
    category: 'horror',
    skill: 60,
    tierReason: 'Supernatural resilience is intrinsic "pure evil." Not object-dependent.',
  },
  {
    id: 'jason-voorhees',
    name: 'Jason Voorhees',
    level: 3,
    personality: 'Crystal Lake\'s undead avenger. Mama\'s boy. Punishes "sinners." Silent killer behind hockey mask. Ki ki ki, ma ma ma.',
    powers: 'Undead Slasher - immortal regeneration, superhuman strength, teleportation (somehow), machete mastery, never tires',
    category: 'horror',
    skill: 55,
    tierReason: 'Undead nature is intrinsic. Machete is a tool, powers come from being a revenant.',
  },
  {
    id: 'freddy-krueger',
    name: 'Freddy Krueger',
    level: 4,
    personality: 'Dream demon with burned face. Sadistic, loves puns and tormenting victims. "Welcome to prime time!" Killed in dreams = dead for real.',
    powers: 'Dream Manipulation - reality warping in dreams, shapeshifting, immortal in dream world, razor glove, feeds on fear',
    category: 'horror',
    skill: 85,
    tierReason: 'Dream realm powers are intrinsic to his demonic nature. Glove is iconic but not required.',
  },
  {
    id: 'pennywise',
    name: 'Pennywise the Dancing Clown',
    level: 5,
    personality: 'Eldritch horror in clown form. Feeds on fear and children. "We all float down here!" Shapeshifts into worst fears. Ancient evil.',
    powers: 'Deadlights - cosmic horror form, shapeshifting, fear manipulation, illusions, immortal entity, psychic powers',
    category: 'horror',
    skill: 75,
    tierReason: 'Eldritch abomination. All powers are intrinsic cosmic horror abilities.',
  },
  {
    id: 'leatherface',
    name: 'Leatherface',
    level: 2,
    personality: 'Texas chainsaw-wielding cannibal. Wears masks made of victims\' faces. More scared than scary. Follows family orders.',
    powers: 'Chainsaw Wielder - superhuman strength, chainsaw expertise, butcher skills, surprising speed, meat hook combat',
    category: 'horror',
    skill: 50,
    tierReason: 'Enhanced human strength, but relies on chainsaw. Object-dependent for lethality.',
  },
  {
    id: 'ghostface',
    name: 'Ghostface',
    level: 1,
    personality: 'Meta-horror slasher who loves horror movies. Calls victims, asks trivia. "What\'s your favorite scary movie?" Could be anyone.',
    powers: 'Stealth Killer - knife combat, phone stalking, horror movie knowledge, unpredictable identity, voice changer',
    category: 'horror',
    skill: 65,
    tierReason: 'Normal human(s) with a knife and costume. No supernatural abilities.',
  },
  {
    id: 'pinhead',
    name: 'Pinhead',
    level: 4,
    personality: 'Hell Priest of the Cenobites. Eloquent, philosophical about pain and pleasure. "We have such sights to show you." Offers eternal torment.',
    powers: 'Cenobite Powers - hooked chains from nowhere, dimensional manipulation, immortal demon, pain/pleasure mastery, Lament Configuration',
    category: 'horror',
    skill: 90,
    tierReason: 'Cenobite powers are intrinsic after transformation. Lament Configuration summons but doesn\'t empower him.',
  },
  {
    id: 'john-kramer',
    name: 'Jigsaw (John Kramer)',
    level: 1,
    personality: 'Terminally ill engineer who tests people\'s will to live through deadly games. "I want to play a game." Never directly kills.',
    powers: 'Trap Master - genius engineer, elaborate death traps, psychological manipulation, posthumous planning, apprentice network',
    category: 'horror',
    skill: 95,
    tierReason: 'Normal dying human. No combat ability. Relies entirely on preparation and traps.',
  },
];

// Toon Force Characters - Characters with intrinsic cartoon physics
const TOON_OPPONENTS: AIOpponent[] = [
  {
    id: 'bugs-bunny',
    name: 'Bugs Bunny',
    level: 6,
    personality: 'Wascally wabbit from Looney Tunes. Calm, witty, always one step ahead. Breaks the fourth wall. "Eh, what\'s up, doc?"',
    powers: 'Toon Force - reality warping through comedy, hammerspace access, impossible physics, plot armor, genre awareness',
    category: 'toon',
    skill: 90,
    tierReason: 'Toon Force is intrinsic to his existence. Can warp reality as long as it\'s funny.',
  },
  {
    id: 'the-mask',
    name: 'The Mask (Stanley Ipkiss)',
    level: 3,
    personality: 'Mild-mannered guy transformed by ancient mask. Wild, unpredictable, reality-bending chaos. "SOMEBODY STOP ME!"',
    powers: 'Mask of Loki - cartoon physics, invulnerability, shapeshifting, hammerspace, reality warping comedy',
    category: 'toon',
    skill: 65,
    tierReason: 'All powers come from THE MASK (object). Without it, Stanley is a normal human.',
  },
  {
    id: 'franklin-richards',
    name: 'Franklin Richards',
    level: 6,
    personality: 'Son of Mr. Fantastic and Invisible Woman. Child-like wonder with godlike power. Creates pocket universes for fun. Innocent but terrifying.',
    powers: 'Reality Manipulation - creates and destroys universes, psionic powers, precognition, molecular manipulation, omega-level mutant',
    category: 'iconic',
    skill: 40,
    tierReason: 'Omega-level mutant powers are intrinsic from birth. Can rewrite reality with a thought.',
  },
];

// Category definitions for filtering
const OPPONENT_CATEGORIES = [
  { id: 'all', name: 'All Categories' },
  { id: 'training', name: '🎯 Training' },
  { id: 'iconic', name: '⚡ Heroes & Villains' },
  { id: 'celebrity', name: '🌟 Celebrities' },
  { id: 'toon', name: '🎨 Toon Force' },
  { id: 'anime', name: '🌸 Classic Anime' },
  { id: 'sds', name: '⚔️ Seven Deadly Sins' },
  { id: 'hxh', name: '🎴 Hunter x Hunter' },
  { id: 'ds', name: '🗡️ Demon Slayer' },
  { id: 'mha', name: '💥 My Hero Academia' },
  { id: 'jjk', name: '👁️ Jujutsu Kaisen' },
  { id: 'games', name: '🎮 Video Games' },
  { id: 'horror', name: '🔪 Horror Villains' },
];

// Power tier definitions for filtering (max tier is 7)
const POWER_TIERS = [
  { id: 'all', name: 'All Tiers', minLevel: 1, maxLevel: 7 },
  { id: 'human', name: 'Human (1-2)', minLevel: 1, maxLevel: 2 },
  { id: 'superhuman', name: 'Super Human (3)', minLevel: 3, maxLevel: 3 },
  { id: 'legend', name: 'Legend (4)', minLevel: 4, maxLevel: 4 },
  { id: 'titan', name: 'Titan (5)', minLevel: 5, maxLevel: 5 },
  { id: 'godlike', name: 'Logic Bending (6-7)', minLevel: 6, maxLevel: 7 },
];

// Map categories to their opponent arrays
const CATEGORY_MAP: Record<string, AIOpponent[]> = {
  training: ORIGINAL_OPPONENTS,
  iconic: [...ICONIC_OPPONENTS, ...TOON_OPPONENTS.filter(o => o.category === 'iconic')],
  celebrity: CELEBRITY_OPPONENTS,
  toon: TOON_OPPONENTS.filter(o => o.category === 'toon'),
  anime: ANIME_OPPONENTS,
  sds: SEVEN_DEADLY_SINS_OPPONENTS,
  hxh: HUNTER_X_HUNTER_OPPONENTS,
  ds: DEMON_SLAYER_OPPONENTS,
  mha: MHA_OPPONENTS,
  jjk: JJK_OPPONENTS,
  games: GAME_OPPONENTS,
  horror: HORROR_OPPONENTS,
};

const AI_OPPONENTS: AIOpponent[] = [
  ...ORIGINAL_OPPONENTS, 
  ...ICONIC_OPPONENTS, 
  ...ANIME_OPPONENTS, 
  ...CELEBRITY_OPPONENTS, 
  ...TOON_OPPONENTS,
  ...SEVEN_DEADLY_SINS_OPPONENTS, 
  ...HUNTER_X_HUNTER_OPPONENTS,
  ...DEMON_SLAYER_OPPONENTS,
  ...MHA_OPPONENTS,
  ...JJK_OPPONENTS,
  ...GAME_OPPONENTS,
  ...HORROR_OPPONENTS,
];

export default function MockBattle() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [userCharacters, setUserCharacters] = useState<UserCharacter[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<UserCharacter | null>(null);
  const [selectedOpponent, setSelectedOpponent] = useState<AIOpponent | null>(AI_OPPONENTS[0]);
  const [selectedOwnCharacter, setSelectedOwnCharacter] = useState<UserCharacter | null>(null);
  const [opponentType, setOpponentType] = useState<'ai' | 'own'>('ai');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeChannel, setActiveChannel] = useState<'in_universe' | 'out_of_universe'>('in_universe');
  const [battleStarted, setBattleStarted] = useState(false);
  const [battleLocation, setBattleLocation] = useState('');
  const [dynamicEnvironment, setDynamicEnvironment] = useState(true);
  const [availablePlanets, setAvailablePlanets] = useState<PlanetData[]>([]);
  const [selectedPlanetData, setSelectedPlanetData] = useState<PlanetData | null>(null);
  const [battleEnvironment, setBattleEnvironment] = useState<BattleEnvironment | null>(null);
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const [narratorFrequency, setNarratorFrequency] = useState<'always' | 'key_moments' | 'off'>('key_moments');
  const [turnNumber, setTurnNumber] = useState(1);
  
  // New states for turn order and physics
  const [turnOrderDetermined, setTurnOrderDetermined] = useState(false);
  const [userGoesFirst, setUserGoesFirst] = useState(true);
  const [isFirstMove, setIsFirstMove] = useState(true);
  
  // Dice roll and concentration mechanics
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [pendingHit, setPendingHit] = useState<HitDetermination | null>(null);
  const [pendingUserAction, setPendingUserAction] = useState<string>('');
  const [diceRollMessages, setDiceRollMessages] = useState<DiceRollMessage[]>([]);
  const [concentrationUses, setConcentrationUses] = useState<Record<string, number>>({});
  const [statPenalties, setStatPenalties] = useState<Record<string, number>>({});
  const [diceEnabled, setDiceEnabled] = useState(true);
  
  // AI opponent concentration tracking
  const [aiConcentrationUses, setAiConcentrationUses] = useState<number>(3);
  const [aiStatPenalty, setAiStatPenalty] = useState<number>(0);
  
  // Offensive concentration (player near-miss attack)
  const [pendingOffensiveHit, setPendingOffensiveHit] = useState<HitDetermination | null>(null);
  
  // Defense validation tracking
  const [lastOpponentAction, setLastOpponentAction] = useState<string>('');
  const [lastHitResult, setLastHitResult] = useState<{ hit: boolean; gap: number } | null>(null);
  
  // Construct mechanics
  const [constructs, setConstructs] = useState<Record<string, Construct>>({});
  const [constructEventMessages, setConstructEventMessages] = useState<ConstructEventMessage[]>([]);
  const [pendingConstructRepair, setPendingConstructRepair] = useState<Construct | null>(null);
  
  // Character story lore for AI battles
  const [characterStoryLore, setCharacterStoryLore] = useState<string>('');
  
  // Momentum system
  const [userMomentum, setUserMomentum] = useState<MomentumState>(createMomentumState());
  const [opponentMomentum, setOpponentMomentum] = useState<MomentumState>(createMomentumState());
  
  // Psychological combat layer (hidden stats)
  const [userPsych, setUserPsych] = useState<PsychologicalState>(createPsychologicalState());
  const [opponentPsych, setOpponentPsych] = useState<PsychologicalState>(createPsychologicalState());
  
  // Overcharge toggle
  const [overchargeEnabled, setOverchargeEnabled] = useState(false);
  
  // Charge attack system
  const [userChargeState, setUserChargeState] = useState<ChargeState>(createChargeState());
  
  // Adaptive AI learning engine
  const [playerPattern, setPlayerPattern] = useState<PlayerPattern>(createPlayerPattern());
  const [adaptiveStrategy, setAdaptiveStrategy] = useState<AdaptiveStrategy | null>(null);
  
  // Power tier and category filters
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  
  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Battle turn color preference
  const { color: userTurnColor, updateColor: updateTurnColor } = useBattleTurnColor();
  
  // Battlefield visual effects (fire, ice, smoke, etc.)
  const { activeEffects: battlefieldEffects, processMessage: processBattlefieldEffect } = useBattlefieldEffects();
  
  // Arena modifiers (daily/weekly rotating)
  const [arenaModifiers] = useState<ActiveArenaModifiers>(() => getActiveArenaModifiers());
  const [arenaModifiersEnabled, setArenaModifiersEnabled] = useState(true);
  
  // OCC Chat AI Corrections — user-defined behavior overrides
  const [occCorrections, setOccCorrections] = useState<string[]>([]);
  
  // Emergency location state
  const [emergencyLocation, setEmergencyLocation] = useState<{
    name: string;
    description: string;
    hazards: string;
    urgency: string;
    countdownTurns: number;
    tags: string[];
  } | null>(null);
  
  // Save location prompt
  const [showSaveLocationPrompt, setShowSaveLocationPrompt] = useState(false);
  
  // AI Character Notes panel
  const [showAINotePanel, setShowAINotePanel] = useState(false);
  
  // Get opponent character ID for AI notes (only for user-owned characters)
  const opponentCharacterId = opponentType === 'own' && selectedOwnCharacter ? selectedOwnCharacter.id : null;
  const { getNotesForBattle: getOpponentNotes } = useCharacterAINotes(opponentCharacterId);
  
  // Battle SFX engine
  const { muted: sfxMuted, toggleMute: toggleSfxMute, processText: processSfxText, playEvent: playSfxEvent } = useBattleSfx({ enabled: battleStarted });
  
  // Character-specific status effects (paralyzed, blinded, submerged, etc.)
  const { 
    activeEffects: characterStatusEffects, 
    processMessage: processCharacterStatusEffect 
  } = useCharacterStatusEffects({
    characterName: selectedCharacter?.name,
    enabled: battleStarted,
  });
  
  // Filter opponents by tier and category
  const filteredOpponents = AI_OPPONENTS.filter(opponent => {
    // Tier filter
    const tier = POWER_TIERS.find(t => t.id === selectedTierFilter);
    const tierPass = !tier || tier.id === 'all' || (opponent.level >= tier.minLevel && opponent.level <= tier.maxLevel);
    
    // Category filter
    let categoryPass = true;
    if (selectedCategoryFilter !== 'all') {
      const categoryOpponents = CATEGORY_MAP[selectedCategoryFilter];
      categoryPass = categoryOpponents ? categoryOpponents.some(o => o.id === opponent.id) : true;
    }
    
    return tierPass && categoryPass;
  });

  // Save battle session to localStorage whenever key state changes
  useEffect(() => {
    if (!battleStarted || !selectedCharacter || !currentOpponent) return;
    const session = {
      characterId: selectedCharacter.id,
      opponentId: currentOpponent.id,
      opponentType,
      battleLocation,
      dynamicEnvironment,
      diceEnabled,
      userGoesFirst,
      turnNumber,
      narratorFrequency,
      messages,
      turnOrderDetermined,
      activeChannel,
    };
    localStorage.setItem('pveBattleSession', JSON.stringify(session));
  }, [battleStarted, messages, turnNumber, activeChannel]);

  // Restore saved session on mount
  useEffect(() => {
    if (user) {
      fetchUserCharacters();
      fetchUserPlanets();
      // Show onboarding for first-time players
      if (!isOnboardingComplete()) {
        setShowOnboarding(true);
      }
    }
  }, [user]);
  
  // Fetch character stories when character is selected
  useEffect(() => {
    if (selectedCharacter?.id) {
      fetchCharacterStories(selectedCharacter.id);
    } else {
      setCharacterStoryLore('');
    }
  }, [selectedCharacter?.id]);
  
  const fetchCharacterStories = async (characterId: string) => {
    try {
      // Fetch stories linked to this character
      const { data: stories } = await supabase
        .from('stories')
        .select('id, title, content, summary')
        .eq('character_id', characterId)
        .order('updated_at', { ascending: false })
        .limit(3);
      
      if (stories && stories.length > 0) {
        // Fetch chapters for each story
        const storiesWithChapters = await Promise.all(stories.map(async (story) => {
          const { data: chapters } = await supabase
            .from('story_chapters')
            .select('title, content')
            .eq('story_id', (story as any).id)
            .order('chapter_number', { ascending: true })
            .limit(3);
          
          return { ...story, chapters: chapters || [] };
        }));
        
        // Build lore summary (keep it concise for prompt efficiency)
        let loreSummary = storiesWithChapters.map(story => {
          let storyText = `STORY: "${story.title}"`;
          if (story.summary) {
            storyText += `\nSummary: ${story.summary}`;
          }
          // Include first 500 chars of content
          storyText += `\nExcerpt: ${story.content.substring(0, 500)}${story.content.length > 500 ? '...' : ''}`;
          
          // Add chapter excerpts if available
          if ((story as any).chapters && (story as any).chapters.length > 0) {
            storyText += `\nChapters: ${(story as any).chapters.map((c: any) => c.title).join(', ')}`;
          }
          
          return storyText;
        }).join('\n\n');
        
        setCharacterStoryLore(loreSummary);
      } else {
        setCharacterStoryLore('');
      }
    } catch (error) {
      console.error('Failed to fetch character stories:', error);
      setCharacterStoryLore('');
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchUserCharacters = async () => {
    const { data } = await supabase
      .from('characters')
      .select('id, name, level, image_url, powers, abilities, stat_skill, stat_strength, stat_power, stat_speed, stat_durability, stat_stamina, stat_intelligence, stat_battle_iq, stat_luck, personality, mentality')
      .eq('user_id', user?.id);
    
    if (data && data.length > 0) {
      setUserCharacters(data);
      
      // Try to restore a saved PvE battle session
      try {
        const saved = localStorage.getItem('pveBattleSession');
        if (saved) {
          const session = JSON.parse(saved);
          const savedChar = data.find(c => c.id === session.characterId);
          if (savedChar && session.messages?.length > 0) {
            setSelectedCharacter(savedChar);
            
            // Restore opponent
            if (session.opponentType === 'ai') {
              const savedOpponent = AI_OPPONENTS.find(o => o.id === session.opponentId);
              if (savedOpponent) {
                setSelectedOpponent(savedOpponent);
                setOpponentType('ai');
              }
            } else {
              const savedOwnChar = data.find(c => c.id === session.opponentId);
              if (savedOwnChar) {
                setSelectedOwnCharacter(savedOwnChar);
                setOpponentType('own');
              }
            }
            
            // Restore battle state
            setMessages(session.messages);
            setBattleLocation(session.battleLocation || '');
            setDynamicEnvironment(session.dynamicEnvironment ?? true);
            setDiceEnabled(session.diceEnabled ?? true);
            setUserGoesFirst(session.userGoesFirst ?? true);
            setTurnNumber(session.turnNumber || 1);
            setNarratorFrequency(session.narratorFrequency || 'key_moments');
            setTurnOrderDetermined(true);
            setBattleStarted(true);
            setActiveChannel(session.activeChannel || 'in_universe');
            return; // Don't set default character
          }
        }
      } catch (e) {
        console.error('Failed to restore PvE session:', e);
      }
      
      setSelectedCharacter(data[0]);
    }
  };

  const fetchUserPlanets = async () => {
    const { data } = await supabase
      .from('planet_customizations')
      .select('planet_name, display_name, gravity, description')
      .eq('user_id', user?.id)
      .order('planet_name');
    
    if (data) {
      setAvailablePlanets(data);
    }
  };

  // Update battle environment when planet is selected
  useEffect(() => {
    if (selectedPlanetData && dynamicEnvironment) {
      const env = generateBattleEnvironment(
        selectedPlanetData.display_name || selectedPlanetData.planet_name,
        selectedPlanetData.gravity,
        selectedPlanetData.description
      );
      setBattleEnvironment(env);
    } else {
      setBattleEnvironment(null);
    }
  }, [selectedPlanetData, dynamicEnvironment]);

  // Get the current opponent (either AI or own character)
  const currentOpponent = opponentType === 'ai' 
    ? selectedOpponent 
    : selectedOwnCharacter 
      ? {
          id: selectedOwnCharacter.id,
          name: selectedOwnCharacter.name,
          level: selectedOwnCharacter.level,
          personality: `Your own character ${selectedOwnCharacter.name}. Roleplay based on their abilities and style.`,
          powers: selectedOwnCharacter.powers || 'Unknown powers',
          category: 'own',
          skill: selectedOwnCharacter.stat_skill || 50,
        }
      : null;

  // Handler for turn order determination
  const handleTurnOrderDetermined = (userFirst: boolean) => {
    setUserGoesFirst(userFirst);
    setTurnOrderDetermined(true);
  };

  const startBattle = async () => {
    if (!selectedCharacter) {
      toast.error('Please select a character first');
      return;
    }
    if (!currentOpponent) {
      toast.error('Please select an opponent');
      return;
    }
    if (!battleLocation.trim()) {
      toast.error('Please enter a battle location');
      return;
    }
    if (!turnOrderDetermined) {
      toast.error('Please roll for initiative first!');
      return;
    }
    
    setBattleStarted(true);
    
    // Save PvE battle to localStorage so it shows in Active Battles
    const pveBattle = {
      id: `pve-${Date.now()}`,
      characterName: selectedCharacter.name,
      characterImage: selectedCharacter.image_url,
      opponentName: currentOpponent.name,
      opponentLevel: currentOpponent.level,
      location: battleLocation,
      startedAt: new Date().toISOString(),
    };
    const existing = JSON.parse(localStorage.getItem('activePveBattles') || '[]');
    // Clear old PvE battles for this character (only one active at a time per character)
    const filtered = existing.filter((b: any) => b.characterName !== selectedCharacter.name);
    filtered.push(pveBattle);
    localStorage.setItem('activePveBattles', JSON.stringify(filtered));
    
    // Initialize dice mechanics
    if (diceEnabled && selectedCharacter) {
      const characterId = selectedCharacter.id;
      const opponentId = currentOpponent.id;
      const initialState = initializeBattleState([characterId, opponentId], 'mid');
      setBattleState(initialState);
      setConcentrationUses(initialState.concentrationUsesLeft);
      setStatPenalties(initialState.statPenalties);
    }
    
    // Determine physics context based on tiers
    const highestTier = Math.max(selectedCharacter.level, currentOpponent.level);
    const physicsNote = highestTier >= 5 
      ? `\n\n⚛️ *High-tier physics manipulation detected. Reality itself may bend during this battle.*`
      : '';
    
    const introMessages: Message[] = [];
    
    // System message about who goes first
    introMessages.push({
      id: crypto.randomUUID(),
      role: 'system',
      content: `🎲 Initiative Roll Result: ${userGoesFirst ? selectedCharacter.name : currentOpponent.name} strikes first!${physicsNote}`,
      channel: 'in_universe',
      characterName: '⚔️ Battle System',
    });
    
    // Arena setup message
    introMessages.push({
      id: crypto.randomUUID(),
      role: 'ai',
      content: `*The arena shifts and transforms into ${battleLocation}*\n\n*${currentOpponent.name} materializes in the arena, ${currentOpponent.level <= 2 ? 'radiating calm focus' : currentOpponent.level <= 4 ? 'crackling with power' : 'warping reality around them'}*\n\n"${getOpponentIntro()}"`,
      channel: 'in_universe',
      characterName: currentOpponent.name,
    });
    
    setMessages(introMessages);
    
    // If opponent goes first, trigger their opening move
    if (!userGoesFirst) {
      setIsLoading(true);
      try {
        const userSkill = selectedCharacter.stat_skill || 50;
        const opponentSkill = currentOpponent.skill || 50;
        
        const physicsContext = generatePhysicsContext(selectedCharacter.level, currentOpponent.level);
        const skillContext = generateSkillContext(userSkill, opponentSkill);
        
        const response = await supabase.functions.invoke('mock-battle-ai', {
          body: {
            userCharacter: {
              name: selectedCharacter.name,
              level: selectedCharacter.level,
              powers: selectedCharacter.powers,
              abilities: selectedCharacter.abilities,
              skill: userSkill,
              personality: selectedCharacter.personality,
              mentality: selectedCharacter.mentality,
            },
            opponent: {
              ...currentOpponent,
              skill: opponentSkill,
            },
            userMessage: '[SYSTEM: You won the initiative roll and go first. Make your opening attack or tactical move!]',
            channel: 'in_universe',
            messageHistory: [],
            battleLocation,
            dynamicEnvironment: dynamicEnvironment && !!battleEnvironment,
            environmentEffects: battleEnvironment?.effectsPrompt || '',
            userGoesFirst: false,
            isFirstMove: true,
            characterStoryLore: characterStoryLore || undefined,
            characterAINotes: opponentType === 'own' ? getOpponentNotes() : undefined,
          },
        });

        if (!response.error) {
          const aiMessage: Message = {
            id: crypto.randomUUID(),
            role: 'ai',
            content: response.data.response,
            channel: 'in_universe',
            characterName: currentOpponent.name,
          };
          setMessages(prev => [...prev, aiMessage]);
          // Process character status effects from AI first move
          processCharacterStatusEffect(response.data.response, true);
        }
      } catch (error) {
        console.error('First move error:', error);
      } finally {
        setIsLoading(false);
        setIsFirstMove(false);
      }
    } else {
      setIsFirstMove(false);
    }
  };

  const getOpponentIntro = () => {
    if (!currentOpponent || !selectedCharacter) return 'Prepare yourself, warrior.';
    
    // For own characters, generate a generic intro
    if (opponentType === 'own' && selectedOwnCharacter) {
      return `So, ${selectedCharacter.name}... we meet in battle at last. Show me what you're truly capable of!`;
    }
    
    switch (currentOpponent.id) {
      case 'training-bot':
        return `Warrior ${selectedCharacter?.name}, I have analyzed your potential. Let us begin your training. Show me the depths of your ${selectedCharacter?.powers || 'power'}.`;
      case 'chaos-imp':
        return `Ohoho! ${selectedCharacter?.name}, is it? Your aura looks... deliciously chaotic. Let's dance, shall we? *giggles mischievously*`;
      case 'ancient-guardian':
        return `${selectedCharacter?.name}... the stars spoke of your coming. Whether you seek wisdom or destruction, you shall find truth in our clash.`;
      case 'hulk':
        return `HULK SEES PUNY ${selectedCharacter?.name?.toUpperCase()}! You think you can fight HULK?! HULK WILL SMASH!`;
      case 'wolverine':
        return `*snikt* So you're ${selectedCharacter?.name}, huh? Let's see what you got, bub. Don't hold back - I heal fast.`;
      case 'deadpool':
        return `Oh em gee! ${selectedCharacter?.name}?! I've been DYING to meet you! Get it? Dying? Because I can't die? ...Tough crowd.`;
      case 'mr-fantastic':
        return `Fascinating. ${selectedCharacter?.name}, your abilities seem to defy conventional physics. Allow me to test some hypotheses during our engagement.`;
      case 'thor':
        return `Hail, ${selectedCharacter?.name}! I am Thor, Prince of Asgard! Show me thy valor, mortal, and perhaps you shall earn the thunderer's respect!`;
      case 'magneto':
        return `${selectedCharacter?.name}... another who would stand in the way of mutant destiny? Very well. Let us see if your conviction matches your power.`;
      case 'doctor-doom':
        return `So, ${selectedCharacter?.name} dares face DOOM?! Amusing. Doom shall grant you the honor of witnessing true power before your inevitable defeat.`;
      case 'spider-man':
        return `Hey there, ${selectedCharacter?.name}! *sticks to wall* So are we doing the whole hero vs hero misunderstanding thing, or...? Either way, let's keep it friendly, yeah?`;
      // Anime characters
      case 'goku':
        return `Hey! I'm Goku! *stretches excitedly* You're ${selectedCharacter?.name}, right? I can sense you've got some real power! This is gonna be fun! Let's go all out!`;
      case 'naruto':
        return `I'm Naruto Uzumaki, and I'm gonna be Hokage someday! Believe it! So you're ${selectedCharacter?.name}? Let's see what you've got, dattebayo!`;
      case 'ichigo':
        return `*rests Zangetsu on shoulder* ${selectedCharacter?.name}, huh? I don't know what you want, but if you're looking for a fight... I won't hold back.`;
      case 'luffy':
        return `Shishishi! I'm Luffy! The man who'll become King of the Pirates! *cracks knuckles* You look strong, ${selectedCharacter?.name}! Let's fight!`;
      case 'saitama':
        return `Oh, another challenger? *scratches head* I'm Saitama, just a hero for fun. Look, ${selectedCharacter?.name}, try to make this interesting, okay?`;
      case 'vegeta':
        return `I am Vegeta, Prince of all Saiyans! ${selectedCharacter?.name}... your power level is... acceptable. Now witness the pride of the Saiyan race!`;
      case 'zoro':
        return `*draws three swords* Roronoa Zoro. I'm going to be the world's greatest swordsman. ${selectedCharacter?.name}... don't bore me.`;
      case 'gojo':
        return `*lifts blindfold slightly* Well well~ ${selectedCharacter?.name}! I'm Gojo Satoru, the strongest. Don't worry, I'll go easy on you... maybe~`;
      case 'levi':
        return `Tch. ${selectedCharacter?.name}. *spins blades* I don't have time for games. Come at me with everything you have, or don't bother.`;
      case 'all-might':
        return `I AM HERE! *strikes heroic pose* ${selectedCharacter?.name}! Let us clash as heroes! Show me the spirit that burns within you! PLUS ULTRA!`;
      default:
        return 'Prepare yourself, warrior.';
    }
  };

  // Helper to get character stats for dice rolls
  const getCharacterStats = (char: UserCharacter) => ({
    stat_intelligence: char.stat_intelligence ?? 50,
    stat_strength: char.stat_strength ?? 50,
    stat_power: char.stat_power ?? 50,
    stat_speed: char.stat_speed ?? 50,
    stat_durability: char.stat_durability ?? 50,
    stat_stamina: char.stat_stamina ?? 50,
    stat_skill: char.stat_skill ?? 50,
    stat_luck: char.stat_luck ?? 50,
    stat_battle_iq: char.stat_battle_iq ?? 50,
  });

  // Helper to get AI opponent stats (simulated based on tier and skill)
  const getOpponentStats = (opponent: { level: number; skill?: number; powers?: string } | null) => {
    if (!opponent) return getCharacterStats({} as UserCharacter);
    const baseStat = 30 + (opponent.level * 10); // Higher tier = higher base stats
    const skill = opponent.skill || 50;
    return {
      stat_intelligence: Math.min(100, baseStat + Math.floor(Math.random() * 20)),
      stat_strength: Math.min(100, baseStat + Math.floor(Math.random() * 20)),
      stat_power: Math.min(100, baseStat + Math.floor(Math.random() * 20)),
      stat_speed: Math.min(100, baseStat + Math.floor(Math.random() * 20)),
      stat_durability: Math.min(100, baseStat + Math.floor(Math.random() * 20)),
      stat_stamina: Math.min(100, baseStat + Math.floor(Math.random() * 20)),
      stat_skill: skill,
      stat_luck: Math.min(100, baseStat + Math.floor(Math.random() * 20)),
      stat_battle_iq: Math.min(100, baseStat + Math.floor(Math.random() * 15)),
    };
  };

  // Handle concentration result
  const handleConcentrationResult = async (result: ConcentrationResult) => {
    if (!selectedCharacter || !currentOpponent || !pendingHit) return;
    
    // Update concentration uses
    const newUses = { ...concentrationUses };
    newUses[selectedCharacter.id] = (newUses[selectedCharacter.id] || 3) - 1;
    setConcentrationUses(newUses);

    // Add dice roll message with concentration result
    const diceMsg: DiceRollMessage = {
      id: crypto.randomUUID(),
      hitDetermination: pendingHit,
      concentrationResult: result,
      attackerName: currentOpponent.name,
      defenderName: selectedCharacter.name,
      timestamp: new Date(),
      channel: 'in_universe',
    };
    setDiceRollMessages(prev => [...prev, diceMsg]);

    // Apply stat penalty if dodge succeeded
    if (result.dodgeSuccess) {
      const newPenalties = { ...statPenalties };
      newPenalties[selectedCharacter.id] = result.statPenalty;
      setStatPenalties(newPenalties);
      
      toast.success(`Dodged! But -${result.statPenalty}% stats on next action`);
    } else {
      toast.error('Concentration failed! The attack lands!');
    }

    // Clear pending hit and continue with the action
    setPendingHit(null);
    
    // Now send the actual message with the dice result context
    await sendMessageWithDiceResult(pendingUserAction, result);
  };

  // Handle offensive concentration result (player boosting near-miss attack)
  const handleOffensiveConcentrationResult = async (result: OffensiveConcentrationResult) => {
    if (!selectedCharacter || !currentOpponent || !pendingOffensiveHit) return;
    
    // Update concentration uses
    const newUses = { ...concentrationUses };
    newUses[selectedCharacter.id] = (newUses[selectedCharacter.id] || 3) - 1;
    setConcentrationUses(newUses);

    // Apply stat penalty if hit succeeded
    if (result.hitSuccess) {
      const newPenalties = { ...statPenalties };
      newPenalties[selectedCharacter.id] = result.statPenalty;
      setStatPenalties(newPenalties);
      
      toast.success(`Concentration boosted your attack! +${result.bonusRoll} — HIT! But -${result.statPenalty}% stats on next action`);
    } else {
      toast.error(`Concentration (+${result.bonusRoll}) wasn't enough. Attack still misses!`);
    }

    // Store the offensive result for the AI context
    const offensiveContext = result.hitSuccess
      ? `\n\n[DICE RESULT: ${selectedCharacter.name}'s attack roll ${pendingOffensiveHit.attackRoll.total} vs ${currentOpponent.name}'s defense ${pendingOffensiveHit.defenseRoll.total}. ${selectedCharacter.name} USED CONCENTRATION (+${result.bonusRoll}), new attack total ${result.newAttackTotal}. Attack now HITS! Narrate ${currentOpponent.name} taking damage from the focused strike.]`
      : `\n\n[DICE RESULT: ${selectedCharacter.name}'s attack roll ${pendingOffensiveHit.attackRoll.total} vs ${currentOpponent.name}'s defense ${pendingOffensiveHit.defenseRoll.total}. ${selectedCharacter.name} tried concentration (+${result.bonusRoll}), new attack total ${result.newAttackTotal}. Still MISSES. Narrate how ${currentOpponent.name} narrowly avoids.]`;

    // Clear pending and continue
    setPendingOffensiveHit(null);
    
    // Send the message with the offensive concentration context injected
    setIsLoading(true);
    const userSkill = selectedCharacter.stat_skill || 50;
    const opponentSkill = currentOpponent.skill || 50;

    try {
      const response = await supabase.functions.invoke('mock-battle-ai', {
        body: {
          userCharacter: {
            name: selectedCharacter.name,
            level: selectedCharacter.level,
            powers: selectedCharacter.powers,
            abilities: selectedCharacter.abilities,
            skill: userSkill,
            personality: selectedCharacter.personality,
            mentality: selectedCharacter.mentality,
          },
          opponent: {
            ...currentOpponent,
            skill: opponentSkill,
          },
          userMessage: pendingUserAction + offensiveContext,
          channel: 'in_universe',
          messageHistory: messages.slice(-10),
          battleLocation,
          dynamicEnvironment: dynamicEnvironment && !!battleEnvironment,
          environmentEffects: battleEnvironment?.effectsPrompt || '',
          userGoesFirst,
          isFirstMove: false,
          characterStoryLore: characterStoryLore || undefined,
          characterAINotes: opponentType === 'own' ? getOpponentNotes() : undefined,
        },
      });

      if (!response.error) {
        const aiMessage: Message = {
          id: crypto.randomUUID(),
          role: 'ai',
          content: response.data.response,
          channel: 'in_universe',
          characterName: currentOpponent.name,
        };
        setMessages(prev => [...prev, aiMessage]);
        setTurnNumber(prev => prev + 1);
        processCharacterStatusEffect(response.data.response, true);
        
        const newPenalties2 = { ...statPenalties };
        newPenalties2[selectedCharacter.id] = 0;
        setStatPenalties(newPenalties2);
      }
    } catch (error) {
      console.error('AI response error:', error);
    } finally {
      setIsLoading(false);
      setPendingUserAction('');
    }
  };

  // Handle skipping offensive concentration (accept the miss)
  const handleSkipOffensiveConcentration = async () => {
    if (!selectedCharacter || !currentOpponent || !pendingOffensiveHit) return;
    
    toast.info('You accept the miss.');
    
    const missContext = `\n\n[DICE RESULT: ${selectedCharacter.name}'s attack roll ${pendingOffensiveHit.attackRoll.total} vs ${currentOpponent.name}'s defense ${pendingOffensiveHit.defenseRoll.total}. Attack MISSES! Narrate how ${currentOpponent.name} avoids or deflects the attack.]`;
    
    setPendingOffensiveHit(null);
    setAiStatPenalty(0);
    
    setIsLoading(true);
    const userSkill = selectedCharacter.stat_skill || 50;
    const opponentSkill = currentOpponent.skill || 50;

    try {
      const response = await supabase.functions.invoke('mock-battle-ai', {
        body: {
          userCharacter: {
            name: selectedCharacter.name,
            level: selectedCharacter.level,
            powers: selectedCharacter.powers,
            abilities: selectedCharacter.abilities,
            skill: userSkill,
            personality: selectedCharacter.personality,
            mentality: selectedCharacter.mentality,
          },
          opponent: {
            ...currentOpponent,
            skill: opponentSkill,
          },
          userMessage: pendingUserAction + missContext,
          channel: 'in_universe',
          messageHistory: messages.slice(-10),
          battleLocation,
          dynamicEnvironment: dynamicEnvironment && !!battleEnvironment,
          environmentEffects: battleEnvironment?.effectsPrompt || '',
          userGoesFirst,
          isFirstMove: false,
          characterStoryLore: characterStoryLore || undefined,
          characterAINotes: opponentType === 'own' ? getOpponentNotes() : undefined,
        },
      });

      if (!response.error) {
        const aiMessage: Message = {
          id: crypto.randomUUID(),
          role: 'ai',
          content: response.data.response,
          channel: 'in_universe',
          characterName: currentOpponent.name,
        };
        setMessages(prev => [...prev, aiMessage]);
        setTurnNumber(prev => prev + 1);
        processCharacterStatusEffect(response.data.response, true);
      }
    } catch (error) {
      console.error('AI response error:', error);
    } finally {
      setIsLoading(false);
      setPendingUserAction('');
    }
  };

  // Handle skipping concentration (taking the hit)
  const handleSkipConcentration = async () => {
    if (!selectedCharacter || !currentOpponent || !pendingHit) return;
    
    // Add dice roll message without concentration
    const diceMsg: DiceRollMessage = {
      id: crypto.randomUUID(),
      hitDetermination: pendingHit,
      attackerName: currentOpponent.name,
      defenderName: selectedCharacter.name,
      timestamp: new Date(),
      channel: 'in_universe',
    };
    setDiceRollMessages(prev => [...prev, diceMsg]);

    toast.info('You take the hit!');
    
    // Clear pending hit and continue
    setPendingHit(null);
    await sendMessageWithDiceResult(pendingUserAction, undefined);
  };

  // Handle construct repair with concentration
  const handleConstructRepair = (construct: Construct) => {
    if (!selectedCharacter) return;
    
    const charId = selectedCharacter.id;
    const usesLeft = concentrationUses[charId] ?? 3;
    
    if (usesLeft <= 0) {
      toast.error('No concentration uses remaining!');
      return;
    }
    
    // Get character stats
    const creatorStats = getCharacterStats(selectedCharacter);
    
    // Perform repair
    const repairResult = repairConstructWithConcentration(creatorStats, construct);
    
    // Update concentration uses
    const newUses = { ...concentrationUses };
    newUses[charId] = usesLeft - 1;
    setConcentrationUses(newUses);
    
    // Update construct durability
    const updatedConstructs = { ...constructs };
    if (updatedConstructs[construct.id]) {
      updatedConstructs[construct.id] = {
        ...updatedConstructs[construct.id],
        currentDurability: repairResult.newDurability,
      };
      setConstructs(updatedConstructs);
    }
    
    // Apply stat penalty
    const newPenalties = { ...statPenalties };
    newPenalties[charId] = (newPenalties[charId] || 0) + repairResult.statPenalty;
    setStatPenalties(newPenalties);
    
    // Add construct event message
    const eventMsg: ConstructEventMessage = {
      id: crypto.randomUUID(),
      type: 'repair',
      construct,
      repairResult,
      defenderName: selectedCharacter.name,
      timestamp: new Date(),
      channel: 'in_universe',
    };
    setConstructEventMessages(prev => [...prev, eventMsg]);
    
    toast.success(`Repaired ${construct.name}! +${repairResult.repairAmount} durability, -${repairResult.statPenalty}% stats next action`);
  };

  // Handle creating a construct from user action
  const handleConstructCreation = (constructName: string, constructType: Construct['type']) => {
    if (!selectedCharacter) return;
    
    const creatorStats = getCharacterStats(selectedCharacter);
    const newConstruct = createConstruct(creatorStats, selectedCharacter.id, constructName, constructType);
    
    // Add to constructs
    const updatedConstructs = { ...constructs };
    updatedConstructs[newConstruct.id] = newConstruct;
    setConstructs(updatedConstructs);
    
    // Add create event message
    const eventMsg: ConstructEventMessage = {
      id: crypto.randomUUID(),
      type: 'create',
      construct: newConstruct,
      defenderName: selectedCharacter.name,
      timestamp: new Date(),
      channel: 'in_universe',
    };
    setConstructEventMessages(prev => [...prev, eventMsg]);
    
    toast.success(`Created ${constructName} (${newConstruct.maxDurability} durability)`);
    
    return newConstruct;
  };

  // Handle construct being attacked by opponent
  const handleConstructAttacked = (constructId: string) => {
    const construct = constructs[constructId];
    if (!construct || !selectedCharacter || !currentOpponent) return null;
    
    const attackerStats = getOpponentStats(currentOpponent);
    const creatorStats = getCharacterStats(selectedCharacter);
    
    const attackResult = attackConstruct(
      attackerStats,
      currentOpponent.level,
      construct,
      creatorStats,
      selectedCharacter.level,
      true
    );
    
    // Update construct durability
    const updatedConstructs = { ...constructs };
    if (attackResult.destroyed) {
      delete updatedConstructs[constructId];
      toast.error(`${construct.name} was destroyed!`);
    } else if (attackResult.damage > 0) {
      updatedConstructs[constructId] = {
        ...updatedConstructs[constructId],
        currentDurability: attackResult.remainingDurability,
      };
      toast.warning(`${construct.name} took ${attackResult.damage} damage!`);
    } else {
      toast.success(`${construct.name} blocked the attack!`);
    }
    setConstructs(updatedConstructs);
    
    // Add construct event message
    const eventMsg: ConstructEventMessage = {
      id: crypto.randomUUID(),
      type: 'attack',
      construct,
      attackResult,
      attackerName: currentOpponent.name,
      defenderName: selectedCharacter.name,
      timestamp: new Date(),
      channel: 'in_universe',
    };
    setConstructEventMessages(prev => [...prev, eventMsg]);
    
    return attackResult;
  };

  // Get user's active constructs
  const userConstructs = selectedCharacter 
    ? Object.values(constructs).filter(c => c.creatorId === selectedCharacter.id)
    : [];

  // Send message with dice result context
  const sendMessageWithDiceResult = async (userInput: string, concentrationResult?: ConcentrationResult) => {
    if (!selectedCharacter || !currentOpponent) return;
    
    setIsLoading(true);
    
    const userSkill = selectedCharacter.stat_skill || 50;
    const opponentSkill = currentOpponent.skill || 50;
    
    // Build dice context for AI
    let diceContext = '';
    if (pendingHit) {
      const finalHit = concentrationResult ? !concentrationResult.dodgeSuccess : pendingHit.wouldHit;
      diceContext = `\n\n[DICE RESULT: Attack roll ${pendingHit.attackRoll.total} vs Defense ${pendingHit.defenseRoll.total}. `;
      if (concentrationResult) {
        diceContext += `Defender used concentration (+${concentrationResult.bonusRoll}). `;
        diceContext += concentrationResult.dodgeSuccess ? 'DODGED!' : 'Still hit!';
      } else {
        diceContext += finalHit ? 'Attack HITS!' : 'Attack MISSES!';
      }
      diceContext += ` Incorporate this into the narrative.]`;
    }

    try {
      const response = await supabase.functions.invoke('mock-battle-ai', {
        body: {
          userCharacter: {
            name: selectedCharacter.name,
            level: selectedCharacter.level,
            powers: selectedCharacter.powers,
            abilities: selectedCharacter.abilities,
            skill: userSkill,
            personality: selectedCharacter.personality,
            mentality: selectedCharacter.mentality,
          },
          opponent: {
            ...currentOpponent,
            skill: opponentSkill,
          },
          userMessage: userInput + diceContext,
          channel: 'in_universe',
          messageHistory: messages.slice(-10),
          battleLocation,
          dynamicEnvironment: dynamicEnvironment && !!battleEnvironment,
          environmentEffects: battleEnvironment?.effectsPrompt || '',
          userGoesFirst,
          isFirstMove: false,
          characterStoryLore: characterStoryLore || undefined,
          characterAINotes: opponentType === 'own' ? getOpponentNotes() : undefined,
        },
      });

      if (!response.error) {
        const aiMessage: Message = {
          id: crypto.randomUUID(),
          role: 'ai',
          content: response.data.response,
          channel: 'in_universe',
          characterName: currentOpponent.name,
        };
        setMessages(prev => [...prev, aiMessage]);
        setTurnNumber(prev => prev + 1);
        
        // Process character status effects from AI response (affects the user)
        processCharacterStatusEffect(response.data.response, true);
        
        // Clear any penalties after the action
        const newPenalties = { ...statPenalties };
        newPenalties[selectedCharacter.id] = 0;
        setStatPenalties(newPenalties);
      }
    } catch (error) {
      console.error('AI response error:', error);
    } finally {
      setIsLoading(false);
      setPendingUserAction('');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedCharacter || isLoading || pendingHit || pendingOffensiveHit) return;

    // OCC Correction Detection — if OOC channel, check for correction patterns
    if (activeChannel === 'out_of_universe') {
      const correctionPatterns = [
        /cannot|can't|doesn't have|don't have|unable to|incapable of/i,
        /fights?\s+(defensively|aggressively|cautiously|recklessly)/i,
        /that (?:was|is|should be)\s+(?:movement|an? attack|repositioning|environmental)/i,
        /not an? attack/i,
        /correct(?:ion)?|fix|adjust|modify/i,
      ];
      const isCorrection = correctionPatterns.some(p => p.test(input));
      if (isCorrection) {
        setOccCorrections(prev => [...prev, input.trim()]);
        toast.info('AI behavior updated based on your correction', { duration: 3000 });
      }
    }

    // Capture status effects snapshot for in-universe messages
    const snapshot: StatusEffectsSnapshot = {};
    if (activeChannel === 'in_universe') {
      for (const effect of characterStatusEffects) {
        snapshot[effect.type] = { type: effect.type, intensity: effect.intensity };
      }
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      channel: activeChannel,
      characterName: selectedCharacter.name,
      statusEffectsSnapshot: Object.keys(snapshot).length > 0 ? snapshot : undefined,
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Process battlefield effects from user message
    if (activeChannel === 'in_universe') {
      processBattlefieldEffect(input);
    }
    
    const currentInput = input;
    setInput('');

    // === CHARGE ATTACK DETECTION ===
    let chargeReleaseContext = '';
    let chargeActiveContext = '';
    if (activeChannel === 'in_universe' && diceEnabled) {
      // If currently charging: validate action + tick turn
      if (userChargeState.isCharging) {
        const validation = validateChargeAction(currentInput);
        if (!validation.allowed) {
          toast.error(validation.reason, { duration: 4000 });
          // Still allow the message but add enforcement context
        }

        // Tick charge turn
        const skillMastery = selectedCharacter.stat_skill ?? 50;
        const ticked = tickChargeTurn(userChargeState, skillMastery);
        
        // Check for risk during charge
        if (checkChargeRisk(ticked)) {
          toast.warning('⚡ Energy destabilized during charge! Risk event!', { duration: 3000 });
          playSfxEvent('charge_interrupted');
        } else {
          playSfxEvent('charge_tick');
        }
        
        // Check if charge is complete (chargeTurnsRemaining hit 0 after tick)
        if (ticked.chargeTurnsRemaining <= 0) {
          // Resolve the charged attack
          const chargeResult = resolveChargeAttack(
            ticked,
            selectedCharacter.level,
            selectedCharacter.stat_skill ?? 50,
            userMomentum.value,
            userPsych.resolve,
            userPsych.fear,
          );
          
          // Apply momentum bonus
          setUserMomentum(prev => applyMomentumEvents(prev, [
            { type: 'gain', amount: chargeResult.momentumBonus, reason: 'Charge attack completed' },
          ], userPsych.fear, userPsych.resolve));
          
          toast.success(`⚡ ${chargeResult.description}`, { duration: 4000 });
          playSfxEvent('charge_release');
          
          setUserChargeState(completeCharge(ticked));
          
          // Inject charge multiplier context into the message — stored for AI call
          chargeReleaseContext = `\n\n[CHARGE ATTACK RELEASED: ${selectedCharacter.name} unleashes their charged attack at x${chargeResult.finalMultiplier.toFixed(1)} power multiplier! ${chargeResult.riskDuringCharge ? 'Energy was unstable — reduced effectiveness.' : 'Full power achieved!'} Describe a devastating, screen-shaking attack with burst animation and impact!]`;
        } else {
          setUserChargeState(ticked);
          // Generate active charge context for AI
          chargeActiveContext = getChargeContext(selectedCharacter.name, ticked, currentOpponent?.name || 'opponent');
        }
      } else if (!userChargeState.isCharging && userChargeState.cooldownTurnsRemaining <= 0) {
        // Detect new charge initiation
        const detection = detectChargeInitiation(currentInput);
        if (detection.isCharging) {
          const newChargeState = initiateCharge(userChargeState, detection.requestedTurns, selectedCharacter.level);
          setUserChargeState(newChargeState);
          toast.info(`⚡ Charging! ${newChargeState.totalChargeTurns} turns — defend only!`, { duration: 4000 });
          playSfxEvent('charge_start');
          chargeActiveContext = getChargeContext(selectedCharacter.name, newChargeState, currentOpponent?.name || 'opponent');
        }
      }
      
      // Tick cooldown
      if (userChargeState.cooldownTurnsRemaining > 0 && !userChargeState.isCharging) {
        setUserChargeState(prev => tickChargeCooldown(prev));
      }
    }

    // Check if user is creating a construct
    if (diceEnabled && activeChannel === 'in_universe') {
      const constructCreation = detectConstructCreation(currentInput);
      if (constructCreation.isCreating) {
        handleConstructCreation(constructCreation.suggestedName, constructCreation.constructType);
      }
    }

    // Defense validation - check if player addressed opponent's last attack
    let defenseEnforcementPrompt = '';
    if (diceEnabled && activeChannel === 'in_universe' && lastOpponentAction && lastHitResult && turnNumber > 1) {
      const validation = validateDefense(currentInput, lastOpponentAction, lastHitResult.hit);
      
      if (validation.shouldEnforceHit && validation.hasAttackToAddress) {
        // Player ignored an attack that should have hit them
        const damageLevel = getDamageLevel(lastHitResult.gap);
        defenseEnforcementPrompt = generateDefenseEnforcementPrompt(
          selectedCharacter.name,
          currentOpponent?.name || 'opponent',
          lastOpponentAction,
          damageLevel
        );
        
        toast.warning('Your move didn\'t address the incoming attack - the hit will be enforced!', {
          duration: 4000,
        });
      }
    }

    // For in-universe attacks with dice enabled, roll dice for the opponent's counter-attack
    if (diceEnabled && activeChannel === 'in_universe' && currentOpponent && turnNumber > 1) {
      const attackerStats = getOpponentStats(currentOpponent);
      const defenderStats = getCharacterStats(selectedCharacter);
      const defenderPenalty = statPenalties[selectedCharacter.id] || 0;
      
      // Check if opponent might target a construct instead of the character
      const userActiveConstructs = Object.values(constructs).filter(c => c.creatorId === selectedCharacter.id);
      const mightTargetConstruct = userActiveConstructs.length > 0 && 
        (detectConstructAttack(currentOpponent.powers || '') || Math.random() < 0.3); // 30% chance to target construct
      
      if (mightTargetConstruct && userActiveConstructs.length > 0) {
        // Target a random construct
        const targetConstruct = userActiveConstructs[Math.floor(Math.random() * userActiveConstructs.length)];
        const constructResult = handleConstructAttacked(targetConstruct.id);
        
        // If construct blocked or was destroyed, we skip the normal hit roll
        if (constructResult && !constructResult.destroyed && constructResult.damage === 0) {
          // Construct blocked - continue without concentration prompt
        } else if (constructResult && constructResult.destroyed) {
          // Construct destroyed - attack still hits character normally
          const isMental = /mind|psychic|telepathy|illusion|mental|brain|thought/i.test(currentOpponent.powers || '');
          const hit = isMental
            ? determineMentalHit(attackerStats, currentOpponent.level, defenderStats, selectedCharacter.level, true, defenderPenalty)
            : determineHit(attackerStats, currentOpponent.level, defenderStats, selectedCharacter.level, true, defenderPenalty);
          
          if (hit.wouldHit && hit.gap <= CONCENTRATION_GAP_THRESHOLD && (concentrationUses[selectedCharacter.id] ?? 3) > 0) {
            setPendingHit(hit);
            setPendingUserAction(currentInput);
            setIsLoading(false);
            return;
          } else {
            const diceMsg: DiceRollMessage = {
              id: crypto.randomUUID(),
              hitDetermination: hit,
              attackerName: currentOpponent.name,
              defenderName: selectedCharacter.name,
              timestamp: new Date(),
              channel: 'in_universe',
              isAIRoll: true,
            };
            setDiceRollMessages(prev => [...prev, diceMsg]);
            
            // Store for defense validation
            setLastHitResult({ hit: hit.wouldHit, gap: hit.gap });
          }
        }
        // If construct took damage but wasn't destroyed, attack was absorbed
      } else {
        // Normal attack against character
        const isMental = /mind|psychic|telepathy|illusion|mental|brain|thought/i.test(currentOpponent.powers || '');
        
        const hit = isMental
          ? determineMentalHit(attackerStats, currentOpponent.level, defenderStats, selectedCharacter.level, true, defenderPenalty)
          : determineHit(attackerStats, currentOpponent.level, defenderStats, selectedCharacter.level, true, defenderPenalty);
        
        // If the attack would hit by 5 or less, show concentration option
        if (hit.wouldHit && hit.gap <= CONCENTRATION_GAP_THRESHOLD && (concentrationUses[selectedCharacter.id] ?? 3) > 0) {
          setPendingHit(hit);
          setPendingUserAction(currentInput);
          setIsLoading(false);
          return; // Wait for concentration decision
        } else {
          // Add dice roll message (miss or no concentration left)
          const diceMsg: DiceRollMessage = {
            id: crypto.randomUUID(),
            hitDetermination: hit,
            attackerName: currentOpponent.name,
            defenderName: selectedCharacter.name,
            timestamp: new Date(),
            channel: 'in_universe',
            isAIRoll: true,
          };
          setDiceRollMessages(prev => [...prev, diceMsg]);
          
          // Store for defense validation
          setLastHitResult({ hit: hit.wouldHit, gap: hit.gap });
          
          // Check charge interruption if player is charging and got hit
          if (hit.wouldHit && userChargeState.isCharging) {
            const interruptCheck = checkChargeInterruption(
              userChargeState, hit.gap, userPsych.resolve, userPsych.fear, userMomentum.value, userMomentum.edgeStateActive
            );
            if (interruptCheck.interrupted) {
              setUserChargeState(interruptCharge(userChargeState));
              setUserMomentum(prev => applyMomentumEvents(prev, [{ type: 'loss', amount: Math.round(userMomentum.value / 2), reason: 'Charge interrupted' }], userPsych.fear, userPsych.resolve));
              toast.error('⚡ Charge Disrupted!', { duration: 3000 });
              playSfxEvent('charge_interrupted');
              chargeActiveContext = `\n\n[CHARGE INTERRUPTED: ${selectedCharacter.name}'s charge was disrupted by the hit! Energy dissipates. Describe the failed charge dramatically.]`;
            }
          }
        }
      }
    }
    
    setIsLoading(true);

    // Determine if an environmental hazard should trigger
    const messageCount = messages.filter(m => m.channel === 'in_universe').length;
    const hazardShouldTrigger = dynamicEnvironment && 
                                 battleEnvironment?.terrainFeatures && 
                                 activeChannel === 'in_universe' &&
                                 shouldTriggerHazard(messageCount, 'medium');
    
    const hazardEvent = hazardShouldTrigger 
      ? generateHazardEventPrompt(battleEnvironment?.terrainFeatures || null)
      : undefined;

    // Generate physics and skill context
    const userSkill = selectedCharacter.stat_skill || 50;
    const opponentSkill = currentOpponent?.skill || 50;
    const physicsContext = generatePhysicsContext(selectedCharacter.level, currentOpponent?.level || 1);
    const skillContext = generateSkillContext(userSkill, opponentSkill);

    // Check for skill mishaps or criticals
    const userMishap = shouldTriggerSkillMishap(userSkill);
    const userCritical = !userMishap && shouldTriggerCritical(userSkill);
    
    let skillEventNote = ''
    if (userMishap && activeChannel === 'in_universe') {
      skillEventNote = '\n\n[SKILL MISHAP: The user\'s low skill caused their attack/ability to misfire or behave unexpectedly. Incorporate this into the narrative!]';
    } else if (userCritical && activeChannel === 'in_universe') {
      skillEventNote = '\n\n[CRITICAL SUCCESS: The user executed their technique with exceptional precision! Describe an impressive or unexpected positive outcome!]';
    }

    // Roll dice for the player's attack against the AI opponent
    let playerAttackContext = '';
    if (diceEnabled && activeChannel === 'in_universe' && currentOpponent && turnNumber > 0) {
      const playerStats = getCharacterStats(selectedCharacter);
      const opponentDefenseStats = getOpponentStats(currentOpponent);
      const opponentPenalty = aiStatPenalty;
      
      const isMentalAttack = /mind|psychic|telepathy|illusion|mental|brain|thought/i.test(selectedCharacter.powers || '');
      
      const playerHit = isMentalAttack
        ? determineMentalHit(playerStats, selectedCharacter.level, opponentDefenseStats, currentOpponent.level, true, opponentPenalty)
        : determineHit(playerStats, selectedCharacter.level, opponentDefenseStats, currentOpponent.level, true, opponentPenalty);
      
      // Add player's attack roll to messages
      const playerDiceMsg: DiceRollMessage = {
        id: crypto.randomUUID(),
        hitDetermination: playerHit,
        attackerName: selectedCharacter.name,
        defenderName: currentOpponent.name,
        timestamp: new Date(),
        channel: 'in_universe',
        isAIRoll: false,
      };
      setDiceRollMessages(prev => [...prev, playerDiceMsg]);
      
      // Check if AI should use concentration (only for close hits, gap ≤ 5)
      if (playerHit.wouldHit && playerHit.gap <= CONCENTRATION_GAP_THRESHOLD && aiConcentrationUses > 0 && Math.random() < 0.5) {
        // AI uses concentration (50% chance when it would help)
        const aiConcentrationResult = useConcentration(opponentDefenseStats, playerHit);
        
        if (aiConcentrationResult.dodgeSuccess) {
          playerAttackContext = `\n\n[DICE RESULT: ${selectedCharacter.name}'s attack roll ${playerHit.attackRoll.total} vs ${currentOpponent.name}'s defense ${playerHit.defenseRoll.total}. ${currentOpponent.name} USED CONCENTRATION (+${aiConcentrationResult.bonusRoll}) and DODGED! They suffer -${aiConcentrationResult.statPenalty}% stats on their next action. Narrate how ${currentOpponent.name} narrowly evades through intense focus.]`;
          setAiConcentrationUses(prev => prev - 1);
          setAiStatPenalty(aiConcentrationResult.statPenalty);
        } else {
          playerAttackContext = `\n\n[DICE RESULT: ${selectedCharacter.name}'s attack roll ${playerHit.attackRoll.total} vs ${currentOpponent.name}'s defense ${playerHit.defenseRoll.total}. ${currentOpponent.name} tried to use concentration (+${aiConcentrationResult.bonusRoll}) but FAILED! The attack HITS! Narrate taking the damage and how it affects them.]`;
          setAiConcentrationUses(prev => prev - 1);
        }
      } else if (playerHit.wouldHit) {
        playerAttackContext = `\n\n[DICE RESULT: ${selectedCharacter.name}'s attack roll ${playerHit.attackRoll.total} vs ${currentOpponent.name}'s defense ${playerHit.defenseRoll.total}. Attack HITS! ${aiConcentrationUses > 0 ? `(${currentOpponent.name} has ${aiConcentrationUses} concentration uses remaining but chose not to use one)` : `(No concentration uses remaining)`}. Narrate taking the damage and how it affects ${currentOpponent.name}.]`;
        // Clear AI stat penalty after their action
        setAiStatPenalty(0);
      } else if (!playerHit.wouldHit && Math.abs(playerHit.gap) <= CONCENTRATION_GAP_THRESHOLD && (concentrationUses[selectedCharacter.id] ?? 3) > 0) {
        // Player's attack missed by 5 or less — offer offensive concentration
        setPendingOffensiveHit(playerHit);
        setPendingUserAction(currentInput);
        setIsLoading(false);
        return; // Wait for offensive concentration decision
      } else {
        playerAttackContext = `\n\n[DICE RESULT: ${selectedCharacter.name}'s attack roll ${playerHit.attackRoll.total} vs ${currentOpponent.name}'s defense ${playerHit.defenseRoll.total}. Attack MISSES! Narrate how ${currentOpponent.name} avoids or deflects the attack.]`;
        // Clear AI stat penalty after their action
        setAiStatPenalty(0);
      }
    }
    // === Phase 3: Adaptive AI — track player action ===
    let adaptiveAIContext = '';
    if (activeChannel === 'in_universe' && currentOpponent) {
      const updatedPattern = recordPlayerAction(playerPattern, currentInput, overchargeEnabled, false);
      setPlayerPattern(updatedPattern);

      // Re-evaluate strategy every ADAPTATION_INTERVAL turns
      if (shouldAdapt(turnNumber)) {
        const newStrategy = deriveStrategy(updatedPattern);
        setAdaptiveStrategy(newStrategy);
      }
      adaptiveAIContext = getAdaptiveAIContext(adaptiveStrategy, currentOpponent.name);
    }

    // === Phase 1: Overcharge, Momentum, Psychology context for AI ===
    let overchargeAIContext = '';
    let momentumAIContext = '';
    let psychAIContext = '';

    if (activeChannel === 'in_universe' && currentOpponent) {
      // Resolve overcharge if enabled
      if (overchargeEnabled) {
        const riskMod = getRiskChanceModifier(userPsych);
        const overchargeResult = resolveOvercharge(true, riskMod, userMomentum.edgeStateActive);
        overchargeAIContext = getOverchargeContext(overchargeResult, selectedCharacter.name);

        // Apply psych events from overcharge outcome
        if (overchargeResult.riskOccurred) {
          setUserPsych(prev => applyPsychEvent(prev, 'overcharge_fail'));
          setUserMomentum(prev => applyMomentumEvents(prev, [{ type: 'loss', amount: 25, reason: 'Risk misfire' }], userPsych.fear, userPsych.resolve));
        } else {
          setUserPsych(prev => applyPsychEvent(prev, 'overcharge_success'));
        }
        setOverchargeEnabled(false); // Reset after use
      }

      // User momentum events from their own action
      const userHitLanded = playerAttackContext.includes('HITS!');
      const userMomentumEvents = detectMomentumEvents(currentInput, true, userHitLanded, false, false);
      if (userMomentumEvents.length > 0) {
        setUserMomentum(prev => applyMomentumEvents(prev, userMomentumEvents, userPsych.fear, userPsych.resolve));
      }
      // Tick Edge State for user
      setUserMomentum(prev => tickEdgeState(prev));
      // Check if edge state just activated
      setUserMomentum(prev => {
        if (prev.edgeStateActive && prev.edgeStateTurnsRemaining === 2) {
          setUserPsych(p => applyPsychEvent(p, 'edge_state_entered'));
        }
        return prev;
      });

      // Build context strings
      momentumAIContext = getMomentumContext(selectedCharacter.name, userMomentum, currentOpponent.name, opponentMomentum);
      psychAIContext = getPsychologyContext(selectedCharacter.name, userPsych, currentOpponent.name, opponentPsych);
    }

    try {
      const response = await supabase.functions.invoke('mock-battle-ai', {
        body: {
          userCharacter: {
            name: selectedCharacter.name,
            level: selectedCharacter.level,
            powers: selectedCharacter.powers,
            abilities: selectedCharacter.abilities,
            skill: userSkill,
            personality: selectedCharacter.personality,
            mentality: selectedCharacter.mentality,
          },
          opponent: {
            ...currentOpponent,
            skill: opponentSkill,
          },
          userMessage: input + skillEventNote + playerAttackContext + defenseEnforcementPrompt + overchargeAIContext + momentumAIContext + psychAIContext + adaptiveAIContext + chargeReleaseContext + chargeActiveContext + (arenaModifiersEnabled ? arenaModifiers.combinedPrompt : ''),
          channel: activeChannel,
          messageHistory: messages.slice(-10),
          battleLocation,
          dynamicEnvironment: dynamicEnvironment && !!battleEnvironment,
          environmentEffects: battleEnvironment?.effectsPrompt || '',
          hazardEvent,
          userGoesFirst,
          isFirstMove: false,
          characterStoryLore: characterStoryLore || undefined,
          occCorrections: occCorrections.length > 0 ? occCorrections : undefined,
          emergencyLocation: emergencyLocation ? {
            name: emergencyLocation.name,
            hazards: emergencyLocation.hazards,
            urgency: emergencyLocation.urgency,
            countdownTurns: emergencyLocation.countdownTurns,
          } : undefined,
          characterAINotes: opponentType === 'own' ? getOpponentNotes() : undefined,
        },
      });

      if (response.error) throw response.error;

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: 'ai',
        content: response.data.response,
        channel: activeChannel,
        characterName: currentOpponent?.name || 'Unknown',
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Process battlefield effects from AI message
      if (activeChannel === 'in_universe') {
        processBattlefieldEffect(response.data.response);
        // Process character status effects from AI response (affects the user)
        processCharacterStatusEffect(response.data.response, true);
        // Process SFX from AI response
        processSfxText(response.data.response);
        
        // Process momentum events from AI response (opponent's actions affect user)
        const aiMomentumEvents = detectMomentumEvents(response.data.response, false, null, false, false);
        if (aiMomentumEvents.length > 0) {
          setUserMomentum(prev => applyMomentumEvents(prev, aiMomentumEvents, userPsych.fear, userPsych.resolve));
        }
        // Opponent gains momentum from their actions
        const oppMomentumEvents = detectMomentumEvents(response.data.response, true, true, false, false);
        if (oppMomentumEvents.length > 0) {
          setOpponentMomentum(prev => applyMomentumEvents(prev, oppMomentumEvents, opponentPsych.fear, opponentPsych.resolve));
        }
        // Tick Edge State for opponent
        setOpponentMomentum(prev => tickEdgeState(prev));
        
        // Process psychological events from AI response
        const aiPsychEvents = detectPsychEvents(response.data.response, true);
        for (const evt of aiPsychEvents) {
          setUserPsych(prev => applyPsychEvent(prev, evt));
        }
        // Opponent psychological shifts from player's action context
        const oppPsychEvents = detectPsychEvents(currentInput, false);
        for (const evt of oppPsychEvents) {
          setOpponentPsych(prev => applyPsychEvent(prev, evt));
        }
      }
      
      // Store opponent's action for defense validation next turn
      if (activeChannel === 'in_universe') {
        setLastOpponentAction(response.data.response);
      }

      // Trigger narrator for in-universe exchanges (based on frequency setting)
      if (narratorFrequency !== 'off' && activeChannel === 'in_universe' && currentOpponent) {
        try {
          const narratorResponse = await supabase.functions.invoke('battle-narrator', {
            body: {
              userCharacter: {
                name: selectedCharacter.name,
                level: selectedCharacter.level,
              },
              opponent: {
                name: currentOpponent.name,
                level: currentOpponent.level,
              },
              userAction: input,
              opponentResponse: response.data.response,
              battleLocation,
              turnNumber,
              frequency: narratorFrequency,
            },
          });

          if (!narratorResponse.error && narratorResponse.data?.narration) {
            const narratorMessage: Message = {
              id: crypto.randomUUID(),
              role: 'narrator',
              content: narratorResponse.data.narration,
              channel: 'in_universe',
              characterName: '🎙️ Narrator',
            };
            setMessages(prev => [...prev, narratorMessage]);
            setTurnNumber(prev => prev + 1);
          } else {
            // If narrator chose not to speak (key moments mode), still increment turn
            setTurnNumber(prev => prev + 1);
          }
        } catch (narratorError) {
          console.error('Narrator error:', narratorError);
          // Narrator failures are non-critical, continue without narration
          setTurnNumber(prev => prev + 1);
        }
      } else if (narratorFrequency === 'off') {
        setTurnNumber(prev => prev + 1);
      }
    } catch (error) {
      console.error('AI response error:', error);
      // Fallback response if AI fails
      const fallbackMessage: Message = {
        id: crypto.randomUUID(),
        role: 'ai',
        content: activeChannel === 'in_universe' 
          ? `*${currentOpponent?.name || 'Your opponent'} narrows their eyes, considering your move*\n\n"Interesting approach, ${selectedCharacter.name}. But can you handle THIS?"\n\n*${currentOpponent?.name || 'Your opponent'} prepares a counter-attack*`
          : `[OOC: Nice move! That was a creative use of your character's abilities. Want to keep going?]`,
        channel: activeChannel,
        characterName: currentOpponent?.name || 'Unknown',
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetBattle = () => {
    // Prompt to save location if one was used
    if (battleLocation.trim() && battleStarted) {
      setShowSaveLocationPrompt(true);
    }
    
    setMessages([]);
    setBattleStarted(false);
    setBattleLocation('');
    setSelectedPlanetData(null);
    setBattleEnvironment(null);
    setUseCustomLocation(false);
    setTurnNumber(1);
    setTurnOrderDetermined(false);
    setUserGoesFirst(true);
    setIsFirstMove(true);
    // Reset dice mechanics
    setBattleState(null);
    setPendingHit(null);
    setPendingOffensiveHit(null);
    setPendingUserAction('');
    setDiceRollMessages([]);
    setConcentrationUses({});
    setStatPenalties({});
    // Reset charge state
    setUserChargeState(createChargeState());
    // Reset AI concentration and defense validation
    setAiConcentrationUses(3);
    setAiStatPenalty(0);
    setLastOpponentAction('');
    setLastHitResult(null);
    // Reset construct mechanics
    setConstructs({});
    setConstructEventMessages([]);
    setPendingConstructRepair(null);
    // Reset Phase 1 advanced systems
    setUserMomentum(createMomentumState());
    setOpponentMomentum(createMomentumState());
    setUserPsych(createPsychologicalState());
    setOpponentPsych(createPsychologicalState());
    setOverchargeEnabled(false);
    // Reset Phase 3 adaptive AI
    setPlayerPattern(createPlayerPattern());
    setAdaptiveStrategy(null);
    // Reset OCC corrections and emergency location
    setOccCorrections([]);
    setEmergencyLocation(null);
    // Clear PvE battle from localStorage
    localStorage.removeItem('pveBattleSession');
    if (selectedCharacter) {
      const existing = JSON.parse(localStorage.getItem('activePveBattles') || '[]');
      const filtered = existing.filter((b: any) => b.characterName !== selectedCharacter.name);
      localStorage.setItem('activePveBattles', JSON.stringify(filtered));
    }
  };

  if (userCharacters.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Bot className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Create a Character First</h2>
        <p className="text-muted-foreground mb-4">
          You need at least one character to practice battles.
        </p>
        <Button asChild>
          <Link to="/characters/new">Create Character</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Save Location Prompt */}
      <SaveLocationPrompt
        open={showSaveLocationPrompt}
        onOpenChange={setShowSaveLocationPrompt}
        locationName={emergencyLocation?.name || battleLocation}
        locationDescription={emergencyLocation?.description}
        isEmergency={!!emergencyLocation}
        hazardDescription={emergencyLocation?.hazards}
        initialTags={emergencyLocation?.tags || []}
      />
      {/* Battle Onboarding Modal */}
      {showOnboarding && (
        <BattleOnboarding
          onComplete={() => setShowOnboarding(false)}
          forceShow={showOnboarding}
        />
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/battles')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              resetOnboarding();
              setShowOnboarding(true);
            }}
          >
            <HelpCircle className="w-4 h-4 mr-1" />
            How to Play
          </Button>
          {battleStarted && (
            <Button variant="outline" onClick={resetBattle}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset Battle
            </Button>
          )}
        </div>
      </div>

      <Card className="bg-card-gradient border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            PvE Battle
            <Badge variant="outline" className="ml-2">AI Opponent</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!battleStarted ? (
            <div className="space-y-6">
              {/* Character Selection */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium">Your Character</label>
                  <Select 
                    value={selectedCharacter?.id} 
                    onValueChange={(id) => setSelectedCharacter(userCharacters.find(c => c.id === id) || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select character" />
                    </SelectTrigger>
                    <SelectContent>
                      {userCharacters.map((char) => (
                        <SelectItem key={char.id} value={char.id}>
                          <span className="flex items-center gap-2">
                            <Sparkles className="w-3 h-3" />
                            {char.name} (Tier {char.level})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCharacter && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={selectedCharacter.image_url || undefined} />
                          <AvatarFallback>{selectedCharacter.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{selectedCharacter.name}</p>
                          <p className="text-xs text-muted-foreground">{getTierName(selectedCharacter.level)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Opponent Type</label>
                  <Tabs value={opponentType} onValueChange={(v) => setOpponentType(v as 'ai' | 'own')}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="ai" className="flex items-center gap-2">
                        <Bot className="w-4 h-4" />
                        AI Characters
                      </TabsTrigger>
                      <TabsTrigger value="own" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        My Characters
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {opponentType === 'ai' ? (
                    <>
                      {/* Filters Row */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          <Label className="text-xs text-muted-foreground">Power:</Label>
                          <Select value={selectedTierFilter} onValueChange={setSelectedTierFilter}>
                            <SelectTrigger className="h-8 w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border border-border z-50">
                              {POWER_TIERS.map((tier) => (
                                <SelectItem key={tier.id} value={tier.id}>
                                  {tier.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-1">
                          <Label className="text-xs text-muted-foreground">Category:</Label>
                          <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                            <SelectTrigger className="h-8 w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border border-border z-50">
                              {OPPONENT_CATEGORIES.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {filteredOpponents.length} opponents
                        </Badge>
                      </div>
                      
                      <Select 
                        value={selectedOpponent?.id || ''} 
                        onValueChange={(id) => setSelectedOpponent(AI_OPPONENTS.find(o => o.id === id) || AI_OPPONENTS[0])}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border border-border z-50 max-h-[400px]">
                          {/* Training Opponents */}
                          {filteredOpponents.some(o => ORIGINAL_OPPONENTS.find(orig => orig.id === o.id)) && (
                            <>
                              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                                🎯 Training Opponents
                              </div>
                              {ORIGINAL_OPPONENTS.filter(o => filteredOpponents.find(f => f.id === o.id)).map((opponent) => (
                                <SelectItem key={opponent.id} value={opponent.id}>
                                  <span className="flex items-center gap-2">
                                    <Bot className="w-3 h-3" />
                                    {opponent.name} (Tier {opponent.level})
                                  </span>
                                </SelectItem>
                              ))}
                            </>
                          )}
                          
                          {/* Iconic Heroes & Villains */}
                          {filteredOpponents.some(o => ICONIC_OPPONENTS.find(orig => orig.id === o.id)) && (
                            <>
                              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2 border-t pt-2 bg-muted/50 sticky top-0">
                                ⚡ Iconic Heroes & Villains
                              </div>
                              {ICONIC_OPPONENTS.filter(o => filteredOpponents.find(f => f.id === o.id)).map((opponent) => (
                                <SelectItem key={opponent.id} value={opponent.id}>
                                  <span className="flex items-center gap-2">
                                    <Swords className="w-3 h-3 text-primary" />
                                    {opponent.name} (Tier {opponent.level})
                                  </span>
                                </SelectItem>
                              ))}
                            </>
                          )}
                          
                          {/* Celebrities */}
                          {filteredOpponents.some(o => CELEBRITY_OPPONENTS.find(orig => orig.id === o.id)) && (
                            <>
                              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2 border-t pt-2 bg-muted/50 sticky top-0">
                                🌟 Celebrities
                              </div>
                              {CELEBRITY_OPPONENTS.filter(o => filteredOpponents.find(f => f.id === o.id)).map((opponent) => (
                                <SelectItem key={opponent.id} value={opponent.id}>
                                  <span className="flex items-center gap-2">
                                    <Mic className="w-3 h-3 text-yellow-500" />
                                    {opponent.name} (Tier {opponent.level})
                                  </span>
                                </SelectItem>
                              ))}
                            </>
                          )}
                          
                          {/* Video Games */}
                          {filteredOpponents.some(o => GAME_OPPONENTS.find(orig => orig.id === o.id)) && (
                            <>
                              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2 border-t pt-2 bg-muted/50 sticky top-0">
                                🎮 Video Games
                              </div>
                              {GAME_OPPONENTS.filter(o => filteredOpponents.find(f => f.id === o.id)).map((opponent) => (
                                <SelectItem key={opponent.id} value={opponent.id}>
                                  <span className="flex items-center gap-2">
                                    <Zap className="w-3 h-3 text-cyan-500" />
                                    {opponent.name} (Tier {opponent.level})
                                  </span>
                                </SelectItem>
                              ))}
                            </>
                          )}
                          
                          {/* Horror Villains */}
                          {filteredOpponents.some(o => HORROR_OPPONENTS.find(orig => orig.id === o.id)) && (
                            <>
                              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2 border-t pt-2 bg-muted/50 sticky top-0">
                                🔪 Horror Villains
                              </div>
                              {HORROR_OPPONENTS.filter(o => filteredOpponents.find(f => f.id === o.id)).map((opponent) => (
                                <SelectItem key={opponent.id} value={opponent.id}>
                                  <span className="flex items-center gap-2">
                                    <AlertTriangle className="w-3 h-3 text-red-600" />
                                    {opponent.name} (Tier {opponent.level})
                                  </span>
                                </SelectItem>
                              ))}
                            </>
                          )}
                          
                          {/* Classic Anime */}
                          {filteredOpponents.some(o => ANIME_OPPONENTS.find(orig => orig.id === o.id)) && (
                            <>
                              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2 border-t pt-2 bg-muted/50 sticky top-0">
                                🌸 Classic Anime
                              </div>
                              {ANIME_OPPONENTS.filter(o => filteredOpponents.find(f => f.id === o.id)).map((opponent) => (
                                <SelectItem key={opponent.id} value={opponent.id}>
                                  <span className="flex items-center gap-2">
                                    <Sparkles className="w-3 h-3 text-pink-500" />
                                    {opponent.name} (Tier {opponent.level})
                                  </span>
                                </SelectItem>
                              ))}
                            </>
                          )}
                          
                          {/* Seven Deadly Sins */}
                          {filteredOpponents.some(o => SEVEN_DEADLY_SINS_OPPONENTS.find(orig => orig.id === o.id)) && (
                            <>
                              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2 border-t pt-2 bg-muted/50 sticky top-0">
                                ⚔️ Seven Deadly Sins
                              </div>
                              {SEVEN_DEADLY_SINS_OPPONENTS.filter(o => filteredOpponents.find(f => f.id === o.id)).map((opponent) => (
                                <SelectItem key={opponent.id} value={opponent.id}>
                                  <span className="flex items-center gap-2">
                                    <Zap className="w-3 h-3 text-orange-500" />
                                    {opponent.name} (Tier {opponent.level})
                                  </span>
                                </SelectItem>
                              ))}
                            </>
                          )}
                          
                          {/* Hunter x Hunter */}
                          {filteredOpponents.some(o => HUNTER_X_HUNTER_OPPONENTS.find(orig => orig.id === o.id)) && (
                            <>
                              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2 border-t pt-2 bg-muted/50 sticky top-0">
                                🎴 Hunter x Hunter
                              </div>
                              {HUNTER_X_HUNTER_OPPONENTS.filter(o => filteredOpponents.find(f => f.id === o.id)).map((opponent) => (
                                <SelectItem key={opponent.id} value={opponent.id}>
                                  <span className="flex items-center gap-2">
                                    <Atom className="w-3 h-3 text-green-500" />
                                    {opponent.name} (Tier {opponent.level})
                                  </span>
                                </SelectItem>
                              ))}
                            </>
                          )}
                          
                          {/* Demon Slayer */}
                          {filteredOpponents.some(o => DEMON_SLAYER_OPPONENTS.find(orig => orig.id === o.id)) && (
                            <>
                              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2 border-t pt-2 bg-muted/50 sticky top-0">
                                🗡️ Demon Slayer
                              </div>
                              {DEMON_SLAYER_OPPONENTS.filter(o => filteredOpponents.find(f => f.id === o.id)).map((opponent) => (
                                <SelectItem key={opponent.id} value={opponent.id}>
                                  <span className="flex items-center gap-2">
                                    <Swords className="w-3 h-3 text-red-500" />
                                    {opponent.name} (Tier {opponent.level})
                                  </span>
                                </SelectItem>
                              ))}
                            </>
                          )}
                          
                          {/* My Hero Academia */}
                          {filteredOpponents.some(o => MHA_OPPONENTS.find(orig => orig.id === o.id)) && (
                            <>
                              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2 border-t pt-2 bg-muted/50 sticky top-0">
                                💥 My Hero Academia
                              </div>
                              {MHA_OPPONENTS.filter(o => filteredOpponents.find(f => f.id === o.id)).map((opponent) => (
                                <SelectItem key={opponent.id} value={opponent.id}>
                                  <span className="flex items-center gap-2">
                                    <Zap className="w-3 h-3 text-blue-500" />
                                    {opponent.name} (Tier {opponent.level})
                                  </span>
                                </SelectItem>
                              ))}
                            </>
                          )}
                          
                          {/* Jujutsu Kaisen */}
                          {filteredOpponents.some(o => JJK_OPPONENTS.find(orig => orig.id === o.id)) && (
                            <>
                              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2 border-t pt-2 bg-muted/50 sticky top-0">
                                👁️ Jujutsu Kaisen
                              </div>
                              {JJK_OPPONENTS.filter(o => filteredOpponents.find(f => f.id === o.id)).map((opponent) => (
                                <SelectItem key={opponent.id} value={opponent.id}>
                                  <span className="flex items-center gap-2">
                                    <Sparkles className="w-3 h-3 text-purple-500" />
                                    {opponent.name} (Tier {opponent.level})
                                  </span>
                                </SelectItem>
                              ))}
                            </>
                          )}
                          
                          {filteredOpponents.length === 0 && (
                            <div className="px-4 py-3 text-center text-sm text-muted-foreground">
                              No opponents match your filters
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      {selectedOpponent && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3 mb-2">
                            <Avatar className="bg-primary/20">
                              <AvatarFallback className="text-primary">
                                <Bot className="w-5 h-5" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium">{selectedOpponent.name}</p>
                              <div className="flex items-center gap-1">
                                <p className="text-xs text-muted-foreground">{getTierName(selectedOpponent.level)}</p>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="w-3 h-3 text-muted-foreground cursor-help hover:text-primary transition-colors" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[250px] text-xs">
                                      <p className="font-medium mb-1">Why Tier {selectedOpponent.level}?</p>
                                      <p>{selectedOpponent.tierReason}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">{selectedOpponent.personality}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <Select 
                        value={selectedOwnCharacter?.id || ''} 
                        onValueChange={(id) => setSelectedOwnCharacter(userCharacters.find(c => c.id === id) || null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your character as opponent" />
                        </SelectTrigger>
                        <SelectContent>
                          {userCharacters.filter(c => c.id !== selectedCharacter?.id).map((char) => (
                            <SelectItem key={char.id} value={char.id}>
                              <span className="flex items-center gap-2">
                                <User className="w-3 h-3" />
                                {char.name} (Tier {char.level})
                              </span>
                            </SelectItem>
                          ))}
                          {userCharacters.filter(c => c.id !== selectedCharacter?.id).length === 0 && (
                            <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                              You need at least 2 characters to fight yourself
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      {selectedOwnCharacter && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3 mb-2">
                            <Avatar>
                              <AvatarImage src={selectedOwnCharacter.image_url || undefined} />
                              <AvatarFallback>{selectedOwnCharacter.name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{selectedOwnCharacter.name}</p>
                              <p className="text-xs text-muted-foreground">{getTierName(selectedOwnCharacter.level)}</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Powers: {selectedOwnCharacter.powers || 'Unknown'}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Battle Location */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Battle Location
                </label>
                
                {availablePlanets.length > 0 && !useCustomLocation ? (
                  <div className="space-y-2">
                    <Select
                      value={selectedPlanetData?.planet_name || ''}
                      onValueChange={(value) => {
                        if (value === '__custom__') {
                          setUseCustomLocation(true);
                          setSelectedPlanetData(null);
                          setBattleLocation('');
                        } else {
                          const planet = availablePlanets.find(p => p.planet_name === value);
                          if (planet) {
                            setSelectedPlanetData(planet);
                            setBattleLocation(planet.display_name || planet.planet_name);
                          }
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a planet from your solar system..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePlanets.map((planet) => (
                          <SelectItem key={planet.planet_name} value={planet.planet_name}>
                            <span className="flex items-center gap-2">
                              <Globe className="w-3 h-3 text-primary" />
                              {planet.display_name || planet.planet_name}
                              {planet.gravity && (
                                <Badge variant="outline" className="text-xs ml-2">
                                  {planet.gravity.toFixed(1)}g
                                </Badge>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__" className="text-muted-foreground border-t mt-1 pt-2">
                          + Enter custom location...
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter battle location (e.g., Volcanic Mountains, Crystal Caverns)"
                        value={battleLocation}
                        onChange={(e) => setBattleLocation(e.target.value)}
                        className="flex-1"
                      />
                      {availablePlanets.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUseCustomLocation(false);
                            setBattleLocation('');
                          }}
                        >
                          <Globe className="w-4 h-4 mr-1" />
                          Select Planet
                        </Button>
                      )}
                    </div>
                    {availablePlanets.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Tip: Create planets in the Solar System Map to enable dynamic battlefield effects
                      </p>
                    )}
                  </div>
                )}

                {/* AI Emergency Location Generator */}
                <EmergencyLocationGenerator
                  character1Name={selectedCharacter?.name}
                  character2Name={currentOpponent?.name}
                  character1Level={selectedCharacter?.level}
                  character2Level={currentOpponent?.level}
                  battleType="PvE"
                  planetName={selectedPlanetData?.display_name || selectedPlanetData?.planet_name}
                  planetDescription={selectedPlanetData?.description || undefined}
                  planetGravity={selectedPlanetData?.gravity}
                  onLocationGenerated={(loc) => {
                    setEmergencyLocation(loc);
                    setBattleLocation(loc.name);
                  }}
                  onSaveLocation={(loc) => {
                    setEmergencyLocation(loc);
                    setShowSaveLocationPrompt(true);
                  }}
                />


                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-amber-500" />
                    <div>
                      <Label htmlFor="dynamic-env" className="text-sm font-medium cursor-pointer">
                        Dynamic Battlefield Effects
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        AI describes how gravity, terrain, and atmosphere affect combat moves
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="dynamic-env"
                    checked={dynamicEnvironment}
                    onCheckedChange={setDynamicEnvironment}
                  />
                </div>

                {/* Battle Narrator Frequency */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                  <div className="flex items-center gap-3">
                    <Mic className="w-5 h-5 text-purple-500" />
                    <div>
                      <Label className="text-sm font-medium">
                        Battle Narrator
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Invisible observer commenting on the fight
                      </p>
                    </div>
                  </div>
                  <Select 
                    value={narratorFrequency} 
                    onValueChange={(v) => setNarratorFrequency(v as 'always' | 'key_moments' | 'off')}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="always">Always</SelectItem>
                      <SelectItem value="key_moments">Key Moments</SelectItem>
                      <SelectItem value="off">Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Dice Roll Combat System Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                  <div className="flex items-center gap-3">
                    <Dices className="w-5 h-5 text-amber-500" />
                    <div>
                      <Label htmlFor="dice-combat" className="text-sm font-medium">
                        Dice Combat System
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Attack/defense rolls with concentration mechanics
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="dice-combat"
                    checked={diceEnabled}
                    onCheckedChange={setDiceEnabled}
                  />
                </div>

                {/* Turn Color Customization */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: userTurnColor }}
                    />
                    <div>
                      <Label className="text-sm font-medium">
                        Turn Indicator Color
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Your color when it's your turn to attack
                      </p>
                    </div>
                  </div>
                  <BattleTurnColorPicker
                    color={userTurnColor}
                    onChange={updateTurnColor}
                  />
                </div>

                {battleEnvironment && dynamicEnvironment && (
                  <div className="p-3 rounded-lg border bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Globe className="w-4 h-4 text-amber-500" />
                      Environment: {battleEnvironment.shortSummary}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Gravity:</span> {battleEnvironment.gravity.toFixed(2)}g ({battleEnvironment.gravityClass.name})
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Stat Impact:</span> {getEnvironmentStatImpact(battleEnvironment.gravity)}
                    </div>
                    {battleEnvironment.terrainFeatures && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Terrain:</span> {battleEnvironment.terrainFeatures.primaryBiome}
                        {battleEnvironment.terrainFeatures.hasVolcanoes && ', volcanic'}
                        {battleEnvironment.terrainFeatures.hasTundra && ', frozen'}
                        {battleEnvironment.terrainFeatures.oceanCoverage > 0.5 && ', aquatic'}
                      </div>
                    )}
                  </div>
                )}

                {/* Arena Modifiers Preview */}
                <div className="p-3 rounded-lg border bg-gradient-to-r from-purple-500/5 to-indigo-500/5 border-purple-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      🌐 Today's Arena Modifiers
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="arena-mod-toggle" className="text-xs text-muted-foreground">
                        {arenaModifiersEnabled ? 'On' : 'Off'}
                      </Label>
                      <Switch
                        id="arena-mod-toggle"
                        checked={arenaModifiersEnabled}
                        onCheckedChange={setArenaModifiersEnabled}
                      />
                    </div>
                  </div>
                  {arenaModifiersEnabled ? (
                    <>
                      <ArenaModifierBadge modifiers={arenaModifiers} />
                      <p className="text-[10px] text-muted-foreground">
                        Same modifiers for all players globally. Affects stats, momentum, and risk chances.
                      </p>
                    </>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">
                      Arena modifiers are disabled for this battle.
                    </p>
                  )}
                </div>
              </div>

              {/* Turn Order Roll */}
              {selectedCharacter && currentOpponent && battleLocation.trim() && (
                <TurnOrderIndicator
                  userCharacterName={selectedCharacter.name}
                  opponentName={currentOpponent.name}
                  onOrderDetermined={handleTurnOrderDetermined}
                  disabled={turnOrderDetermined}
                />
              )}

              {/* Skill Proficiency Display */}
              {selectedCharacter && turnOrderDetermined && (
                <div className="grid md:grid-cols-2 gap-4">
                  <SkillProficiencyBar 
                    skillStat={selectedCharacter.stat_skill || 50} 
                    characterName={selectedCharacter.name} 
                  />
                  {currentOpponent && (
                    <SkillProficiencyBar 
                      skillStat={currentOpponent.skill || 50} 
                      characterName={currentOpponent.name} 
                    />
                  )}
                </div>
              )}

              {/* Physics Notice for High Tiers */}
              {selectedCharacter && currentOpponent && Math.max(selectedCharacter.level, currentOpponent.level) >= 5 && turnOrderDetermined && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30">
                  <Atom className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-purple-300">High-Tier Physics Active</p>
                    <p className="text-xs text-muted-foreground">
                      Tier 5+ fighters can bend physics and reality. Standard physical laws may be bypassed, 
                      quantum effects may occur, and theoretical physics concepts may come into play.
                    </p>
                  </div>
                </div>
              )}

              <div className="text-center">
                <Button 
                  onClick={startBattle} 
                  className="glow-primary" 
                  size="lg"
                  disabled={!selectedCharacter || !currentOpponent || !battleLocation.trim() || !turnOrderDetermined}
                >
                  <Swords className="w-5 h-5 mr-2" />
                  Begin Practice Battle
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Battle Location Display */}
              <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-semibold">{battleLocation}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <SfxToggle muted={sfxMuted} onToggle={toggleSfxMute} />
                    {battleEnvironment && dynamicEnvironment && (
                      <Badge variant="outline" className="text-xs bg-amber-500/10 border-amber-500/30 text-amber-600">
                        <Zap className="w-3 h-3 mr-1" />
                        {battleEnvironment.gravity.toFixed(1)}g • {battleEnvironment.gravityClass.name}
                      </Badge>
                    )}
                  </div>
                </div>
                {/* Arena Modifiers */}
                {arenaModifiersEnabled && (
                  <div className="flex items-center gap-2 mt-2">
                    <ArenaModifierBadge modifiers={arenaModifiers} />
                  </div>
                )}
                {battleEnvironment && dynamicEnvironment && battleEnvironment.terrainFeatures && (
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {battleEnvironment.terrainFeatures.primaryBiome} environment
                    {battleEnvironment.terrainFeatures.atmosphereType !== 'normal' && ` • ${battleEnvironment.terrainFeatures.atmosphereType} atmosphere`}
                  </div>
                )}
              </div>

              {/* Battle Header */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedCharacter?.image_url || undefined} />
                    <AvatarFallback>{selectedCharacter?.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedCharacter?.name}</p>
                    <Badge variant="outline" className="text-xs">{getTierName(selectedCharacter?.level || 1)}</Badge>
                  </div>
                </div>
                <Swords className="w-6 h-6 text-primary" />
                <div
                  className={`flex items-center gap-3 ${opponentType === 'own' ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                  onClick={() => {
                    if (opponentType === 'own' && selectedOwnCharacter) {
                      setShowAINotePanel(true);
                    }
                  }}
                  title={opponentType === 'own' ? 'Click to add AI character notes' : undefined}
                >
                  <div className="text-right">
                    <p className="font-medium">{currentOpponent?.name}</p>
                    <Badge variant="outline" className="text-xs">{getTierName(currentOpponent?.level || 1)}</Badge>
                    {opponentType === 'own' && (
                      <p className="text-[10px] text-primary mt-0.5">📝 Click for AI notes</p>
                    )}
                  </div>
                  {opponentType === 'own' && selectedOwnCharacter ? (
                    <Avatar className="h-10 w-10 ring-2 ring-primary/30">
                      <AvatarImage src={selectedOwnCharacter.image_url || undefined} />
                      <AvatarFallback>{selectedOwnCharacter.name[0]}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <Avatar className="h-10 w-10 bg-primary/20">
                      <AvatarFallback className="text-primary">
                        <Bot className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>

              {/* Concentration Button moved to above input */}


              {/* Channel Tabs */}
              <Tabs value={activeChannel} onValueChange={(v) => setActiveChannel(v as 'in_universe' | 'out_of_universe')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="in_universe" className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    In-Universe (RP)
                  </TabsTrigger>
                  <TabsTrigger value="out_of_universe" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Out-of-Universe (OOC)
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="in_universe" className="mt-0">
                  <MessageArea 
                    messages={messages.filter(m => m.channel === 'in_universe')}
                    diceRollMessages={diceRollMessages}
                    constructEventMessages={constructEventMessages}
                    scrollRef={scrollRef}
                    isInUniverse={true}
                    isLoading={isLoading && activeChannel === 'in_universe'}
                    opponentName={currentOpponent?.name}
                    isUserTurn={!isLoading}
                    userTurnColor={userTurnColor}
                    battlefieldEffects={battlefieldEffects}
                    userCharacterName={selectedCharacter?.name}
                    battleLocation={battleLocation}
                  />
                </TabsContent>
                <TabsContent value="out_of_universe" className="mt-0">
                  <MessageArea 
                    messages={messages.filter(m => m.channel === 'out_of_universe')}
                    diceRollMessages={[]}
                    constructEventMessages={[]}
                    scrollRef={scrollRef}
                    isInUniverse={false}
                    isLoading={isLoading && activeChannel === 'out_of_universe'}
                    opponentName={currentOpponent?.name}
                    isUserTurn={!isLoading}
                    userTurnColor={userTurnColor}
                    battlefieldEffects={[]}
                  />
                </TabsContent>
              </Tabs>

              {/* Dice Combat Status — Progressive Disclosure: only show when state is meaningful */}
              {diceEnabled && battleStarted && selectedCharacter && currentOpponent && (() => {
                const userConc = concentrationUses[selectedCharacter.id] ?? 3;
                const userPenalty = statPenalties[selectedCharacter.id] || 0;
                const hasUserActivity = userConc < 3 || userPenalty > 0 || userConstructs.length > 0 || userMomentum.value > 0 || userChargeState.isCharging || getDominantPsychCue(userPsych) !== null;
                const hasOppActivity = aiConcentrationUses < 3 || aiStatPenalty > 0 || opponentMomentum.value > 0 || getDominantPsychCue(opponentPsych) !== null;
                const hasAnyActivity = hasUserActivity || hasOppActivity;

                // Show compact summary when nothing has happened yet
                if (!hasAnyActivity) {
                  return (
                    <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/50 text-xs text-muted-foreground">
                      <Dices className="w-3.5 h-3.5" />
                      <span>Dice combat active — status appears as the battle progresses</span>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-muted/30 border text-xs animate-fade-in">
                    {/* Player Status */}
                    <div className="flex flex-col gap-1 p-2 rounded bg-primary/10 border border-primary/30">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-primary" />
                        <span className="font-medium text-primary truncate">{selectedCharacter.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs bg-amber-500/10 border-amber-500/30 text-amber-600">
                          D5: {userConc}/3
                        </Badge>
                        {userPenalty > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            -{userPenalty}%
                          </Badge>
                        )}
                        {userConstructs.length > 0 && (
                          <Badge variant="outline" className="text-xs bg-purple-500/10 border-purple-500/30 text-purple-400">
                            {userConstructs.length} 🛡️
                          </Badge>
                        )}
                        {getDominantPsychCue(userPsych) !== null && (
                          <PsychCueIndicator cue={getDominantPsychCue(userPsych)} characterName={selectedCharacter.name} variant="user" />
                        )}
                      </div>
                      {userMomentum.value > 0 && (
                        <MomentumMeter momentum={userMomentum} characterName={selectedCharacter.name} variant="user" />
                      )}
                      {userChargeState.isCharging && (
                        <ChargeIndicator chargeState={userChargeState} characterName={selectedCharacter.name} />
                      )}
                    </div>

                    {/* AI Opponent Status */}
                    <div className="flex flex-col gap-1 p-2 rounded bg-red-500/10 border border-red-500/30">
                      <div className="flex items-center gap-2">
                        <Bot className="w-3 h-3 text-red-400" />
                        <span className="font-medium text-red-400 truncate">{currentOpponent.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs bg-amber-500/10 border-amber-500/30 text-amber-600">
                          D5: {aiConcentrationUses}/3
                        </Badge>
                        {aiStatPenalty > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            -{aiStatPenalty}%
                          </Badge>
                        )}
                        {getDominantPsychCue(opponentPsych) !== null && (
                          <PsychCueIndicator cue={getDominantPsychCue(opponentPsych)} characterName={currentOpponent.name} variant="opponent" />
                        )}
                      </div>
                      {opponentMomentum.value > 0 && (
                        <MomentumMeter momentum={opponentMomentum} characterName={currentOpponent.name} variant="opponent" />
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Construct Panel - above input for visibility */}
              {diceEnabled && battleStarted && selectedCharacter && userConstructs.length > 0 && (
                <TooltipProvider>
                  <ConstructPanel
                    constructs={userConstructs}
                    characterId={selectedCharacter.id}
                    concentrationUsesRemaining={concentrationUses[selectedCharacter.id] ?? 3}
                    onRepairConstruct={handleConstructRepair}
                    disabled={isLoading || !!pendingHit || !!pendingOffensiveHit}
                  />
                </TooltipProvider>
              )}

              {/* Defensive Concentration Button when pending hit */}
              {pendingHit && selectedCharacter && (
                <TooltipProvider>
                  <ConcentrationButton
                    hitDetermination={pendingHit}
                    defenderStats={getCharacterStats(selectedCharacter)}
                    usesRemaining={concentrationUses[selectedCharacter.id] ?? 3}
                    mode="defense"
                    onUseConcentration={handleConcentrationResult}
                    onSkip={handleSkipConcentration}
                    disabled={isLoading}
                  />
                </TooltipProvider>
              )}

              {/* Offensive Concentration Button when player's attack near-missed */}
              {pendingOffensiveHit && selectedCharacter && (
                <TooltipProvider>
                  <ConcentrationButton
                    hitDetermination={pendingOffensiveHit}
                    attackerStats={getCharacterStats(selectedCharacter)}
                    usesRemaining={concentrationUses[selectedCharacter.id] ?? 3}
                    mode="offense"
                    onUseOffensiveConcentration={handleOffensiveConcentrationResult}
                    onSkip={handleSkipOffensiveConcentration}
                    disabled={isLoading}
                    characterName={selectedCharacter.name}
                    opponentName={currentOpponent?.name}
                  />
                </TooltipProvider>
              )}

              {/* Input */}
              <div className="flex gap-2 items-end">
                {/* Overcharge Toggle - only in-universe */}
                {activeChannel === 'in_universe' && diceEnabled && battleStarted && (
                  <OverchargeToggle
                    enabled={overchargeEnabled}
                    onToggle={setOverchargeEnabled}
                    disabled={isLoading || !!pendingHit || !!pendingOffensiveHit || userChargeState.isCharging}
                  />
                )}
                <div className="relative flex-1">
                  {/* Character Status Effect Overlay - shows effects affecting the user */}
                  {activeChannel === 'in_universe' && characterStatusEffects.length > 0 && (
                    <CharacterStatusOverlay effects={characterStatusEffects} />
                  )}
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={pendingHit 
                      ? 'Resolve the incoming attack first...'
                      : pendingOffensiveHit
                      ? 'Resolve your near-miss first...'
                      : userChargeState.isCharging
                      ? `⚡ CHARGING (${userChargeState.totalChargeTurns - userChargeState.chargeTurnsRemaining}/${userChargeState.totalChargeTurns}) — Defend only!`
                      : overchargeEnabled
                      ? '⚡ OVERCHARGED — Describe your amplified attack...'
                      : activeChannel === 'in_universe' 
                      ? 'Describe your action or attack...' 
                      : 'Ask a question or discuss strategy...'}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !pendingHit && !pendingOffensiveHit && sendMessage()}
                    disabled={isLoading || !!pendingHit || !!pendingOffensiveHit}
                    className="relative z-20"
                  />
                </div>
                <Button onClick={sendMessage} disabled={isLoading || !input.trim() || !!pendingHit || !!pendingOffensiveHit}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Character Note Panel - only for own characters */}
      {opponentType === 'own' && selectedOwnCharacter && (
        <AICharacterNotePanel
          open={showAINotePanel}
          onOpenChange={setShowAINotePanel}
          characterId={selectedOwnCharacter.id}
          characterName={selectedOwnCharacter.name}
          battleId={undefined}
        />
      )}
    </div>
  );
}

function TypingIndicator({ opponentName }: { opponentName?: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/50 border-l-4 border-accent mr-8 animate-fade-in">
      <p className="text-xs mb-1 text-muted-foreground">
        {opponentName || 'Opponent'}
      </p>
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground text-sm">thinking</span>
        <span className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      </div>
    </div>
  );
}

function MessageArea({
  messages,
  diceRollMessages = [],
  constructEventMessages = [],
  scrollRef,
  isInUniverse,
  isLoading,
  opponentName,
  isUserTurn,
  userTurnColor,
  battlefieldEffects = [],
  userCharacterName,
  battleLocation,
}: { 
  messages: Message[]; 
  diceRollMessages?: DiceRollMessage[];
  constructEventMessages?: ConstructEventMessage[];
  scrollRef: React.RefObject<HTMLDivElement>;
  isInUniverse: boolean;
  isLoading?: boolean;
  opponentName?: string;
  isUserTurn?: boolean;
  userTurnColor?: string;
  battlefieldEffects?: ActiveBattlefieldEffect[];
  userCharacterName?: string;
  battleLocation?: string;
}) {
  return (
    <TurnIndicatorWrapper
      isUserTurn={isUserTurn ?? true}
      userColor={userTurnColor}
      opponentColor="#EF4444"
    >
      <div className="relative">
        {/* Persistent Environment Background tied to battle location */}
        {isInUniverse && battleLocation && (
          <EnvironmentChatBackground location={battleLocation} />
        )}
        
        {/* Battlefield Effects Overlay - temporary message-triggered effects */}
        {isInUniverse && battlefieldEffects.length > 0 && (
          <BattlefieldEffectsOverlay effects={battlefieldEffects} />
        )}
        
        <ScrollArea className="h-[400px] rounded-lg border border-border p-4 relative z-10" ref={scrollRef}>
          {messages.length === 0 && diceRollMessages.length === 0 && !isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>{isInUniverse ? 'The arena awaits your first move...' : 'No OOC messages yet'}</p>
            </div>
          ) : (
            <div className="space-y-4">
            {messages.map((message, idx) => {
              // Find construct events that happened around this message
              const relevantConstructEvents = constructEventMessages.filter((evt, evtIdx) => 
                evtIdx === Math.floor(idx / 2)
              );
              
              // Build snapshot-based effects for this specific message
              const snapshotEffects: import('@/lib/character-status-effects').CharacterStatusEffect[] = [];
              
              if (isInUniverse) {
                if (message.statusEffectsSnapshot && message.role === 'user') {
                  // User's own message: render from saved snapshot (permanent)
                  for (const [, effectData] of Object.entries(message.statusEffectsSnapshot)) {
                    if (effectData) {
                      snapshotEffects.push({
                        type: effectData.type as import('@/lib/character-status-effects').CharacterStatusType,
                        intensity: effectData.intensity as 'light' | 'moderate' | 'severe',
                        duration: 999999999,
                        startTime: Date.now(),
                        source: 'snapshot',
                      });
                    }
                  }
                } else if (message.role === 'ai') {
                  // AI messages: detect effects described in their action
                  const detected = detectCharacterStatusEffects(message.content, userCharacterName);
                  snapshotEffects.push(...detected.map(e => ({
                    ...e,
                    duration: 999999999,
                    startTime: Date.now(),
                  })));
                }
              }
              
              return (
                <div key={message.id}>
                  <div
                    className={`relative p-3 rounded-lg overflow-hidden ${
                      message.role === 'user'
                        ? 'bg-primary/20 border-l-4 border-primary ml-8'
                        : message.role === 'narrator'
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-l-4 border-purple-500 mx-4 italic'
                        : message.role === 'system'
                        ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-l-4 border-cyan-500 mx-4 text-center'
                        : 'bg-muted/50 border-l-4 border-accent mr-8'
                    }`}
                  >
                    {/* Snapshot-based Status Effect Overlay — permanent per message */}
                    {snapshotEffects.length > 0 && (
                      <CharacterStatusOverlay 
                        effects={snapshotEffects} 
                        className="rounded-lg"
                      />
                    )}
                    
                    <p className={`text-xs mb-1 relative z-10 ${
                      message.role === 'narrator' 
                        ? 'text-purple-400 font-semibold' 
                        : message.role === 'system'
                        ? 'text-cyan-400 font-semibold'
                        : 'text-muted-foreground'
                    }`}>
                      {message.characterName}
                    </p>
                    <p className="whitespace-pre-wrap relative z-10">{message.content}</p>
                  </div>
                  {/* Show construct events after user messages */}
                  {message.role === 'user' && isInUniverse && relevantConstructEvents.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {relevantConstructEvents.map(evt => (
                        <ConstructDiceMessage
                          key={evt.id}
                          type={evt.type === 'create' ? 'repair' : evt.type}
                          construct={evt.construct}
                          attackResult={evt.attackResult}
                          repairResult={evt.repairResult}
                          attackerName={evt.attackerName}
                          defenderName={evt.defenderName}
                        />
                      ))}
                    </div>
                  )}
                  {/* Show dice roll after user messages if one exists */}
                  {message.role === 'user' && isInUniverse && diceRollMessages[Math.floor(idx / 2)] && (
                    <div className="mt-2">
                      <DiceRollChatMessage
                        hitDetermination={diceRollMessages[Math.floor(idx / 2)].hitDetermination}
                        concentrationResult={diceRollMessages[Math.floor(idx / 2)].concentrationResult}
                        attackerName={diceRollMessages[Math.floor(idx / 2)].attackerName}
                        defenderName={diceRollMessages[Math.floor(idx / 2)].defenderName}
                        timestamp={diceRollMessages[Math.floor(idx / 2)].timestamp}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {isLoading && <TypingIndicator opponentName={opponentName} />}
          </div>
        )}
      </ScrollArea>
      </div>
    </TurnIndicatorWrapper>
  );
}
