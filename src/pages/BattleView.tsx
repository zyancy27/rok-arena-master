import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { buildSceneTags } from '@/lib/build-scene-tags';
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
  determineDefenseSuccess,
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
  type DefenseDetermination,
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
import SaveLocationPrompt from '@/components/battles/SaveLocationPrompt';
import EnvironmentChatBackground from '@/components/battles/EnvironmentChatBackground';
import { buildSnapshotFromState, type ThemeSnapshot } from '@/lib/theme-engine';
import { usePvPCombatMechanics } from '@/hooks/use-pvp-combat-mechanics';
import SfxToggle from '@/components/battles/SfxToggle';
import PrivateNarratorChat, { type MechanicDiscoveryMessage } from '@/components/battles/PrivateNarratorChat';
import { type StatModification } from '@/components/battles/StatModificationPanel';
import { discoverMechanic, type MechanicKey } from '@/lib/mechanic-discovery';
import { useBattleSfx } from '@/hooks/use-battle-sfx';
import { useAmbientSound } from '@/hooks/use-ambient-sound';
import { getDominantPsychCue } from '@/lib/battle-psychology';
import { interpretMove } from '@/lib/intent-interpreter';
import { applyHardClamp, generateClampContext, type CharacterProfile, type ClampResult } from '@/lib/hard-clamp';
import { detectDirectInteraction } from '@/lib/battle-hit-detection';
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
  battle_mode?: string | null;
  max_players?: number | null;
  emergency_enabled?: boolean;
  emergency_payload?: any;
  has_shown_arena_intro?: boolean;
  location_base?: string | null;
  location_confirmed_by_host?: boolean;
}

interface BattleInvitation {
  id: string;
  battle_id: string;
  user_id: string;
  status: 'pending' | 'accepted' | 'declined';
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

interface StatusEffectsSnapshot {
  [key: string]: { type: string; intensity: string } | undefined;
}

interface Message {
  id: string;
  character_id: string;
  content: string;
  channel: 'in_universe' | 'out_of_universe';
  created_at: string;
  character_name?: string;
  /** Status effects active on the sender's character at send time */
  statusEffectsSnapshot?: StatusEffectsSnapshot;
  /** True while the message is being sent to the server */
  isPending?: boolean;
  /** Theme snapshot at send-time for historical rendering */
  themeSnapshot?: ThemeSnapshot | null;
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
  const [isSending, setIsSending] = useState(false);
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
  const entranceAttemptedRef = useRef(false);
  
  // Area damage warning state
  const [areaDamageWarning, setAreaDamageWarning] = useState<AreaDamageWarning | null>(null);
  
  // Defense validation tracking
  const [lastOpponentAction, setLastOpponentAction] = useState<string>('');
  const [lastOpponentCharId, setLastOpponentCharId] = useState<string | null>(null);
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
  
  // Battlefield visual effects (fire, ice, smoke, etc.) — synced to DB for PvP
  const { 
    activeEffects: battlefieldEffects, 
    processMessage: processBattlefieldEffect,
    hydrateFromDatabase: hydrateBattlefieldEffects,
  } = useBattlefieldEffects({ battleId: id, enabled: battle?.dynamic_environment !== false });
  
  // Character-specific status effects (paralyzed, blinded, etc.)
  const { 
    activeEffects: characterStatusEffects, 
    processMessage: processStatusEffect 
  } = useCharacterStatusEffects({
    characterName: userCharacter?.character?.name,
    enabled: battle?.status === 'active',
  });
  
  // Emergency location state
  const [emergencyLocation, setEmergencyLocation] = useState<any>(null);
  const [showSaveLocationPrompt, setShowSaveLocationPrompt] = useState(false);

  // Group battle invitation state
  const [groupInvitation, setGroupInvitation] = useState<BattleInvitation | null>(null);

  // Battle narrator state
  const [narratorFrequency, setNarratorFrequency] = useState<NarratorFrequency>('key_moments');
  const [narratorMessages, setNarratorMessages] = useState<Array<{ id: string; content: string; timestamp: Date }>>([]);
  const [isNarratorLoading, setIsNarratorLoading] = useState(false);

  // Private narrator validation state
  const [pendingNarratorValidation, setPendingNarratorValidation] = useState<{
    moveText: string;
    warningMessage: string;
    suggestedFix?: string;
  } | null>(null);
  const [narratorGlowing, setNarratorGlowing] = useState(false);

  // Mechanic discovery notifications
  const [pendingDiscoveries, setPendingDiscoveries] = useState<MechanicDiscoveryMessage[]>([]);
  
  const triggerMechanicDiscovery = (key: MechanicKey) => {
    if (!user?.id) return;
    const info = discoverMechanic(user.id, key);
    if (info) {
      setPendingDiscoveries(prev => [...prev, { title: info.title, summary: info.summary }]);
      setNarratorGlowing(true);
    }
  };

  const handleDiscoveriesShown = () => {
    setPendingDiscoveries([]);
    setNarratorGlowing(false);
  };

  // Stat modifications during battle
  const [statModifications, setStatModifications] = useState<StatModification[]>([]);

  // Internal fairness tracking (invisible to UI)
  const [consecutiveHighForceTurns, setConsecutiveHighForceTurns] = useState(0);
  const lastClampResultRef = useRef<ClampResult | null>(null);

  // Advanced combat mechanics (momentum, psychology, overcharge, charge, perception, hit detection, arena modifiers)
  const combatMechanics = usePvPCombatMechanics({
    enabled: battle?.status === 'active' && !!userCharacter,
    userCharacterLevel: userCharacter?.character?.level ?? 1,
    userCharacterName: userCharacter?.character?.name ?? '',
    battleLocation: battle?.chosen_location ?? null,
  });

  // Battle SFX
  const { playEvent: playSfxEvent, muted: sfxMuted, toggleMute: toggleSfxMute, processText: processSfxText } = useBattleSfx();
  // Ambient environment sounds
  const { muted: ambientMuted, toggleMute: toggleAmbientMute } = useAmbientSound({
    enabled: battle?.status === 'active',
    location: battle?.chosen_location,
  });
  useEffect(() => {
    if (battle?.chosen_location && battle?.dynamic_environment) {
      const env = generateBattleEnvironment(battle.chosen_location, null, null);
      setBattleEnvironment(env);
    }
    // Hydrate persisted battlefield effects on initial load
    if (battle?.environment_effects) {
      hydrateBattlefieldEffects(battle.environment_effects);
    }
  }, [battle?.chosen_location, battle?.dynamic_environment]);
  
  // Generate character entrances when battle becomes active
  useEffect(() => {
    const generateEntrances = async () => {
      if (
        battle?.status === 'active' && 
        battle?.chosen_location && 
        participants.length >= 2 && 
        !entrancesGenerated && 
        !isGeneratingEntrances &&
        !entranceAttemptedRef.current &&
        userCharacter
      ) {
        // Mark attempted immediately to prevent re-runs on remount
        entranceAttemptedRef.current = true;
        
        // Also check has_shown_arena_intro flag from battle record
        if (battle?.has_shown_arena_intro) {
          setEntrancesGenerated(true);
          return;
        }
        
        // Check if entrances were already sent (look for entrance markers in messages)
        const hasEntrances = messages.some(m => m.content.includes('⚔️ **') && (m.content.includes('enters the arena') || m.content.includes('arrives') || m.content.includes('walks in') || m.content.includes('is already')));
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
              // Include 3rd character if present
              ...(participants[2]?.character ? {
                character3: {
                  name: participants[2].character.name,
                  level: participants[2].character.level,
                  powers: participants[2].character.powers,
                  abilities: participants[2].character.abilities,
                },
              } : {}),
              battleLocation: battle.chosen_location,
            },
          });
          
          if (response.data) {
            const { entrance1, entrance2, entrance3 } = response.data;
            
            // Double-check no entrance messages exist (race condition guard)
            const { data: existingMsgs } = await supabase
              .from('battle_messages')
              .select('id')
              .eq('battle_id', id)
              .like('content', '⚔️ **%')
              .limit(1);
            
            if (!existingMsgs || existingMsgs.length === 0) {
              const entranceInserts = [
                {
                  battle_id: id,
                  character_id: participants[0].character_id,
                  content: `⚔️ **${char1.name}:**\n${entrance1}`,
                  channel: 'in_universe' as const,
                },
                {
                  battle_id: id,
                  character_id: participants[1].character_id,
                  content: `⚔️ **${char2.name}:**\n${entrance2}`,
                  channel: 'in_universe' as const,
                },
              ];
              
              // Add 3rd entrance if present
              if (participants[2]?.character && entrance3) {
                entranceInserts.push({
                  battle_id: id,
                  character_id: participants[2].character_id,
                  content: `⚔️ **${participants[2].character.name}:**\n${entrance3}`,
                  channel: 'in_universe' as const,
                });
              }
              
              await supabase.from('battle_messages').insert(entranceInserts);
              
              // Mark intro as shown
              await supabase.from('battles').update({ has_shown_arena_intro: true }).eq('id', id);
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
  }, [battle?.status, battle?.chosen_location, participants, entrancesGenerated, isGeneratingEntrances, userCharacter, id]);

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

    // Check if user already has a character in this battle
    let userAlreadyJoined = false;
    if (participantsData) {
      const pCharIds = participantsData.map(p => p.character_id);
      const { data: pCharsCheck } = await supabase
        .from('characters')
        .select('id, user_id')
        .in('id', pCharIds);
      userAlreadyJoined = pCharsCheck?.some(c => c.user_id === user?.id) ?? false;
    }

    // Check for group battle invitation or PvP challenge
    if (battleData.status === 'pending' && !userAlreadyJoined) {
      const { data: invitation } = await supabase
        .from('battle_invitations')
        .select('id, battle_id, user_id, status')
        .eq('battle_id', id!)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (invitation) {
        setGroupInvitation(invitation as BattleInvitation);
      }

      const isChallenged = battleData.challenged_user_id === user?.id;
      const isInvited = !!invitation;

      if (isChallenged || isInvited) {
        const { data: myChars } = await supabase
          .from('characters')
          .select('id, name, level, user_id, powers, abilities, stat_intelligence, stat_battle_iq, stat_strength, stat_power, stat_speed, stat_durability, stat_stamina, stat_skill, stat_luck')
          .eq('user_id', user!.id);
        
        if (myChars) {
          setUserCharacters(myChars);
        }
      }
    }

    // Fetch messages
    await fetchMessages();
    setLoading(false);
  };

  const fetchMessages = async () => {
    const { data: messagesData } = await supabase
      .from('battle_messages')
      .select('id, character_id, content, channel, created_at, theme_snapshot')
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
        themeSnapshot: (m as any).theme_snapshot ?? null,
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
          
          // Reconcile: check if this message was optimistically added (pending)
          setMessages(prev => {
            // Check if already exists by real ID
            if (prev.some(m => m.id === newMessage.id && !m.isPending)) {
              return prev; // Already confirmed, skip
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
                  themeSnapshot: (newMessage as any).theme_snapshot ?? null,
                  isPending: false,
                };
                
                // Replace optimistic message or update placeholder
                setMessages(current => {
                  // Find and replace optimistic message for this user's message
                  const optimisticIndex = current.findIndex(m => 
                    m.isPending && m.character_id === newMessage.character_id && m.content === newMessage.content
                  );
                  if (optimisticIndex !== -1) {
                    const optimistic = current[optimisticIndex];
                    const reconciled = { ...messageWithName, statusEffectsSnapshot: optimistic.statusEffectsSnapshot, themeSnapshot: optimistic.themeSnapshot };
                    return current.map((m, i) => i === optimisticIndex ? reconciled : m);
                  }
                  // Otherwise just update the placeholder
                  return current.map(m => m.id === newMessage.id ? messageWithName : m);
                });
                
                // Unlock sending after server confirms
                if (charData?.user_id === user?.id) {
                  setIsSending(false);
                }
                
                // Process battlefield effects from in-universe messages
                if (newMessage.channel === 'in_universe') {
                  processBattlefieldEffect(newMessage.content);
                  
                  // Process character status effects from opponent's messages
                  if (charData?.user_id !== user?.id) {
                    processStatusEffect(newMessage.content, true);
                    
                    // Track opponent's last action and identity for defense validation & group PvP targeting
                    setLastOpponentAction(newMessage.content);
                    setLastOpponentCharId(newMessage.character_id);
                    setTurnNumber(prev => prev + 1);

                    // Process opponent action through combat mechanics (perception, psych updates)
                    combatMechanics.processOpponentAction(
                      newMessage.content,
                      charData?.name || 'Opponent',
                      userCharacter?.character ? {
                        stat_intelligence: userCharacter.character.stat_intelligence ?? 50,
                        stat_battle_iq: userCharacter.character.stat_battle_iq ?? 50,
                        stat_strength: userCharacter.character.stat_strength ?? 50,
                        stat_power: userCharacter.character.stat_power ?? 50,
                        stat_speed: userCharacter.character.stat_speed ?? 50,
                        stat_durability: userCharacter.character.stat_durability ?? 50,
                        stat_stamina: userCharacter.character.stat_stamina ?? 50,
                        stat_skill: userCharacter.character.stat_skill ?? 50,
                        stat_luck: userCharacter.character.stat_luck ?? 50,
                      } : { stat_intelligence: 50, stat_battle_iq: 50, stat_strength: 50, stat_power: 50, stat_speed: 50, stat_durability: 50, stat_stamina: 50, stat_skill: 50, stat_luck: 50 },
                      userCharacter?.character?.level ?? 1,
                      true // Assume hit landed for now, refining later with dice check
                    );
                    
                    // Generate dice roll for opponent's attack (so receiver sees it inline)
                    // Dice resolves FIRST, then narrator describes the actual outcome
                    const opponentDiceResult = generateOpponentDiceRoll(newMessage.content, charData?.name || 'Opponent', newMessage.character_id);
                    
                    // Call battle narrator with dice result so it describes what actually happened
                    callBattleNarrator(newMessage.content, charData?.name || 'Opponent', opponentDiceResult ?? undefined);
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

                  try {
                    const audio = new Audio('/notification.mp3');
                    audio.volume = 0.3;
                    audio.play().catch(() => {});
                  } catch {}
                  
                  setOpponentTyping(false);
                }
              });
            
            // Check if an optimistic version already exists for this content
            const hasOptimistic = prev.some(m => 
              m.isPending && m.character_id === newMessage.character_id && m.content === newMessage.content
            );
            if (hasOptimistic) {
              return prev; // Optimistic message already shown, wait for reconciliation
            }
            
            // Immediately add message with placeholder name (from opponent)
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
          
          // Sync battlefield effects from opponent's updates
          if (updatedBattle.environment_effects) {
            hydrateBattlefieldEffects(updatedBattle.environment_effects);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'battle_participants',
          filter: `battle_id=eq.${id}`,
        },
        async (payload) => {
          // A new player joined — refetch participants for waiting room
          const newP = payload.new as any;
          const { data: charData } = await supabase
            .from('characters')
            .select('id, name, level, user_id, powers, abilities, stat_intelligence, stat_battle_iq, stat_strength, stat_power, stat_speed, stat_durability, stat_stamina, stat_skill, stat_luck')
            .eq('id', newP.character_id)
            .maybeSingle();

          if (charData) {
            setParticipants(prev => {
              if (prev.some(p => p.id === newP.id)) return prev;
              return [...prev, { ...newP, character: charData }];
            });

            if (charData.user_id !== user?.id) {
              toast.info(`${charData.name} has joined the battle!`);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'battle_invitations',
          filter: `battle_id=eq.${id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated.user_id === user?.id) {
            setGroupInvitation(prev => prev ? { ...prev, status: updated.status } : null);
          }
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
    if (!messageInput.trim() || !userCharacter || isSending) return;

    // Only validate in-universe moves
    if (activeChannel === 'in_universe' && userCharacter.character) {
      const characterAbilities: CharacterAbilities = {
        powers: userCharacter.character.powers || null,
        abilities: userCharacter.character.abilities || null,
        name: userCharacter.character.name,
      };
      
      const validation = validateMove(messageInput, characterAbilities);
      
      if (!validation.isValid) {
        // Route to private narrator for validation instead of inline warning
        setPendingNarratorValidation({
          moveText: messageInput,
          warningMessage: validation.warningMessage || 'Move may not match your character abilities.',
          suggestedFix: validation.suggestedFix || undefined,
        });
        setNarratorGlowing(true);
        triggerMechanicDiscovery('move_validation');
        setPendingMove(messageInput);
        setMoveValidation(validation);
        setMessageInput('');
        // Auto-clear glow after 5 seconds
        setTimeout(() => setNarratorGlowing(false), 5000);
        toast.warning('⚠️ Check the Private Narrator tab to validate your move', { duration: 4000 });
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
    if (!content.trim() || !userCharacter || isSending) return;
    
    // Lock sending
    setIsSending(true);
    
    // Clear typing status before sending
    updateTypingStatus(false);
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }

    // Defense validation - check if player addressed opponent's last attack
    if (activeChannel === 'in_universe' && lastOpponentAction && lastHitResult && turnNumber > 1) {
      const validation = validateDefense(content, lastOpponentAction, lastHitResult.hit);
      
      if (validation.shouldEnforceHit && validation.hasAttackToAddress) {
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

    // Build status effects snapshot for this message
    const snapshot: StatusEffectsSnapshot = {};
    if (activeChannel === 'in_universe') {
      for (const effect of characterStatusEffects) {
        snapshot[effect.type] = { type: effect.type, intensity: effect.intensity };
      }
    }

    // Build theme snapshot for historical per-message rendering
    const playerSceneLocation = battle?.chosen_location ?? null;
    const themeSnap = activeChannel === 'in_universe'
      ? buildSnapshotFromState({
          location: playerSceneLocation,
          activeStatusEffects: characterStatusEffects.map(e => e.type),
        })
      : null;

    // OPTIMISTIC: Add message to UI immediately
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage: Message = {
      id: tempId,
      character_id: userCharacter.character_id,
      content: content.trim(),
      channel: activeChannel,
      created_at: new Date().toISOString(),
      character_name: userCharacter.character?.name || 'You',
      statusEffectsSnapshot: Object.keys(snapshot).length > 0 ? snapshot : undefined,
      themeSnapshot: themeSnap,
      isPending: true,
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setMessageInput('');
    setPendingMove(null);
    setMoveValidation(null);

    // Send to server (include theme_snapshot)
    const { error } = await supabase.from('battle_messages').insert({
      battle_id: id,
      character_id: userCharacter.character_id,
      content: content.trim(),
      channel: activeChannel,
      ...(themeSnap ? { theme_snapshot: themeSnap } : {}),
    } as any);

    if (error) {
      // Rollback optimistic message
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setIsSending(false);
      toast.error('Failed to send message');
      return;
    }

    // ── Invisible fairness pipeline (Layer 1 + 2) ──────────────────────────
    if (activeChannel === 'in_universe' && userCharacter.character) {
      const char = userCharacter.character;
      const intent = interpretMove(content);
      const profile: CharacterProfile = {
        name: char.name,
        tier: char.level,
        stats: {
          stat_intelligence: char.stat_intelligence ?? 50,
          stat_battle_iq: char.stat_battle_iq ?? 50,
          stat_strength: char.stat_strength ?? 50,
          stat_power: char.stat_power ?? 50,
          stat_speed: char.stat_speed ?? 50,
          stat_durability: char.stat_durability ?? 50,
          stat_stamina: char.stat_stamina ?? 50,
          stat_skill: char.stat_skill ?? 50,
          stat_luck: char.stat_luck ?? 50,
        },
        powers: char.powers ?? null,
        abilities: char.abilities ?? null,
        consecutiveHighForceTurns,
      };
      const clamp = applyHardClamp(intent, profile);
      lastClampResultRef.current = clamp;

      // Track consecutive high-force turns for stamina escalation
      if (intent.intentCategory === 'HIGH_FORCE' || intent.posture === 'RECKLESS') {
        setConsecutiveHighForceTurns(prev => prev + 1);
      } else {
        setConsecutiveHighForceTurns(0);
      }
    }

    // Generate dice roll for in-universe attack moves
    if (activeChannel === 'in_universe' && !skipDiceRoll) {
      generateDiceRoll(content);
      detectAndCatalogNewTechnique(content);
      setTurnNumber(prev => prev + 1);
    }
    
    // Failsafe: unlock sending after 5 seconds if realtime doesn't confirm
    setTimeout(() => {
      setIsSending(false);
    }, 5000);
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

  // Resolve which opponent to target in group PvP (3-player) by checking name mentions
  const resolveTarget = (moveText: string): Participant | undefined => {
    const opponents = participants.filter(p => p.character_id !== userCharacter?.character_id);
    if (opponents.length <= 1) return opponents[0];
    
    // Check if move text mentions an opponent's name
    const lowerMove = moveText.toLowerCase();
    const namedTarget = opponents.find(p => 
      p.character?.name && lowerMove.includes(p.character.name.toLowerCase())
    );
    if (namedTarget) return namedTarget;
    
    // Fall back to the last opponent who acted
    if (lastOpponentCharId) {
      const lastActor = opponents.find(p => p.character_id === lastOpponentCharId);
      if (lastActor) return lastActor;
    }
    
    // Final fallback: first opponent
    return opponents[0];
  };

  // Generate dice roll for an attack
  const generateDiceRoll = (moveText: string) => {
    if (!userCharacter?.character) return;
    
    const opponent = resolveTarget(moveText);
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

    // Use the adaptive hit detection parser to determine if this is an offensive or defensive action
    const hitDetection = detectDirectInteraction(moveText);

    // === DEFENSIVE ACTION RESOLUTION ===
    if (hitDetection.shouldTriggerDefenseCheck && !hitDetection.shouldTriggerHitCheck) {
      const defenderChar = userCharacter.character;
      // In group PvP, use the last attacker's stats for the incoming attack potency
      const attacker = lastOpponentCharId
        ? participants.find(p => p.character_id === lastOpponentCharId)
        : participants.find(p => p.character_id !== userCharacter.character_id);
      if (!attacker?.character) return;

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

      const attackerStats: CharacterStats = {
        stat_intelligence: attacker.character.stat_intelligence ?? 50,
        stat_battle_iq: attacker.character.stat_battle_iq ?? 50,
        stat_strength: attacker.character.stat_strength ?? 50,
        stat_power: attacker.character.stat_power ?? 50,
        stat_speed: attacker.character.stat_speed ?? 50,
        stat_durability: attacker.character.stat_durability ?? 50,
        stat_stamina: attacker.character.stat_stamina ?? 50,
        stat_skill: attacker.character.stat_skill ?? 50,
        stat_luck: attacker.character.stat_luck ?? 50,
      };

      const defenseType = hitDetection.intent === 'dodge' ? 'dodge' : 'block';
      const defPenalty = statPenalties[defenderChar.id] ?? 0;
      const defResult = determineDefenseSuccess(
        defenderStats, defenderChar.level,
        attackerStats, attacker.character.level,
        defenseType, defPenalty,
      );

      // Post defense result as OOC
      if (defResult.defenseSuccess) {
        supabase.from('battle_messages').insert({
          battle_id: id,
          character_id: userCharacter.character_id,
          content: `🛡️ **Defense Roll**: ${defenseType === 'dodge' ? 'Evasion' : 'Block'} ${defResult.defenseRoll.total} vs Incoming ${defResult.incomingAttackPotency.total} — ✅ ${defenseType === 'dodge' ? 'DODGED' : 'BLOCKED'}! (Gap: ${defResult.gap})`,
          channel: 'out_of_universe',
        });
        playSfxEvent('hit_light');
      } else {
        supabase.from('battle_messages').insert({
          battle_id: id,
          character_id: userCharacter.character_id,
          content: `🛡️ **Defense Roll**: ${defenseType === 'dodge' ? 'Evasion' : 'Block'} ${defResult.defenseRoll.total} vs Incoming ${defResult.incomingAttackPotency.total} — ❌ ${defenseType === 'dodge' ? 'DODGE FAILED' : 'BLOCK FAILED'}! (Gap: ${Math.abs(defResult.gap)})`,
          channel: 'out_of_universe',
        });
        playSfxEvent('hit_heavy');
      }

      return;
    }

    // === OFFENSIVE ACTION RESOLUTION ===
    if (!hitDetection.shouldTriggerHitCheck) return;

    const attackerChar = userCharacter.character;
    const targetOpponent = resolveTarget(moveText);
    const defenderChar = targetOpponent?.character;
    if (!defenderChar) return;

    // Build stats objects with defaults, applying any active stat modifications
    const applyMods = (base: CharacterStats): CharacterStats => {
      const modified = { ...base };
      for (const mod of statModifications) {
        if (mod.stat in modified) {
          (modified as any)[mod.stat] = Math.max(0, Math.min(100, ((modified as any)[mod.stat] ?? 50) + mod.delta));
        }
      }
      return modified;
    };

    const attackerStatsBase: CharacterStats = {
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
    const attackerStats = applyMods(attackerStatsBase);

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
    triggerMechanicDiscovery('dice_roll');
    if (hit.wouldHit && hit.gap >= 5) triggerMechanicDiscovery('hit_detection');
    if (mental) triggerMechanicDiscovery('mental_attack');
    
    // Track this hit result for opponent's defense validation
    setLastHitResult({ hit: hit.wouldHit, gap: hit.gap });

    // Apply combat mechanics (momentum, psychology updates from dice result)
    combatMechanics.applyDiceResults(hit, true);

    // SFX
    if (hit.wouldHit) {
      playSfxEvent('hit_heavy');
    } else {
      playSfxEvent('hit_light');
    }
    
    // Process user action through combat mechanics (charge, overcharge, etc.)
    const mechanicsResult = combatMechanics.processUserAction(
      moveText,
      attackerStats,
      attackerChar.level,
      attackerChar.stat_skill ?? 50,
    );

    // Post charge context as OOC if relevant
    if (mechanicsResult.chargeContext) {
      supabase.from('battle_messages').insert({
        battle_id: id,
        character_id: userCharacter.character_id,
        content: mechanicsResult.chargeContext,
        channel: 'out_of_universe',
      });
    }

    // Post overcharge result as OOC if relevant
    if (mechanicsResult.overchargeResult) {
      supabase.from('battle_messages').insert({
        battle_id: id,
        character_id: userCharacter.character_id,
        content: mechanicsResult.overchargeResult,
        channel: 'out_of_universe',
      });
    }

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

  // Generate dice roll for an opponent's incoming attack (so the defender sees it inline)
  const generateOpponentDiceRoll = (moveText: string, opponentName: string, opponentCharId: string): { hit: boolean; attackTotal: number; defenseTotal: number; gap: number; isMental: boolean } | null => {
    if (!userCharacter?.character) return null;
    
    const opponentParticipant = participants.find(p => p.character_id === opponentCharId);
    if (!opponentParticipant?.character) return null;

    // Use the adaptive hit detection parser
    const hitDetection = detectDirectInteraction(moveText);
    if (!hitDetection.shouldTriggerHitCheck) return null;

    const attackerChar = opponentParticipant.character;
    const defenderChar = userCharacter.character;

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

    const rollMessage = {
      id: `roll-opp-${Date.now()}`,
      hitDetermination: hit,
      attackerName: attackerChar.name,
      defenderName: defenderChar.name,
      timestamp: new Date(),
      isPlayerRoll: false, // Opponent's roll
    };
    
    setDiceRollMessages(prev => [...prev, rollMessage]);
    triggerMechanicDiscovery('dice_roll');
    triggerMechanicDiscovery('hit_detection');
    setLastHitResult({ hit: hit.wouldHit, gap: hit.gap });

    // SFX
    if (hit.wouldHit) {
      playSfxEvent('hit_heavy');
      // Show concentration option for the defender (current user)
      setPendingHit(hit);
    } else {
      playSfxEvent('hit_light');
    }

    // Apply combat mechanics from opponent's perspective
    combatMechanics.applyDiceResults(hit, false);

    // Return dice result for narrator
    return {
      hit: hit.wouldHit,
      attackTotal: hit.attackRoll.total,
      defenseTotal: hit.defenseRoll.total,
      gap: hit.gap,
      isMental: mental,
    };
  };

  // Call battle narrator for atmospheric commentary
  const callBattleNarrator = async (
    opponentAction: string,
    opponentName: string,
    diceResult?: { hit: boolean; attackTotal: number; defenseTotal: number; gap: number; isMental: boolean },
  ) => {
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
          // Dice result so narrator can describe actual outcome
          diceResult: diceResult ?? undefined,
          // Invisible fairness context from hard clamp (internal only)
          fairnessContext: lastClampResultRef.current
            ? generateClampContext(lastClampResultRef.current)
            : undefined,
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
    triggerMechanicDiscovery('concentration');
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
    setPendingNarratorValidation(null);
    setNarratorGlowing(false);
  };

  // Handle narrator-approved move
  const handleNarratorMoveApproved = async (moveText: string, explanation: string) => {
    setPendingNarratorValidation(null);
    setNarratorGlowing(false);
    setPendingMove(null);
    setMoveValidation(null);
    await sendMessage(moveText);
    // Post explanation in OOC
    if (userCharacter) {
      await supabase.from('battle_messages').insert({
        battle_id: id,
        character_id: userCharacter.character_id,
        content: `📋 **Move Validated by Narrator:** ${explanation}`,
        channel: 'out_of_universe',
      });
    }
    toast.success('Move approved and sent!');
  };

  // Handle narrator-rejected move
  const handleNarratorMoveRejected = () => {
    setPendingNarratorValidation(null);
    setNarratorGlowing(false);
    setMessageInput(pendingMove || '');
    setPendingMove(null);
    setMoveValidation(null);
  };

  // Handle ability learned through narrator validation
  const handleAbilityLearned = async (abilityDescription: string) => {
    if (!userCharacter?.character) return;
    const currentAbilities = userCharacter.character.abilities || '';
    const updatedAbilities = currentAbilities + `\n\n${abilityDescription}`;
    await supabase
      .from('characters')
      .update({ abilities: updatedAbilities })
      .eq('id', userCharacter.character.id);
    setParticipants(prev => prev.map(p =>
      p.character_id === userCharacter.character_id
        ? { ...p, character: { ...p.character!, abilities: updatedAbilities } }
        : p
    ));
    toast.success('New ability added to character sheet!');
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
      const isGroup = battle.battle_mode === 'group_pvp';
      
      // Determine turn_order: for group battles, assign next available
      let turnOrder = 2;
      if (isGroup) {
        const existingOrders = participants.map(p => p.turn_order);
        turnOrder = existingOrders.length > 0 ? Math.max(...existingOrders) + 1 : 2;
      }

      // Build scene tags from battle location + emergency payload
      const emergencyTags = battle.emergency_payload?.tags ?? null;
      const sceneTags = buildSceneTags(battle.chosen_location || battle.location_1, emergencyTags);

      // Add user as participant
      const { error: participantError } = await supabase
        .from('battle_participants')
        .insert({
          battle_id: battle.id,
          character_id: selectedCharacterId,
          turn_order: turnOrder,
          scene_location: battle.chosen_location || battle.location_1,
          scene_tags: sceneTags,
        });

      if (participantError) {
        toast.error('Failed to join battle: ' + participantError.message);
        return;
      }

      // Update invitation status if this is a group battle
      if (groupInvitation) {
        await supabase
          .from('battle_invitations')
          .update({ status: 'accepted' })
          .eq('id', groupInvitation.id);
      }

      // For group battles with host-confirmed location, check if all players joined to auto-start
      if (isGroup && battle.location_confirmed_by_host) {
        const expectedPlayers = battle.max_players ?? 3;
        const currentParticipantCount = participants.length + 1; // +1 for the user just joining
        
        if (currentParticipantCount >= expectedPlayers) {
          // All players joined - snapshot stats and start battle
          // Fetch fresh participants
          const { data: allParticipants } = await supabase
            .from('battle_participants')
            .select('id, character_id')
            .eq('battle_id', battle.id);
          
          if (allParticipants) {
            for (const p of allParticipants) {
              const { data: charData } = await supabase
                .from('characters')
                .select('id, name, level, user_id, powers, abilities, stat_intelligence, stat_battle_iq, stat_strength, stat_power, stat_speed, stat_durability, stat_stamina, stat_skill, stat_luck')
                .eq('id', p.character_id)
                .maybeSingle();
              
              if (charData) {
                await supabase
                  .from('battle_participants')
                  .update({ character_snapshot: JSON.parse(JSON.stringify(charData)) })
                  .eq('id', p.id);
              }
            }
          }

          await supabase
            .from('battles')
            .update({ 
              status: 'active',
              dynamic_environment: true,
            })
            .eq('id', battle.id);

          toast.success('⚔️ All players joined! Battle has begun!');
        } else {
          toast.success(`Challenge accepted! Waiting for ${expectedPlayers - currentParticipantCount} more player(s).`);
        }
      } else {
        toast.success('Challenge accepted! Enter your battle location.');
      }
      
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
      // If this is a group invitation, just decline the invite (don't delete the battle)
      if (groupInvitation && battle.battle_mode === 'group_pvp') {
        await supabase
          .from('battle_invitations')
          .update({ status: 'declined' })
          .eq('id', groupInvitation.id);
        
        toast.success('Invitation declined');
        navigate('/battles');
        return;
      }

      // Delete all participants first
      await supabase
        .from('battle_participants')
        .delete()
        .eq('battle_id', battle.id);

      // Delete invitations
      await supabase
        .from('battle_invitations')
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
  
  // Determine whose turn it is based on turn order and message count
  // For 2-player: alternating turns based on last RP message sender
  // For 3-player: cycle through turn_order 1→2→3→1→...
  const isGroupBattle = (battle?.battle_mode === 'group_pvp' || (battle?.max_players ?? 2) > 2);
  const lastInUniverseMessage = inUniverseMessages[inUniverseMessages.length - 1];
  
  let isUserTurn = false;
  let currentTurnParticipant: Participant | undefined;
  
  if (isGroupBattle && participants.length >= 3) {
    // Count RP messages to determine whose turn it is
    const rpMessageCount = inUniverseMessages.length;
    const currentTurnOrder = (rpMessageCount % participants.length) + 1;
    currentTurnParticipant = participants.find(p => p.turn_order === currentTurnOrder);
    isUserTurn = currentTurnParticipant?.character?.user_id === user?.id;
  } else {
    // 2-player: simple alternating
    isUserTurn = !lastInUniverseMessage || lastInUniverseMessage.character_id !== userCharacter?.character_id;
  }

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
    <div className="space-y-4 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => navigate('/battles')} className="min-h-[44px]">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Battles
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
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
        isGroupBattle && participants.length >= 3 ? (
          // 3-player compact participant strip
          <div className="space-y-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {participants.map((p, i) => {
                const isCurrent = p.turn_order === ((inUniverseMessages.length % participants.length) + 1);
                const isMe = p.character?.user_id === user?.id;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border shrink-0 transition-all ${
                      isCurrent
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                        : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-primary animate-pulse' : 'bg-muted-foreground/30'}`} />
                    <span className={`text-sm font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                      {p.character?.name || 'Unknown'}
                      {isMe && ' (You)'}
                    </span>
                    {isCurrent && (
                      <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                        Turn
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <TurnIndicator
            isUserTurn={isUserTurn}
            userName={userCharacter.character.name}
            opponentName={participants.find(p => p.character?.user_id !== user?.id)?.character?.name || 'Opponent'}
            userColor={userTurnColor}
            opponentColor="#EF4444"
          />
        )
      )}

      {/* SFX Toggle (minimal) */}
      {battle.status === 'active' && userCharacter?.character && (
        <div className="flex justify-end">
          <div className="flex items-center gap-1">
            <SfxToggle muted={sfxMuted} onToggle={toggleSfxMute} />
            <SfxToggle muted={ambientMuted} onToggle={toggleAmbientMute} />
          </div>
        </div>
      )}


      {/* Challenge Acceptance for Challenged User OR Group Invitation (not yet a participant) */}
      {battle.status === 'pending' && !userCharacter && (battle.challenged_user_id === user?.id || groupInvitation?.status === 'pending') && (
        <Card className="bg-card-gradient border-primary/30">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Swords className="w-4 h-4 text-primary" />
              {battle.battle_mode === 'group_pvp' ? "You've Been Invited to a Group Battle!" : "You've Been Challenged!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm mb-2">
                <span className="font-medium">{participants[0]?.character?.name || 'A host'}</span>
                {battle.battle_mode === 'group_pvp' 
                  ? ` has invited you to a 3-player group battle!`
                  : ` has challenged you to battle!`}
              </p>
              {battle.battle_mode === 'group_pvp' && battle.chosen_location && (
                <p className="text-xs text-muted-foreground mb-2">
                  📍 Location: <span className="font-medium text-foreground">{battle.chosen_location}</span>
                  {battle.emergency_enabled && ' (Emergency scenario active)'}
                </p>
              )}
              <p className="text-sm mb-4">Select a character to accept.</p>
              
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
                {isAcceptingChallenge ? 'Joining...' : 'Accept & Join'}
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
      {battle.status === 'pending' && userCharacter && !isGroupBattle && (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* Group Battle Waiting Room (host sees this after creating) */}
      {battle.status === 'pending' && userCharacter && isGroupBattle && (
        <Card className="bg-card-gradient border-border">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Group Battle — Waiting for Players
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={isCancelling}>
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Group Battle?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will cancel the battle and remove all invitations.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Battle</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeclineChallenge}>Cancel Battle</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">📍 Location: <span className="font-medium text-foreground">{battle.chosen_location || battle.location_1}</span></p>
              {battle.emergency_enabled && (
                <p className="text-xs text-muted-foreground">🚨 Emergency scenario active</p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Players ({participants.length}/{battle.max_players ?? 3})</p>
              <div className="flex flex-wrap gap-2">
                {participants.map(p => (
                  <Badge key={p.id} variant="outline" className="flex items-center gap-2 py-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    {p.character?.name || 'Unknown'} (Tier {p.character?.level})
                  </Badge>
                ))}
                {Array.from({ length: (battle.max_players ?? 3) - participants.length }).map((_, i) => (
                  <Badge key={`waiting-${i}`} variant="secondary" className="flex items-center gap-2 py-1.5 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-pulse" />
                    Waiting...
                  </Badge>
                ))}
              </div>
            </div>
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
          <Tabs value={activeChannel} onValueChange={(v) => setActiveChannel(v as any)}>
            <TabsList className="grid w-full grid-cols-3 rounded-none border-b border-border">
              <TabsTrigger value="in_universe" className="flex items-center gap-1.5 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary text-xs sm:text-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">In-Universe</span>
                <span className="sm:hidden">RP</span>
              </TabsTrigger>
              <TabsTrigger value="out_of_universe" className="flex items-center gap-1.5 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-muted-foreground text-xs sm:text-sm">
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">OOC</span>
                <span className="sm:hidden">OOC</span>
              </TabsTrigger>
              <TabsTrigger
                value="private_narrator"
                className={`flex items-center gap-1.5 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-amber-400 text-xs sm:text-sm transition-all ${
                  narratorGlowing ? 'animate-pulse bg-amber-500/10 text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]' : ''
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Narrator</span>
                <span className="sm:hidden">📖</span>
                {(pendingNarratorValidation || pendingDiscoveries.length > 0) && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="in_universe" className="mt-0">
              <TurnIndicatorWrapper
                isUserTurn={isUserTurn}
                userColor={userTurnColor}
                opponentColor="#EF4444"
              >
                <div className="relative flex flex-col">
                  {/* Persistent Environment Background tied to battle location */}
                  <EnvironmentChatBackground location={battle.chosen_location} />
                  
                  {/* Battlefield Effects Overlay (temporary message-triggered) */}
                  {battlefieldEffects.length > 0 && (
                    <BattlefieldEffectsOverlay effects={battlefieldEffects} className="rounded-b-lg" />
                  )}
                  
                  <ScrollArea className="min-h-[300px] h-[calc(50vh-env(safe-area-inset-bottom,0px))] max-h-[60vh] p-4 relative z-10 flex-1 overflow-y-auto">
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
                          
                          // Find dice roll associated with this message
                          const msgTime = new Date(msg.created_at).getTime();
                          const associatedRoll = diceRollMessages.find(roll => {
                            const rollTime = roll.timestamp.getTime();
                            // For user messages: match player rolls within 5s
                            // For opponent messages: match opponent rolls within 10s (realtime delay)
                            const timeWindow = isFromOpponent ? 10000 : 5000;
                            const rollOwnerMatch = isFromOpponent ? roll.isPlayerRoll === false : roll.isPlayerRoll === true;
                            return Math.abs(rollTime - msgTime) < timeWindow && rollOwnerMatch;
                          });
                          
                          // Build snapshot-based effects for this specific message
                          // For opponent messages: detect effects described in the message
                          // For user messages: use the stored snapshot from send-time
                          const snapshotEffects: import('@/lib/character-status-effects').CharacterStatusEffect[] = [];
                          
                          if (msg.statusEffectsSnapshot && isFromUser) {
                            // User's own message: render from saved snapshot (permanent)
                            for (const [, effectData] of Object.entries(msg.statusEffectsSnapshot)) {
                              if (effectData) {
                                snapshotEffects.push({
                                  type: effectData.type as import('@/lib/character-status-effects').CharacterStatusType,
                                  intensity: effectData.intensity as 'light' | 'moderate' | 'severe',
                                  duration: 999999999, // Permanent for rendering
                                  startTime: Date.now(), // Always active
                                  source: 'snapshot',
                                });
                              }
                            }
                          } else if (isFromOpponent) {
                            // Opponent messages: detect effects described in their action
                            const detected = detectCharacterStatusEffects(msg.content, userCharacter?.character?.name);
                            snapshotEffects.push(...detected.map(e => ({
                              ...e,
                              duration: 999999999,
                              startTime: Date.now(),
                            })));
                          }
                          
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
                                className={`env-scope p-3 rounded-lg ${
                                  isFromUser
                                    ? `bg-primary/20 border-l-4 border-primary ml-8${msg.isPending ? ' opacity-70' : ''}`
                                    : 'bg-muted/50 border-l-4 border-accent mr-8'
                                }`}
                              >
                                {/* Per-message theme snapshot background */}
                                {msg.themeSnapshot && (
                                  <EnvironmentChatBackground
                                    snapshot={msg.themeSnapshot}
                                    scope="bubble"
                                    className="rounded-lg"
                                  />
                                )}
                                {/* Snapshot-based Status Effect Overlay — permanent per message */}
                                {snapshotEffects.length > 0 && (
                                  <CharacterStatusOverlay 
                                    effects={snapshotEffects} 
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
                                  {/* Pending indicator */}
                                  {msg.isPending && (
                                    <span className="text-xs text-muted-foreground italic ml-auto">Sending...</span>
                                  )}
                                  {/* Read receipt for user's messages */}
                                  {isFromUser && !msg.isPending && (
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
                                <p className="whitespace-pre-wrap break-words relative z-10">{msg.content}</p>
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
                    <div className="p-3 sm:p-4 border-t border-border space-y-2 sm:space-y-3 relative z-10 shrink-0 pb-[env(safe-area-inset-bottom,8px)]">
                      {/* Turn lock indicator */}
                      {!isUserTurn && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Waiting for your turn…</span>
                        </div>
                      )}
                      
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
                            placeholder={isSending
                              ? 'Sending...'
                              : !isUserTurn
                              ? 'Waiting for your turn…'
                              : pendingHit 
                              ? 'Resolve the incoming attack first...'
                              : 'Describe your action or attack...'}
                            disabled={!!pendingHit || isSending}
                            className="relative z-20"
                          />
                        </div>
                        <Button type="submit" size="icon" disabled={!!pendingHit || !messageInput.trim() || isSending || !isUserTurn} className="min-h-[44px] min-w-[44px]">
                          {isSending ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              </TurnIndicatorWrapper>
            </TabsContent>

            <TabsContent value="out_of_universe" className="mt-0">
              <ScrollArea className="min-h-[300px] h-[50vh] max-h-[60vh] p-4">
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
                      placeholder={isSending ? "Sending..." : "Say something OOC..."}
                      value={activeChannel === 'out_of_universe' ? messageInput : ''}
                      onChange={(e) => handleInputChange(e.target.value, 'out_of_universe')}
                      disabled={isSending}
                    />
                    <Button type="submit" size="icon" variant="secondary" disabled={isSending || !messageInput.trim()} className="min-h-[44px] min-w-[44px]">
                      {isSending ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </form>
                </div>
              )}
            </TabsContent>

            {/* Private Narrator Tab */}
            <TabsContent value="private_narrator" className="mt-0">
              {battle.status === 'active' && userCharacter?.character ? (
                <PrivateNarratorChat
                  battleId={battle.id}
                  characterName={userCharacter.character.name}
                  characterPowers={userCharacter.character.powers ?? null}
                  characterAbilities={userCharacter.character.abilities ?? null}
                  battleLocation={battle.chosen_location ?? null}
                  opponentNames={participants.filter(p => p.character?.user_id !== user?.id).map(p => p.character?.name || 'Unknown')}
                  publicMessages={inUniverseMessages}
                  pendingValidation={pendingNarratorValidation}
                  onMoveApproved={handleNarratorMoveApproved}
                  onMoveRejected={handleNarratorMoveRejected}
                  onAbilityLearned={handleAbilityLearned}
                  glowing={narratorGlowing}
                  mechanicDiscoveries={pendingDiscoveries}
                  onDiscoveriesShown={handleDiscoveriesShown}
                />
              ) : (
                <div className="flex items-center justify-center h-[300px] text-center text-muted-foreground">
                  <div>
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">The narrator will be available once the battle begins.</p>
                  </div>
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
      {/* Save Location Prompt */}
      <SaveLocationPrompt
        open={showSaveLocationPrompt}
        onOpenChange={setShowSaveLocationPrompt}
        locationName={emergencyLocation?.name || battle?.chosen_location || ''}
        locationDescription={emergencyLocation?.description}
        isEmergency={!!emergencyLocation}
        hazardDescription={emergencyLocation?.hazards}
        countdownSeconds={emergencyLocation?.countdownTurns ? emergencyLocation.countdownTurns * 60 : undefined}
        initialTags={emergencyLocation?.tags || []}
      />
    </div>
  );
}
