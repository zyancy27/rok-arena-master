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
import { 
  ArrowLeft, 
  Swords, 
  Bot, 
  Send, 
  MessageSquare, 
  Sparkles,
  RefreshCw,
  User,
  MapPin,
  Globe,
  Zap
} from 'lucide-react';

interface UserCharacter {
  id: string;
  name: string;
  level: number;
  image_url: string | null;
  powers: string | null;
  abilities: string | null;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
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
}

interface PlanetData {
  planet_name: string;
  display_name: string | null;
  gravity: number | null;
  description: string | null;
}

// Original AI opponent templates
const ORIGINAL_OPPONENTS = [
  {
    id: 'training-bot',
    name: 'Training Sentinel',
    level: 2,
    personality: 'A stoic training construct designed to help warriors hone their skills. Speaks formally and provides tactical feedback.',
    powers: 'Adaptive Combat Analysis - can analyze and counter fighting styles',
    category: 'original',
  },
  {
    id: 'chaos-imp',
    name: 'Zyx the Chaos Imp',
    level: 3,
    personality: 'A mischievous trickster who enjoys wordplay and unconventional attacks. Playful but cunning.',
    powers: 'Reality Pranks - minor reality distortions for comedic and tactical effect',
    category: 'original',
  },
  {
    id: 'ancient-guardian',
    name: 'Aethon the Eternal',
    level: 4,
    personality: 'An ancient guardian who speaks in riddles and tests worthy challengers. Wise and patient.',
    powers: 'Cosmic Wisdom - manipulation of celestial energies and precognition',
    category: 'original',
  },
];

// Iconic comic book character AI opponents
const ICONIC_OPPONENTS = [
  {
    id: 'hulk',
    name: 'The Hulk',
    level: 5,
    personality: 'HULK IS STRONGEST ONE THERE IS! Speaks in third person, simple sentences. Gets angrier as fight goes on. Surprisingly protective of innocent.',
    powers: 'Limitless Strength - grows stronger with rage, regeneration, thunderclap shockwaves, gamma radiation immunity',
    category: 'iconic',
  },
  {
    id: 'wolverine',
    name: 'Wolverine',
    level: 4,
    personality: 'Gruff, sarcastic Canadian mutant. Calls everyone "bub." Has a code of honor despite his feral nature. Cigar-chomping anti-hero.',
    powers: 'Adamantium Claws - indestructible skeleton, superhuman senses, regenerative healing factor that makes him nearly unkillable',
    category: 'iconic',
  },
  {
    id: 'deadpool',
    name: 'Deadpool',
    level: 4,
    personality: 'Fourth-wall breaking merc with a mouth. Makes pop culture references, talks to the audience, chaotic and unpredictable. Maximum effort!',
    powers: 'Regenerative Healing - extreme regeneration, expert marksman and swordsman, unpredictable fighting style',
    category: 'iconic',
  },
  {
    id: 'mr-fantastic',
    name: 'Mr. Fantastic',
    level: 4,
    personality: 'Brilliant scientist Reed Richards. Speaks technically, always calculating. Sometimes oblivious to social cues. Will explain the science.',
    powers: 'Elasticity - can stretch, reshape, and expand body infinitely. Genius-level intellect, one of the smartest beings alive',
    category: 'iconic',
  },
  {
    id: 'thor',
    name: 'Thor Odinson',
    level: 5,
    personality: 'Asgardian God of Thunder. Speaks in archaic, noble manner. Honorable warrior who respects worthy opponents. "Have at thee!"',
    powers: 'Thunder God - Mjolnir control, lightning manipulation, superhuman strength, flight, near-immortality',
    category: 'iconic',
  },
  {
    id: 'magneto',
    name: 'Magneto',
    level: 5,
    personality: 'Master of magnetism and mutant supremacist. Eloquent, philosophical, sees himself as mutant savior. Holocaust survivor with complex morality.',
    powers: 'Magnetokinesis - control over all magnetic fields and metal, force fields, electromagnetic pulse generation',
    category: 'iconic',
  },
  {
    id: 'doctor-doom',
    name: 'Doctor Doom',
    level: 5,
    personality: 'Ruler of Latveria. Refers to himself in third person as "Doom." Arrogant genius who believes only he can save the world. Theatrical villain.',
    powers: 'Sorcery & Technology - genius inventor, powerful sorcerer, armored suit with vast weaponry, diplomatic immunity',
    category: 'iconic',
  },
  {
    id: 'spider-man',
    name: 'Spider-Man',
    level: 3,
    personality: 'Friendly neighborhood wall-crawler. Cracks jokes constantly during fights. Great power, great responsibility. Queens accent optional.',
    powers: 'Spider Powers - wall-crawling, superhuman agility and strength, spider-sense danger detection, web-slinging',
    category: 'iconic',
  },
];

// Anime & Manga character AI opponents
const ANIME_OPPONENTS = [
  {
    id: 'goku',
    name: 'Son Goku',
    level: 6,
    personality: 'Pure-hearted Saiyan warrior who lives for the thrill of battle. Cheerful, naive about non-combat things. Always seeking stronger opponents. "Kamehameha!"',
    powers: 'Saiyan Might - Super Saiyan transformations, Ki manipulation, Instant Transmission, Kamehameha, Ultra Instinct',
    category: 'anime',
  },
  {
    id: 'naruto',
    name: 'Naruto Uzumaki',
    level: 5,
    personality: 'Hyperactive ninja who never gives up. Says "Believe it!" and "Dattebayo!" Wants to be acknowledged. Will talk-no-jutsu you into friendship.',
    powers: 'Nine-Tails Jinchuriki - Massive chakra reserves, Shadow Clone Jutsu, Rasengan, Sage Mode, Six Paths power',
    category: 'anime',
  },
  {
    id: 'ichigo',
    name: 'Ichigo Kurosaki',
    level: 5,
    personality: 'Orange-haired Soul Reaper with a scowl. Protective of friends, reluctant hero. Sarcastic but has a strong moral code.',
    powers: 'Shinigami Powers - Zangetsu sword, Bankai transformation, Hollow powers, Quincy abilities, Getsuga Tensho',
    category: 'anime',
  },
  {
    id: 'luffy',
    name: 'Monkey D. Luffy',
    level: 5,
    personality: 'Rubber pirate captain who will be King of the Pirates! Simple-minded, loves meat, fiercely loyal to crew. Gear transformations mid-fight.',
    powers: 'Gum-Gum Fruit - Rubber body, Gear Second/Third/Fourth/Fifth, Haki mastery, Nika awakening',
    category: 'anime',
  },
  {
    id: 'saitama',
    name: 'Saitama',
    level: 7,
    personality: 'Bored hero who defeats everything in one punch. Deadpan, obsessed with supermarket sales. Existential crisis about being too strong.',
    powers: 'Limitless Strength - One punch knockout, immeasurable speed, invulnerability, Serious Series techniques',
    category: 'anime',
  },
  {
    id: 'vegeta',
    name: 'Vegeta',
    level: 6,
    personality: 'Prince of all Saiyans! Arrogant, prideful warrior with a rivalry complex. Has grown from villain to anti-hero. "Its over 9000!"',
    powers: 'Saiyan Pride - Super Saiyan forms, Final Flash, Big Bang Attack, Ultra Ego, intense training discipline',
    category: 'anime',
  },
  {
    id: 'zoro',
    name: 'Roronoa Zoro',
    level: 4,
    personality: 'Three-sword style master who gets lost constantly. Stoic, loves sake and naps. Dreams of being worlds greatest swordsman.',
    powers: 'Santoryu - Three Sword Style, Haki mastery, Asura technique, superhuman endurance and strength',
    category: 'anime',
  },
  {
    id: 'gojo',
    name: 'Gojo Satoru',
    level: 6,
    personality: 'Blindfolded sorcerer whos the strongest. Playful and arrogant, loves teasing people. Actually cares deeply but hides it behind jokes.',
    powers: 'Infinity & Six Eyes - Limitless cursed technique, Infinity barrier, Domain Expansion: Unlimited Void, Hollow Purple',
    category: 'anime',
  },
  {
    id: 'levi',
    name: 'Levi Ackerman',
    level: 4,
    personality: 'Humanitys strongest soldier. Short, clean-freak, blunt to the point of rudeness. Moves faster than the eye can follow.',
    powers: 'Ackerman Bloodline - Superhuman combat ability, ODM Gear mastery, incredible speed and precision',
    category: 'anime',
  },
  {
    id: 'all-might',
    name: 'All Might',
    level: 5,
    personality: 'Symbol of Peace! Always smiling, speaks in dramatic heroic fashion. "I AM HERE!" Muscle form hero who inspires hope.',
    powers: 'One For All - Immense strength, speed, United States of Smash, Detroit Smash, Texas Smash',
    category: 'anime',
  },
];

const AI_OPPONENTS: AIOpponent[] = [...ORIGINAL_OPPONENTS, ...ICONIC_OPPONENTS, ...ANIME_OPPONENTS];

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

  useEffect(() => {
    if (user) {
      fetchUserCharacters();
      fetchUserPlanets();
    }
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchUserCharacters = async () => {
    const { data } = await supabase
      .from('characters')
      .select('id, name, level, image_url, powers, abilities')
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
          category: 'own'
        }
      : null;

  const startBattle = () => {
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
    
    setBattleStarted(true);
    const introMessage: Message = {
      id: crypto.randomUUID(),
      role: 'ai',
      content: `*The arena shifts and transforms into ${battleLocation}*\n\n*${currentOpponent.name} materializes in the arena, ${currentOpponent.level <= 2 ? 'radiating calm focus' : currentOpponent.level <= 4 ? 'crackling with power' : 'warping reality around them'}*\n\n"${getOpponentIntro()}"`,
      channel: 'in_universe',
      characterName: currentOpponent.name,
    };
    setMessages([introMessage]);
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

    try {
      const response = await supabase.functions.invoke('mock-battle-ai', {
        body: {
          userCharacter: {
            name: selectedCharacter.name,
            level: selectedCharacter.level,
            powers: selectedCharacter.powers,
            abilities: selectedCharacter.abilities,
          },
          opponent: currentOpponent,
          userMessage: input,
          channel: activeChannel,
          messageHistory: messages.slice(-10),
          battleLocation,
          dynamicEnvironment: dynamicEnvironment && !!battleEnvironment,
          environmentEffects: battleEnvironment?.effectsPrompt || '',
          hazardEvent,
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
                      <Select 
                        value={selectedOpponent?.id || ''} 
                        onValueChange={(id) => setSelectedOpponent(AI_OPPONENTS.find(o => o.id === id) || AI_OPPONENTS[0])}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Training Opponents</div>
                          {ORIGINAL_OPPONENTS.map((opponent) => (
                            <SelectItem key={opponent.id} value={opponent.id}>
                              <span className="flex items-center gap-2">
                                <Bot className="w-3 h-3" />
                                {opponent.name} (Tier {opponent.level})
                              </span>
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2 border-t pt-2">
                            ⚡ Iconic Heroes & Villains
                          </div>
                          {ICONIC_OPPONENTS.map((opponent) => (
                            <SelectItem key={opponent.id} value={opponent.id}>
                              <span className="flex items-center gap-2">
                                <Swords className="w-3 h-3 text-primary" />
                                {opponent.name} (Tier {opponent.level})
                              </span>
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2 border-t pt-2">
                            🌸 Anime & Manga
                          </div>
                          {ANIME_OPPONENTS.map((opponent) => (
                            <SelectItem key={opponent.id} value={opponent.id}>
                              <span className="flex items-center gap-2">
                                <Sparkles className="w-3 h-3 text-pink-500" />
                                {opponent.name} (Tier {opponent.level})
                              </span>
                            </SelectItem>
                          ))}
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
                        <SelectValue placeholder="Select a planet from your galaxy..." />
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
                        Tip: Create planets in the Galaxy Map to enable dynamic battlefield effects
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

              <div className="text-center">
                <Button 
                  onClick={startBattle} 
                  className="glow-primary" 
                  size="lg"
                  disabled={!selectedCharacter || !currentOpponent || !battleLocation.trim()}
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
                  : 'bg-muted/50 border-l-4 border-accent mr-8'
              }`}
            >
              <p className="text-xs text-muted-foreground mb-1">
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
