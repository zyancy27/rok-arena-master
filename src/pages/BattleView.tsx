import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { ROK_RULES } from '@/lib/game-constants';
import { generateBattleEnvironment, BattleEnvironment } from '@/lib/battle-environment';
import { validateMove, isMentalAttack, detectAreaDamage, type MoveValidationResult, type CharacterAbilities, type AreaDamageWarning } from '@/lib/move-validation';
import { 
  determineHit, 
  determineMentalHit, 
  detectMovementInAction,
  updateDistance,
  isAttackValidForDistance,
  formatDistanceInfo,
  calculateTravelTime,
  useConcentration,
  createConstruct,
  attackConstruct,
  detectConstructCreation,
  detectConstructAttack,
  type HitDetermination, 
  type ConcentrationResult,
  type DistanceState,
  type DistanceZone,
  type Construct,
  type ConstructDefenseResult,
} from '@/lib/battle-dice';
import { 
  validateDefense, 
  generateDefenseEnforcementPrompt, 
  getDamageLevel 
} from '@/lib/defense-validation';
import { 
  generatePhysicsContext, 
  generateSkillContext,
  shouldTriggerSkillMishap,
  shouldTriggerCritical,
  getSkillProficiency,
} from '@/lib/battle-physics';
import type { CharacterStats } from '@/lib/character-stats';
import MoveValidationWarning from '@/components/battles/MoveValidationWarning';
import MatchupWarning from '@/components/battles/MatchupWarning';
import ConcentrationButton from '@/components/battles/ConcentrationButton';
import DiceRollChatMessage from '@/components/battles/DiceRollChatMessage';
import SkillProficiencyBar from '@/components/battles/SkillProficiencyBar';
import ConstructPanel from '@/components/battles/ConstructPanel';
import ConstructDiceMessage from '@/components/battles/ConstructDiceMessage';
import TurnIndicatorWrapper from '@/components/battles/TurnIndicatorWrapper';
import TurnIndicator from '@/components/battles/TurnIndicator';
import BattleTurnColorPicker from '@/components/battles/BattleTurnColorPicker';
import BattlefieldEffectsOverlay from '@/components/battles/BattlefieldEffectsOverlay';
import { CharacterStatusOverlay } from '@/components/battles/CharacterStatusOverlay';
import { useBattleTurnColor } from '@/hooks/use-battle-turn-color';
import { useBattlefieldEffects } from '@/components/battles/useBattlefieldEffects';
import { useCharacterStatusEffects } from '@/hooks/use-character-status-effects';
import { detectCharacterStatusEffects } from '@/lib/character-status-effects';
import { shouldSuppressStatus } from '@/lib/battlefield-effects';
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
  AlertTriangle,
  Eye,
  Pencil,
  Check,
  CheckCheck,
  Lock,
  X,
  UserPlus,
  Volume2,
  VolumeX,
  Mic,
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
  challenged_user_id: string | null;
}

interface CharacterData {
  id: string;
  name: string;
  level: number;
  user_id: string;
  powers?: string | null;
  abilities?: string | null;
  stat_intelligence?: number | null;
  stat_battle_iq?: number | null;
  stat_strength?: number | null;
  stat_power?: number | null;
  stat_speed?: number | null;
  stat_durability?: number | null;
  stat_stamina?: number | null;
  stat_skill?: number | null;
  stat_luck?: number | null;
}

interface CharacterSnapshot {
  id: string;
  name: string;
  level: number;
  user_id: string;
  powers?: string | null;
  abilities?: string | null;
  stat_intelligence?: number | null;
  stat_battle_iq?: number | null;
  stat_strength?: number | null;
  stat_power?: number | null;
  stat_speed?: number | null;
  stat_durability?: number | null;
  stat_stamina?: number | null;
  stat_skill?: number | null;
  stat_luck?: number | null;
}

interface Participant {
  id: string;
  character_id: string;
  turn_order: number;
  character?: CharacterData;
  is_typing?: boolean;
  last_typed_at?: string;
  last_read_message_id?: string | null;
  last_read_at?: string | null;
  character_snapshot?: CharacterSnapshot | null;
}

interface Message {
  id: string;
  character_id: string;
  content: string;
  channel: 'in_universe' | 'out_of_universe';
  created_at: string;
  character_name?: string;
}

type NarratorFrequency = 'always' | 'key_moments' | 'off';

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
  
  // Challenge acceptance state
  const [userCharacters, setUserCharacters] = useState<CharacterData[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [isAcceptingChallenge, setIsAcceptingChallenge] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Move validation state
  const [pendingMove, setPendingMove] = useState<string | null>(null);
  const [moveValidation, setMoveValidation] = useState<MoveValidationResult | null>(null);
  const [showMatchupWarning, setShowMatchupWarning] = useState(true);
  
  // Dice roll and concentration state
  const [pendingHit, setPendingHit] = useState<HitDetermination | null>(null);
  const [concentrationUses, setConcentrationUses] = useState<Record<string, number>>({});
  const [statPenalties, setStatPenalties] = useState<Record<string, number>>({});
  const [diceRollMessages, setDiceRollMessages] = useState<Array<{
    id: string;
    hitDetermination: HitDetermination;
    concentrationResult?: ConcentrationResult;
    attackerName: string;
    defenderName: string;
    timestamp: Date;
    isPlayerRoll?: boolean;
  }>>([]);
  
  // Distance tracking state
  const [battleDistance, setBattleDistance] = useState<DistanceState>({
    currentZone: 'mid',
    estimatedMeters: 10,
    lastMovement: 'none',
  });
  
  // Entrance state
  const [entrancesGenerated, setEntrancesGenerated] = useState(false);
  const [isGeneratingEntrances, setIsGeneratingEntrances] = useState(false);
  
  // Area damage warning state
  const [areaDamageWarning, setAreaDamageWarning] = useState<AreaDamageWarning | null>(null);
  
  // Defense validation tracking
  const [lastOpponentAction, setLastOpponentAction] = useState<string>('');
  const [lastHitResult, setLastHitResult] = useState<{ hit: boolean; gap: number } | null>(null);
  
  // Construct mechanics
  const [constructs, setConstructs] = useState<Record<string, Construct>>({});
  
  // Skill tracking
  const [turnNumber, setTurnNumber] = useState(1);
  
  // Typing indicator state
  const [opponentTyping, setOpponentTyping] = useState(false);
  const [lastTypingUpdate, setLastTypingUpdate] = useState<number>(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Read receipts state - track who has read what
  const [opponentLastReadMessageId, setOpponentLastReadMessageId] = useState<string | null>(null);
  
  // Track if we're using snapshot data (battle is active)
  const [usingSnapshot, setUsingSnapshot] = useState(false);
  
  // Battle turn color preference
  const { color: userTurnColor, updateColor: updateTurnColor } = useBattleTurnColor();
  
  // Battlefield visual effects (fire, ice, smoke, etc.)
  const { activeEffects: battlefieldEffects, processMessage: processBattlefieldEffect } = useBattlefieldEffects();
  
  // Character-specific status effects (paralyzed, blinded, etc.)
  const { 
    activeEffects: characterStatusEffects, 
    processMessage: processStatusEffect 
  } = useCharacterStatusEffects({
    characterName: userCharacter?.character?.name,
    enabled: battle?.status === 'active',
  });
  
  // Battle narrator state
  const [narratorFrequency, setNarratorFrequency] = useState<NarratorFrequency>('key_moments');
  const [narratorMessages, setNarratorMessages] = useState<Array<{ id: string; content: string; timestamp: Date }>>([]);
  const [isNarratorLoading, setIsNarratorLoading] = useState(false);

  // Generate environment and entrances when battle becomes active with a location
  useEffect(() => {
    if (battle?.chosen_location && battle?.dynamic_environment) {
      const env = generateBattleEnvironment(battle.chosen_location, null, null);
      setBattleEnvironment(env);
    }
  }, [battle?.chosen_location, battle?.dynamic_environment]);
  
  // Generate character entrances when battle becomes active
  useEffect(() => {
    const generateEntrances = async () => {
      if (
        battle?.status === 'active' && 
        battle?.chosen_location && 
        participants.length === 2 && 
        !entrancesGenerated && 
        !isGeneratingEntrances &&
        userCharacter
      ) {
        // Check if entrances were already sent (look for entrance markers in messages)
        const hasEntrances = messages.some(m => m.content.includes('⚔️ **') && m.content.includes('enters the arena'));
        if (hasEntrances) {
          setEntrancesGenerated(true);
          return;
        }
        
        setIsGeneratingEntrances(true);
        
        try {
          const char1 = participants[0]?.character;
          const char2 = participants[1]?.character;
          
          if (!char1 || !char2) return;
          
          const response = await supabase.functions.invoke('battle-narrator', {
            body: {
              type: 'entrance',
              character1: {
                name: char1.name,
                level: char1.level,
                powers: char1.powers,
                abilities: char1.abilities,
              },
              character2: {
                name: char2.name,
                level: char2.level,
                powers: char2.powers,
                abilities: char2.abilities,
              },
              battleLocation: battle.chosen_location,
            },
          });
          
          if (response.data) {
            const { entrance1, entrance2 } = response.data;
            
            // Only insert if no entrance messages exist yet
            const existingEntrances = messages.filter(m => 
              m.content.includes('enters the arena') || 
              m.content.includes('⚔️ **')
            );
            
            if (existingEntrances.length === 0) {
              // Send entrance messages to in-universe chat
              await supabase.from('battle_messages').insert([
                {
                  battle_id: id,
                  character_id: participants[0].character_id,
                  content: `⚔️ **${char1.name} enters the arena:**\n${entrance1}`,
                  channel: 'in_universe',
                },
                {
                  battle_id: id,
                  character_id: participants[1].character_id,
                  content: `⚔️ **${char2.name} enters the arena:**\n${entrance2}`,
                  channel: 'in_universe',
                },
              ]);
            }
          }
        } catch (error) {
          console.error('Failed to generate entrances:', error);
        } finally {
          setEntrancesGenerated(true);
          setIsGeneratingEntrances(false);
        }
      }
    };
    
    generateEntrances();
  }, [battle?.status, battle?.chosen_location, participants, entrancesGenerated, isGeneratingEntrances, messages, userCharacter, id]);

  useEffect(() => {
    if (id && user) {
      fetchBattleData();
      setupRealtime();
    }

    return () => {
      supabase.channel(`battle-${id}`).unsubscribe();
      supabase.channel(`battle-typing-${id}`).unsubscribe();
      // Clear typing on unmount
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    };
  }, [id, user]);
  
  // Update read receipts when viewing messages
  useEffect(() => {
    const updateReadReceipt = async () => {
      if (!userCharacter || !messages.length || battle?.status !== 'active') return;
      
      // Get the last message
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage) return;
      
      // Only update if it's from the opponent
      const opponent = participants.find(p => p.character_id !== userCharacter.character_id);
      if (!opponent || lastMessage.character_id !== opponent.character_id) return;
      
      // Update our read receipt
      await supabase
        .from('battle_participants')
        .update({
          last_read_message_id: lastMessage.id,
          last_read_at: new Date().toISOString(),
        })
        .eq('id', userCharacter.id);
    };
    
    updateReadReceipt();
  }, [messages, userCharacter, battle?.status, participants]);

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

    // Fetch participants with character info including typing, read receipts, and snapshots
    const { data: participantsData } = await supabase
      .from('battle_participants')
      .select('id, character_id, turn_order, is_typing, last_typed_at, last_read_message_id, last_read_at, character_snapshot')
      .eq('battle_id', id)
      .order('turn_order');

    if (participantsData) {
      // Fetch character details with powers, abilities, and stats for validation and dice rolls
      const charIds = participantsData.map(p => p.character_id);
      const { data: charsData } = await supabase
        .from('characters')
        .select('id, name, level, user_id, powers, abilities, stat_intelligence, stat_battle_iq, stat_strength, stat_power, stat_speed, stat_durability, stat_stamina, stat_skill, stat_luck')
        .in('id', charIds);

      const participantsWithChars = participantsData.map(p => {
        const liveCharacter = charsData?.find(c => c.id === p.character_id);
        // Use snapshot data if battle is active and snapshot exists, otherwise use live data
        const snapshot = p.character_snapshot as unknown as CharacterSnapshot | null;
        const shouldUseSnapshot = battleData.status === 'active' && snapshot;
        
        return {
          ...p,
          character: shouldUseSnapshot ? snapshot : liveCharacter,
          is_typing: p.is_typing || false,
          last_typed_at: p.last_typed_at,
          last_read_message_id: p.last_read_message_id,
          last_read_at: p.last_read_at,
          character_snapshot: snapshot,
        };
      });

      setParticipants(participantsWithChars);
      setUsingSnapshot(battleData.status === 'active' && participantsWithChars.some(p => p.character_snapshot));

      // Find user's character in this battle
      const userChar = participantsWithChars.find(
        p => p.character?.user_id === user?.id
      );
      setUserCharacter(userChar || null);
      
      // Track opponent's last read message
      const opponent = participantsWithChars.find(p => p.character?.user_id !== user?.id);
      if (opponent) {
        setOpponentLastReadMessageId(opponent.last_read_message_id || null);
        setOpponentTyping(opponent.is_typing || false);
      }
      
      // Initialize concentration uses from battle data or default to 3
      const battleConcentration = (battleData as any).concentration_uses as Record<string, number> | null;
      if (battleConcentration) {
        setConcentrationUses(battleConcentration);
      } else {
        // Initialize with 3 uses per character
        const initialUses: Record<string, number> = {};
        charIds.forEach(id => { initialUses[id] = 3; });
        setConcentrationUses(initialUses);
      }
    }

    // If user is the challenged user but not a participant yet, fetch their characters
    if (battleData.challenged_user_id === user?.id) {
      const userIsParticipant = participantsData?.some(p => {
        const charIds = participantsData.map(pd => pd.character_id);
        // We need to check if any of these chars belong to the user
        return false; // Will check after chars fetch
      });
      
      // Fetch user's available characters for selection
      const { data: myChars } = await supabase
        .from('characters')
        .select('id, name, level, user_id, powers, abilities, stat_intelligence, stat_battle_iq, stat_strength, stat_power, stat_speed, stat_durability, stat_stamina, stat_skill, stat_luck')
        .eq('user_id', user.id);
      
      if (myChars) {
        setUserCharacters(myChars);
      }
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
    // Main battle channel for messages and battle updates
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
          
          // Check if message already exists to prevent duplicates
          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) {
              return prev; // Message already exists, skip
            }
            
            // Fetch character name asynchronously and update
            supabase
              .from('characters')
              .select('name, user_id')
              .eq('id', newMessage.character_id)
              .maybeSingle()
              .then(({ data: charData }) => {
                const messageWithName = {
                  ...newMessage,
                  channel: newMessage.channel as 'in_universe' | 'out_of_universe',
                  character_name: charData?.name || 'Unknown',
                };
                
                // Update the message with character name
                setMessages(current => 
                  current.map(m => m.id === newMessage.id ? messageWithName : m)
                );
                
                // Process battlefield effects from in-universe messages
                if (newMessage.channel === 'in_universe') {
                  processBattlefieldEffect(newMessage.content);
                  
                  // Process character status effects from opponent's messages
                  if (charData?.user_id !== user?.id) {
                    processStatusEffect(newMessage.content, true);
                    
                    // Track opponent's last action for defense validation
                    setLastOpponentAction(newMessage.content);
                    setTurnNumber(prev => prev + 1);
                    
                    // Call battle narrator for atmospheric commentary
                    callBattleNarrator(newMessage.content, charData?.name || 'Opponent');
                  }
                }

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
                  
                  // Clear opponent typing indicator when they send a message
                  setOpponentTyping(false);
                }
              });
            
            // Immediately add message with placeholder name
            return [...prev, {
              ...newMessage,
              channel: newMessage.channel as 'in_universe' | 'out_of_universe',
              character_name: 'Loading...',
            }];
          });
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
          setBattle(prev => {
            if (updatedBattle.status === 'active' && prev?.status === 'pending') {
              toast.success('⚔️ Battle has begun!', {
                description: 'Your opponent is ready. Make your move!',
              });
            }
            
            if (updatedBattle.status === 'completed') {
              toast.info('🏁 Battle completed!', {
                description: 'The battle has ended.',
              });
            }
            return updatedBattle;
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Battle realtime channel connected');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Battle realtime channel error');
        }
      });
      
    // Separate channel for typing indicators and read receipts
    const typingChannel = supabase
      .channel(`battle-typing-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'battle_participants',
          filter: `battle_id=eq.${id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          
          // Use userCharacter from state to check if this is opponent
          setParticipants(currentParticipants => {
            const isOpponent = currentParticipants.some(p => 
              p.id === updated.id && 
              p.character?.user_id !== user?.id
            );
            
            if (isOpponent) {
              // Update typing status
              setOpponentTyping(updated.is_typing || false);
              
              // Update read receipt
              if (updated.last_read_message_id) {
                setOpponentLastReadMessageId(updated.last_read_message_id);
              }
            }
            
            return currentParticipants;
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Typing indicator channel connected');
        }
      });
  };
  
  // Update typing status in database
  const updateTypingStatus = async (isTyping: boolean) => {
    if (!userCharacter || battle?.status !== 'active') return;
    
    await supabase
      .from('battle_participants')
      .update({
        is_typing: isTyping,
        last_typed_at: isTyping ? new Date().toISOString() : null,
      })
      .eq('id', userCharacter.id);
  };
  
  // Handle input change with typing indicator
  const handleInputChange = (value: string, channel: 'in_universe' | 'out_of_universe') => {
    setActiveChannel(channel);
    setMessageInput(value);
    
    // Debounce typing status updates
    const now = Date.now();
    if (now - lastTypingUpdate > 1000) {
      setLastTypingUpdate(now);
      updateTypingStatus(true);
    }
    
    // Clear previous timeout
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }
    
    // Set typing to false after 3 seconds of no typing
    typingDebounceRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 3000);
  };

  // Validate and send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !userCharacter) return;

    // Only validate in-universe moves
    if (activeChannel === 'in_universe' && userCharacter.character) {
      const characterAbilities: CharacterAbilities = {
        powers: userCharacter.character.powers || null,
        abilities: userCharacter.character.abilities || null,
        name: userCharacter.character.name,
      };
      
      const validation = validateMove(messageInput, characterAbilities);
      
      if (!validation.isValid) {
        // Store the pending move and show warning
        setPendingMove(messageInput);
        setMoveValidation(validation);
        setMessageInput('');
        return;
      }
      
      // Check distance validity for melee attacks
      const distanceCheck = isAttackValidForDistance(messageInput, battleDistance.currentZone);
      if (!distanceCheck.valid && distanceCheck.warning) {
        toast.warning(distanceCheck.warning, { duration: 5000 });
        // Still allow sending - it's a warning, not a block
      }
      
      // Check for area damage (for flavor/coolness)
      const areaCheck = detectAreaDamage(messageInput);
      if (areaCheck.isSevere) {
        setAreaDamageWarning(areaCheck);
        // Clear warning after 4 seconds (just flavor, doesn't block)
        setTimeout(() => setAreaDamageWarning(null), 4000);
      }
    }

    // Send the message
    await sendMessage(messageInput);
  };

  const sendMessage = async (content: string, skipDiceRoll: boolean = false) => {
    if (!content.trim() || !userCharacter) return;
    
    // Clear typing status before sending
    updateTypingStatus(false);
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }

    // Defense validation - check if player addressed opponent's last attack
    if (activeChannel === 'in_universe' && lastOpponentAction && lastHitResult && turnNumber > 1) {
      const validation = validateDefense(content, lastOpponentAction, lastHitResult.hit);
      
      if (validation.shouldEnforceHit && validation.hasAttackToAddress) {
        // Player ignored an attack that should have hit them - notify in OOC
        const damageLevel = getDamageLevel(lastHitResult.gap);
        await supabase.from('battle_messages').insert({
          battle_id: id,
          character_id: userCharacter.character_id,
          content: `⚠️ **Defense Check**: Your action didn't address the incoming attack. The ${damageLevel} hit will affect your move.`,
          channel: 'out_of_universe',
        });
      }
    }

    // Check if user is creating a construct
    if (activeChannel === 'in_universe' && userCharacter.character) {
      const constructCreation = detectConstructCreation(content);
      if (constructCreation.isCreating) {
        handleConstructCreation(constructCreation.suggestedName, constructCreation.constructType);
      }
    }

    const { error } = await supabase.from('battle_messages').insert({
      battle_id: id,
      character_id: userCharacter.character_id,
      content: content.trim(),
      channel: activeChannel,
    });

    if (error) {
      toast.error('Failed to send message');
      return;
    }

    // Generate dice roll for in-universe attack moves
    if (activeChannel === 'in_universe' && !skipDiceRoll) {
      generateDiceRoll(content);
      
      // Detect new techniques and add to character sheet
      detectAndCatalogNewTechnique(content);
      
      // Increment turn number
      setTurnNumber(prev => prev + 1);
    }

    setMessageInput('');
    setPendingMove(null);
    setMoveValidation(null);
  };
  
  // Handle construct creation
  const handleConstructCreation = (name: string, type: Construct['type']) => {
    if (!userCharacter?.character) return;
    
    const char = userCharacter.character;
    const creatorStats: CharacterStats = {
      stat_intelligence: char.stat_intelligence ?? 50,
      stat_battle_iq: char.stat_battle_iq ?? 50,
      stat_strength: char.stat_strength ?? 50,
      stat_power: char.stat_power ?? 50,
      stat_speed: char.stat_speed ?? 50,
      stat_durability: char.stat_durability ?? 50,
      stat_stamina: char.stat_stamina ?? 50,
      stat_skill: char.stat_skill ?? 50,
      stat_luck: char.stat_luck ?? 50,
    };
    
    const newConstruct = createConstruct(creatorStats, userCharacter.character_id, name, type);
    
    setConstructs(prev => ({ ...prev, [newConstruct.id]: newConstruct }));
    
    toast.success(`🛡️ ${name} created!`, {
      description: `Durability: ${newConstruct.maxDurability}`,
    });
    
    supabase.from('battle_messages').insert({
      battle_id: id,
      character_id: userCharacter.character_id,
      content: `🛡️ **Construct Created**: ${name} (${type}) — Durability: ${newConstruct.currentDurability}/${newConstruct.maxDurability}`,
      channel: 'out_of_universe',
    });
  };
  
  // Handle construct being attacked - simplified version for PvP (opponent handles manually)
  const handleConstructAttacked = (constructId: string, damage: number) => {
    const construct = constructs[constructId];
    if (!construct) return null;
    
    const newDurability = Math.max(0, construct.currentDurability - damage);
    const destroyed = newDurability <= 0;
    
    // Update construct state
    if (destroyed) {
      setConstructs(prev => {
        const updated = { ...prev };
        delete updated[constructId];
        return updated;
      });
      toast.error(`💥 ${construct.name} destroyed!`);
    } else {
      setConstructs(prev => ({
        ...prev,
        [constructId]: { ...construct, currentDurability: newDurability },
      }));
    }
    
    return { destroyed, remainingDurability: newDurability };
  };
  
  // Detect if the action contains a new technique and add it to character sheet
  const detectAndCatalogNewTechnique = async (action: string) => {
    if (!userCharacter?.character || !battle) return;
    
    try {
      const response = await supabase.functions.invoke('detect-new-technique', {
        body: {
          action,
          character: {
            id: userCharacter.character.id,
            name: userCharacter.character.name,
            powers: userCharacter.character.powers,
            abilities: userCharacter.character.abilities,
            personality: (userCharacter.character as any).personality,
            mentality: (userCharacter.character as any).mentality,
          },
          battleId: battle.id,
          battleLocation: battle.chosen_location,
        },
      });
      
      if (response.data?.isNewTechnique && response.data?.techniqueName) {
        const { techniqueName, techniqueDescription, battleContext } = response.data;
        
        // Build the new technique entry with battle context
        const techniqueEntry = `\n\n**${techniqueName}** _(Discovered ${battleContext.date} during battle at ${battleContext.location})_\n${techniqueDescription}`;
        
        // Append to existing abilities
        const currentAbilities = userCharacter.character.abilities || '';
        const updatedAbilities = currentAbilities + techniqueEntry;
        
        // Update character in database
        const { error: updateError } = await supabase
          .from('characters')
          .update({ abilities: updatedAbilities })
          .eq('id', userCharacter.character.id);
        
        if (!updateError) {
          // Update local state
          setParticipants(prev => prev.map(p => 
            p.character_id === userCharacter.character_id 
              ? { ...p, character: { ...p.character!, abilities: updatedAbilities } }
              : p
          ));
          
          // Notify the user
          toast.success(`📜 New Technique Catalogued!`, {
            description: `"${techniqueName}" has been added to ${userCharacter.character.name}'s abilities.`,
            duration: 5000,
          });
          
          // Also post a system message in OOC
          await supabase.from('battle_messages').insert({
            battle_id: id,
            character_id: userCharacter.character_id,
            content: `📜 **New Technique Discovered!**\n${userCharacter.character.name} has developed a new technique: **${techniqueName}**\n_${techniqueDescription}_`,
            channel: 'out_of_universe',
          });
        }
      }
    } catch (error) {
      console.error('Failed to detect new technique:', error);
      // Silently fail - this is a background feature
    }
  };

  // Generate dice roll for an attack
  const generateDiceRoll = (moveText: string) => {
    if (!userCharacter?.character) return;
    
    const opponent = participants.find(p => p.character_id !== userCharacter.character_id);
    if (!opponent?.character) return;

    // Detect and apply movement from the action
    const movementDetection = detectMovementInAction(moveText);
    if (movementDetection.movement !== 'none') {
      const newDistance = updateDistance(battleDistance, movementDetection.suggestedZoneChange);
      setBattleDistance(newDistance);
      
      // Notify about distance change in OOC
      const directionText = movementDetection.movement === 'closer' ? 'closed distance' : 'created distance';
      const travelTime = calculateTravelTime(
        userCharacter.character.stat_speed ?? 50,
        userCharacter.character.level,
        battleDistance.currentZone,
        newDistance.currentZone
      );
      
      supabase.from('battle_messages').insert({
        battle_id: id,
        character_id: userCharacter.character_id,
        content: `📍 **Distance Update**: ${userCharacter.character.name} ${directionText}. Now at **${newDistance.currentZone}** range (~${newDistance.estimatedMeters.toFixed(0)}m apart). ${!travelTime.isInstant ? `Travel time: ${travelTime.description}` : ''}`,
        channel: 'out_of_universe',
      });
    }

    // Check if this looks like an attack (simple heuristic)
    const attackKeywords = ['attack', 'strike', 'hit', 'punch', 'kick', 'slash', 'blast', 'fire', 'throw', 'launch', 'charge', 'swing', 'aim', 'shoot'];
    const isAttack = attackKeywords.some(kw => moveText.toLowerCase().includes(kw));
    if (!isAttack) return;

    const attackerChar = userCharacter.character;
    const defenderChar = opponent.character;

    // Build stats objects with defaults
    const attackerStats: CharacterStats = {
      stat_intelligence: attackerChar.stat_intelligence ?? 50,
      stat_battle_iq: attackerChar.stat_battle_iq ?? 50,
      stat_strength: attackerChar.stat_strength ?? 50,
      stat_power: attackerChar.stat_power ?? 50,
      stat_speed: attackerChar.stat_speed ?? 50,
      stat_durability: attackerChar.stat_durability ?? 50,
      stat_stamina: attackerChar.stat_stamina ?? 50,
      stat_skill: attackerChar.stat_skill ?? 50,
      stat_luck: attackerChar.stat_luck ?? 50,
    };

    const defenderStats: CharacterStats = {
      stat_intelligence: defenderChar.stat_intelligence ?? 50,
      stat_battle_iq: defenderChar.stat_battle_iq ?? 50,
      stat_strength: defenderChar.stat_strength ?? 50,
      stat_power: defenderChar.stat_power ?? 50,
      stat_speed: defenderChar.stat_speed ?? 50,
      stat_durability: defenderChar.stat_durability ?? 50,
      stat_stamina: defenderChar.stat_stamina ?? 50,
      stat_skill: defenderChar.stat_skill ?? 50,
      stat_luck: defenderChar.stat_luck ?? 50,
    };

    const defenderPenalty = statPenalties[defenderChar.id] ?? 0;
    const mental = isMentalAttack(moveText);
    
    const hit = mental
      ? determineMentalHit(attackerStats, attackerChar.level, defenderStats, defenderChar.level, true, defenderPenalty)
      : determineHit(attackerStats, attackerChar.level, defenderStats, defenderChar.level, true, defenderPenalty);

    // Add dice roll message to local display
    const rollMessage = {
      id: `roll-${Date.now()}`,
      hitDetermination: hit,
      attackerName: attackerChar.name,
      defenderName: defenderChar.name,
      timestamp: new Date(),
      isPlayerRoll: true,
    };
    
    setDiceRollMessages(prev => [...prev, rollMessage]);
    
    // Track this hit result for opponent's defense validation
    setLastHitResult({ hit: hit.wouldHit, gap: hit.gap });

    // If the attack would hit and the defender is the current user's opponent, 
    // we show the concentration button to the opponent (handled through realtime)
    if (hit.wouldHit) {
      // Send system message about the hit
      supabase.from('battle_messages').insert({
        battle_id: id,
        character_id: userCharacter.character_id,
        content: `🎲 **Dice Roll**: Attack ${hit.attackRoll.total} vs Defense ${hit.defenseRoll.total} — 💥 HIT! (from ${battleDistance.currentZone} range)`,
        channel: 'out_of_universe',
      });
    } else {
      // Attack misses
      supabase.from('battle_messages').insert({
        battle_id: id,
        character_id: userCharacter.character_id,
        content: `🎲 **Dice Roll**: Attack ${hit.attackRoll.total} vs Defense ${hit.defenseRoll.total} — ❌ MISS (Gap: ${hit.gap})`,
        channel: 'out_of_universe',
      });
    }
  };

  // Call battle narrator for atmospheric commentary
  const callBattleNarrator = async (opponentAction: string, opponentName: string) => {
    if (narratorFrequency === 'off' || !battle?.chosen_location || !userCharacter?.character) return;
    
    setIsNarratorLoading(true);
    
    try {
      const response = await supabase.functions.invoke('battle-narrator', {
        body: {
          type: 'narration',
          userCharacter: {
            name: opponentName, // From narrator's perspective, opponent made the move
            level: participants.find(p => p.character?.name === opponentName)?.character?.level || 1,
            speed: participants.find(p => p.character?.name === opponentName)?.character?.stat_speed,
          },
          opponent: {
            name: userCharacter.character.name,
            level: userCharacter.character.level,
            speed: userCharacter.character.stat_speed,
          },
          userAction: opponentAction,
          opponentResponse: '', // User hasn't responded yet
          battleLocation: battle.chosen_location,
          turnNumber,
          frequency: narratorFrequency,
          detectEnvironmentalEffects: true,
          currentDistance: {
            zone: battleDistance.currentZone,
            meters: battleDistance.estimatedMeters,
          },
        },
      });
      
      if (response.data?.narration) {
        const narratorMsg = {
          id: `narrator-${Date.now()}`,
          content: response.data.narration,
          timestamp: new Date(),
        };
        setNarratorMessages(prev => [...prev, narratorMsg]);
        
        // Also post to OOC chat for persistence
        await supabase.from('battle_messages').insert({
          battle_id: id,
          character_id: userCharacter.character_id,
          content: `📖 *${response.data.narration}*`,
          channel: 'out_of_universe',
        });
      }
    } catch (error) {
      console.error('Narrator error:', error);
    } finally {
      setIsNarratorLoading(false);
    }
  };

  // Handle concentration use
  const handleUseConcentration = async (result: ConcentrationResult) => {
    if (!userCharacter?.character || !pendingHit) return;
    
    const charId = userCharacter.character_id;
    
    // Update concentration uses
    const newUses = Math.max(0, (concentrationUses[charId] ?? 3) - 1);
    setConcentrationUses(prev => ({ ...prev, [charId]: newUses }));
    
    // Update in database
    await supabase.from('battles').update({
      concentration_uses: { ...concentrationUses, [charId]: newUses }
    }).eq('id', id);
    
    // Apply stat penalty if dodge succeeded
    if (result.dodgeSuccess && result.statPenalty > 0) {
      setStatPenalties(prev => ({ ...prev, [charId]: result.statPenalty }));
    }
    
    // Update the dice roll display with concentration result
    setDiceRollMessages(prev => {
      const updated = [...prev];
      const lastRoll = updated[updated.length - 1];
      if (lastRoll) {
        lastRoll.concentrationResult = result;
      }
      return updated;
    });
    
    // Send OOC message about concentration result
    await supabase.from('battle_messages').insert({
      battle_id: id,
      character_id: userCharacter.character_id,
      content: `🎯 **Concentration Used**: +${result.bonusRoll} bonus — ${result.dodgeSuccess ? '✅ Dodge Successful!' : '❌ Dodge Failed!'}${result.dodgeSuccess && result.statPenalty > 0 ? ` (-${result.statPenalty}% stats next action)` : ''}`,
      channel: 'out_of_universe',
    });
    
    setPendingHit(null);
  };

  const handleSkipConcentration = () => {
    setPendingHit(null);
  };

  // Handle move explanation
  const handleMoveExplanation = async (explanation: string) => {
    if (!pendingMove || !userCharacter) return;
    
    // Send the original move with the explanation in OOC
    await sendMessage(pendingMove);
    
    // Also send the explanation to out-of-universe chat
    const { error } = await supabase.from('battle_messages').insert({
      battle_id: id,
      character_id: userCharacter.character_id,
      content: `📋 **Move Explanation:** ${explanation}`,
      channel: 'out_of_universe',
    });

    if (error) {
      console.error('Failed to send explanation:', error);
    }

    setPendingMove(null);
    setMoveValidation(null);
    toast.success('Move submitted with explanation');
  };

  // Handle move redo
  const handleMoveRedo = () => {
    setMessageInput(pendingMove || '');
    setPendingMove(null);
    setMoveValidation(null);
  };

  // Handle accepting move without explanation (for edge cases)
  const handleAcceptMove = async () => {
    if (!pendingMove) return;
    await sendMessage(pendingMove);
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

  // Accept a challenge by selecting a character and joining the battle
  const handleAcceptChallenge = async () => {
    if (!battle || !selectedCharacterId || !user) return;
    
    setIsAcceptingChallenge(true);
    
    try {
      // Add user as participant with turn_order 2
      const { error: participantError } = await supabase
        .from('battle_participants')
        .insert({
          battle_id: battle.id,
          character_id: selectedCharacterId,
          turn_order: 2,
        });

      if (participantError) {
        toast.error('Failed to join battle: ' + participantError.message);
        return;
      }

      toast.success('Challenge accepted! Enter your battle location.');
      
      // Refetch battle data to get updated participants
      await fetchBattleData();
    } catch (error: any) {
      toast.error('Failed to accept challenge: ' + error.message);
    } finally {
      setIsAcceptingChallenge(false);
    }
  };

  // Decline or cancel a challenge
  const handleDeclineChallenge = async () => {
    if (!battle) return;
    
    setIsCancelling(true);
    
    try {
      // Delete all participants first
      await supabase
        .from('battle_participants')
        .delete()
        .eq('battle_id', battle.id);

      // Delete the battle
      const { error } = await supabase
        .from('battles')
        .delete()
        .eq('id', battle.id);

      if (error) {
        toast.error('Failed to cancel challenge');
        return;
      }

      toast.success('Challenge declined');
      navigate('/battles');
    } catch (error: any) {
      toast.error('Failed to decline challenge');
    } finally {
      setIsCancelling(false);
    }
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
    
    // Create character snapshots for both participants BEFORE starting the battle
    // This locks in the character stats/abilities at battle start
    for (const participant of participants) {
      if (participant.character) {
        const snapshot: CharacterSnapshot = {
          id: participant.character.id,
          name: participant.character.name,
          level: participant.character.level,
          user_id: participant.character.user_id,
          powers: participant.character.powers,
          abilities: participant.character.abilities,
          stat_intelligence: participant.character.stat_intelligence,
          stat_battle_iq: participant.character.stat_battle_iq,
          stat_strength: participant.character.stat_strength,
          stat_power: participant.character.stat_power,
          stat_speed: participant.character.stat_speed,
          stat_durability: participant.character.stat_durability,
          stat_stamina: participant.character.stat_stamina,
          stat_skill: participant.character.stat_skill,
          stat_luck: participant.character.stat_luck,
        };
        
        await supabase
          .from('battle_participants')
          .update({ character_snapshot: JSON.parse(JSON.stringify(snapshot)) })
          .eq('id', participant.id);
      }
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
    
    // Mark that we're now using snapshots
    setUsingSnapshot(true);
    
    const winnerName = participants[winnerIndex]?.character?.name || 'Unknown';
    toast.success(`🪙 ${winnerName}'s location was chosen: ${chosenLocation}!`);
    if (dynamicEnvironmentEnabled) {
      toast.info('⚛️ Dynamic battlefield effects are active!');
    }
    toast.info('🔒 Character stats locked for this battle', {
      description: 'Any changes to character stats or abilities won\'t affect this match.',
      duration: 5000,
    });
    setIsFlippingCoin(false);
  };

  const inUniverseMessages = messages.filter(m => m.channel === 'in_universe');
  const outOfUniverseMessages = messages.filter(m => m.channel === 'out_of_universe');
  
  // Determine whose turn it is based on last message sender
  const lastInUniverseMessage = inUniverseMessages[inUniverseMessages.length - 1];
  const isUserTurn = !lastInUniverseMessage || lastInUniverseMessage.character_id !== userCharacter?.character_id;

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
          {usingSnapshot && battle.status === 'active' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="flex items-center gap-1 text-amber-500 border-amber-500/30">
                    <Lock className="w-3 h-3" />
                    Stats Locked
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Character stats are locked for this battle.</p>
                  <p className="text-xs text-muted-foreground">Changes made during the match won't affect this battle.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {battle.status === 'active' && (
            <BattleTurnColorPicker
              color={userTurnColor}
              onChange={updateTurnColor}
            />
          )}
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

      {/* Turn Indicator - Shows whose turn it is */}
      {battle.status === 'active' && userCharacter?.character && participants.length >= 2 && (
        <TurnIndicator
          isUserTurn={isUserTurn}
          userName={userCharacter.character.name}
          opponentName={participants.find(p => p.character?.user_id !== user?.id)?.character?.name || 'Opponent'}
          userColor={userTurnColor}
          opponentColor="#EF4444"
        />
      )}

      {/* Narrator Settings - Toggle narrator frequency */}
      {battle.status === 'active' && (
        <Card className="bg-card-gradient border-border">
          <CardContent className="p-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Battle Narrator</span>
                {isNarratorLoading && (
                  <Badge variant="outline" className="text-xs animate-pulse">
                    <Pencil className="w-3 h-3 mr-1" />
                    Narrating...
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={narratorFrequency}
                  onValueChange={(v) => setNarratorFrequency(v as NarratorFrequency)}
                >
                  <SelectTrigger className="w-[160px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">
                      <span className="flex items-center gap-2">
                        <Volume2 className="w-3 h-3" />
                        Always
                      </span>
                    </SelectItem>
                    <SelectItem value="key_moments">
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-3 h-3" />
                        Key Moments
                      </span>
                    </SelectItem>
                    <SelectItem value="off">
                      <span className="flex items-center gap-2">
                        <VolumeX className="w-3 h-3" />
                        Off
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Challenge Acceptance for Challenged User (not yet a participant) */}
      {battle.status === 'pending' && !userCharacter && battle.challenged_user_id === user?.id && (
        <Card className="bg-card-gradient border-primary/30">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Swords className="w-4 h-4 text-primary" />
              You've Been Challenged!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm mb-4">
                <span className="font-medium">{participants[0]?.character?.name || 'An opponent'}</span> has challenged you to battle!
                Select a character to accept the challenge.
              </p>
              
              <div className="space-y-3">
                <Label>Choose Your Fighter</Label>
                <Select value={selectedCharacterId} onValueChange={setSelectedCharacterId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a character..." />
                  </SelectTrigger>
                  <SelectContent>
                    {userCharacters.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No characters available
                      </SelectItem>
                    ) : (
                      userCharacters.map((char) => (
                        <SelectItem key={char.id} value={char.id}>
                          <span className="flex items-center gap-2">
                            <Sparkles className="w-3 h-3" />
                            {char.name} (Tier {char.level})
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={handleAcceptChallenge}
                disabled={!selectedCharacterId || isAcceptingChallenge}
                className="flex-1 glow-primary"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {isAcceptingChallenge ? 'Accepting...' : 'Accept Challenge'}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isCancelling}>
                    <X className="w-4 h-4 mr-2" />
                    Decline
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Decline Challenge?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to decline this challenge? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeclineChallenge}>
                      Decline Challenge
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Setup for Pending Battle (when user is already a participant) */}
      {battle.status === 'pending' && userCharacter && (
        <Card className="bg-card-gradient border-border">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Battle Location Setup
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={isCancelling}>
                    <X className="w-4 h-4 mr-1" />
                    {userCharacter.turn_order === 1 ? 'Cancel' : 'Decline'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {userCharacter.turn_order === 1 ? 'Cancel Challenge?' : 'Decline Challenge?'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {userCharacter.turn_order === 1 
                        ? 'Are you sure you want to cancel this challenge? This action cannot be undone.'
                        : 'Are you sure you want to decline this challenge? This action cannot be undone.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Challenge</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeclineChallenge}>
                      {userCharacter.turn_order === 1 ? 'Cancel Challenge' : 'Decline Challenge'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
            
            {/* Distance Indicator */}
            {battle.status === 'active' && (
              <div className="mt-4 p-3 bg-background/50 rounded-lg space-y-2 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MapPin className="w-4 h-4 text-primary" />
                    Combat Distance
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {battleDistance.currentZone.charAt(0).toUpperCase() + battleDistance.currentZone.slice(1)} Range
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-300"
                      style={{ 
                        width: `${['melee', 'close', 'mid', 'long', 'extreme'].indexOf(battleDistance.currentZone) / 4 * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    ~{battleDistance.estimatedMeters.toFixed(0)}m
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {battleDistance.currentZone === 'melee' && "Within arm's reach - punches, grabs, and close combat effective"}
                  {battleDistance.currentZone === 'close' && "A few steps apart - quick lunges and short-range attacks work"}
                  {battleDistance.currentZone === 'mid' && "Moderate distance - projectiles and charges needed to close"}
                  {battleDistance.currentZone === 'long' && "Far apart - ranged attacks or significant movement required"}
                  {battleDistance.currentZone === 'extreme' && "Very distant - only long-range powers or travel can bridge the gap"}
                </p>
                {battleDistance.lastMovement !== 'none' && (
                  <p className="text-xs text-primary/80">
                    ↔ Last movement: {battleDistance.lastMovement === 'closer' ? 'Closed distance' : 'Created distance'}
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
          
          {/* Skill Proficiency Bars */}
          {battle.status === 'active' && participants.length >= 2 && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {participants.map((p) => (
                <SkillProficiencyBar
                  key={p.id}
                  characterName={p.character?.name || 'Unknown'}
                  skillStat={p.character?.stat_skill ?? 50}
                  compact={true}
                />
              ))}
            </div>
          )}
          
          {/* Concentration & Penalty Status */}
          {battle.status === 'active' && userCharacter?.character && (
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10">
                  🎯 Concentration: {concentrationUses[userCharacter.character_id] ?? 3}/3
                </Badge>
              </div>
              {(statPenalties[userCharacter.character_id] ?? 0) > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  ⚠️ -{statPenalties[userCharacter.character_id]}% stats this action
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Constructs Panel */}
      {battle.status === 'active' && userCharacter && Object.keys(constructs).length > 0 && (
        <ConstructPanel
          constructs={Object.values(constructs)}
          characterId={userCharacter.character_id}
          concentrationUsesRemaining={concentrationUses[userCharacter.character_id] ?? 3}
          onRepairConstruct={(construct) => {
            // Simplified repair - just notify in OOC
            toast.info(`Request repair for ${construct.name} in OOC chat`);
          }}
        />
      )}

      {/* Matchup Warning for Uneven Battles */}
      {battle.status === 'active' && showMatchupWarning && participants.length >= 2 && (
        (() => {
          const player = participants.find(p => p.character?.user_id === user?.id);
          const opponent = participants.find(p => p.character?.user_id !== user?.id);
          if (player?.character && opponent?.character && Math.abs(player.character.level - opponent.character.level) >= 2) {
            return (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 z-10"
                  onClick={() => setShowMatchupWarning(false)}
                >
                  ×
                </Button>
                <MatchupWarning
                  playerTier={player.character.level}
                  opponentTier={opponent.character.level}
                  playerName={player.character.name}
                  opponentName={opponent.character.name}
                />
              </div>
            );
          }
          return null;
        })()
      )}

      {/* Move Validation Warning */}
      {moveValidation && !moveValidation.isValid && userCharacter?.character && (
        <MoveValidationWarning
          validation={moveValidation}
          characterName={userCharacter.character.name}
          onExplain={handleMoveExplanation}
          onRedo={handleMoveRedo}
          onAccept={handleAcceptMove}
        />
      )}

      {/* Concentration Button - appears when an attack would hit */}
      {pendingHit && pendingHit.wouldHit && userCharacter?.character && (
        <ConcentrationButton
          hitDetermination={pendingHit}
          defenderStats={{
            stat_intelligence: userCharacter.character.stat_intelligence ?? 50,
            stat_battle_iq: userCharacter.character.stat_battle_iq ?? 50,
            stat_strength: userCharacter.character.stat_strength ?? 50,
            stat_power: userCharacter.character.stat_power ?? 50,
            stat_speed: userCharacter.character.stat_speed ?? 50,
            stat_durability: userCharacter.character.stat_durability ?? 50,
            stat_stamina: userCharacter.character.stat_stamina ?? 50,
            stat_skill: userCharacter.character.stat_skill ?? 50,
            stat_luck: userCharacter.character.stat_luck ?? 50,
          }}
          usesRemaining={concentrationUses[userCharacter.character_id] ?? 3}
          onUseConcentration={handleUseConcentration}
          onSkip={handleSkipConcentration}
        />
      )}

      {/* Dice Roll Display - Shows recent rolls that aren't displayed inline */}
      {diceRollMessages.length > 0 && diceRollMessages.some(roll => {
        // Check if any recent roll isn't associated with a message
        const msgTimes = messages
          .filter(m => m.channel === 'in_universe')
          .map(m => new Date(m.created_at).getTime());
        return !msgTimes.some(msgTime => Math.abs(roll.timestamp.getTime() - msgTime) < 5000);
      }) && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Recent Combat Rolls</p>
          {diceRollMessages.slice(-3).map((roll) => (
            <DiceRollChatMessage
              key={roll.id}
              hitDetermination={roll.hitDetermination}
              concentrationResult={roll.concentrationResult}
              attackerName={roll.attackerName}
              defenderName={roll.defenderName}
              timestamp={roll.timestamp}
            />
          ))}
        </div>
      )}

      {/* Chat Area - Dynamic Tabbed Interface */}
      <Card className="bg-card-gradient border-border">
        <CardContent className="p-0">
          <Tabs value={activeChannel} onValueChange={(v) => setActiveChannel(v as 'in_universe' | 'out_of_universe')}>
            <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-border">
              <TabsTrigger value="in_universe" className="flex items-center gap-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <Sparkles className="w-4 h-4" />
                In-Universe (RP)
              </TabsTrigger>
              <TabsTrigger value="out_of_universe" className="flex items-center gap-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-muted-foreground">
                <MessageCircle className="w-4 h-4" />
                Out-of-Universe (OOC)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="in_universe" className="mt-0">
              <TurnIndicatorWrapper
                isUserTurn={isUserTurn}
                userColor={userTurnColor}
                opponentColor="#EF4444"
              >
                <div className="relative">
                  {/* Battlefield Effects Overlay */}
                  {battlefieldEffects.length > 0 && (
                    <BattlefieldEffectsOverlay effects={battlefieldEffects} className="rounded-b-lg" />
                  )}
                  
                  <ScrollArea className="h-[400px] p-4 relative z-10">
                    {inUniverseMessages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-muted-foreground">
                          <Swords className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">The arena awaits your first move...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {inUniverseMessages.map((msg, msgIndex) => {
                          const isFromUser = msg.character_id === userCharacter?.character_id;
                          const isFromOpponent = !isFromUser;
                          const isLastUserMessage = isFromUser && 
                            inUniverseMessages.filter(m => m.character_id === userCharacter?.character_id).pop()?.id === msg.id;
                          const wasRead = isLastUserMessage && opponentLastReadMessageId === msg.id;
                          
                          // Find dice roll associated with this message (by approximate timestamp)
                          const msgTime = new Date(msg.created_at).getTime();
                          const associatedRoll = diceRollMessages.find(roll => {
                            const rollTime = roll.timestamp.getTime();
                            // Match roll within 5 seconds of the message
                            return Math.abs(rollTime - msgTime) < 5000 && 
                              (isFromOpponent ? roll.isPlayerRoll !== true : roll.isPlayerRoll === true);
                          });
                          
                          // Detect status effects on opponent messages (they're affecting the user)
                          const messageStatusEffects = isFromOpponent 
                            ? detectCharacterStatusEffects(msg.content, userCharacter?.character?.name)
                            : [];
                          
                          return (
                            <div key={msg.id} className="space-y-2">
                              {/* Show dice roll above message if associated */}
                              {associatedRoll && (
                                <DiceRollChatMessage
                                  hitDetermination={associatedRoll.hitDetermination}
                                  concentrationResult={associatedRoll.concentrationResult}
                                  attackerName={associatedRoll.attackerName}
                                  defenderName={associatedRoll.defenderName}
                                  timestamp={associatedRoll.timestamp}
                                  isAIRoll={!isFromUser}
                                />
                              )}
                              
                              <div 
                                className={`relative p-3 rounded-lg overflow-hidden ${
                                  isFromUser
                                    ? 'bg-primary/20 border-l-4 border-primary ml-8'
                                    : 'bg-muted/50 border-l-4 border-accent mr-8'
                                }`}
                              >
                                {/* Status Effect Overlay on opponent's messages that describe effects happening TO user */}
                                {isFromOpponent && messageStatusEffects.length > 0 && (
                                  <CharacterStatusOverlay 
                                    effects={messageStatusEffects} 
                                    className="rounded-lg"
                                  />
                                )}
                                
                                {/* Show active character status effects on user's own messages */}
                                {isFromUser && characterStatusEffects.length > 0 && (
                                  <CharacterStatusOverlay 
                                    effects={characterStatusEffects} 
                                    className="rounded-lg"
                                  />
                                )}
                                
                                <div className="flex items-center gap-2 mb-1 relative z-10">
                                  <span className="font-semibold text-sm text-muted-foreground">
                                    {msg.character_name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(msg.created_at).toLocaleTimeString()}
                                  </span>
                                  {/* Read receipt for user's messages */}
                                  {isFromUser && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="ml-auto">
                                            {wasRead ? (
                                              <CheckCheck className="w-3 h-3 text-primary" />
                                            ) : (
                                              <Check className="w-3 h-3 text-muted-foreground" />
                                            )}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {wasRead ? 'Read by opponent' : 'Sent'}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                                <p className="whitespace-pre-wrap relative z-10">{msg.content}</p>
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Typing Indicator */}
                        {opponentTyping && (
                          <div className="p-3 rounded-lg bg-muted/50 border-l-4 border-accent mr-8 animate-fade-in">
                            <p className="text-xs mb-1 text-muted-foreground">
                              {participants.find(p => p.character?.user_id !== user?.id)?.character?.name}
                            </p>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground text-sm">typing</span>
                              <span className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* Narrator Loading Indicator */}
                        {isNarratorLoading && (
                          <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-l-4 border-amber-500 mx-4 animate-fade-in">
                            <p className="text-xs mb-1 text-amber-400 font-semibold">Narrator</p>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground text-sm">observing</span>
                              <span className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* Inline Narrator Commentary - most recent */}
                        {narratorMessages.length > 0 && !isNarratorLoading && (
                          <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 via-background to-amber-500/10 border border-amber-500/30 mx-4 animate-fade-in">
                            <div className="flex items-start gap-2">
                              <BookOpen className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-xs text-amber-400 font-medium uppercase tracking-wider mb-1">
                                  Narrator
                                </p>
                                <p className="text-sm text-foreground/90 italic">
                                  {narratorMessages[narratorMessages.length - 1]?.content}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>
                  
                  {/* In-Universe Input */}
                  {battle.status === 'active' && userCharacter && (
                    <div className="p-4 border-t border-border space-y-3 relative z-10">
                      {/* Area Damage Warning - Flavor Only */}
                      {areaDamageWarning && areaDamageWarning.isSevere && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 bg-gradient-to-r from-destructive/20 via-orange-500/20 to-destructive/20 border border-destructive/50 rounded-lg p-3 space-y-1">
                          <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
                            <AlertTriangle className="w-4 h-4 animate-pulse" />
                            {areaDamageWarning.warningText}
                          </div>
                          {areaDamageWarning.flavorText && (
                            <p className="text-xs text-muted-foreground italic pl-6">
                              {areaDamageWarning.flavorText}
                            </p>
                          )}
                        </div>
                      )}
                      
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendMessage();
                        }}
                        className="flex gap-2"
                      >
                        <div className="relative flex-1">
                          {/* Character Status Effect Overlay */}
                          {characterStatusEffects.length > 0 && (
                            <CharacterStatusOverlay effects={characterStatusEffects} />
                          )}
                          <Input
                            value={activeChannel === 'in_universe' ? messageInput : ''}
                            onChange={(e) => handleInputChange(e.target.value, 'in_universe')}
                            placeholder={pendingHit 
                              ? 'Resolve the incoming attack first...'
                              : 'Describe your action or attack...'}
                            disabled={!!pendingHit}
                            className="relative z-20"
                          />
                        </div>
                        <Button type="submit" size="icon" disabled={!!pendingHit || !messageInput.trim()}>
                          <Send className="w-4 h-4" />
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              </TurnIndicatorWrapper>
            </TabsContent>

            <TabsContent value="out_of_universe" className="mt-0">
              <ScrollArea className="h-[400px] p-4">
                {outOfUniverseMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-muted-foreground">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No OOC messages yet</p>
                      <p className="text-xs">Discuss rules or clarify things here</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {outOfUniverseMessages.map((msg) => {
                      const isFromUser = msg.character_id === userCharacter?.character_id;
                      return (
                        <div 
                          key={msg.id} 
                          className={`p-3 rounded-lg ${
                            isFromUser
                              ? 'bg-muted/30 border-l-4 border-muted-foreground ml-8'
                              : 'bg-muted/20 border-l-4 border-muted mr-8'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-muted-foreground">
                              {msg.character_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
              
              {/* OOC Input */}
              {battle.status === 'active' && userCharacter && (
                <div className="p-4 border-t border-border">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      placeholder="Say something OOC..."
                      value={activeChannel === 'out_of_universe' ? messageInput : ''}
                      onChange={(e) => handleInputChange(e.target.value, 'out_of_universe')}
                    />
                    <Button type="submit" size="icon" variant="secondary">
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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
