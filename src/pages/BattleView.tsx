import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { ROK_RULES } from '@/lib/game-constants';
import { generateBattleEnvironment, BattleEnvironment } from '@/lib/battle-environment';
import {
  ArrowLeft,
  Send,
  Swords,
  MessageCircle,
  BookOpen,
  Flag,
  Users,
  Sparkles,
  MapPin,
  Coins,
  Atom,
  Zap,
  Wind,
  Flame,
  Snowflake,
} from 'lucide-react';

interface Battle {
  id: string;
  status: 'pending' | 'active' | 'completed';
  created_at: string;
  winner_id: string | null;
  loser_id: string | null;
  location_1: string | null;
  location_2: string | null;
  chosen_location: string | null;
  coin_flip_winner_id: string | null;
  dynamic_environment: boolean;
  environment_effects: string | null;
}

interface Participant {
  id: string;
  character_id: string;
  turn_order: number;
  character?: {
    id: string;
    name: string;
    level: number;
    user_id: string;
  };
}

interface Message {
  id: string;
  character_id: string;
  content: string;
  channel: 'in_universe' | 'out_of_universe';
  created_at: string;
  character_name?: string;
}

export default function BattleView() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [battle, setBattle] = useState<Battle | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userCharacter, setUserCharacter] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [activeChannel, setActiveChannel] = useState<'in_universe' | 'out_of_universe'>('in_universe');
  const [showRules, setShowRules] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [isFlippingCoin, setIsFlippingCoin] = useState(false);
  const [dynamicEnvironmentEnabled, setDynamicEnvironmentEnabled] = useState(true);
  const [battleEnvironment, setBattleEnvironment] = useState<BattleEnvironment | null>(null);

  // Generate environment when battle becomes active with a location
  useEffect(() => {
    if (battle?.chosen_location && battle?.dynamic_environment) {
      const env = generateBattleEnvironment(battle.chosen_location, null, null);
      setBattleEnvironment(env);
    }
  }, [battle?.chosen_location, battle?.dynamic_environment]);

  useEffect(() => {
    if (id && user) {
      fetchBattleData();
      setupRealtime();
    }

    return () => {
      supabase.channel(`battle-${id}`).unsubscribe();
    };
  }, [id, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchBattleData = async () => {
    // Fetch battle
    const { data: battleData, error: battleError } = await supabase
      .from('battles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (battleError || !battleData) {
      toast.error('Battle not found');
      navigate('/battles');
      return;
    }

    setBattle(battleData as Battle);

    // Fetch participants with character info
    const { data: participantsData } = await supabase
      .from('battle_participants')
      .select('id, character_id, turn_order')
      .eq('battle_id', id)
      .order('turn_order');

    if (participantsData) {
      // Fetch character details
      const charIds = participantsData.map(p => p.character_id);
      const { data: charsData } = await supabase
        .from('characters')
        .select('id, name, level, user_id')
        .in('id', charIds);

      const participantsWithChars = participantsData.map(p => ({
        ...p,
        character: charsData?.find(c => c.id === p.character_id),
      }));

      setParticipants(participantsWithChars);

      // Find user's character in this battle
      const userChar = participantsWithChars.find(
        p => p.character?.user_id === user?.id
      );
      setUserCharacter(userChar || null);
    }

    // Fetch messages
    await fetchMessages();
    setLoading(false);
  };

  const fetchMessages = async () => {
    const { data: messagesData } = await supabase
      .from('battle_messages')
      .select('id, character_id, content, channel, created_at')
      .eq('battle_id', id)
      .order('created_at', { ascending: true });

    if (messagesData) {
      // Get character names
      const charIds = [...new Set(messagesData.map(m => m.character_id))];
      const { data: charsData } = await supabase
        .from('characters')
        .select('id, name')
        .in('id', charIds);

      const charMap = new Map(charsData?.map(c => [c.id, c.name]) || []);

      const messagesWithNames = messagesData.map(m => ({
        ...m,
        channel: m.channel as 'in_universe' | 'out_of_universe',
        character_name: charMap.get(m.character_id) || 'Unknown',
      }));

      setMessages(messagesWithNames);
    }
  };

  const setupRealtime = () => {
    const channel = supabase
      .channel(`battle-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'battle_messages',
          filter: `battle_id=eq.${id}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          
          // Fetch character name for new message
          const { data: charData } = await supabase
            .from('characters')
            .select('name, user_id')
            .eq('id', newMessage.character_id)
            .maybeSingle();

          const messageWithName = {
            ...newMessage,
            channel: newMessage.channel as 'in_universe' | 'out_of_universe',
            character_name: charData?.name || 'Unknown',
          };

          setMessages(prev => [...prev, messageWithName]);

          // Show notification if message is from another user
          if (charData?.user_id !== user?.id) {
            const channelLabel = newMessage.channel === 'in_universe' ? '⚔️' : '💬';
            toast.info(`${channelLabel} ${charData?.name || 'Unknown'}`, {
              description: newMessage.content.length > 60 
                ? newMessage.content.substring(0, 60) + '...' 
                : newMessage.content,
              duration: 4000,
            });

            // Play notification sound if available
            try {
              const audio = new Audio('/notification.mp3');
              audio.volume = 0.3;
              audio.play().catch(() => {});
            } catch {}
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'battles',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const updatedBattle = payload.new as Battle;
          setBattle(updatedBattle);
          
          if (updatedBattle.status === 'active' && battle?.status === 'pending') {
            toast.success('⚔️ Battle has begun!', {
              description: 'Your opponent is ready. Make your move!',
            });
          }
          
          if (updatedBattle.status === 'completed') {
            toast.info('🏁 Battle completed!', {
              description: 'The battle has ended.',
            });
          }
        }
      )
      .subscribe();
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !userCharacter) return;

    const { error } = await supabase.from('battle_messages').insert({
      battle_id: id,
      character_id: userCharacter.character_id,
      content: messageInput.trim(),
      channel: activeChannel,
    });

    if (error) {
      toast.error('Failed to send message');
      return;
    }

    setMessageInput('');
  };

  const handleConcede = async () => {
    if (!userCharacter || !battle) return;

    // Find opponent
    const opponent = participants.find(p => p.character_id !== userCharacter.character_id);

    const { error } = await supabase
      .from('battles')
      .update({
        status: 'completed',
        winner_id: opponent?.character_id,
        loser_id: userCharacter.character_id,
      })
      .eq('id', battle.id);

    if (error) {
      toast.error('Failed to concede');
      return;
    }

    toast.success('You have conceded the battle');
    navigate('/battles');
  };

  const handleAcceptBattle = async () => {
    if (!battle) return;

    if (!locationInput.trim()) {
      toast.error('Please enter your battle location first');
      return;
    }

    // Set location_2 and then flip coin
    const { error: locationError } = await supabase
      .from('battles')
      .update({ location_2: locationInput.trim() })
      .eq('id', battle.id);

    if (locationError) {
      toast.error('Failed to set location');
      return;
    }

    setBattle({ ...battle, location_2: locationInput.trim() });
    setLocationInput('');
    toast.success('Location submitted! Flip the coin to determine the battle arena.');
  };

  const handleCoinFlip = async () => {
    if (!battle || !userCharacter) return;
    
    setIsFlippingCoin(true);
    
    // Animate coin flip
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Randomly choose winner
    const locations = [battle.location_1, battle.location_2];
    const winnerIndex = Math.random() > 0.5 ? 0 : 1;
    const chosenLocation = locations[winnerIndex];
    const winnerCharacterId = winnerIndex === 0 
      ? participants[0]?.character_id 
      : participants[1]?.character_id;

    // Generate environment effects if dynamic environment is enabled
    let environmentEffects: string | null = null;
    if (dynamicEnvironmentEnabled && chosenLocation) {
      const env = generateBattleEnvironment(chosenLocation, null, null);
      environmentEffects = env.effectsPrompt;
    }

    const { error } = await supabase
      .from('battles')
      .update({ 
        status: 'active',
        chosen_location: chosenLocation,
        coin_flip_winner_id: winnerCharacterId,
        dynamic_environment: dynamicEnvironmentEnabled,
        environment_effects: environmentEffects
      })
      .eq('id', battle.id);

    if (error) {
      toast.error('Failed to start battle');
      setIsFlippingCoin(false);
      return;
    }

    setBattle({ 
      ...battle, 
      status: 'active', 
      chosen_location: chosenLocation,
      coin_flip_winner_id: winnerCharacterId,
      dynamic_environment: dynamicEnvironmentEnabled,
      environment_effects: environmentEffects
    });
    
    const winnerName = participants[winnerIndex]?.character?.name || 'Unknown';
    toast.success(`🪙 ${winnerName}'s location was chosen: ${chosenLocation}!`);
    if (dynamicEnvironmentEnabled) {
      toast.info('⚛️ Dynamic battlefield effects are active!');
    }
    setIsFlippingCoin(false);
  };

  const inUniverseMessages = messages.filter(m => m.channel === 'in_universe');
  const outOfUniverseMessages = messages.filter(m => m.channel === 'out_of_universe');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse-glow">
          <Swords className="w-16 h-16 text-primary" />
        </div>
      </div>
    );
  }

  if (!battle) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/battles')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Battles
        </Button>
        <div className="flex items-center gap-2">
          <Badge
            className={
              battle.status === 'active'
                ? 'bg-green-500/20 text-green-400'
                : battle.status === 'pending'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-muted text-muted-foreground'
            }
          >
            {battle.status.toUpperCase()}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRules(!showRules)}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Rules
          </Button>
        </div>
      </div>

      {/* Location Setup for Pending Battle */}
      {battle.status === 'pending' && userCharacter && (
        <Card className="bg-card-gradient border-border">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Battle Location Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show submitted locations */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {participants[0]?.character?.name || 'Challenger'}'s Location
                </p>
                {battle.location_1 ? (
                  <Badge variant="outline" className="w-full justify-start gap-2 py-2">
                    <Sparkles className="w-3 h-3" />
                    {battle.location_1}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="w-full justify-start py-2 text-muted-foreground">
                    Awaiting...
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {participants[1]?.character?.name || 'Defender'}'s Location
                </p>
                {battle.location_2 ? (
                  <Badge variant="outline" className="w-full justify-start gap-2 py-2">
                    <Sparkles className="w-3 h-3" />
                    {battle.location_2}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="w-full justify-start py-2 text-muted-foreground">
                    Awaiting...
                  </Badge>
                )}
              </div>
            </div>

            {/* Input for defender to set their location */}
            {userCharacter.turn_order === 2 && !battle.location_2 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Enter Your Battle Location</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Volcanic Mountains, Crystal Caverns..."
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAcceptBattle()}
                  />
                  <Button onClick={handleAcceptBattle} disabled={!locationInput.trim()}>
                    Submit
                  </Button>
                </div>
              </div>
            )}

            {/* Coin flip when both locations are set */}
            {battle.location_1 && battle.location_2 && !battle.chosen_location && (
              <div className="text-center space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Both locations submitted! Flip the coin to decide the battle arena.
                </p>
                
                {/* Dynamic Environment Toggle */}
                <div className="flex items-center justify-center gap-3 p-3 bg-background/50 rounded-lg">
                  <Atom className="w-4 h-4 text-primary" />
                  <Label htmlFor="dynamic-env" className="text-sm">
                    Dynamic Battlefield Effects
                  </Label>
                  <Switch
                    id="dynamic-env"
                    checked={dynamicEnvironmentEnabled}
                    onCheckedChange={setDynamicEnvironmentEnabled}
                  />
                </div>
                {dynamicEnvironmentEnabled && (
                  <p className="text-xs text-muted-foreground">
                    ⚛️ Gravity, weather, and terrain will affect combat narration
                  </p>
                )}
                
                {isFlippingCoin && (
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 animate-spin flex items-center justify-center shadow-lg">
                      <Coins className="w-8 h-8 text-amber-900" />
                    </div>
                  </div>
                )}
                
                {!isFlippingCoin && (
                  <Button 
                    onClick={handleCoinFlip}
                    className="glow-primary"
                    size="lg"
                  >
                    <Coins className="w-5 h-5 mr-2" />
                    Flip Coin & Start Battle
                  </Button>
                )}
              </div>
            )}

            {/* Waiting for defender message */}
            {userCharacter.turn_order === 1 && battle.location_1 && !battle.location_2 && (
              <p className="text-center text-sm text-muted-foreground">
                Waiting for your opponent to submit their location...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Show chosen location when battle is active */}
      {battle.chosen_location && (
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Battle Location</p>
                  <p className="font-semibold text-lg">{battle.chosen_location}</p>
                </div>
              </div>
              {battle.dynamic_environment && (
                <Badge variant="outline" className="flex items-center gap-1 text-primary border-primary/30">
                  <Atom className="w-3 h-3" />
                  Dynamic Effects Active
                </Badge>
              )}
            </div>
            
            {/* Environment Effects Display */}
            {battle.dynamic_environment && battleEnvironment && (
              <div className="mt-4 p-3 bg-background/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Battlefield Conditions
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="text-primary">⬇️</span>
                    Gravity: {battleEnvironment.gravity.toFixed(2)}g ({battleEnvironment.gravityClass.name})
                  </div>
                  {battleEnvironment.terrainFeatures?.atmosphereType && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Wind className="w-3 h-3 text-cyan-400" />
                      {battleEnvironment.terrainFeatures.atmosphereType} atmosphere
                    </div>
                  )}
                  {battleEnvironment.terrainFeatures?.primaryBiome && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      {battleEnvironment.terrainFeatures.hasVolcanoes ? (
                        <Flame className="w-3 h-3 text-orange-400" />
                      ) : battleEnvironment.terrainFeatures.hasTundra ? (
                        <Snowflake className="w-3 h-3 text-blue-400" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-purple-400" />
                      )}
                      {battleEnvironment.terrainFeatures.primaryBiome}
                    </div>
                  )}
                </div>
                {battleEnvironment.shortSummary && (
                  <p className="text-xs text-muted-foreground italic mt-1">
                    {battleEnvironment.shortSummary}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rules Panel */}
      {showRules && (
        <Card className="bg-card-gradient border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              R.O.K. Battle Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {ROK_RULES.map((rule) => (
                <div key={rule.id} className="flex gap-3">
                  <Badge className="tier-badge tier-4 shrink-0">{rule.id}</Badge>
                  <div>
                    <p className="font-semibold text-sm">{rule.title}</p>
                    <p className="text-xs text-muted-foreground">{rule.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Participants */}
      <Card className="bg-card-gradient border-border">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" />
            Combatants
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex flex-wrap gap-3">
            {participants.map((p, index) => (
              <div key={p.id} className="flex items-center gap-2">
                {index > 0 && <span className="text-primary font-bold">VS</span>}
                <Badge variant="outline" className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {p.character?.name || 'Unknown'}
                  <span className="text-xs text-muted-foreground ml-1">
                    (Tier {p.character?.level})
                  </span>
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* In-Universe Chat */}
        <Card className="bg-card-gradient border-border">
          <CardHeader className="py-3 border-b border-border">
            <CardTitle className="text-sm flex items-center gap-2">
              <Swords className="w-4 h-4 text-primary" />
              In-Universe (Roleplay)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px] p-4">
              {inUniverseMessages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Swords className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">The battle awaits...</p>
                  <p className="text-xs">Send your first move!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inUniverseMessages.map((msg) => (
                    <div key={msg.id} className="chat-in-universe pl-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-primary text-sm">
                          {msg.character_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{msg.content}</p>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
            {battle.status === 'active' && userCharacter && activeChannel === 'in_universe' && (
              <div className="p-4 border-t border-border">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    placeholder="Describe your action..."
                    value={activeChannel === 'in_universe' ? messageInput : ''}
                    onChange={(e) => {
                      setActiveChannel('in_universe');
                      setMessageInput(e.target.value);
                    }}
                    onFocus={() => setActiveChannel('in_universe')}
                  />
                  <Button type="submit" size="icon">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Out-of-Universe Chat */}
        <Card className="bg-card-gradient border-border">
          <CardHeader className="py-3 border-b border-border">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
              Out-of-Universe (OOC)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px] p-4">
              {outOfUniverseMessages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No OOC messages yet</p>
                  <p className="text-xs">Discuss rules or clarify things here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {outOfUniverseMessages.map((msg) => (
                    <div key={msg.id} className="chat-out-of-universe pl-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-muted-foreground text-sm">
                          {msg.character_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            {battle.status === 'active' && userCharacter && activeChannel === 'out_of_universe' && (
              <div className="p-4 border-t border-border">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    placeholder="Say something OOC..."
                    value={activeChannel === 'out_of_universe' ? messageInput : ''}
                    onChange={(e) => {
                      setActiveChannel('out_of_universe');
                      setMessageInput(e.target.value);
                    }}
                    onFocus={() => setActiveChannel('out_of_universe')}
                  />
                  <Button type="submit" size="icon" variant="secondary">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Channel Toggle for Mobile */}
      {battle.status === 'active' && userCharacter && (
        <Card className="bg-card-gradient border-border lg:hidden">
          <CardContent className="p-4">
            <Tabs value={activeChannel} onValueChange={(v) => setActiveChannel(v as 'in_universe' | 'out_of_universe')}>
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="in_universe">In-Universe</TabsTrigger>
                <TabsTrigger value="out_of_universe">OOC</TabsTrigger>
              </TabsList>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder={activeChannel === 'in_universe' ? 'Describe your action...' : 'Say something OOC...'}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                />
                <Button type="submit" size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Battle Actions */}
      {battle.status === 'active' && userCharacter && (
        <div className="flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Flag className="w-4 h-4 mr-2" />
                Concede Battle
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Concede Battle?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to concede? This will end the battle and declare your opponent as the winner.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConcede}>Concede</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
