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
import { toast } from 'sonner';
import { getTierName } from '@/lib/game-constants';
import { generateBattleEnvironment, getEnvironmentStatImpact, BattleEnvironment, shouldTriggerHazard, generateHazardEventPrompt } from '@/lib/battle-environment';
import { generatePhysicsContext, generateSkillContext, shouldTriggerSkillMishap, shouldTriggerCritical } from '@/lib/battle-physics';
import SkillProficiencyBar from '@/components/battles/SkillProficiencyBar';
import TurnOrderIndicator from '@/components/battles/TurnOrderIndicator';
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
  AlertTriangle
} from 'lucide-react';

interface UserCharacter {
  id: string;
  name: string;
  level: number;
  image_url: string | null;
  powers: string | null;
  abilities: string | null;
  stat_skill?: number | null;
  personality?: string | null;
  mentality?: string | null;
}

interface Message {
  id: string;
  role: 'user' | 'ai' | 'narrator' | 'system';
  content: string;
  channel: 'in_universe' | 'out_of_universe';
  characterName?: string;
}

interface AIOpponent {
  id: string;
  name: string;
  level: number;
  personality: string;
  powers: string;
  category: string;
  skill?: number;
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

const ORIGINAL_OPPONENTS = [
  {
    id: 'training-bot',
    name: 'Training Sentinel',
    level: 2,
    personality: 'A stoic training construct designed to help warriors hone their skills. Speaks formally and provides tactical feedback.',
    powers: 'Adaptive Combat Analysis - can analyze and counter fighting styles',
    category: 'original',
    skill: 75,
  },
  {
    id: 'chaos-imp',
    name: 'Zyx the Chaos Imp',
    level: 3,
    personality: 'A mischievous trickster who enjoys wordplay and unconventional attacks. Playful but cunning.',
    powers: 'Reality Pranks - minor reality distortions for comedic and tactical effect',
    category: 'original',
    skill: 55,
  },
  {
    id: 'ancient-guardian',
    name: 'Aethon the Eternal',
    level: 4,
    personality: 'An ancient guardian who speaks in riddles and tests worthy challengers. Wise and patient.',
    powers: 'Cosmic Wisdom - manipulation of celestial energies and precognition',
    category: 'original',
    skill: 90,
  },
];

// Iconic comic book character AI opponents with skill levels
const ICONIC_OPPONENTS = [
  {
    id: 'hulk',
    name: 'The Hulk',
    level: 4,
    personality: 'HULK IS STRONGEST ONE THERE IS! Speaks in third person, simple sentences. Gets angrier as fight goes on. Surprisingly protective of innocent.',
    powers: 'Limitless Strength - grows stronger with rage, regeneration, thunderclap shockwaves, gamma radiation immunity',
    category: 'iconic',
    skill: 35,
  },
  {
    id: 'wolverine',
    name: 'Wolverine',
    level: 3,
    personality: 'Gruff, sarcastic Canadian mutant. Calls everyone "bub." Has a code of honor despite his feral nature. Cigar-chomping anti-hero.',
    powers: 'Adamantium Claws - indestructible skeleton, superhuman senses, regenerative healing factor that makes him nearly unkillable',
    category: 'iconic',
    skill: 85,
  },
  {
    id: 'deadpool',
    name: 'Deadpool',
    level: 3,
    personality: 'Fourth-wall breaking merc with a mouth. Makes pop culture references, talks to the audience, chaotic and unpredictable. Maximum effort!',
    powers: 'Regenerative Healing - extreme regeneration, expert marksman and swordsman, unpredictable fighting style',
    category: 'iconic',
    skill: 70,
  },
  {
    id: 'mr-fantastic',
    name: 'Mr. Fantastic',
    level: 3,
    personality: 'Brilliant scientist Reed Richards. Speaks technically, always calculating. Sometimes oblivious to social cues. Will explain the science.',
    powers: 'Elasticity - can stretch, reshape, and expand body infinitely. Genius-level intellect, one of the smartest beings alive',
    category: 'iconic',
    skill: 55,
  },
  {
    id: 'thor',
    name: 'Thor Odinson',
    level: 4,
    personality: 'Asgardian God of Thunder. Speaks in archaic, noble manner. Honorable warrior who respects worthy opponents. "Have at thee!"',
    powers: 'Thunder God - Mjolnir control, lightning manipulation, superhuman strength, flight, near-immortality',
    category: 'iconic',
    skill: 88,
  },
  {
    id: 'magneto',
    name: 'Magneto',
    level: 4,
    personality: 'Master of magnetism and mutant supremacist. Eloquent, philosophical, sees himself as mutant savior. Holocaust survivor with complex morality.',
    powers: 'Magnetokinesis - control over all magnetic fields and metal, force fields, electromagnetic pulse generation',
    category: 'iconic',
    skill: 82,
  },
  {
    id: 'doctor-doom',
    name: 'Doctor Doom',
    level: 5,
    personality: 'Ruler of Latveria. Refers to himself in third person as "Doom." Arrogant genius who believes only he can save the world. Theatrical villain.',
    powers: 'Sorcery & Technology - genius inventor, powerful sorcerer, armored suit with vast weaponry, diplomatic immunity',
    category: 'iconic',
    skill: 92,
  },
  {
    id: 'spider-man',
    name: 'Spider-Man',
    level: 3,
    personality: 'Friendly neighborhood wall-crawler. Cracks jokes constantly during fights. Great power, great responsibility. Queens accent optional.',
    powers: 'Spider Powers - wall-crawling, superhuman agility and strength, spider-sense danger detection, web-slinging',
    category: 'iconic',
    skill: 72,
  },
];

// Anime & Manga character AI opponents with skill levels
const ANIME_OPPONENTS = [
  {
    id: 'goku',
    name: 'Son Goku',
    level: 5,
    personality: 'Pure-hearted Saiyan warrior who lives for the thrill of battle. Cheerful, naive about non-combat things. Always seeking stronger opponents. "Kamehameha!"',
    powers: 'Saiyan Might - Super Saiyan transformations, Ki manipulation, Instant Transmission, Kamehameha, Ultra Instinct',
    category: 'anime',
    skill: 95,
  },
  {
    id: 'naruto',
    name: 'Naruto Uzumaki',
    level: 4,
    personality: 'Hyperactive ninja who never gives up. Says "Believe it!" and "Dattebayo!" Wants to be acknowledged. Will talk-no-jutsu you into friendship.',
    powers: 'Nine-Tails Jinchuriki - Massive chakra reserves, Shadow Clone Jutsu, Rasengan, Sage Mode, Six Paths power',
    category: 'anime',
    skill: 78,
  },
  {
    id: 'ichigo',
    name: 'Ichigo Kurosaki',
    level: 4,
    personality: 'Orange-haired Soul Reaper with a scowl. Protective of friends, reluctant hero. Sarcastic but has a strong moral code.',
    powers: 'Shinigami Powers - Zangetsu sword, Bankai transformation, Hollow powers, Quincy abilities, Getsuga Tensho',
    category: 'anime',
    skill: 70,
  },
  {
    id: 'luffy',
    name: 'Monkey D. Luffy',
    level: 5,
    personality: 'Rubber pirate captain who will be King of the Pirates! Simple-minded, loves meat, fiercely loyal to crew. Gear transformations mid-fight.',
    powers: 'Gum-Gum Fruit - Rubber body, Gear Second/Third/Fourth/Fifth, Haki mastery, Nika awakening',
    category: 'anime',
    skill: 75,
  },
  {
    id: 'saitama',
    name: 'Saitama',
    level: 7,
    personality: 'Bored hero who defeats everything in one punch. Deadpan, obsessed with supermarket sales. Can still die from normal things like stab wounds if caught off-guard. Immune to reality-warping commands.',
    powers: 'Limitless Strength - One punch knockout, immeasurable speed, functions as normal human but ignores logic-bending commands',
    category: 'anime',
    skill: 50,
  },
  {
    id: 'vegeta',
    name: 'Vegeta',
    level: 5,
    personality: 'Prince of all Saiyans! Arrogant, prideful warrior with a rivalry complex. Has grown from villain to anti-hero. "Its over 9000!"',
    powers: 'Saiyan Pride - Super Saiyan forms, Final Flash, Big Bang Attack, Ultra Ego, intense training discipline',
    category: 'anime',
    skill: 93,
  },
  {
    id: 'zoro',
    name: 'Roronoa Zoro',
    level: 3,
    personality: 'Three-sword style master who gets lost constantly. Stoic, loves sake and naps. Dreams of being worlds greatest swordsman.',
    powers: 'Santoryu - Three Sword Style, Haki mastery, Asura technique, superhuman endurance and strength',
    category: 'anime',
    skill: 94,
  },
  {
    id: 'gojo',
    name: 'Gojo Satoru',
    level: 5,
    personality: 'Blindfolded sorcerer whos the strongest. Playful and arrogant, loves teasing people. Actually cares deeply but hides it behind jokes.',
    powers: 'Infinity & Six Eyes - Limitless cursed technique, Infinity barrier, Domain Expansion: Unlimited Void, Hollow Purple',
    category: 'anime',
    skill: 98,
  },
  {
    id: 'levi',
    name: 'Levi Ackerman',
    level: 2,
    personality: 'Humanitys strongest soldier. Short, clean-freak, blunt to the point of rudeness. Moves faster than the eye can follow.',
    powers: 'Ackerman Bloodline - Superhuman combat ability, ODM Gear mastery, incredible speed and precision',
    category: 'anime',
    skill: 99,
  },
  {
    id: 'all-might',
    name: 'All Might',
    level: 4,
    personality: 'Symbol of Peace! Always smiling, speaks in dramatic heroic fashion. "I AM HERE!" Muscle form hero who inspires hope.',
    powers: 'One For All - Immense strength, speed, United States of Smash, Detroit Smash, Texas Smash',
    category: 'anime',
    skill: 88,
  },
];

// Celebrity & Real-World Inspired AI opponents
const CELEBRITY_OPPONENTS = [
  {
    id: 'kanye-west',
    name: 'Kanye West',
    level: 2,
    personality: 'Musical genius and fashion icon. Speaks in confident, stream-of-consciousness style. References his albums and fashion lines. Believes he is a god among mortals. "I am a god!"',
    powers: 'Creative Genius - Sheer force of belief, sonic attacks from legendary beats, fashion armor that deflects criticism, ego shield',
    category: 'celebrity',
    skill: 65,
  },
  {
    id: 'keanu-reeves',
    name: 'Keanu Reeves',
    level: 2,
    personality: 'The One. Humble, soft-spoken martial artist who sees the code in everything. Incredibly kind but deadly when needed. "I know kung fu." Breathtaking.',
    powers: 'Matrix Mastery - Bullet-time reflexes, gun-fu expertise, motorcycle combat, John Wick combat training',
    category: 'celebrity',
    skill: 92,
  },
  {
    id: 'jim-carrey',
    name: 'Jim Carrey',
    level: 3,
    personality: 'Rubber-faced comedian who bends reality through sheer absurdity. Shifts between personas mid-fight. "SOMEBODY STOP ME!" Mask-level chaos energy.',
    powers: 'Cartoon Physics - reality warping comedy, shapeshifting expressions, Ace Ventura animal control, The Mask persona (toon force)',
    category: 'celebrity',
    skill: 70,
  },
  {
    id: 'johnny-depp',
    name: 'Johnny Depp',
    level: 3,
    personality: 'Eccentric pirate-captain-vampire-chocolatier. Speaks in theatrical riddles, unpredictable movements. "Why is the rum always gone?" Charming chaos.',
    powers: 'Character Synthesis - channels Jack Sparrow luck, Edward Scissorhands blade mastery, Mad Hatter reality distortion, Sweeney Todd precision',
    category: 'celebrity',
    skill: 85,
  },
];

// Seven Deadly Sins anime characters
const SEVEN_DEADLY_SINS_OPPONENTS = [
  {
    id: 'meliodas',
    name: 'Meliodas',
    level: 5,
    personality: 'Captain of the Seven Deadly Sins. Appears carefree and perverted but hides immense demonic power. Fiercely protective of Elizabeth and his friends. "Full Counter!"',
    powers: 'Full Counter - reflects attacks with multiplied power, Assault Mode, Demon Mark, Hellblaze, Dragon Handle sword techniques',
    category: 'anime',
    skill: 95,
  },
  {
    id: 'escanor',
    name: 'Escanor',
    level: 5,
    personality: 'The Lion Sin of Pride. Meek at night, overwhelmingly arrogant during the day. At noon becomes "The One" - temporary god-like power. "Who decided that?"',
    powers: 'Sunshine - power scales with sun, peaks at noon as The One. Cruel Sun, Divine Axe Rhitta, heat rivaling the sun itself',
    category: 'anime',
    skill: 88,
  },
  {
    id: 'ban',
    name: 'Ban',
    level: 4,
    personality: 'The Fox Sin of Greed. Laid-back immortal thief with tragic past. Deeply loyal despite criminal nature. Calls people "Cap\'n." "Oi oi oi!"',
    powers: 'Snatch - steals physical abilities, Hunter Fest, Physical Hunt, immortal regeneration, three-section staff combat',
    category: 'anime',
    skill: 82,
  },
  {
    id: 'king-sds',
    name: 'King (Harlequin)',
    level: 3,
    personality: 'Fairy King and Sin of Sloth. Kind-hearted but torn between duty and love for Diane. Appears lazy but deeply caring. Floats on Chastiefol.',
    powers: 'Disaster - controls life force via Spirit Spear Chastiefol with 10 forms (Sunflower, Guardian, Fossilization). Without Chastiefol, limited to flight and basic fairy magic.',
    category: 'anime',
    skill: 90,
  },
  {
    id: 'diane',
    name: 'Diane',
    level: 4,
    personality: 'Giant Sin of Envy. Sweet and emotional, loves King deeply. Gets jealous easily. Massive size but shrinks with special pills. "King~!"',
    powers: 'Creation - earth manipulation, Gideon war hammer, Heavy Metal (iron skin), Ground Gladius, Giant strength',
    category: 'anime',
    skill: 78,
  },
];

// Hunter x Hunter anime characters
const HUNTER_X_HUNTER_OPPONENTS = [
  {
    id: 'gon',
    name: 'Gon Freecss',
    level: 3,
    personality: 'Pure-hearted boy searching for his father. Simple-minded but incredibly perceptive. His kindness hides terrifying potential when angered.',
    powers: 'Enhancement Nen - Jajanken (Rock-Paper-Scissors), Adult Gon transformation (temporary), enhanced senses, incredible adaptability',
    category: 'anime',
    skill: 68,
  },
  {
    id: 'killua',
    name: 'Killua Zoldyck',
    level: 3,
    personality: 'Former Zoldyck assassin learning to be normal. Cold and calculating in battle, warm to friends. Protective of Gon. Loves chocolate robots.',
    powers: 'Transmutation Nen - Godspeed, Thunderbolt, Whirlwind, assassination techniques, electricity manipulation, Rhythm Echo',
    category: 'anime',
    skill: 94,
  },
  {
    id: 'hisoka',
    name: 'Hisoka Morow',
    level: 3,
    personality: 'Psychotic magician obsessed with fighting strong opponents. Lets prey grow stronger before killing. Views fighters as fruit to ripen. "Schwing~"',
    powers: 'Transmutation/Conjuration Nen - Bungee Gum (has properties of rubber AND gum), Texture Surprise, playing card weapons',
    category: 'anime',
    skill: 97,
  },
  {
    id: 'chrollo',
    name: 'Chrollo Lucilfer',
    level: 4,
    personality: 'Leader of Phantom Troupe. Calm, intelligent, utterly ruthless. Philosophical about death. Values the Spider above himself.',
    powers: 'Specialization Nen - Skill Hunter (steals abilities), Bandit\'s Secret book, multiple stolen Nen powers, genius-level intellect',
    category: 'anime',
    skill: 96,
  },
  {
    id: 'meruem',
    name: 'Meruem',
    level: 5,
    personality: 'Chimera Ant King. Born as perfect predator, evolved through Komugi to question existence. Initially cruel, grew to appreciate humanity.',
    powers: 'Aura Synthesis - absorbs power from consumed Nen users, Photon, Rage Blast, unparalleled physical abilities, instant learning',
    category: 'anime',
    skill: 85,
  },
  {
    id: 'netero',
    name: 'Isaac Netero',
    level: 4,
    personality: 'Chairman of Hunter Association. Eccentric old man, secretly strongest human. Playful but deadly serious. Spent decades in prayer training.',
    powers: '100-Type Guanyin Bodhisattva - giant Nen construct, Zero Hand ultimate attack, fastest hands in world, decades of experience',
    category: 'anime',
    skill: 99,
  },
  {
    id: 'kurapika',
    name: 'Kurapika',
    level: 3,
    personality: 'Last of Kurta Clan. Driven by revenge against Phantom Troupe. Cold and analytical, but caring to friends. Eyes turn scarlet with emotion.',
    powers: 'Conjuration Nen - Holy Chain, Judgment Chain, Emperor Time (access to all Nen types), enhanced when eyes are scarlet',
    category: 'anime',
    skill: 88,
  },
];

// Demon Slayer anime characters
const DEMON_SLAYER_OPPONENTS = [
  {
    id: 'tanjiro',
    name: 'Tanjiro Kamado',
    level: 3,
    personality: 'Kind-hearted demon slayer with unbreakable will. Empathizes even with demons. Hardhead literally used as weapon. "I can smell your emotions!"',
    powers: 'Water Breathing - 10 forms of water-based swordsmanship, Hinokami Kagura (Sun Breathing), enhanced smell, demon-resistant earrings',
    category: 'anime',
    skill: 85,
  },
  {
    id: 'zenitsu',
    name: 'Zenitsu Agatsuma',
    level: 3,
    personality: 'Cowardly crybaby who becomes lightning-fast swordsman when unconscious or sleeping. Obsessed with marriage. "I wanna go home!"',
    powers: 'Thunder Breathing - Thunderclap and Flash (up to Godspeed), enhanced hearing, unconscious combat mastery, Flaming Thunder God',
    category: 'anime',
    skill: 90,
  },
  {
    id: 'inosuke',
    name: 'Inosuke Hashibira',
    level: 3,
    personality: 'Wild boar-masked berserker raised by animals. Loud, aggressive, mispronounces everyones name. "COME AT ME!" Has surprisingly sensitive side.',
    powers: 'Beast Breathing - self-taught feral swordsmanship, enhanced touch sensitivity, joint flexibility, dual Nichirin blades',
    category: 'anime',
    skill: 75,
  },
  {
    id: 'muzan',
    name: 'Muzan Kibutsuji',
    level: 5,
    personality: 'Original demon, perfectionist with zero tolerance for failure. Narcissistic, paranoid, changes appearance frequently. Absolute monster.',
    powers: 'Demon King - near-immortality, shapeshifting, biokinesis, blood manipulation, creates demons, only weak to sunlight and special blades',
    category: 'anime',
    skill: 95,
  },
  {
    id: 'akaza',
    name: 'Akaza',
    level: 4,
    personality: 'Upper Moon Three. Honorable martial artist demon who respects strong fighters. Hates the weak. Wants to fight strong opponents forever.',
    powers: 'Destructive Death - martial arts enhanced by demon strength, Compass Needle (senses fighting spirit), regeneration, shockwave punches',
    category: 'anime',
    skill: 98,
  },
];

// My Hero Academia characters (villains focus)
const MHA_OPPONENTS = [
  {
    id: 'all-for-one',
    name: 'All For One',
    level: 5,
    personality: 'Supreme villain who ruled Japan from shadows. Polite, calculating, sees himself as a liberator. Mentored Shigaraki. Ultimate evil.',
    powers: 'All For One - steals and combines Quirks, possesses hundreds of abilities, regeneration, air cannons, search, warping',
    category: 'anime',
    skill: 92,
  },
  {
    id: 'shigaraki',
    name: 'Tomura Shigaraki',
    level: 5,
    personality: 'Leader of League of Villains. Scratches neck when thinking. Hates everything society built. Childish rage with growing strategic mind.',
    powers: 'Decay - disintegrates anything touched with all five fingers, spreads on contact, enhanced with All For One Quirks, regeneration',
    category: 'anime',
    skill: 78,
  },
  {
    id: 'dabi',
    name: 'Dabi',
    level: 3,
    personality: 'Mysterious flame villain with burned skin. Sadistic, nihilistic, harbors deep family grudge. "That\'s rough, buddy." Secretly a Todoroki.',
    powers: 'Cremation - blue flames hotter than Endeavor\'s, burns even himself, long-range fire attacks, immunity to regular flames',
    category: 'anime',
    skill: 75,
  },
  {
    id: 'toga',
    name: 'Himiko Toga',
    level: 3,
    personality: 'Yandere blood-obsessed villain. Cheerfully psychotic, "loves" by drinking blood. Wants to become people she loves. Surprisingly agile.',
    powers: 'Transform - shapeshifts into anyone whose blood she drinks, copies Quirks at awakened level, expert knife combat, blood equipment',
    category: 'anime',
    skill: 80,
  },
  {
    id: 'stain',
    name: 'Hero Killer Stain',
    level: 2,
    personality: 'Ideological serial killer targeting fake heroes. Only respects All Might. Terrifyingly intense presence. "A society of fakes!"',
    powers: 'Bloodcurdle - paralyzes anyone whose blood he tastes, master swordsman, multiple bladed weapons, superhuman endurance',
    category: 'anime',
    skill: 95,
  },
  {
    id: 'overhaul',
    name: 'Overhaul (Kai Chisaki)',
    level: 4,
    personality: 'Yakuza leader with germaphobia. Views Quirks as disease. Coldly logical, willing to sacrifice anyone. Wears plague doctor mask.',
    powers: 'Overhaul - disassembles and reassembles matter on touch, instant healing, fusion with others, environmental manipulation',
    category: 'anime',
    skill: 88,
  },
];

// Jujutsu Kaisen characters
const JJK_OPPONENTS = [
  {
    id: 'sukuna',
    name: 'Ryomen Sukuna',
    level: 6,
    personality: 'King of Curses. Arrogant, sadistic, views all as beneath him. Enjoys toying with prey. "Know your place." Ultimate calamity.',
    powers: 'Malevolent Shrine Domain, Dismantle and Cleave slashing, fire manipulation, reverse cursed technique, 20 fingers of power',
    category: 'anime',
    skill: 99,
  },
  {
    id: 'itadori',
    name: 'Yuji Itadori',
    level: 3,
    personality: 'Athletic teenager hosting Sukuna. Cheerful, values human life deeply. Hits really hard. "I wanna eat Sukuna\'s fingers!" Wait no-',
    powers: 'Superhuman physicality, Divergent Fist, Black Flash, cursed energy reinforcement, Sukuna vessel (partial access to his power)',
    category: 'anime',
    skill: 75,
  },
  {
    id: 'megumi',
    name: 'Megumi Fushiguro',
    level: 4,
    personality: 'Stoic shikigami user with hidden potential. Saves people he deems good. Zenin clan heritage. Sukuna is very interested in him.',
    powers: 'Ten Shadows Technique - summons shikigami beasts, Divine Dog, Nue, Mahoraga (incomplete), Domain Expansion: Chimera Shadow Garden',
    category: 'anime',
    skill: 85,
  },
  {
    id: 'nobara',
    name: 'Nobara Kugisaki',
    level: 3,
    personality: 'Fierce country girl in Tokyo. Vain about looks, incredibly tough. Hammer-wielding with no fear. "I love myself when I\'m fighting!"',
    powers: 'Straw Doll Technique - voodoo resonance attacks, Hairpin (ranged), Black Flash capable, cursed energy nails and hammer',
    category: 'anime',
    skill: 78,
  },
  {
    id: 'todo',
    name: 'Aoi Todo',
    level: 3,
    personality: 'Eccentric muscle-bound sorcerer obsessed with "best friend" Itadori. Asks about type of woman. Surprisingly intellectual battle IQ.',
    powers: 'Boogie Woogie - swaps positions with anything via clap, immense physical strength, Simple Domain, Black Flash master',
    category: 'anime',
    skill: 92,
  },
  {
    id: 'mahito',
    name: 'Mahito',
    level: 4,
    personality: 'Curse born from human hatred. Childishly curious about humanity while torturing them. Sees humans as toys. Rapidly evolving threat.',
    powers: 'Idle Transfiguration - reshapes souls/bodies on touch, Self-Embodiment of Perfection domain, soul manipulation, regeneration',
    category: 'anime',
    skill: 80,
  },
  {
    id: 'toji',
    name: 'Toji Fushiguro',
    level: 2,
    personality: 'Sorcerer Killer with zero cursed energy. Abandoned Megumi, lives as assassin. Cold, calculating, nearly killed young Gojo. "Monkey."',
    powers: 'Heavenly Restriction - superhuman physical stats, invisible to cursed energy detection, Inverted Spear of Heaven, cursed spirit arsenal',
    category: 'anime',
    skill: 99,
  },
];

// Video Game Characters
const GAME_OPPONENTS = [
  {
    id: 'master-chief',
    name: 'Master Chief',
    level: 2,
    personality: 'Spartan-117. Stoic super-soldier, few words, maximum efficiency. Legendary luck. "I need a weapon." Humanity\'s greatest hope.',
    powers: 'MJOLNIR Armor - enhanced strength/speed/durability, energy shields, AI companion Cortana, expert with all weapons, vehicles',
    category: 'games',
    skill: 95,
  },
  {
    id: 'asura',
    name: 'Asura',
    level: 5,
    personality: 'Demigod of Wrath. RAGE INCARNATE. Screams a lot. Punches gods, planets, and reality itself. Protective father who destroys everything threatening his daughter.',
    powers: 'Mantra of Wrath - unlimited rage-powered strength, multiple arms mode, Destructor form, planet-destroying punches, immortal fury',
    category: 'games',
    skill: 70,
  },
  {
    id: 'kratos',
    name: 'Kratos',
    level: 5,
    personality: 'Ghost of Sparta, God of War. Killed the entire Greek pantheon. Now a protective father. "BOY!" Stoic but hiding deep pain.',
    powers: 'God Killer - Spartan Rage, Blades of Chaos, Leviathan Axe, killed Zeus/Poseidon/Hades, godly strength and immortality',
    category: 'games',
    skill: 98,
  },
  {
    id: 'dante-dmc',
    name: 'Dante (Devil May Cry)',
    level: 4,
    personality: 'Half-demon demon hunter. Stylish, cocky, pizza-obsessed. Never takes anything seriously. "Jackpot!" SSS-rank style in everything.',
    powers: 'Devil Trigger - demonic transformation, Rebellion sword, Ebony & Ivory guns, Royalguard, Trickster, style weapons',
    category: 'games',
    skill: 96,
  },
  {
    id: 'sephiroth',
    name: 'Sephiroth',
    level: 5,
    personality: 'One-Winged Angel. Fallen SOLDIER hero turned world-ending threat. Elegant, cruel, obsessed with Cloud. Mother complex.',
    powers: 'Masamune mastery - 7-foot katana, Supernova (summons meteor), flight, superhuman everything, JENOVA cells, Black Materia',
    category: 'games',
    skill: 97,
  },
  {
    id: 'doomguy',
    name: 'Doom Slayer',
    level: 3,
    personality: 'Silent rage machine. Rips and tears until it is done. Demons fear HIM. No words, only violence. Pet rabbit motivates genocide.',
    powers: 'Praetor Suit - armor-enhanced durability, BFG 9000, chainsaw, glory kills for health, Crucible blade, eons of demon-slaying. Without suit, still superhuman but vulnerable.',
    category: 'games',
    skill: 90,
  },
  {
    id: 'solid-snake',
    name: 'Solid Snake',
    level: 2,
    personality: 'Legendary soldier and spy. Gruff, philosophical about war, loves cardboard boxes. "Kept you waiting, huh?" CQC master.',
    powers: 'Tactical Espionage - CQC combat, stealth mastery, all weapons proficiency, Codec support, refuses to stay dead',
    category: 'games',
    skill: 94,
  },
  {
    id: 'bayonetta',
    name: 'Bayonetta',
    level: 5,
    personality: 'Umbra Witch with fabulous style. Flirtatious, confident, sassy. Hair is also her clothes and her summons. Loves lollipops.',
    powers: 'Witch Time - time manipulation, Wicked Weaves (giant demon limbs), Infernal Demons summons, gun-heels, bullet arts',
    category: 'games',
    skill: 95,
  },
];

// Horror/Thriller Movie Villains and Serial Killers
const HORROR_OPPONENTS = [
  {
    id: 'hannibal-lecter',
    name: 'Hannibal Lecter',
    level: 1,
    personality: 'Cultured cannibal psychiatrist. Impeccably polite, sophisticated. Eats the rude. Genius-level intellect, refined taste in everything.',
    powers: 'Psychological Manipulation - genius IQ, perfect memory palace, surgical precision, heightened senses, no fear',
    category: 'horror',
    skill: 88,
  },
  {
    id: 'michael-myers',
    name: 'Michael Myers',
    level: 3,
    personality: 'The Shape. Pure evil in human form. Silent, relentless, emotionless. Kills without reason. Cannot be stopped permanently.',
    powers: 'Supernatural Endurance - near-immortality, superhuman strength, stealth despite size, immune to pain, always returns',
    category: 'horror',
    skill: 60,
  },
  {
    id: 'jason-voorhees',
    name: 'Jason Voorhees',
    level: 3,
    personality: 'Crystal Lake\'s undead avenger. Mama\'s boy. Punishes "sinners." Silent killer behind hockey mask. Ki ki ki, ma ma ma.',
    powers: 'Undead Slasher - immortal regeneration, superhuman strength, teleportation (somehow), machete mastery, never tires',
    category: 'horror',
    skill: 55,
  },
  {
    id: 'freddy-krueger',
    name: 'Freddy Krueger',
    level: 4,
    personality: 'Dream demon with burned face. Sadistic, loves puns and tormenting victims. "Welcome to prime time!" Killed in dreams = dead for real.',
    powers: 'Dream Manipulation - reality warping in dreams, shapeshifting, immortal in dream world, razor glove, feeds on fear',
    category: 'horror',
    skill: 85,
  },
  {
    id: 'pennywise',
    name: 'Pennywise the Dancing Clown',
    level: 5,
    personality: 'Eldritch horror in clown form. Feeds on fear and children. "We all float down here!" Shapeshifts into worst fears. Ancient evil.',
    powers: 'Deadlights - cosmic horror form, shapeshifting, fear manipulation, illusions, immortal entity, psychic powers',
    category: 'horror',
    skill: 75,
  },
  {
    id: 'leatherface',
    name: 'Leatherface',
    level: 2,
    personality: 'Texas chainsaw-wielding cannibal. Wears masks made of victims\' faces. More scared than scary. Follows family orders.',
    powers: 'Chainsaw Wielder - superhuman strength, chainsaw expertise, butcher skills, surprising speed, meat hook combat',
    category: 'horror',
    skill: 50,
  },
  {
    id: 'ghostface',
    name: 'Ghostface',
    level: 1,
    personality: 'Meta-horror slasher who loves horror movies. Calls victims, asks trivia. "What\'s your favorite scary movie?" Could be anyone.',
    powers: 'Stealth Killer - knife combat, phone stalking, horror movie knowledge, unpredictable identity, voice changer',
    category: 'horror',
    skill: 65,
  },
  {
    id: 'pinhead',
    name: 'Pinhead',
    level: 4,
    personality: 'Hell Priest of the Cenobites. Eloquent, philosophical about pain and pleasure. "We have such sights to show you." Offers eternal torment.',
    powers: 'Cenobite Powers - hooked chains from nowhere, dimensional manipulation, immortal demon, pain/pleasure mastery, Lament Configuration',
    category: 'horror',
    skill: 90,
  },
  {
    id: 'john-kramer',
    name: 'Jigsaw (John Kramer)',
    level: 1,
    personality: 'Terminally ill engineer who tests people\'s will to live through deadly games. "I want to play a game." Never directly kills.',
    powers: 'Trap Master - genius engineer, elaborate death traps, psychological manipulation, posthumous planning, apprentice network',
    category: 'horror',
    skill: 95,
  },
];

// Category definitions for filtering
const OPPONENT_CATEGORIES = [
  { id: 'all', name: 'All Categories' },
  { id: 'training', name: '🎯 Training' },
  { id: 'iconic', name: '⚡ Heroes & Villains' },
  { id: 'celebrity', name: '🌟 Celebrities' },
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
  iconic: ICONIC_OPPONENTS,
  celebrity: CELEBRITY_OPPONENTS,
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
  
  // Character story lore for AI battles
  const [characterStoryLore, setCharacterStoryLore] = useState<string>('');
  
  // Power tier and category filters
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  
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

  useEffect(() => {
    if (user) {
      fetchUserCharacters();
      fetchUserPlanets();
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
      .select('id, name, level, image_url, powers, abilities, stat_skill, personality, mentality')
      .eq('user_id', user?.id);
    
    if (data && data.length > 0) {
      setUserCharacters(data);
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

  const sendMessage = async () => {
    if (!input.trim() || !selectedCharacter || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      channel: activeChannel,
      characterName: selectedCharacter.name,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
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
    
    let skillEventNote = '';
    if (userMishap && activeChannel === 'in_universe') {
      skillEventNote = '\n\n[SKILL MISHAP: The user\'s low skill caused their attack/ability to misfire or behave unexpectedly. Incorporate this into the narrative!]';
    } else if (userCritical && activeChannel === 'in_universe') {
      skillEventNote = '\n\n[CRITICAL SUCCESS: The user executed their technique with exceptional precision! Describe an impressive or unexpected positive outcome!]';
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
          userMessage: input + skillEventNote,
          channel: activeChannel,
          messageHistory: messages.slice(-10),
          battleLocation,
          dynamicEnvironment: dynamicEnvironment && !!battleEnvironment,
          environmentEffects: battleEnvironment?.effectsPrompt || '',
          hazardEvent,
          userGoesFirst,
          isFirstMove: false,
          characterStoryLore: characterStoryLore || undefined,
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
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        {battleStarted && (
          <Button variant="outline" onClick={resetBattle}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset Battle
          </Button>
        )}
      </div>

      <Card className="bg-card-gradient border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            Practice Arena
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
                            <div>
                              <p className="font-medium">{selectedOpponent.name}</p>
                              <p className="text-xs text-muted-foreground">{getTierName(selectedOpponent.level)}</p>
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

                {/* Environment Effects Toggle */}
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

                {/* Environment Preview */}
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
                  {battleEnvironment && dynamicEnvironment && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs bg-amber-500/10 border-amber-500/30 text-amber-600">
                        <Zap className="w-3 h-3 mr-1" />
                        {battleEnvironment.gravity.toFixed(1)}g • {battleEnvironment.gravityClass.name}
                      </Badge>
                    </div>
                  )}
                </div>
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
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-medium">{currentOpponent?.name}</p>
                    <Badge variant="outline" className="text-xs">{getTierName(currentOpponent?.level || 1)}</Badge>
                  </div>
                  {opponentType === 'own' && selectedOwnCharacter ? (
                    <Avatar className="h-10 w-10">
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
                    scrollRef={scrollRef}
                    isInUniverse={true}
                  />
                </TabsContent>
                <TabsContent value="out_of_universe" className="mt-0">
                  <MessageArea 
                    messages={messages.filter(m => m.channel === 'out_of_universe')}
                    scrollRef={scrollRef}
                    isInUniverse={false}
                  />
                </TabsContent>
              </Tabs>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={activeChannel === 'in_universe' 
                    ? 'Describe your action or attack...' 
                    : 'Ask a question or discuss strategy...'}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  disabled={isLoading}
                />
                <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MessageArea({ 
  messages, 
  scrollRef, 
  isInUniverse 
}: { 
  messages: Message[]; 
  scrollRef: React.RefObject<HTMLDivElement>;
  isInUniverse: boolean;
}) {
  return (
    <ScrollArea className="h-[400px] rounded-lg border border-border p-4" ref={scrollRef}>
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p>{isInUniverse ? 'The arena awaits your first move...' : 'No OOC messages yet'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-primary/20 border-l-4 border-primary ml-8'
                  : message.role === 'narrator'
                  ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-l-4 border-purple-500 mx-4 italic'
                  : message.role === 'system'
                  ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-l-4 border-cyan-500 mx-4 text-center'
                  : 'bg-muted/50 border-l-4 border-accent mr-8'
              }`}
            >
              <p className={`text-xs mb-1 ${
                message.role === 'narrator' 
                  ? 'text-purple-400 font-semibold' 
                  : message.role === 'system'
                  ? 'text-cyan-400 font-semibold'
                  : 'text-muted-foreground'
              }`}>
                {message.characterName}
              </p>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  );
}
