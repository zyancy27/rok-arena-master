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
import { toast } from 'sonner';
import { getTierName } from '@/lib/game-constants';
import { 
  ArrowLeft, 
  Swords, 
  Bot, 
  Send, 
  MessageSquare, 
  Sparkles,
  RefreshCw
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

// AI opponent templates
const AI_OPPONENTS = [
  {
    id: 'training-bot',
    name: 'Training Sentinel',
    level: 2,
    personality: 'A stoic training construct designed to help warriors hone their skills. Speaks formally and provides tactical feedback.',
    powers: 'Adaptive Combat Analysis - can analyze and counter fighting styles',
  },
  {
    id: 'chaos-imp',
    name: 'Zyx the Chaos Imp',
    level: 3,
    personality: 'A mischievous trickster who enjoys wordplay and unconventional attacks. Playful but cunning.',
    powers: 'Reality Pranks - minor reality distortions for comedic and tactical effect',
  },
  {
    id: 'ancient-guardian',
    name: 'Aethon the Eternal',
    level: 4,
    personality: 'An ancient guardian who speaks in riddles and tests worthy challengers. Wise and patient.',
    powers: 'Cosmic Wisdom - manipulation of celestial energies and precognition',
  },
];

export default function MockBattle() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [userCharacters, setUserCharacters] = useState<UserCharacter[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<UserCharacter | null>(null);
  const [selectedOpponent, setSelectedOpponent] = useState(AI_OPPONENTS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeChannel, setActiveChannel] = useState<'in_universe' | 'out_of_universe'>('in_universe');
  const [battleStarted, setBattleStarted] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserCharacters();
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

  const startBattle = () => {
    if (!selectedCharacter) {
      toast.error('Please select a character first');
      return;
    }
    
    setBattleStarted(true);
    const introMessage: Message = {
      id: crypto.randomUUID(),
      role: 'ai',
      content: `*${selectedOpponent.name} materializes in the arena, ${selectedOpponent.level <= 2 ? 'radiating calm focus' : selectedOpponent.level <= 4 ? 'crackling with power' : 'warping reality around them'}*\n\n"${getOpponentIntro()}"`,
      channel: 'in_universe',
      characterName: selectedOpponent.name,
    };
    setMessages([introMessage]);
  };

  const getOpponentIntro = () => {
    switch (selectedOpponent.id) {
      case 'training-bot':
        return `Warrior ${selectedCharacter?.name}, I have analyzed your potential. Let us begin your training. Show me the depths of your ${selectedCharacter?.powers || 'power'}.`;
      case 'chaos-imp':
        return `Ohoho! ${selectedCharacter?.name}, is it? Your aura looks... deliciously chaotic. Let's dance, shall we? *giggles mischievously*`;
      case 'ancient-guardian':
        return `${selectedCharacter?.name}... the stars spoke of your coming. Whether you seek wisdom or destruction, you shall find truth in our clash.`;
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

    try {
      const response = await supabase.functions.invoke('mock-battle-ai', {
        body: {
          userCharacter: {
            name: selectedCharacter.name,
            level: selectedCharacter.level,
            powers: selectedCharacter.powers,
            abilities: selectedCharacter.abilities,
          },
          opponent: selectedOpponent,
          userMessage: input,
          channel: activeChannel,
          messageHistory: messages.slice(-10),
        },
      });

      if (response.error) throw response.error;

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: 'ai',
        content: response.data.response,
        channel: activeChannel,
        characterName: selectedOpponent.name,
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI response error:', error);
      // Fallback response if AI fails
      const fallbackMessage: Message = {
        id: crypto.randomUUID(),
        role: 'ai',
        content: activeChannel === 'in_universe' 
          ? `*${selectedOpponent.name} narrows their eyes, considering your move*\n\n"Interesting approach, ${selectedCharacter.name}. But can you handle THIS?"\n\n*${selectedOpponent.name} prepares a counter-attack*`
          : `[OOC: Nice move! That was a creative use of your character's abilities. Want to keep going?]`,
        channel: activeChannel,
        characterName: selectedOpponent.name,
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetBattle = () => {
    setMessages([]);
    setBattleStarted(false);
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
                  <label className="text-sm font-medium">AI Opponent</label>
                  <Select 
                    value={selectedOpponent.id} 
                    onValueChange={(id) => setSelectedOpponent(AI_OPPONENTS.find(o => o.id === id) || AI_OPPONENTS[0])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_OPPONENTS.map((opponent) => (
                        <SelectItem key={opponent.id} value={opponent.id}>
                          <span className="flex items-center gap-2">
                            <Bot className="w-3 h-3" />
                            {opponent.name} (Tier {opponent.level})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                </div>
              </div>

              <div className="text-center">
                <Button onClick={startBattle} className="glow-primary" size="lg">
                  <Swords className="w-5 h-5 mr-2" />
                  Begin Practice Battle
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
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
                    <p className="font-medium">{selectedOpponent.name}</p>
                    <Badge variant="outline" className="text-xs">{getTierName(selectedOpponent.level)}</Badge>
                  </div>
                  <Avatar className="h-10 w-10 bg-primary/20">
                    <AvatarFallback className="text-primary">
                      <Bot className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
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
