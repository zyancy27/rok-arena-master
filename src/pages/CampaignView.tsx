import { useEffect, useState, useRef, useCallback } from 'react';
import { RealtimeStatus } from '@/components/ui/realtime-status';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/use-subscription';
import { supabase } from '@/integrations/supabase/client';
import { fromDecrypted } from '@/lib/encrypted-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VoiceTextarea } from '@/components/ui/voice-textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  ArrowLeft, Compass, Heart, LogOut, MapPin, Play, Send,
  Shield, Swords, Users, Zap, Clock, Sun, Moon, Backpack,
  Volume2, VolumeX, RefreshCw, BookOpen, Sparkles, Dices, Trash2, UserCheck, FastForward,
  Target, Brain, Map as MapIcon, Check, CheckCheck,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import EnvironmentChatBackground from '@/components/battles/EnvironmentChatBackground';
import { findLatestSceneShift } from '@/lib/scene-location-tracker';
import DiceRollChatMessage from '@/components/battles/DiceRollChatMessage';
import HitDetectionBadge from '@/components/battles/HitDetectionBadge';
import { CharacterStatusOverlay } from '@/components/battles/CharacterStatusOverlay';
import BattlefieldEffectsOverlay from '@/components/battles/BattlefieldEffectsOverlay';
import { useBattlefieldEffects } from '@/components/battles/useBattlefieldEffects';
import { shouldSuppressStatus } from '@/lib/battlefield-effects';
import MoveValidationWarning from '@/components/battles/MoveValidationWarning';
import type { Campaign, CampaignParticipant, CampaignMessage } from '@/lib/campaign-types';
import { getTimeEmoji, CAMPAIGN_STARTING_ABILITIES, XP_REWARDS, advanceTime } from '@/lib/campaign-types';
import CampaignInventoryPanel, { type InventoryItem } from '@/components/campaigns/CampaignInventoryPanel';
import CampaignEndDialog from '@/components/campaigns/CampaignEndDialog';
import CampaignNarratorChat from '@/components/campaigns/CampaignNarratorChat';
import { useAmbientSound } from '@/hooks/use-ambient-sound';
import { discoverMechanic, type MechanicKey } from '@/lib/mechanic-discovery';
import { useCampaignNarrative } from '@/hooks/use-campaign-narrative';
import { useCampaignCombat } from '@/hooks/use-campaign-combat';
import type { CampaignMechanicDiscovery } from '@/components/campaigns/CampaignNarratorChat';
import BagBubble from '@/components/campaigns/BagBubble';
import CampaignEnemyTracker, { type CampaignEnemy } from '@/components/campaigns/CampaignEnemyTracker';
import CampaignStatAllocation from '@/components/campaigns/CampaignStatAllocation';
import { useCampaignTrades } from '@/hooks/use-campaign-trades';
import ConcentrationButton from '@/components/battles/ConcentrationButton';
import type { CharacterStats } from '@/lib/character-stats';
import CampaignTacticalMap, { type NarratorSceneMap } from '@/components/campaigns/CampaignTacticalMap';
import NarratorMessageContent from '@/components/campaigns/NarratorMessageContent';
import NpcDialogueBubble from '@/components/campaigns/NpcDialogueBubble';
import { parseNarratorMessage, resolveNpcDisplayName } from '@/lib/npc-dialogue-parser';
import { getChatSoundsEngine } from '@/lib/chat-sounds';
import { useUserSettings } from '@/hooks/use-user-settings';
import { useNarrationController } from '@/hooks/use-narration-controller';
import OverchargeToggle from '@/components/battles/OverchargeToggle';
import { resolveOvercharge, getOverchargeContext } from '@/lib/battle-overcharge';
import { invokeOrchestrator } from '@/lib/story-orchestrator';
import { IntentEngine } from '@/systems/intent/IntentEngine';
import { CharacterContextResolver } from '@/systems/character/CharacterContextResolver';
import { ActionResolver, formatActionForNarrator } from '@/systems/resolution/ActionResolver';
import { CombatResolver, formatCombatResolutionForNarrator, toActionResult } from '@/systems/combat/CombatResolver';
import { createCombatState } from '@/systems/combat/CombatState';
import { buildCampaignNpcTurn, formatNpcBrainForNarrator } from '@/systems/npc/NpcBrainAdapters';
import { buildNarrationPlaybackOptions, buildNarratorMessageMetadata, getNarratorAnimationClass } from '@/lib/narration-playback';
import { IntentDebugCard } from '@/components/intent/IntentDebugCard';
// Helper: build bag content for the inline backpack bubble
function buildBagContent(campaignItems: InventoryItem[], characterWeapons: string | null) {
  const items: { name: string; type: string; rarity: string; equipped: boolean }[] = [];
  
  // Campaign inventory items
  for (const i of campaignItems) {
    items.push({ name: i.item_name, type: i.item_type, rarity: i.item_rarity, equipped: i.is_equipped });
  }
  
  // Character sheet weapons/items (always available) — show name only in bag
  if (characterWeapons) {
    let parsed: { name: string; description?: string }[] = [];
    try {
      const json = JSON.parse(characterWeapons);
      if (Array.isArray(json)) parsed = json;
    } catch {
      // Legacy plain-text format
      parsed = characterWeapons.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean).map(n => ({ name: n }));
    }
    for (const si of parsed) {
      if (si.name.trim()) {
        items.push({ name: si.name.trim(), type: 'personal', rarity: 'unique', equipped: true });
      }
    }
  }
  
  return items;
}

function resolveCampaignEnemyContext(enemy: CampaignEnemy) {
  return CharacterContextResolver.resolve({
    characterId: enemy.id,
    name: enemy.name,
    tier: enemy.tier,
    stats: {
      stat_strength: 50,
      stat_speed: 50,
      stat_durability: 50,
      stat_stamina: 50,
      stat_skill: 50,
      stat_battle_iq: 50,
      stat_power: 50,
      stat_intelligence: 50,
      stat_luck: 50,
    },
    stamina: 100,
    energy: 50,
  });
}

export default function CampaignView() {
  const { id: campaignId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [participants, setParticipants] = useState<CampaignParticipant[]>([]);
  const [messages, setMessages] = useState<CampaignMessage[]>([]);
  const [myParticipant, setMyParticipant] = useState<CampaignParticipant | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [narratorTyping, setNarratorTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [myJoinRequest, setMyJoinRequest] = useState<any | null>(null);
  const [campaignEnemies, setCampaignEnemies] = useState<CampaignEnemy[]>([]);
  const [knownNpcNames, setKnownNpcNames] = useState<Set<string>>(new Set());
  const [showStatAllocation, setShowStatAllocation] = useState(false);
  const [sceneMap, setSceneMap] = useState<NarratorSceneMap | null>(null);
  const [overchargeEnabled, setOverchargeEnabled] = useState(false);
  const playerMessageCountRef = useRef(0);
  const worldSimThresholdRef = useRef(Math.floor(Math.random() * 10) + 6);
  const [narratorSentiment, setNarratorSentiment] = useState<{
    nickname: string | null;
    sentiment_score: number;
    opinion_summary: string | null;
    personality_notes: string | null;
    memorable_moments: string[];
    relationship_stage?: string;
    curiosity?: number;
    respect?: number;
    trust?: number;
    amusement?: number;
    disappointment?: number;
    intrigue?: number;
    story_value?: number;
    creativity_score?: number;
    world_interaction_score?: number;
    npc_interaction_score?: number;
    exploration_score?: number;
    combat_style_score?: number;
    story_engagement_score?: number;
    story_compatibility?: number;
    narrator_observations?: string[];
    nickname_history?: string[];
  } | null>(null);
  const [showTacticalMap, setShowTacticalMap] = useState(false);
  const [activeTab, setActiveTab] = useState<'adventure' | 'narrator'>('adventure');
  const userIsNearBottomRef = useRef(true);
  const introAttemptedRef = useRef(false);
  const consecutiveAdvancesRef = useRef(0);
  const [showNewMsgIndicator, setShowNewMsgIndicator] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');

  // ── Narrator Voice & Chat Sounds ──
  const { settings: userSettings } = useUserSettings();
  const { hasAIAccess } = useSubscription();
  const narratorVoice = useNarrationController({
    enabled: userSettings.audio.narratorVoiceEnabled,
    voiceVolume: userSettings.audio.narratorVoiceVolume * userSettings.audio.masterVolume,
    soundVolume: userSettings.audio.narrationAmbientVolume * userSettings.audio.masterVolume,
    tapToNarrate: userSettings.audio.tapToNarrate,
    askBeforeTapToNarrate: userSettings.audio.askBeforeTapToNarrate,
    narrationHighlightEnabled: userSettings.audio.narrationHighlightEnabled,
    narrationDebug: userSettings.audio.narrationDebug,
    hasAIAccess,
    ambientEnabled: userSettings.audio.narrationAmbientEnabled,
    ambientIntensity: userSettings.audio.narrationAmbientIntensity,
    ambientVolume: userSettings.audio.narrationAmbientVolume,
    masterVolume: userSettings.audio.masterVolume,
    reduceVocalSounds: userSettings.audio.narrationReduceVocalSounds,
  });
  const narratorVoiceRef = useRef(narratorVoice);
  narratorVoiceRef.current = narratorVoice;
  const userSettingsRef = useRef(userSettings);
  userSettingsRef.current = userSettings;
  const chatSoundsEngine = getChatSoundsEngine();
  useEffect(() => {
    chatSoundsEngine.setEnabled(userSettings.audio.chatSoundsEnabled);
    chatSoundsEngine.setVolume(userSettings.audio.chatSoundsVolume * userSettings.audio.masterVolume);
  }, [userSettings.audio.chatSoundsEnabled, userSettings.audio.chatSoundsVolume, userSettings.audio.masterVolume]);

  // Pending send context held while concentration prompt is active
  const pendingSendRef = useRef<{
    messageText: string;
    soloIntent: 'go_solo' | 'rejoin' | null;
    participant: CampaignParticipant;
    campaign: Campaign;
  } | null>(null);

  // Ref to avoid stale closure in realtime callbacks
  const participantsRef = useRef<CampaignParticipant[]>([]);

  // Read receipt tracking for campaign messages
  const [otherReadIds, setOtherReadIds] = useState<Set<string>>(new Set());

  // Update our read receipt when new messages arrive
  useEffect(() => {
    const updateReadReceipt = async () => {
      if (!myParticipant || !messages.length || campaign?.status !== 'active') return;
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg || lastMsg.isPending) return;
      // Only update if the last message is from someone else
      if (lastMsg.character_id === myParticipant.character_id && lastMsg.sender_type === 'player') return;
      await supabase
        .from('campaign_participants')
        .update({ last_read_message_id: lastMsg.id, last_read_at: new Date().toISOString() })
        .eq('id', myParticipant.id);
    };
    updateReadReceipt();
  }, [messages, myParticipant, campaign?.status]);

  // Build set of message IDs that other participants have read
  useEffect(() => {
    if (!myParticipant || participants.length <= 1) return;
    const others = participants.filter(p => p.id !== myParticipant.id);
    // Collect all message IDs that at least one other participant has read up to
    const readSet = new Set<string>();
    for (const other of others) {
      if (other.last_read_message_id) {
        // Mark all messages up to and including last_read_message_id as read
        for (const msg of messages) {
          readSet.add(msg.id);
          if (msg.id === other.last_read_message_id) break;
        }
      }
    }
    setOtherReadIds(readSet);
  }, [participants, messages, myParticipant]);

  const otherParticipantsReadThis = (messageId: string) => otherReadIds.has(messageId);

  // ── Typing indicator state ──
  const [typingParticipants, setTypingParticipants] = useState<{ name: string; characterId: string }[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const updateTypingStatus = async (isTyping: boolean) => {
    if (!myParticipant) return;
    await supabase
      .from('campaign_participants')
      .update({ is_typing: isTyping, last_typed_at: isTyping ? new Date().toISOString() : null })
      .eq('id', myParticipant.id);
  };

  const handleCampaignInputChange = (value: string) => {
    setInputMessage(value);
    // Debounce typing indicator
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (value.trim()) {
      typingDebounceRef.current = setTimeout(() => updateTypingStatus(true), 300);
      // Auto-clear after 5 seconds of no input
      typingTimeoutRef.current = setTimeout(() => updateTypingStatus(false), 5000);
    } else {
      updateTypingStatus(false);
    }
  };

  // Clear typing on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    };
  }, []);

  // Dynamic scene location from messages
  const [activeSceneLocation, setActiveSceneLocation] = useState<string | null>(null);
  useEffect(() => {
    if (!messages.length) return;
    const adventureMessages = messages
      .filter(m => (m.channel as string) === 'adventure' || m.channel === 'in_universe')
      .map(m => ({ content: m.content, role: m.sender_type, channel: 'in_universe' }));
    if (adventureMessages.length < 2) return;
    const shift = findLatestSceneShift(adventureMessages.slice(-6));
    if (shift) setActiveSceneLocation(shift.newLocation);
  }, [messages]);

  useEffect(() => {
    if (!campaign || campaign.status !== 'active') return;
    narratorVoice.onSceneChange();
  }, [activeSceneLocation, campaign?.current_zone, campaign?.status]);

  const campaignTrades = useCampaignTrades(campaignId, myParticipant?.id);

  // Ambient environment sounds for campaign chat only — uses scene location when available, falls back to zone
  const { muted: ambientMuted, toggleMute: toggleAmbientMute } = useAmbientSound({
    enabled: campaign?.status === 'active' && activeTab === 'adventure',
    location: activeSceneLocation || campaign?.current_zone,
  });

  // Join / swap dialog
  const [characters, setCharacters] = useState<{ id: string; name: string; level: number; image_url: string | null }[]>([]);
  const [joinCharacter, setJoinCharacter] = useState('');
  const [swapCharacter, setSwapCharacter] = useState('');
  const [swapping, setSwapping] = useState(false);

  // Mechanic discoveries
  const [pendingDiscoveries, setPendingDiscoveries] = useState<CampaignMechanicDiscovery[]>([]);
  const [narratorTabGlowing, setNarratorTabGlowing] = useState(false);

  // Combat pulse state: 'none' | 'red' | 'green'
  const [combatPulse, setCombatPulse] = useState<'none' | 'red' | 'green'>('none');
  const combatPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Collect all party member names for move validation name exclusion
  const allPartyNames = participants
    .map(p => p.character?.name)
    .filter((n): n is string => !!n);

  // Combat mechanics integration
  const campaignCombat = useCampaignCombat(
    myParticipant?.character ? {
      characterId: myParticipant.character_id,
      name: myParticipant.character.name,
      level: myParticipant.character.level,
      campaignLevel: myParticipant.campaign_level,
      powers: myParticipant.character.powers || null,
      abilities: myParticipant.character.abilities || null,
    } : null,
    allPartyNames
  );

  // Battlefield environment effects (fire, ice, storm, etc.)
  const { activeEffects: battlefieldEffects, processMessage: processEffectMessage } = useBattlefieldEffects({
    enabled: campaign?.status === 'active',
  });

  // Narrative systems context (identity, gravity, echo, reflection, pressure, conscience)
  const campaignNarrative = useCampaignNarrative(
    myParticipant?.character ? {
      characterId: myParticipant.character_id,
      characterName: myParticipant.character.name,
      campaignId: campaignId || '',
      campaignDescription: campaign?.description || null,
    } : null
  );

  const triggerDiscovery = (key: MechanicKey) => {
    if (!user) return;
    const info = discoverMechanic(user.id, key);
    if (info) {
      setPendingDiscoveries(prev => [...prev, info]);
      setNarratorTabGlowing(true);
    }
  };

  useEffect(() => {
    if (user && campaignId) {
      fetchAll();
      fetchCharacters();
      setupRealtime();
    }
    return () => {
      supabase.removeChannel(supabase.channel(`campaign-${campaignId}`));
    };
  }, [user, campaignId]);

  // Fetch narrator sentiment when participant character is known
  useEffect(() => {
    if (myParticipant?.character_id) {
      fetchNarratorSentiment(myParticipant.character_id);
    }
  }, [myParticipant?.character_id]);

  // ── Auto-generate narrator intro if campaign is active but has no narrator message ──
  useEffect(() => {
    if (
      !loading &&
      campaign?.status === 'active' &&
      participants.length > 0 &&
      myParticipant &&
      !introAttemptedRef.current
    ) {
      const hasNarratorMessage = messages.some(m => m.sender_type === 'narrator');
      if (!hasNarratorMessage) {
        introAttemptedRef.current = true;
        (async () => {
          try {
            setNarratorTyping(true);
            const partyInfo = participants
              .filter(p => p.is_active)
              .map(p => `${p.character?.name} (Campaign Lv.${p.campaign_level}, Original Tier ${p.character?.level})`)
              .join(', ');

            const { data, error } = await supabase.functions.invoke('battle-narrator', {
              body: {
                type: 'campaign_intro',
                campaignName: campaign.name,
                campaignDescription: campaign.description,
                location: campaign.current_zone,
                timeOfDay: campaign.time_of_day,
                dayCount: campaign.day_count,
                partyMembers: partyInfo,
                worldState: campaign.world_state,
                storyContext: campaign.story_context,
                environmentTags: campaign.environment_tags,
                chosenLocation: campaign.chosen_location,
                campaignSeed: campaign.campaign_seed || `${campaign.id}-${Date.now()}`,
              },
            });

            if (!error && data?.narration) {
              await supabase.from('campaign_messages').insert([{
                campaign_id: campaign.id,
                sender_type: 'narrator',
                content: data.narration,
                channel: 'in_universe',
                metadata: buildNarratorMessageMetadata(data) as any,
              }]);
              await fetchMessages();
            }
          } catch (err) {
            console.error('Failed to auto-generate campaign intro:', err);
          } finally {
            setNarratorTyping(false);
          }
        })();
      }
    }
  }, [loading, campaign, participants, myParticipant, messages]);


  // Smart auto-scroll: only scroll if user is near the bottom
  useEffect(() => {
    if (userIsNearBottomRef.current) {
      setShowNewMsgIndicator(false);
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setShowNewMsgIndicator(true);
    }
  }, [messages, narratorTyping]);

  // Show stat allocation when points are available after level-up
  useEffect(() => {
    if (myParticipant && myParticipant.available_stat_points > 0) {
      setShowStatAllocation(true);
    }
  }, [myParticipant?.available_stat_points]);

  const setupRealtime = () => {
    supabase
      .channel(`campaign-${campaignId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'campaign_messages', filter: `campaign_id=eq.${campaignId}` },
        async (payload) => {
          const msg = payload.new as any;

          // Detect battlefield effects from narrator messages
          if (msg.sender_type === 'narrator' && msg.content) {
            processEffectMessage(msg.content);
            // Play narrator arrival sound + auto-read
            chatSoundsEngine.play('narrator_message');
            if (userSettingsRef.current.audio.narratorAutoRead && userSettingsRef.current.audio.narratorVoiceEnabled) {
              // NarrationController handles ducking, highlighting, and sound triggers
              narratorVoiceRef.current.narrate(msg.content, msg.id, buildNarrationPlaybackOptions(msg.metadata));
            }
          } else if (msg.sender_type === 'player') {
            // Play received sound if it's from another player
            const isFromMe = participantsRef.current.find(
              p => p.character_id === msg.character_id
            )?.user_id === user?.id;
            if (!isFromMe) {
              chatSoundsEngine.play('message_received');
            }
            // Play dice roll sound
            if (msg.dice_result) {
              chatSoundsEngine.play('dice_roll');
            }
          }

          setMessages(prev => {
            // Check if we have an optimistic (isPending) message that matches
            const optimisticIndex = prev.findIndex(m =>
              m.isPending && m.character_id === msg.character_id && m.content === msg.content
            );
            
            const enriched: CampaignMessage = {
              ...msg,
              metadata: (msg.metadata || {}) as Record<string, unknown>,
              dice_result: msg.dice_result as Record<string, unknown> | null,
              theme_snapshot: msg.theme_snapshot as Record<string, unknown> | null,
              isPending: false,
              character: (() => {
                const participant = participantsRef.current.find(p => p.character_id === msg.character_id);
                return participant?.character
                  ? { name: participant.character.name, image_url: participant.character.image_url }
                  : msg.character || null;
              })(),
            };

            if (optimisticIndex !== -1) {
              return prev.map((m, i) => i === optimisticIndex ? enriched : m);
            }
            
            if (prev.some(m => m.id === msg.id)) return prev;
            
            return [...prev, enriched];
          });
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'campaign_participants', filter: `campaign_id=eq.${campaignId}` },
        (payload) => {
          const updated = payload.new as any;
          // Update typing indicators from other participants
          if (updated.user_id !== user?.id) {
            setTypingParticipants(prev => {
              const without = prev.filter(t => t.characterId !== updated.character_id);
              if (updated.is_typing) {
                const p = participantsRef.current.find(pp => pp.character_id === updated.character_id);
                return [...without, { name: p?.character?.name || 'Someone', characterId: updated.character_id }];
              }
              return without;
            });
          }
          // Also refetch participants for read receipts etc.
          fetchParticipants();
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'campaigns', filter: `id=eq.${campaignId}` },
        (payload) => {
          const updated = payload.new as any;
          setCampaign(prev => prev ? {
            ...prev,
            ...updated,
            environment_tags: Array.isArray(updated.environment_tags) ? updated.environment_tags : [],
            story_context: updated.story_context || {},
            world_state: updated.world_state || {},
            visibility: updated.visibility || prev.visibility,
          } as Campaign : null);
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_inventory', filter: `campaign_id=eq.${campaignId}` },
        () => fetchInventory()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_enemies', filter: `campaign_id=eq.${campaignId}` },
        () => fetchEnemies()
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('connected');
        else if (status === 'CHANNEL_ERROR') setRealtimeStatus('error');
        else if (status === 'TIMED_OUT') setRealtimeStatus('disconnected');
        else if (status === 'CLOSED') setRealtimeStatus('disconnected');
      });
  };

  const fetchKnownNpcs = async () => {
    const { data } = await supabase
      .from('campaign_npcs')
      .select('name')
      .eq('campaign_id', campaignId!)
      .eq('status', 'alive');
    if (data) {
      setKnownNpcNames(new Set(data.map((n: any) => n.name)));
    }
  };

  const fetchNarratorSentiment = async (characterId: string) => {
    const { data } = await supabase
      .from('narrator_sentiments' as any)
      .select('*')
      .eq('character_id', characterId)
      .maybeSingle();
    if (data) {
      setNarratorSentiment({
        nickname: (data as any).nickname,
        sentiment_score: (data as any).sentiment_score ?? 0,
        opinion_summary: (data as any).opinion_summary,
        personality_notes: (data as any).personality_notes,
        memorable_moments: (data as any).memorable_moments || [],
        relationship_stage: (data as any).relationship_stage,
        curiosity: (data as any).curiosity,
        respect: (data as any).respect,
        trust: (data as any).trust,
        amusement: (data as any).amusement,
        disappointment: (data as any).disappointment,
        intrigue: (data as any).intrigue,
        story_value: (data as any).story_value,
        creativity_score: (data as any).creativity_score,
        world_interaction_score: (data as any).world_interaction_score,
        npc_interaction_score: (data as any).npc_interaction_score,
        exploration_score: (data as any).exploration_score,
        combat_style_score: (data as any).combat_style_score,
        story_engagement_score: (data as any).story_engagement_score,
        story_compatibility: (data as any).story_compatibility,
        narrator_observations: (data as any).narrator_observations || [],
        nickname_history: (data as any).nickname_history || [],
      });
    }
  };

  const fetchAll = async () => {
    await Promise.all([fetchCampaign(), fetchParticipants(), fetchMessages(), fetchInventory(), fetchJoinRequests(), fetchEnemies(), fetchKnownNpcs()]);
    setLoading(false);
  };

  const fetchCampaign = async () => {
    const { data } = await supabase.from('campaigns').select('*').eq('id', campaignId!).single();
    if (data) setCampaign({
      ...data,
      environment_tags: Array.isArray(data.environment_tags) ? data.environment_tags as string[] : [],
      story_context: (data.story_context || {}) as Record<string, unknown>,
      world_state: (data.world_state || {}) as Record<string, unknown>,
      visibility: (data as any).visibility || 'public',
    } as Campaign);
  };

  const fetchParticipants = async () => {
    const { data } = await supabase
      .from('campaign_participants')
      .select('*, character:characters(name, image_url, level, user_id, race, sub_race, stat_strength)')
      .eq('campaign_id', campaignId!);
    // Fetch decrypted character fields separately
    if (data) {
      const charIds = data.map(p => (Array.isArray(p.character) ? p.character[0]?.id : (p as any).character_id)).filter(Boolean);
      const uniqueIds = [...new Set(charIds.map(id => typeof id === 'string' ? id : (data.find(d => true) as any)?.character_id))];
      const realIds = data.map(p => p.character_id);
      if (realIds.length > 0) {
        const { data: decChars } = await fromDecrypted('characters')
          .select('id, powers, abilities, weapons_items, lore, personality, mentality')
          .in('id', realIds);
        if (decChars) {
          const charMap = Object.fromEntries(decChars.map((c: any) => [c.id, c]));
          data.forEach(p => {
            const dec = charMap[p.character_id];
            if (dec && p.character) {
              const char = Array.isArray(p.character) ? p.character[0] : p.character;
              if (char) Object.assign(char, { powers: dec.powers, abilities: dec.abilities, weapons_items: dec.weapons_items, lore: dec.lore, personality: dec.personality, mentality: dec.mentality });
            }
          });
        }
      }
    }
    if (data) {
      const parsed = data.map(p => ({
        ...p,
        stat_overrides: (p.stat_overrides || {}) as Record<string, number>,
        unlocked_abilities: Array.isArray(p.unlocked_abilities) ? p.unlocked_abilities as string[] : [],
        character: Array.isArray(p.character) ? p.character[0] : p.character,
      })) as CampaignParticipant[];
      setParticipants(parsed);
      participantsRef.current = parsed;
      setMyParticipant(parsed.find(p => p.user_id === user!.id && p.is_active) || null);
    }
  };

  const fetchMessages = async () => {
    // Fetch the LATEST 200 messages (descending) then reverse to chronological order
    const { data } = await supabase
      .from('campaign_messages')
      .select('*, character:characters(name, image_url)')
      .eq('campaign_id', campaignId!)
      .order('created_at', { ascending: false })
      .limit(200);
    if (data) {
      const chronological = data.reverse();
      setMessages(chronological.map(m => ({
        ...m,
        metadata: (m.metadata || {}) as Record<string, unknown>,
        dice_result: m.dice_result as Record<string, unknown> | null,
        theme_snapshot: m.theme_snapshot as Record<string, unknown> | null,
        character: Array.isArray(m.character) ? m.character[0] : m.character,
      })) as CampaignMessage[]);
      // Scroll to bottom after loading messages (e.g. on page refresh)
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 150);
    }
  };

  const fetchCharacters = async () => {
    const { data } = await supabase
      .from('characters')
      .select('id, name, level, image_url')
      .eq('user_id', user!.id)
      .order('name');
    if (data) setCharacters(data);
  };

  const fetchInventory = async () => {
    if (!campaignId) return;
    const { data } = await supabase
      .from('campaign_inventory')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    if (data) setInventory(data.map(i => ({
      ...i,
      stat_bonus: (i.stat_bonus || {}) as Record<string, number>,
    })) as InventoryItem[]);
  };

  const fetchEnemies = async () => {
    if (!campaignId) return;
    const { data } = await supabase
      .from('campaign_enemies' as any)
      .select('*')
      .eq('campaign_id', campaignId)
      .in('status', ['active', 'hiding', 'defeated', 'fled'])
      .order('created_at', { ascending: true });
    if (data) setCampaignEnemies(data as unknown as CampaignEnemy[]);
  };

  const fetchJoinRequests = async () => {
    if (!campaignId) return;
    const { data } = await supabase
      .from('campaign_join_requests')
      .select('*, character:characters(name, level, image_url)')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (data) {
      setJoinRequests(data);
      setMyJoinRequest(data.find((r: any) => r.user_id === user?.id) || null);
    }
  };

  const handleJoin = async () => {
    if (!joinCharacter || !campaign) { toast.error('Select a character'); return; }

    // If creator, join directly (always allowed)
    const isCreator = campaign.creator_id === user?.id;
    if (isCreator) {
      await directJoin();
      return;
    }

    // For non-creators, submit a join request
    const { error } = await supabase.from('campaign_join_requests').insert({
      campaign_id: campaignId!,
      user_id: user!.id,
      character_id: joinCharacter,
    } as any);

    if (error) {
      if (error.code === '23505') {
        toast.error('You already have a pending request for this campaign');
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success('Join request sent! Waiting for the campaign creator to accept.');
    fetchJoinRequests();
  };

  const directJoin = async () => {
    const { error } = await supabase.from('campaign_participants').insert({
      campaign_id: campaignId!,
      character_id: joinCharacter,
      user_id: user!.id,
      power_reset_applied: true,
    });

    if (error) { toast.error(error.message); return; }

    const char = characters.find(c => c.id === joinCharacter);
    triggerDiscovery('campaign_power_reset');

    // Narrator-driven organic arrival + world briefing (only if campaign is active)
    if (campaign?.status === 'active') {
      try {
        const activeParty = participants.filter(p => p.is_active).map(p => `${p.character?.name}`).join(', ');
        const { data } = await supabase.functions.invoke('battle-narrator', {
          body: {
            type: 'campaign_narration',
            campaignId: campaignId!,
            playerAction: `[NEW ARRIVAL] ${char?.name} has just joined the campaign. Write an organic narrative describing their arrival at ${campaign.current_zone} during ${campaign.time_of_day}. Then give a brief world briefing so they understand where they are, what the current situation is, who else is present (${activeParty || 'nobody yet'}), and what their immediate options are. Make it immersive and in-character.`,
            currentZone: campaign.current_zone,
            timeOfDay: campaign.time_of_day,
            dayCount: campaign.day_count,
            worldState: campaign.world_state,
            storyContext: campaign.story_context,
            campaignDescription: campaign.description,
            environmentTags: campaign.environment_tags,
            playerCharacter: { name: char?.name },
            partyContext: activeParty,
          },
        });
        await supabase.from('campaign_messages').insert({
          campaign_id: campaignId!,
          sender_type: 'narrator',
          content: data?.narration || `A new figure appears — **${char?.name}** has arrived at ${campaign.current_zone}.`,
          channel: 'in_universe',
        });
      } catch {
        await supabase.from('campaign_messages').insert({
          campaign_id: campaignId!,
          sender_type: 'narrator',
          content: `A new figure emerges from the path — **${char?.name || 'a new adventurer'}** has arrived at ${campaign.current_zone}.`,
          channel: 'in_universe',
        });
      }
    } else {
      await supabase.from('campaign_messages').insert({
        campaign_id: campaignId!,
        sender_type: 'system',
        content: `**${char?.name || 'A new adventurer'}** has joined the campaign.`,
        channel: 'in_universe',
      });
    }

    toast.success('Joined campaign!');
    fetchParticipants();
  };

  const handleAcceptRequest = async (request: any) => {
    if (!campaign) return;

    // Add them as participant
    const { error: joinErr } = await supabase.from('campaign_participants').insert({
      campaign_id: campaign.id,
      character_id: request.character_id,
      user_id: request.user_id,
      power_reset_applied: true,
    });

    if (joinErr) { toast.error(joinErr.message); return; }

    // Update request status
    await supabase.from('campaign_join_requests')
      .update({ status: 'accepted' } as any)
      .eq('id', request.id);

    // Add system message
    const charName = request.character?.name || 'A new adventurer';
    await supabase.from('campaign_messages').insert({
      campaign_id: campaign.id,
      sender_type: 'system',
      content: `**${charName}** has been accepted into the campaign!`,
      channel: 'in_universe',
    });

    toast.success(`Accepted ${charName}!`);
    fetchParticipants();
    fetchJoinRequests();
  };

  const handleDeclineRequest = async (request: any) => {
    await supabase.from('campaign_join_requests')
      .update({ status: 'declined' } as any)
      .eq('id', request.id);

    toast.success('Request declined.');
    fetchJoinRequests();
  };

  const handleLeave = async () => {
    if (!myParticipant || !campaign) return;

    await supabase.from('campaign_participants')
      .update({ is_active: false })
      .eq('id', myParticipant.id);

    const charName = myParticipant.character?.name || 'An adventurer';

    // Narrator-driven organic departure (only if campaign is active)
    if (campaign.status === 'active') {
      try {
        const { data } = await supabase.functions.invoke('battle-narrator', {
          body: {
            type: 'campaign_narration',
            campaignId: campaign.id,
            playerAction: `[DEPARTURE] ${charName} is leaving the party. Write a brief, organic narrative describing their departure from ${campaign.current_zone} during ${campaign.time_of_day}. Make it feel natural — perhaps they have other duties, or they slip away quietly.`,
            currentZone: campaign.current_zone,
            timeOfDay: campaign.time_of_day,
            dayCount: campaign.day_count,
            worldState: campaign.world_state,
            storyContext: campaign.story_context,
            campaignDescription: campaign.description,
            playerCharacter: { name: charName },
            partyContext: participants.filter(p => p.is_active && p.id !== myParticipant.id).map(p => `${p.character?.name}`).join(', '),
          },
        });
        await supabase.from('campaign_messages').insert({
          campaign_id: campaign.id,
          sender_type: 'narrator',
          content: data?.narration || `**${charName}** turns and walks away from the group.`,
          channel: 'in_universe',
        });
      } catch {
        await supabase.from('campaign_messages').insert({
          campaign_id: campaign.id,
          sender_type: 'narrator',
          content: `**${charName}** quietly slips away from the party, disappearing into the ${campaign.current_zone}.`,
          channel: 'in_universe',
        });
      }
    } else {
      await supabase.from('campaign_messages').insert({
        campaign_id: campaignId!,
        sender_type: 'system',
        content: `**${charName}** has left the party.`,
        channel: 'in_universe',
      });
    }

    toast.success('Left campaign. Your progress is saved — you can return anytime.');
    fetchParticipants();
  };

  const handleSwapCharacter = async () => {
    if (!swapCharacter || !myParticipant || !campaign) return;
    if (swapCharacter === myParticipant.character_id) {
      toast.error('That character is already active');
      return;
    }
    setSwapping(true);
    try {
      // Deactivate current character (preserves their campaign data)
      await supabase.from('campaign_participants')
        .update({ is_active: false })
        .eq('id', myParticipant.id);

      // Check if the new character was previously in this campaign
      const { data: existing } = await supabase
        .from('campaign_participants')
        .select('id')
        .eq('campaign_id', campaign.id)
        .eq('character_id', swapCharacter)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (existing) {
        // Re-activate with preserved stats
        await supabase.from('campaign_participants')
          .update({ is_active: true })
          .eq('id', existing.id);
      } else {
        // Brand new to campaign — fresh stats
        await supabase.from('campaign_participants').insert({
          campaign_id: campaign.id,
          character_id: swapCharacter,
          user_id: user!.id,
          power_reset_applied: true,
          is_active: true,
        });
      }

      const oldName = myParticipant.character?.name || 'A character';
      const newChar = characters.find(c => c.id === swapCharacter);
      const returning = !!existing;

      // Ask narrator to write an organic in-fiction transition
      try {
        const { data: narratorData, error: narratorErr } = await supabase.functions.invoke('battle-narrator', {
          body: {
            type: 'campaign_narration',
            campaignId: campaign.id,
            playerAction: `[CHARACTER SWAP] ${oldName} is leaving the scene and ${newChar?.name} is ${returning ? 'returning to' : 'arriving in'} the adventure. Write a brief, organic narrative transition that fits the current scenario — describe ${oldName} departing and ${newChar?.name} appearing in a way that feels natural to the location and story.`,
            currentZone: campaign.current_zone,
            timeOfDay: campaign.time_of_day,
            dayCount: campaign.day_count,
            worldState: campaign.world_state,
            storyContext: campaign.story_context,
            campaignDescription: campaign.description,
            playerCharacter: {
              name: oldName,
              swapTarget: newChar?.name,
              isReturning: returning,
            },
            partyContext: participants.filter(p => p.is_active).map(p =>
              `${p.character?.name} (Campaign Lv.${p.campaign_level})`
            ).join(', '),
          },
        });

        const narration = narratorData?.narration;
        await supabase.from('campaign_messages').insert({
          campaign_id: campaign.id,
          sender_type: 'narrator',
          content: narration || `${oldName} fades from view as ${newChar?.name} ${returning ? 'returns' : 'arrives'}.`,
          channel: 'in_universe',
        });
      } catch {
        // Fallback if narrator fails
        await supabase.from('campaign_messages').insert({
          campaign_id: campaign.id,
          sender_type: 'narrator',
          content: `${oldName} slips away as ${newChar?.name} ${returning ? 'rejoins the group' : 'steps into the scene for the first time'}.`,
          channel: 'in_universe',
        });
      }

      setSwapCharacter('');
      triggerDiscovery('campaign_character_swap');
      toast.success(`Swapped to ${newChar?.name}`);
      fetchParticipants();
    } catch (err) {
      console.error('Swap error:', err);
      toast.error('Failed to swap character');
    } finally {
      setSwapping(false);
    }
  };

  const handleStartCampaign = async () => {
    if (!campaign) return;
    await supabase.from('campaigns').update({ status: 'active' }).eq('id', campaign.id);

    // Generate opening narration
    try {
      const partyInfo = participants
        .filter(p => p.is_active)
        .map(p => `${p.character?.name} (Campaign Lv.${p.campaign_level}, Original Tier ${p.character?.level})`)
        .join(', ');

      const { data, error } = await supabase.functions.invoke('battle-narrator', {
        body: {
          type: 'campaign_intro',
          campaignName: campaign.name,
          campaignDescription: campaign.description,
          location: campaign.current_zone,
          timeOfDay: campaign.time_of_day,
          dayCount: campaign.day_count,
          partyMembers: partyInfo,
          worldState: campaign.world_state,
          storyContext: campaign.story_context,
          environmentTags: campaign.environment_tags,
          chosenLocation: campaign.chosen_location,
          campaignSeed: campaign.campaign_seed || `${campaign.id}-${Date.now()}`,
        },
      });

      if (!error && data?.narration) {
          await supabase.from('campaign_messages').insert([{
            campaign_id: campaign.id,
            sender_type: 'narrator',
            content: data.narration,
            channel: 'in_universe',
            metadata: buildNarratorMessageMetadata(data) as any,
          }]);
      }
    } catch (err) {
      console.error('Failed to generate intro:', err);
    }

    toast.success('Campaign started!');
    fetchCampaign();
  };

  // Intent detection patterns for solo/rejoin — checked after narrator responds
  const SOLO_INTENT_PATTERNS = [
    /\b(go|head|venture|wander|sneak|slip|step)\b.{0,20}\b(alone|solo|on my own|by myself|away from|off on)\b/i,
    /\b(leave|split from|separate from|break away|part ways)\b.{0,20}\b(group|party|team|others|companions)\b/i,
    /\b(i('ll| will)?|let me)\b.{0,15}\b(explore|scout|investigate|check out)\b.{0,15}\b(alone|solo|on my own|by myself)\b/i,
    /\bstep away\b/i,
    /\bgo.{0,5}my own way\b/i,
  ];

  const REJOIN_INTENT_PATTERNS = [
    /\b(rejoin|regroup|find|meet up|catch up|return to|head back to|go back to)\b.{0,20}\b(group|party|team|others|companions)\b/i,
    /\b(find|look for|search for)\b.{0,20}\b(party|group|companions|team|friends|allies)\b/i,
    /\b(done|finished)\b.{0,15}\b(solo|alone|exploring|scouting)\b/i,
    /\bgo\s+back\b/i,
  ];

  const detectSoloIntent = (text: string): 'go_solo' | 'rejoin' | null => {
    if (!isSoloMode && SOLO_INTENT_PATTERNS.some(p => p.test(text))) return 'go_solo';
    if (isSoloMode && REJOIN_INTENT_PATTERNS.some(p => p.test(text))) return 'rejoin';
    return null;
  };

  const applySoloStatusChange = async (intent: 'go_solo' | 'rejoin') => {
    if (!myParticipant) return;
    const newSolo = intent === 'go_solo';
    await supabase.from('campaign_participants')
      .update({ is_solo: newSolo } as any)
      .eq('id', myParticipant.id);
  };

  /**
   * Background narrator call — fires after the player message is confirmed.
   * Runs independently so the input stays unlocked.
   */
  const fireNarratorResponse = async (
    messageText: string,
    soloIntent: 'go_solo' | 'rejoin' | null,
    combatResult: ReturnType<typeof campaignCombat.processCombatAction>,
    snapshotParticipant: CampaignParticipant,
    snapshotCampaign: Campaign,
    overchargeContext: string = '',
  ) => {
    setNarratorTyping(true);
    try {
      // Fetch recent conversation history for AI continuity (last 20 messages)
      const { data: recentMsgs } = await supabase
        .from('campaign_messages')
        .select('sender_type, content, character_id')
        .eq('campaign_id', snapshotCampaign.id)
        .eq('channel', 'in_universe')
        .order('created_at', { ascending: false })
        .limit(20);
      const conversationHistory = (recentMsgs || []).reverse().map((m: any) => ({
        role: m.sender_type === 'player' ? 'player' : 'world',
        content: m.content,
      }));

      const activeParticipants = participants.filter(p => p.is_active);
      const partyContext = activeParticipants.map(p =>
        `${p.character?.name} (Campaign Lv.${p.campaign_level}, HP: ${p.campaign_hp}/${p.campaign_hp_max}${(p as any).is_solo ? ', SOLO — away from group' : ''})`
      ).join(', ');

      const equippedCampaignItems = inventory.filter(i => i.is_equipped);

      // Build character lore/fame context for narrator
      const charData = snapshotParticipant.character;
      const loreContext: Record<string, unknown> = {};
      if (charData?.lore) loreContext.lore = charData.lore;
      if (charData?.race) loreContext.race = charData.race;
      if (charData?.sub_race) loreContext.subRace = charData.sub_race;
      if (charData?.personality) loreContext.personality = charData.personality;
      if (charData?.mentality) loreContext.mentality = charData.mentality;

      // Fetch linked stories, groups, race, and existing campaign NPCs in parallel
      const [storiesRes, groupsRes, raceRes, npcsRes, npcRelsRes] = await Promise.all([
        supabase.from('story_characters').select('story:stories(title, summary, is_published)').eq('character_id', snapshotParticipant.character_id),
        supabase.from('character_group_members').select('group:character_groups(name, description)').eq('character_id', snapshotParticipant.character_id),
        charData?.race ? supabase.from('races').select('name, description, typical_abilities, cultural_traits, home_planet').eq('name', charData.race).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('campaign_npcs').select('*').eq('campaign_id', snapshotCampaign.id).eq('status', 'alive').limit(30),
        supabase.from('npc_relationships').select('*').eq('campaign_id', snapshotCampaign.id).eq('character_id', snapshotParticipant.character_id),
      ]);

      const publishedStories = (storiesRes.data || [])
        .map((s: any) => s.story)
        .filter((s: any) => s && s.is_published)
        .map((s: any) => ({ title: s.title, summary: s.summary }));
      if (publishedStories.length > 0) loreContext.knownStories = publishedStories;

      const groups = (groupsRes.data || [])
        .map((g: any) => g.group)
        .filter(Boolean)
        .map((g: any) => ({ name: g.name, description: g.description }));
      if (groups.length > 0) loreContext.affiliations = groups;

      if (raceRes.data) loreContext.speciesInfo = raceRes.data;

      // Build known NPCs context for the AI
      const knownNpcs = (npcsRes.data || []).map((npc: any) => {
        const rel = (npcRelsRes.data || []).find((r: any) => r.npc_id === npc.id);
        return {
          id: npc.id,
          name: npc.name,
          role: npc.role,
          personality: npc.personality,
          appearance: npc.appearance,
          current_zone: npc.current_zone,
          backstory: npc.backstory,
          disposition: rel?.disposition || 'neutral',
          trust_level: rel?.trust_level || 0,
          relationship_notes: rel?.notes || null,
          last_seen_day: npc.last_seen_day,
        };
      });

      // Detect inventory-check intent
      const INVENTORY_CHECK_PATTERNS = [
        /\b(check|look|search|dig|rummage|open|peek)\b.{0,20}\b(bag|backpack|pocket|pockets|inventory|items|pouch|satchel|pack|belongings|supplies|gear|stuff)\b/i,
        /\bwhat do i have\b/i,
        /\bmy (items|inventory|stuff|gear|belongings)\b/i,
        /\b(check|look at) (my |what i ).{0,10}(have|carry|got)\b/i,
        /\b(use|equip|unequip|drink|eat|consume|apply|wear|wield|put on|take off)\b.{0,20}\b(potion|sword|shield|item|weapon|armor|ring|amulet|scroll|herb|food|bandage)\b/i,
        /\b(pick up|grab|take|pocket|collect|loot|gather)\b.{0,20}\b(item|loot|treasure|gold|coin|gem|weapon|armor|potion|herb|key|scroll)\b/i,
        /\b(drop|discard|throw away|toss|get rid of)\b.{0,15}\b(item|weapon|potion|armor)\b/i,
        /\b(pick up|grab|take|pocket|collect|loot)\b/i,
      ];
      const isInventoryCheck = INVENTORY_CHECK_PATTERNS.some(p => p.test(messageText));

      // Build narrative systems context (identity, gravity, echo, reflection, etc.)
      const activeEnemiesList = campaignEnemies.filter(e => e.status === 'active' || e.status === 'hiding');
      const primaryEnemy = activeEnemiesList[0] ?? null;
      const intentResult = IntentEngine.resolve(messageText, {
        mode: 'campaign',
        actorName: snapshotParticipant.character?.name,
        possibleTargets: [
          ...activeEnemiesList.map(enemy => ({ id: enemy.id, name: enemy.name, kind: 'enemy' as const })),
          ...knownNpcs.map(npc => ({ name: npc.name, kind: 'npc' as const })),
        ],
        defaultTool: equippedCampaignItems[0]?.item_name ?? null,
      });
      const characterContext = CharacterContextResolver.resolve({
        characterId: snapshotParticipant.character_id,
        name: snapshotParticipant.character?.name || 'Character',
        tier: snapshotParticipant.character?.level || snapshotParticipant.campaign_level,
        stats: { stat_strength: snapshotParticipant.character?.stat_strength ?? 50 },
        abilities: snapshotParticipant.character?.abilities,
        powers: snapshotParticipant.character?.powers,
        equippedItems: equippedCampaignItems.map(item => item.item_name),
        stamina: Math.round((snapshotParticipant.campaign_hp / Math.max(1, snapshotParticipant.campaign_hp_max)) * 100),
      });
      const enemyContext = primaryEnemy ? resolveCampaignEnemyContext(primaryEnemy) : null;
      const hasThreat = activeEnemiesList.length > 0;
      const combatResolution = intentResult.intent.isCombatAction && hasThreat && primaryEnemy && enemyContext
        ? CombatResolver.resolve(
            intentResult.intent,
            characterContext,
            createCombatState({
              participants: [
                {
                  id: snapshotParticipant.character_id,
                  name: snapshotParticipant.character?.name || 'Character',
                  stats: {
                    hp: snapshotParticipant.campaign_hp,
                    stamina: characterContext.stamina,
                    speed: characterContext.stats.stat_speed,
                    strength: characterContext.stats.stat_strength,
                  },
                },
                {
                  id: primaryEnemy.id,
                  name: primaryEnemy.name,
                  stats: {
                    hp: primaryEnemy.hp,
                    stamina: 100,
                    speed: enemyContext.stats.stat_speed,
                    strength: enemyContext.stats.stat_strength,
                  },
                },
              ],
              rangeZone: 'mid',
              zone: snapshotCampaign.current_zone,
              terrainTags: battlefieldEffects.map((effect: any) => effect.type),
            }),
            {
              actorId: snapshotParticipant.character_id,
              targetId: primaryEnemy.id,
              targetContext: enemyContext,
            },
          )
        : null;
      const npcBrainTurn = primaryEnemy
        ? buildCampaignNpcTurn({
            enemy: {
              id: primaryEnemy.id,
              name: primaryEnemy.name,
              tier: primaryEnemy.tier,
              hp: primaryEnemy.hp,
              hpMax: primaryEnemy.hp_max,
              description: primaryEnemy.description,
              behaviorProfile: primaryEnemy.behavior_profile,
              lastAction: primaryEnemy.last_action,
              metadata: primaryEnemy.metadata,
            },
            player: {
              id: snapshotParticipant.character_id,
              name: snapshotParticipant.character?.name || 'Character',
              healthPct: Math.round((snapshotParticipant.campaign_hp / Math.max(1, snapshotParticipant.campaign_hp_max)) * 100),
              context: characterContext,
            },
            combatResult: combatResolution,
            timeOfDay: snapshotCampaign.time_of_day,
            chaosLevel: Number((snapshotCampaign.world_state as Record<string, unknown> | null)?.chaosLevel ?? 40),
            escapeRoutes: Number((snapshotCampaign.world_state as Record<string, unknown> | null)?.escapeRoutes ?? 2),
          })
        : null;
      const actionResult = combatResolution
        ? toActionResult(combatResolution)
        : ActionResolver.resolve(intentResult.intent, characterContext, {
            activeHazards: battlefieldEffects.map((effect: any) => effect.type),
            hasActiveThreat: hasThreat,
            currentZone: snapshotCampaign.current_zone,
          });
      const structuredAction = combatResolution
        ? formatCombatResolutionForNarrator(intentResult.intent, combatResolution, messageText)
        : formatActionForNarrator(intentResult.intent, actionResult, messageText);
      const npcBrainContext = npcBrainTurn ? formatNpcBrainForNarrator(npcBrainTurn) : null;
      const narrativeSystemsContext = campaignNarrative.buildNarrativeBlock(
        npcBrainContext ? `${structuredAction} | enemyBrain=${npcBrainContext}` : structuredAction,
        activeEnemiesList.length > 0,
        snapshotCampaign.current_zone,
      );

      const { data, error } = await invokeOrchestrator({
        pipelineType: 'campaign_narration',
        characterId: snapshotParticipant.character_id,
        campaignId: snapshotCampaign.id,
        type: 'campaign_narration',
        playerCharacter: {
          name: snapshotParticipant.character?.name,
          campaignLevel: snapshotParticipant.campaign_level,
          originalLevel: snapshotParticipant.character?.level,
          hp: snapshotParticipant.campaign_hp,
          hpMax: snapshotParticipant.campaign_hp_max,
          powers: snapshotParticipant.character?.powers,
          abilities: snapshotParticipant.character?.abilities,
          weaponsItems: (snapshotParticipant.character as any)?.weapons_items,
          strengthStat: (snapshotParticipant.character as any)?.stat_strength ?? 50,
          isSolo: snapshotParticipant.is_solo ?? false,
          soloIntent: soloIntent,
          equippedCampaignItems: equippedCampaignItems.map(i => ({
            item_name: i.item_name,
            item_type: i.item_type,
            item_rarity: i.item_rarity,
            description: i.description,
          })),
          allCampaignItems: inventory.map(i => ({
            id: i.id,
            item_name: i.item_name,
            item_type: i.item_type,
            item_rarity: i.item_rarity,
            description: i.description,
            is_equipped: i.is_equipped,
          })),
          loreContext,
        },
        playerAction: structuredAction,
        playerActionRawText: messageText,
        structuredIntent: intentResult.intent,
        actionResult,
        currentZone: snapshotCampaign.current_zone,
        timeOfDay: snapshotCampaign.time_of_day,
        dayCount: snapshotCampaign.day_count,
        partyContext,
        worldState: snapshotCampaign.world_state,
        storyContext: snapshotCampaign.story_context,
        campaignDescription: snapshotCampaign.description,
        maxAllowedTier: CAMPAIGN_STARTING_ABILITIES.maxPowerTierAtLevel(snapshotParticipant.campaign_level),
        ...(combatResult.narratorDiceContext || {}),
        conversationHistory,
        knownNpcs,
        activeEnemies: activeEnemiesList,
        activeEnemyBrain: npcBrainTurn,
        narrativeSystemsContext,
        overchargeContext: overchargeContext || undefined,
        narratorSentiment: narratorSentiment || undefined,
      });

      if (!error && data?.narration) {
        // Process narrator response for status effects
        campaignCombat.processNarratorResponse(data.narration);

        // Process narrator response for battlefield environment effects
        processEffectMessage(data.narration);

        // Update tactical map from narrator-generated scene data
        if (data.sceneMap && typeof data.sceneMap === 'object' && Array.isArray(data.sceneMap.zones)) {
          setSceneMap(data.sceneMap as NarratorSceneMap);
        }

        // Detect combat pulse: enemy encounter (red) or sneak attack success (green)
        if (data.enemySpawned) {
          const sneakPatterns = /\b(sneak|stealth|ambush|surprise|undetected|unnoticed|from behind|caught off guard)\b/i;
          const playerSneaked = sneakPatterns.test(messageText) || sneakPatterns.test(data.narration);
          const enemyUnaware = /\b(unaware|didn't notice|caught off guard|surprise|from the shadows|before .{0,20} could react)\b/i.test(data.narration);

          if (playerSneaked && enemyUnaware) {
            setCombatPulse('green');
          } else {
            setCombatPulse('red');
          }
          // Clear pulse after 8 seconds
          if (combatPulseTimerRef.current) clearTimeout(combatPulseTimerRef.current);
          combatPulseTimerRef.current = setTimeout(() => setCombatPulse('none'), 8000);
        }

        await supabase.from('campaign_messages').insert([{
          campaign_id: snapshotCampaign.id,
          sender_type: 'narrator',
          content: data.narration,
          channel: 'in_universe',
          metadata: buildNarratorMessageMetadata(data, npcBrainTurn?.narration ? {
            context: activeEnemiesList.length > 0 ? 'combat' : 'danger',
            voiceRate: npcBrainTurn.narration.voiceRate,
            voicePitch: npcBrainTurn.narration.voicePitch,
            soundCue: npcBrainTurn.narration.soundCue,
            animationTag: npcBrainTurn.narration.animationTag,
          } : null) as any,
        }]);

        // Accumulate all XP from this turn and apply level-ups immediately
        let totalXpGained = 0;
        if (data.xpGained) {
          triggerDiscovery('campaign_xp');
          totalXpGained += data.xpGained;
        }

        if (data.hpChange && data.hpChange !== 0) {
          const newHp = Math.max(0, Math.min(snapshotParticipant.campaign_hp_max, snapshotParticipant.campaign_hp + data.hpChange));
          await supabase.from('campaign_participants')
            .update({ campaign_hp: newHp })
            .eq('id', snapshotParticipant.id);
        }

        // Time advancement
        if (data.advanceTime) {
          triggerDiscovery('campaign_time');
          const { time: newTime, newDay } = advanceTime(snapshotCampaign.time_of_day, data.advanceTime);
          await supabase.from('campaigns').update({
            time_of_day: newTime,
            day_count: newDay ? snapshotCampaign.day_count + 1 : snapshotCampaign.day_count,
          }).eq('id', snapshotCampaign.id);
        }

        // Zone change
        if (data.newZone) {
          triggerDiscovery('campaign_zone');
          await supabase.from('campaigns').update({
            current_zone: data.newZone,
          }).eq('id', snapshotCampaign.id);
        }

        // Items found
        if (data.itemsFound && Array.isArray(data.itemsFound) && data.itemsFound.length > 0) {
          triggerDiscovery('campaign_inventory');
          for (const item of data.itemsFound) {
            await supabase.from('campaign_inventory').insert({
              campaign_id: snapshotCampaign.id,
              participant_id: snapshotParticipant.id,
              user_id: user!.id,
              item_name: item.name || 'Unknown Item',
              item_type: item.type || 'misc',
              item_rarity: item.rarity || 'common',
              description: item.description || null,
              stat_bonus: item.statBonus || {},
              found_at_zone: snapshotCampaign.current_zone,
              found_at_day: snapshotCampaign.day_count,
            });
          }
          const itemNames = data.itemsFound.map((i: any) => i.name).join(', ');
          await supabase.from('campaign_messages').insert({
            campaign_id: snapshotCampaign.id,
            sender_type: 'system',
            content: `🎒 **${snapshotParticipant.character?.name}** found: ${itemNames}`,
            channel: 'in_universe',
          });
          fetchInventory();
        }

        // Handle items consumed/used/given away — only if the player's message references the item
        if (data.itemsUsed && Array.isArray(data.itemsUsed) && data.itemsUsed.length > 0) {
          const confirmedUsed: string[] = [];
          for (const usedItem of data.itemsUsed) {
            const itemName = (usedItem.name || '').toLowerCase();
            if (!itemName) continue;
            // Only remove if the player actually referenced the item in their message
            const playerMentioned = messageText.toLowerCase().includes(itemName) ||
              messageText.toLowerCase().includes(itemName.replace(/\s+/g, ''));
            if (!playerMentioned) continue;
            const match = inventory.find(i =>
              i.item_name.toLowerCase() === itemName
            );
            if (match) {
              await supabase.from('campaign_inventory').delete().eq('id', match.id);
              confirmedUsed.push(usedItem.name);
            }
          }
          if (confirmedUsed.length > 0) {
            await supabase.from('campaign_messages').insert({
              campaign_id: snapshotCampaign.id,
              sender_type: 'system',
              content: `📦 Items used: ${confirmedUsed.join(', ')}`,
              channel: 'in_universe',
            });
            fetchInventory();
          }
        }

        // Persist NPC changes from AI response
        if (data.npcUpdates && Array.isArray(data.npcUpdates)) {
          for (const npcUpdate of data.npcUpdates) {
            if (npcUpdate.isNew) {
              const { data: newNpc } = await supabase.from('campaign_npcs').insert({
                campaign_id: snapshotCampaign.id,
                name: npcUpdate.name,
                role: npcUpdate.role || 'civilian',
                personality: npcUpdate.personality || null,
                appearance: npcUpdate.appearance || null,
                current_zone: snapshotCampaign.current_zone,
                backstory: npcUpdate.backstory || null,
                first_met_day: snapshotCampaign.day_count,
                last_seen_day: snapshotCampaign.day_count,
              } as any).select().single();

              if (newNpc) {
                await supabase.from('npc_relationships').insert({
                  npc_id: newNpc.id,
                  character_id: snapshotParticipant.character_id,
                  campaign_id: snapshotCampaign.id,
                  disposition: npcUpdate.disposition || 'neutral',
                  trust_level: npcUpdate.trust_level || 0,
                  notes: npcUpdate.relationship_notes || null,
                  last_interaction_day: snapshotCampaign.day_count,
                } as any);
              }
            } else if (npcUpdate.id) {
              await supabase.from('campaign_npcs').update({
                last_seen_day: snapshotCampaign.day_count,
                current_zone: npcUpdate.current_zone || snapshotCampaign.current_zone,
                status: npcUpdate.status || 'alive',
              } as any).eq('id', npcUpdate.id);

              if (npcUpdate.disposition || npcUpdate.trust_change) {
                const existingRel = (npcRelsRes.data || []).find((r: any) => r.npc_id === npcUpdate.id);
                if (existingRel) {
                  const newTrust = Math.max(-100, Math.min(100, (existingRel.trust_level || 0) + (npcUpdate.trust_change || 0)));
                  await supabase.from('npc_relationships').update({
                    disposition: npcUpdate.disposition || existingRel.disposition,
                    trust_level: newTrust,
                    notes: npcUpdate.relationship_notes || existingRel.notes,
                    last_interaction_day: snapshotCampaign.day_count,
                  } as any).eq('id', existingRel.id);
                } else {
                  await supabase.from('npc_relationships').insert({
                    npc_id: npcUpdate.id,
                    character_id: snapshotParticipant.character_id,
                    campaign_id: snapshotCampaign.id,
                    disposition: npcUpdate.disposition || 'neutral',
                    trust_level: npcUpdate.trust_change || 0,
                    notes: npcUpdate.relationship_notes || null,
                    last_interaction_day: snapshotCampaign.day_count,
                  } as any);
                }
              }
            }
          }
          // Refresh known NPC names after updates
          fetchKnownNpcs();
        }

        // Handle enemy spawning from narrator response
        if (data.enemySpawned) {
          await supabase.from('campaign_enemies' as any).insert({
            campaign_id: snapshotCampaign.id,
            name: data.enemySpawned.name,
            tier: data.enemySpawned.tier || 1,
            hp: data.enemySpawned.hp || 50,
            hp_max: data.enemySpawned.hp || 50,
            description: data.enemySpawned.description || null,
            abilities: data.enemySpawned.abilities || null,
            weakness: data.enemySpawned.weakness || null,
            count: data.enemySpawned.count || 1,
            status: 'active',
            behavior_profile: data.enemySpawned.behaviorProfile || 'aggressive',
            spawned_at_zone: snapshotCampaign.current_zone,
            spawned_at_day: snapshotCampaign.day_count,
          });
          fetchEnemies();
        }

        // Handle enemy updates (HP changes, status changes) from narrator response
        if (data.enemyUpdates && Array.isArray(data.enemyUpdates)) {
          for (const eu of data.enemyUpdates) {
            if (!eu.id) continue;
            const enemy = campaignEnemies.find(e => e.id === eu.id);
            if (!enemy) continue;

            const newHp = eu.hpChange ? Math.max(0, enemy.hp + eu.hpChange) : enemy.hp;
            const newStatus = newHp <= 0 ? 'defeated' : (eu.status || enemy.status);

            await supabase.from('campaign_enemies' as any)
              .update({
                hp: newHp,
                status: newStatus,
                last_action: eu.lastAction || null,
              } as any)
              .eq('id', eu.id);

            // Grant XP for defeating enemies
            if (newStatus === 'defeated' && enemy.status !== 'defeated') {
              const defeatXp = Math.min(50, enemy.tier * 10 + 5);
              totalXpGained += defeatXp;
              await supabase.from('campaign_messages').insert({
                campaign_id: snapshotCampaign.id,
                sender_type: 'system',
                content: `💀 **${enemy.name}** has been defeated! (+${defeatXp} XP)`,
                channel: 'in_universe',
              });
            }

            if (newStatus === 'fled') {
              await supabase.from('campaign_messages').insert({
                campaign_id: snapshotCampaign.id,
                sender_type: 'system',
                content: `🏃 **${enemy.name}** has fled the battle!`,
                channel: 'in_universe',
              });
            }

            if (newStatus === 'hiding') {
              await supabase.from('campaign_messages').insert({
                campaign_id: snapshotCampaign.id,
                sender_type: 'system',
                content: `👁️ **${enemy.name}** has disappeared into the shadows...`,
                channel: 'in_universe',
              });
            }
          }
          fetchEnemies();
        }

        // Handle narrator sentiment update
        if (data.sentimentUpdate && typeof data.sentimentUpdate === 'object' && snapshotParticipant?.character_id) {
          const su = data.sentimentUpdate;
          const currentScore = narratorSentiment?.sentiment_score ?? 0;
          const newScore = Math.max(-100, Math.min(100, currentScore + (su.sentiment_shift || 0)));
          const newMoments = [...(narratorSentiment?.memorable_moments || [])];
          if (su.memorable_moment && typeof su.memorable_moment === 'string') {
            newMoments.push(su.memorable_moment);
            if (newMoments.length > 20) newMoments.shift();
          }

          // Clamp helper
          const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));
          const rd = su.relationship_dimensions || {};
          const bs = su.behavior_scores || {};

          // Update relationship dimensions
          const newCuriosity = clamp((narratorSentiment?.curiosity ?? 50) + (rd.curiosity_shift || 0));
          const newRespect = clamp((narratorSentiment?.respect ?? 50) + (rd.respect_shift || 0));
          const newTrust = clamp((narratorSentiment?.trust ?? 50) + (rd.trust_shift || 0));
          const newAmusement = clamp((narratorSentiment?.amusement ?? 50) + (rd.amusement_shift || 0));
          const newDisappointment = clamp((narratorSentiment?.disappointment ?? 0) + (rd.disappointment_shift || 0));
          const newIntrigue = clamp((narratorSentiment?.intrigue ?? 50) + (rd.intrigue_shift || 0));
          const newStoryValue = clamp((narratorSentiment?.story_value ?? 50) + (rd.story_value_shift || 0));

          // Update behavior scores
          const newCreativity = clamp((narratorSentiment?.creativity_score ?? 50) + (bs.creativity || 0));
          const newWorldInteraction = clamp((narratorSentiment?.world_interaction_score ?? 50) + (bs.world_interaction || 0));
          const newNpcInteraction = clamp((narratorSentiment?.npc_interaction_score ?? 50) + (bs.npc_interaction || 0));
          const newExploration = clamp((narratorSentiment?.exploration_score ?? 50) + (bs.exploration || 0));
          const newCombatStyle = clamp((narratorSentiment?.combat_style_score ?? 50) + (bs.combat_style || 0));
          const newStoryEngagement = clamp((narratorSentiment?.story_engagement_score ?? 50) + (bs.story_engagement || 0));
          const newStoryCompat = clamp((narratorSentiment?.story_compatibility ?? 50) + (su.story_compatibility_shift || 0));

          // Narrator observations
          const newObservations = [...(narratorSentiment?.narrator_observations || [])];
          if (su.narrator_observation && typeof su.narrator_observation === 'string') {
            newObservations.push(su.narrator_observation);
            if (newObservations.length > 30) newObservations.shift();
          }

          // Nickname history
          const newNicknameHistory = [...(narratorSentiment?.nickname_history || [])];
          const currentNickname = narratorSentiment?.nickname;
          const newNickname = su.nickname || currentNickname || null;
          if (newNickname && newNickname !== currentNickname && currentNickname) {
            if (!newNicknameHistory.includes(currentNickname)) {
              newNicknameHistory.push(currentNickname);
            }
          }
          if (newNickname && !newNicknameHistory.includes(newNickname)) {
            newNicknameHistory.push(newNickname);
          }

          // Derive relationship stage from dimensions
          const avgPositive = (newCuriosity + newRespect + newTrust + newAmusement + newIntrigue + newStoryValue) / 6;
          let stage = 'unknown';
          if (newDisappointment > 70) stage = 'disappointed';
          else if (newDisappointment > 50 && avgPositive < 30) stage = 'irritated';
          else if (avgPositive < 25) stage = 'unimpressed';
          else if (avgPositive < 35) stage = 'dismissive';
          else if (avgPositive >= 80) stage = 'beloved_storyteller';
          else if (avgPositive >= 65) stage = 'compelling';
          else if (avgPositive >= 55) stage = 'noteworthy';
          else if (avgPositive >= 45) stage = 'interesting';
          else if (avgPositive >= 35) stage = 'observed';
          else stage = 'unknown';

          const updatedSentiment = {
            nickname: newNickname,
            sentiment_score: newScore,
            opinion_summary: su.opinion_summary || narratorSentiment?.opinion_summary || null,
            personality_notes: su.personality_notes || narratorSentiment?.personality_notes || null,
            memorable_moments: newMoments,
            relationship_stage: stage,
            curiosity: newCuriosity,
            respect: newRespect,
            trust: newTrust,
            amusement: newAmusement,
            disappointment: newDisappointment,
            intrigue: newIntrigue,
            story_value: newStoryValue,
            creativity_score: newCreativity,
            world_interaction_score: newWorldInteraction,
            npc_interaction_score: newNpcInteraction,
            exploration_score: newExploration,
            combat_style_score: newCombatStyle,
            story_engagement_score: newStoryEngagement,
            story_compatibility: newStoryCompat,
            narrator_observations: newObservations,
            nickname_history: newNicknameHistory,
          };
          setNarratorSentiment(updatedSentiment);

          // Upsert to database
          const { data: existing } = await supabase
            .from('narrator_sentiments' as any)
            .select('id')
            .eq('character_id', snapshotParticipant.character_id)
            .maybeSingle();

          if (existing) {
            await supabase.from('narrator_sentiments' as any)
              .update({
                ...updatedSentiment,
                updated_at: new Date().toISOString(),
              } as any)
              .eq('character_id', snapshotParticipant.character_id);
          } else {
            await supabase.from('narrator_sentiments' as any)
              .insert({
                character_id: snapshotParticipant.character_id,
                ...updatedSentiment,
              } as any);
          }
        }

        // ─── Unified level-up check (handles XP from narrator + enemy defeats, supports multi-level) ───
        if (totalXpGained > 0) {
          let currentXp = snapshotParticipant.campaign_xp + totalXpGained;
          let currentLevel = snapshotParticipant.campaign_level;
          let earnedStatPoints = 0;
          let levelsGained = 0;

          // Loop to handle multi-level jumps from large XP gains
          let xpNeeded = CAMPAIGN_STARTING_ABILITIES.xpForLevel(currentLevel + 1);
          while (currentXp >= xpNeeded) {
            currentXp -= xpNeeded;
            currentLevel += 1;
            earnedStatPoints += 3;
            levelsGained += 1;
            xpNeeded = CAMPAIGN_STARTING_ABILITIES.xpForLevel(currentLevel + 1);
          }

          await supabase.from('campaign_participants')
            .update({
              campaign_xp: currentXp,
              campaign_level: currentLevel,
              xp_to_next_level: CAMPAIGN_STARTING_ABILITIES.xpForLevel(currentLevel + 1),
              available_stat_points: snapshotParticipant.available_stat_points + earnedStatPoints,
            })
            .eq('id', snapshotParticipant.id);

          if (levelsGained > 0) {
            triggerDiscovery('campaign_level_up');
            await supabase.from('campaign_messages').insert({
              campaign_id: snapshotCampaign.id,
              sender_type: 'system',
              content: `🎉 **${snapshotParticipant.character?.name}** leveled up to Campaign Level ${currentLevel}! (+${earnedStatPoints} stat points to allocate)`,
              channel: 'in_universe',
            });
          }
        }

        // Feed narrator response back into narrative subsystems
        campaignNarrative.ingestNarratorResponse(
          data.narration,
          data.encounterType || null,
          snapshotCampaign.current_zone,
          snapshotCampaign.day_count,
          snapshotCampaign.time_of_day,
          snapshotCampaign.description || '',
          snapshotCampaign.story_context as Record<string, unknown> || {},
          snapshotCampaign.world_state as Record<string, unknown> || {},
          (knownNpcs || []).length,
          activeEnemiesList.length,
          messageText,
        );

        // explicit check, items found, items used, or equip/use intent in their message
        const inventoryInteracted =
          isInventoryCheck ||
          (data.itemsFound && Array.isArray(data.itemsFound) && data.itemsFound.length > 0) ||
          (data.itemsUsed && Array.isArray(data.itemsUsed) && data.itemsUsed.length > 0);

        if (inventoryInteracted) {
          // Re-fetch inventory so the bag reflects the latest state (items just found/used)
          const { data: freshInv } = await supabase
            .from('campaign_inventory')
            .select('*')
            .eq('campaign_id', snapshotCampaign.id)
            .eq('user_id', user!.id)
            .order('created_at', { ascending: false });
          const latestItems = (freshInv || []).map((i: any) => ({
            ...i,
            stat_bonus: (i.stat_bonus || {}) as Record<string, number>,
          })) as InventoryItem[];
          setInventory(latestItems);

          const charWeapons = snapshotParticipant.character?.weapons_items;
          const bagContent = buildBagContent(latestItems, charWeapons || null);
          await supabase.from('campaign_messages').insert({
            campaign_id: snapshotCampaign.id,
            sender_type: 'system',
            content: `__BAG__${JSON.stringify(bagContent)}`,
            channel: 'in_universe',
            metadata: { owner_user_id: user!.id },
          } as any);
        }
      }

      // Apply solo status change if intent was detected
      if (soloIntent) {
        triggerDiscovery('campaign_solo_mode');
        await applySoloStatusChange(soloIntent);
      }

      fetchParticipants();
    } catch (err) {
      console.error('Campaign narrator error:', err);
    } finally {
      setNarratorTyping(false);
      // Force-refresh messages so the narrator response is visible immediately
      // even if the realtime subscription is slow or missed
      await fetchMessages();
    }
  };

   const handleSendMessage = async () => {
    if (!inputMessage.trim() || !myParticipant || !campaign) return;
    consecutiveAdvancesRef.current = 0; // Reset idle counter when player types
    const messageText = inputMessage.trim();

    // Move validation — check before sending
    const validation = campaignCombat.validateCampaignMove(messageText);
    if (!validation.isValid) {
      return;
    }

    setInputMessage('');
    updateTypingStatus(false);
    setSending(true);

    // Resolve overcharge if toggled and in combat
    const inCombat = campaignEnemies.filter(e => e.status === 'active' || e.status === 'hiding').length > 0;
    const overchargeResult = inCombat && overchargeEnabled
      ? resolveOvercharge(true)
      : null;
    const overchargeContext = overchargeResult
      ? getOverchargeContext(overchargeResult, myParticipant.character?.name || 'The character')
      : '';
    if (overchargeEnabled) setOverchargeEnabled(false); // Reset after use

    try {
      // Detect solo/rejoin intent from the player's message
      const soloIntent = detectSoloIntent(messageText);

      // Process combat mechanics (hit detection, dice rolls)
      const combatResult = campaignCombat.processCombatAction(messageText);

      // If concentration is available, pause sending and wait for player choice
      if (combatResult.concentrationAvailable) {
        pendingSendRef.current = { messageText, soloIntent, participant: myParticipant, campaign };
        triggerDiscovery('dice_roll' as MechanicKey);
        setSending(false);
        return;
      }

      // Continue with normal send
      await continueSend(messageText, soloIntent, combatResult, myParticipant, campaign, overchargeContext);

    } catch (err) {
      console.error('Campaign message error:', err);
      toast.error('Failed to send message');
      setSending(false);
    }
  };

  /**
   * Continue sending after concentration is resolved (or skipped).
   */
  const continueSend = async (
    messageText: string,
    soloIntent: 'go_solo' | 'rejoin' | null,
    combatResult: ReturnType<typeof campaignCombat.processCombatAction>,
    participant: CampaignParticipant,
    campaignSnap: Campaign,
    overchargeContext: string = '',
  ) => {
    setSending(true);
    try {
      const equippedCampaignItems = inventory.filter(i => i.is_equipped);
      const activeEnemiesList = campaignEnemies.filter(e => e.status === 'active' || e.status === 'hiding');
      const primaryEnemy = activeEnemiesList[0] ?? null;
      const intentResult = IntentEngine.resolve(messageText, {
        mode: 'campaign',
        actorName: participant.character?.name,
        possibleTargets: activeEnemiesList.map(enemy => ({ id: enemy.id, name: enemy.name, kind: 'enemy' as const })),
        defaultTool: equippedCampaignItems[0]?.item_name ?? null,
      });
      const characterContext = CharacterContextResolver.resolve({
        characterId: participant.character_id,
        name: participant.character?.name || 'Character',
        tier: participant.character?.level || participant.campaign_level,
        stats: { stat_strength: participant.character?.stat_strength ?? 50 },
        abilities: participant.character?.abilities,
        powers: participant.character?.powers,
        equippedItems: equippedCampaignItems.map(item => item.item_name),
        stamina: Math.round((participant.campaign_hp / Math.max(1, participant.campaign_hp_max)) * 100),
      });
      const enemyContext = primaryEnemy ? resolveCampaignEnemyContext(primaryEnemy) : null;
      const combatResolution = intentResult.intent.isCombatAction && primaryEnemy && enemyContext
        ? CombatResolver.resolve(
            intentResult.intent,
            characterContext,
            createCombatState({
              participants: [
                {
                  id: participant.character_id,
                  name: participant.character?.name || 'Character',
                  stats: {
                    hp: participant.campaign_hp,
                    stamina: characterContext.stamina,
                    speed: characterContext.stats.stat_speed,
                    strength: characterContext.stats.stat_strength,
                  },
                },
                {
                  id: primaryEnemy.id,
                  name: primaryEnemy.name,
                  stats: {
                    hp: primaryEnemy.hp,
                    stamina: 100,
                    speed: enemyContext.stats.stat_speed,
                    strength: enemyContext.stats.stat_strength,
                  },
                },
              ],
              rangeZone: 'mid',
              zone: campaignSnap.current_zone,
              terrainTags: battlefieldEffects.map((effect: any) => effect.type),
            }),
            {
              actorId: participant.character_id,
              targetId: primaryEnemy.id,
              targetContext: enemyContext,
            },
          )
        : null;
      const npcBrainTurn = primaryEnemy
        ? buildCampaignNpcTurn({
            enemy: {
              id: primaryEnemy.id,
              name: primaryEnemy.name,
              tier: primaryEnemy.tier,
              hp: primaryEnemy.hp,
              hpMax: primaryEnemy.hp_max,
              description: primaryEnemy.description,
              behaviorProfile: primaryEnemy.behavior_profile,
              lastAction: primaryEnemy.last_action,
              metadata: primaryEnemy.metadata,
            },
            player: {
              id: participant.character_id,
              name: participant.character?.name || 'Character',
              healthPct: Math.round((participant.campaign_hp / Math.max(1, participant.campaign_hp_max)) * 100),
              context: characterContext,
            },
            combatResult: combatResolution,
            timeOfDay: campaignSnap.time_of_day,
            chaosLevel: Number((campaignSnap.world_state as Record<string, unknown> | null)?.chaosLevel ?? 40),
            escapeRoutes: Number((campaignSnap.world_state as Record<string, unknown> | null)?.escapeRoutes ?? 2),
          })
        : null;
      const actionResult = combatResolution
        ? toActionResult(combatResolution)
        : ActionResolver.resolve(intentResult.intent, characterContext, {
            activeHazards: battlefieldEffects.map((effect: any) => effect.type),
            hasActiveThreat: activeEnemiesList.length > 0,
            currentZone: campaignSnap.current_zone,
          });

      // Build dice metadata for the message
      const diceResult = combatResult.diceMetadata
        ? combatResult.diceMetadata as Record<string, unknown>
        : null;

      // Play sent sound
      chatSoundsEngine.play('message_sent');

      // OPTIMISTIC: Add message to UI immediately before DB write
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimisticMessage: CampaignMessage = {
        id: tempId,
        campaign_id: campaignSnap.id,
        character_id: participant.character_id,
        sender_type: 'player',
        channel: 'in_universe',
        content: messageText,
        dice_result: diceResult,
        theme_snapshot: null,
        metadata: {
          intentDebug: intentResult.debug,
          actionResult,
          combatResult: combatResolution,
          npcBrainTurn,
        },
        created_at: new Date().toISOString(),
        isPending: true,
        character: participant.character
          ? { name: participant.character.name, image_url: participant.character.image_url }
          : undefined,
      };
      setMessages(prev => [...prev, optimisticMessage]);

      // Insert player message
      const { error: insertError } = await supabase.from('campaign_messages').insert({
        campaign_id: campaignSnap.id,
        character_id: participant.character_id,
        sender_type: 'player',
        content: messageText,
        channel: 'in_universe',
        dice_result: diceResult as any,
        metadata: {
          intentDebug: intentResult.debug,
          actionResult,
          combatResult: combatResolution,
          npcBrainTurn,
        } as any,
      } as any);

      if (insertError) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        toast.error('Failed to send message');
        setSending(false);
        return;
      }

      // Trigger dice mechanic discovery on first combat action
      if (combatResolution || combatResult.outcome === 'hit' || combatResult.outcome === 'partial_hit' || combatResult.outcome === 'block' || combatResult.outcome === 'dodge') {
        triggerDiscovery('dice_roll' as MechanicKey);
      }

      // Release input immediately — narrator runs in background
      setSending(false);

      // Fire narrator response in background (non-blocking)
      fireNarratorResponse(messageText, soloIntent, combatResult, participant, campaignSnap, overchargeContext);

      // Trigger world simulation randomly every 6–15 player messages
      playerMessageCountRef.current += 1;
      if (!worldSimThresholdRef.current) worldSimThresholdRef.current = Math.floor(Math.random() * 10) + 6;
      if (playerMessageCountRef.current >= worldSimThresholdRef.current && campaignSnap) {
        playerMessageCountRef.current = 0;
        worldSimThresholdRef.current = Math.floor(Math.random() * 10) + 6;
        supabase.functions.invoke('world-simulation', {
          body: {
            campaignId: campaignSnap.id,
            currentZone: campaignSnap.current_zone,
            dayCount: campaignSnap.day_count,
            difficultyScale: campaignSnap.difficulty_scale,
            partyLevel: participant.campaign_level,
            timeOfDay: campaignSnap.time_of_day,
            environmentTags: campaignSnap.environment_tags,
          },
        }).catch(e => console.warn('[WorldSim] Background simulation failed:', e));
      }
    } catch (err) {
      console.error('Campaign message error:', err);
      toast.error('Failed to send message');
      setSending(false);
    }
  };

  /**
   * Handle concentration result (offensive or defensive), then continue send.
   */
  const handleConcentrationResult = (updatedCombatResult: ReturnType<typeof campaignCombat.processCombatAction> | null) => {
    const pending = pendingSendRef.current;
    pendingSendRef.current = null;
    if (!pending || !updatedCombatResult) return;
    triggerDiscovery('concentration' as MechanicKey);
    continueSend(pending.messageText, pending.soloIntent, updatedCombatResult, pending.participant, pending.campaign);
  };

  const handleConcentrationSkip = () => {
    const result = campaignCombat.skipConcentration();
    const pending = pendingSendRef.current;
    pendingSendRef.current = null;
    if (!pending || !result) return;
    continueSend(pending.messageText, pending.soloIntent, result as any, pending.participant, pending.campaign);
  };

  const handleAdvanceCampaign = async () => {
    if (!myParticipant || !campaign || narratorTyping) return;
    consecutiveAdvancesRef.current += 1;
    setNarratorTyping(true);
    try {
      const activeParty = participants.filter(p => p.is_active);
      const partyCtx = activeParty.map(p =>
        `${p.character?.name} (Campaign Lv.${p.campaign_level}, HP: ${p.campaign_hp}/${p.campaign_hp_max})`
      ).join(', ');

      const { data: recentMsgs } = await supabase
        .from('campaign_messages')
        .select('sender_type, content, character_id')
        .eq('campaign_id', campaign.id)
        .eq('channel', 'in_universe')
        .order('created_at', { ascending: false })
        .limit(20);
      const history = (recentMsgs || []).reverse().map((m: any) => ({
        role: m.sender_type === 'player' ? 'player' : 'world',
        content: m.content,
      }));

      // Build narrative systems context for advance story
      const activeEnemiesList = campaignEnemies.filter(e => e.status === 'active' || e.status === 'hiding');
      const advanceNarrativeContext = campaignNarrative.buildNarrativeBlock(
        '[ADVANCE STORY] The party is idle.',
        activeEnemiesList.length > 0,
        campaign.current_zone,
      );

      const { data, error } = await invokeOrchestrator({
        pipelineType: 'campaign_narration',
        characterId: myParticipant.character_id,
        campaignId: campaign.id,
        type: 'campaign_narration',
        playerAction: `[ADVANCE STORY] The party is idle.${consecutiveAdvancesRef.current >= 3 ? ' [IDLE ESCALATION — the players have pressed "Progress Story" ' + consecutiveAdvancesRef.current + ' times in a row without typing anything. The world MUST force an interaction NOW — an enemy ambush, an NPC approaching with urgent news, a sudden environmental event, a creature attack, or something that DEMANDS the player respond. Do NOT describe calm scenes. Make something happen TO them that they MUST react to.]' : ' Move the campaign forward organically — introduce a new event, encounter, discovery, environmental change, NPC interaction, or plot development that fits the current situation and keeps things interesting. Do NOT wait for player input; make something happen in the world around them.'}`,
        currentZone: campaign.current_zone,
        timeOfDay: campaign.time_of_day,
        dayCount: campaign.day_count,
        worldState: campaign.world_state,
        storyContext: campaign.story_context,
        campaignDescription: campaign.description,
        environmentTags: campaign.environment_tags,
        conversationHistory: history,
        partyContext: partyCtx,
        playerCharacter: { name: myParticipant.character?.name },
        isMultiplayer: !isSoloCampaign,
        partyNames: allPartyNames,
        narrativeSystemsContext: advanceNarrativeContext,
      });

      if (!error && data?.narration) {
        await supabase.from('campaign_messages').insert([{
          campaign_id: campaign.id,
          sender_type: 'narrator',
          content: data.narration,
          channel: 'in_universe',
          metadata: buildNarratorMessageMetadata(data) as any,
        }]);

        // Update tactical map from narrator scene data
        if (data.sceneMap && typeof data.sceneMap === 'object' && Array.isArray(data.sceneMap.zones)) {
          setSceneMap(data.sceneMap as NarratorSceneMap);
        }

        if (data.advanceTime) {
          const { time: newTime, newDay } = advanceTime(campaign.time_of_day, data.advanceTime);
          await supabase.from('campaigns').update({
            time_of_day: newTime,
            day_count: newDay ? campaign.day_count + 1 : campaign.day_count,
          }).eq('id', campaign.id);
        }
        if (data.newZone) {
          await supabase.from('campaigns').update({ current_zone: data.newZone }).eq('id', campaign.id);
        }
        if (data.enemySpawned) {
          await supabase.from('campaign_enemies' as any).insert({
            campaign_id: campaign.id,
            name: data.enemySpawned.name,
            tier: data.enemySpawned.tier || 1,
            hp: data.enemySpawned.hp || 50,
            hp_max: data.enemySpawned.hp || 50,
            description: data.enemySpawned.description || null,
            abilities: data.enemySpawned.abilities || null,
            weakness: data.enemySpawned.weakness || null,
            count: data.enemySpawned.count || 1,
            status: 'active',
            behavior_profile: data.enemySpawned.behaviorProfile || 'aggressive',
            spawned_at_zone: campaign.current_zone,
            spawned_at_day: campaign.day_count,
          });
          fetchEnemies();
        }
        // Handle enemy updates from advance story
        if (data.enemyUpdates && Array.isArray(data.enemyUpdates)) {
          for (const eu of data.enemyUpdates) {
            if (!eu.id) continue;
            const enemy = campaignEnemies.find(e => e.id === eu.id);
            if (!enemy) continue;
            const newHp = eu.hpChange ? Math.max(0, enemy.hp + eu.hpChange) : enemy.hp;
            const newStatus = newHp <= 0 ? 'defeated' : (eu.status || enemy.status);
            await supabase.from('campaign_enemies' as any)
              .update({ hp: newHp, status: newStatus, last_action: eu.lastAction || null } as any)
              .eq('id', eu.id);
            if (newStatus === 'defeated' && enemy.status !== 'defeated') {
              await supabase.from('campaign_messages').insert({
                campaign_id: campaign.id,
                sender_type: 'system',
                content: `💀 **${enemy.name}** has been defeated!`,
                channel: 'in_universe',
              });
            }
          }
          fetchEnemies();
        }
      }
      // Feed advance response back into narrative subsystems
      if (!error && data?.narration) {
        campaignNarrative.ingestNarratorResponse(
          data.narration,
          data.encounterType || null,
          campaign.current_zone,
          campaign.day_count,
          campaign.time_of_day,
          campaign.description || '',
          (campaign.story_context ?? {}) as Record<string, unknown>,
          (campaign.world_state ?? {}) as Record<string, unknown>,
          0,
          activeEnemiesList.length,
          '[ADVANCE STORY]',
        );
      }

      fetchCampaign();
      fetchMessages();
    } catch (err) {
      console.error('Advance campaign error:', err);
      toast.error('Failed to advance the campaign');
    } finally {
      setNarratorTyping(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-pulse text-muted-foreground">Loading campaign...</div></div>;
  }

  if (!campaign) {
    return <div className="text-center py-12"><p className="text-muted-foreground">Campaign not found.</p></div>;
  }

  const isCreator = campaign.creator_id === user?.id;
  const canJoin = !myParticipant && campaign.status === 'recruiting' && participants.filter(p => p.is_active).length < campaign.max_players;
  const isActive = campaign.status === 'active';
  const isSoloCampaign = campaign.max_players === 1;
  const isSoloMode = myParticipant?.is_solo ?? false;
  const canStart = isCreator && campaign.status === 'recruiting' && participants.filter(p => p.is_active).length >= 1;

  const handleDeleteCampaign = async () => {
    try {
      // Deactivate my participation
      if (myParticipant) {
        await supabase.from('campaign_participants')
          .update({ is_active: false })
          .eq('id', myParticipant.id);
      }

      // If no other active participants remain, mark campaign as abandoned
      const otherActive = participants.filter(p => p.is_active && p.user_id !== user?.id);
      if (otherActive.length === 0) {
        await supabase.from('campaigns')
          .update({ status: 'abandoned' })
          .eq('id', campaign.id);
      }

      toast.success('Campaign removed from your list.');
      navigate('/campaigns');
    } catch {
      toast.error('Failed to delete campaign');
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 shrink-0 bg-background/70 backdrop-blur-md border-b border-border/50 z-20 relative">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm font-bold flex items-center gap-1.5 truncate">
              <Compass className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">{campaign.name}</span>
            </h1>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <RealtimeStatus status={realtimeStatus} />
              <span>{getTimeEmoji(campaign.time_of_day)} Day {campaign.day_count}</span>
              <span className="flex items-center gap-0.5 truncate max-w-[100px]">
                <MapPin className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{campaign.current_zone}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isActive && sceneMap && (
            <Button
              variant={showTacticalMap ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowTacticalMap(!showTacticalMap)}
              title={showTacticalMap ? 'Hide tactical map' : 'Show tactical map'}
            >
              <MapIcon className="w-4 h-4" />
            </Button>
          )}
          {isActive && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleAmbientMute} title={ambientMuted ? 'Unmute ambient' : 'Mute ambient'}>
              {ambientMuted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-primary" />}
            </Button>
          )}
          <Badge className={`text-[10px] sm:text-xs ${campaign.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
            {campaign.status}
          </Badge>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete campaign">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this campaign?</AlertDialogTitle>
                <AlertDialogDescription>
                  {participants.filter(p => p.is_active && p.user_id !== user?.id).length > 0
                    ? "You'll be removed from this campaign. Other players can continue without you."
                    : "This will archive the campaign since you're the only participant."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCampaign} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className={`flex-1 min-h-0 flex flex-col relative transition-shadow duration-500 ${
          combatPulse === 'red' ? 'animate-combat-pulse-red' : combatPulse === 'green' ? 'animate-combat-pulse-green' : ''
        }`}>
        {/* Persistent Environment Background — fills entire content area */}
        <EnvironmentChatBackground location={activeSceneLocation || campaign.current_zone} />
        <BattlefieldEffectsOverlay effects={battlefieldEffects} className="z-[1]" />

        <Tabs defaultValue="adventure" className="flex flex-col flex-1 min-h-0 relative z-[2]">
          <div className="bg-background/60 backdrop-blur-sm border-b border-border/30 px-3 z-10 relative shrink-0">
              <TabsList className="bg-transparent h-auto p-0 gap-4">
                <TabsTrigger value="adventure" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-2 pt-3 text-sm gap-1.5">
                  <Compass className="w-4 h-4" />
                  Adventure Log
                </TabsTrigger>
                {isActive && myParticipant?.is_active && (
                  <TabsTrigger
                    value="narrator"
                    className={`rounded-none border-b-2 border-transparent data-[state=active]:border-amber-400 data-[state=active]:bg-transparent px-1 pb-2 pt-3 text-sm gap-1.5 transition-all ${
                      narratorTabGlowing ? 'animate-pulse text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]' : ''
                    }`}
                    onClick={() => setNarratorTabGlowing(false)}
                  >
                    <BookOpen className="w-4 h-4" />
                    Private Narrator
                    {pendingDiscoveries.length > 0 && (
                      <span className="ml-1 w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                    )}
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <TabsContent value="adventure" className="flex-1 flex flex-col mt-0 min-h-0 data-[state=inactive]:hidden">
              <div className="relative flex flex-col flex-1 min-h-0">

                {/* Narrator-driven Tactical Map */}
                {showTacticalMap && sceneMap && (
                  <div className="px-3 pt-3 pb-1 relative z-10">
                    <CampaignTacticalMap sceneMap={sceneMap} onClose={() => setShowTacticalMap(false)} />
                  </div>
                )}

                {/* Enemy Tracker — above chat for visibility */}
                {campaignEnemies.filter(e => e.status === 'active' || e.status === 'hiding').length > 0 && (
                  <div className="px-3 pt-3 pb-1 relative z-10">
                    <CampaignEnemyTracker enemies={campaignEnemies.filter(e => e.status === 'active' || e.status === 'hiding')} />
                  </div>
                )}

                {/* Stat Allocation Panel — shown on level up */}
                {showStatAllocation && myParticipant && myParticipant.available_stat_points > 0 && (
                  <div className="px-3 pt-2 relative z-10">
                    <CampaignStatAllocation
                      participantId={myParticipant.id}
                      characterName={myParticipant.character?.name || 'Character'}
                      campaignLevel={myParticipant.campaign_level}
                      availablePoints={myParticipant.available_stat_points}
                      currentOverrides={myParticipant.stat_overrides}
                      onComplete={() => { setShowStatAllocation(false); fetchParticipants(); }}
                      onClose={() => setShowStatAllocation(false)}
                    />
                  </div>
                )}

                <div
                  className="flex-1 min-h-0 overflow-y-auto p-4 relative z-10"
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                    userIsNearBottomRef.current = distFromBottom < 120;
                  }}
                >
                  <div className="space-y-4">
                    {messages.map(msg => {
                      const isPlayer = msg.sender_type === 'player';
                      const isNarrator = msg.sender_type === 'narrator';
                      const isSystem = msg.sender_type === 'system';
                      const isMe = isPlayer && msg.character_id === myParticipant?.character_id;

                      if (isSystem) {
                        // Bag bubble for inventory checks — only visible to the owning player
                        if (msg.content.startsWith('__BAG__')) {
                          const bagOwnerId = (msg.metadata as any)?.owner_user_id;
                          if (bagOwnerId && bagOwnerId !== user?.id) return null;

                          let bagItems: { name: string; type: string; rarity: string; equipped: boolean }[] = [];
                          try { bagItems = JSON.parse(msg.content.slice(7)); } catch {}

                          const myIndex = messages.indexOf(msg);
                          const hasLaterMessage = messages.slice(myIndex + 1).some(m => !m.content.startsWith('__BAG__'));
                          
                          return (
                            <BagBubble key={msg.id} bagItems={bagItems} isClosed={hasLaterMessage} />
                          );
                        }
                        
                        return (
                          <div key={msg.id} className="flex justify-center py-1 animate-fade-in">
                            <span className="text-xs text-muted-foreground italic bg-background/60 backdrop-blur-sm px-3 py-1 rounded-full">
                              {msg.content}
                            </span>
                          </div>
                        );
                      }

                      if (isNarrator) {
                        const segments = parseNarratorMessage(msg.content);
                        const sceneLocation = activeSceneLocation || campaign.current_zone;

                        // Voice controls (shown once for the whole message)
                        const isActiveNarration = narratorVoice.activeMessageId === msg.id;
                        const voiceControls = userSettings.audio.narratorVoiceEnabled && (
                          narratorVoice.isPlaying && isActiveNarration ? (
                            <button
                              onClick={() => narratorVoice.togglePause()}
                              className="ml-auto p-1 rounded-full hover:bg-amber-500/20 transition-colors"
                              title={narratorVoice.isPaused ? 'Resume narrator' : 'Pause narrator'}
                            >
                              {narratorVoice.isPaused ? (
                                <Play className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <VolumeX className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => narratorVoice.narrate(msg.content, msg.id, buildNarrationPlaybackOptions(msg.metadata))}
                              className="ml-auto p-1 rounded-full hover:bg-amber-500/20 transition-colors"
                              title="Listen to narrator"
                            >
                              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                            </button>
                          )
                        );

                        // If no NPC dialogue segments, render classic narrator bubble
                        const hasNpcSegments = segments.some(s => s.type === 'npc_dialogue');
                        const narratorAnimationClass = getNarratorAnimationClass(msg.metadata);

                        if (!hasNpcSegments) {
                          return (
                            <div key={msg.id} className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 via-background/80 to-amber-500/10 border border-amber-500/30 mx-2 animate-fade-in backdrop-blur-sm">
                              <div className="flex items-start gap-2">
                                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                                  <BookOpen className="w-4 h-4 text-amber-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Narrator</span>
                                    <span className="text-[10px] text-muted-foreground">{new Date(msg.created_at).toLocaleTimeString()}</span>
                                    {voiceControls}
                                  </div>
                                  <NarratorMessageContent
                                    content={msg.content}
                                    activeSentenceIndex={isActiveNarration ? narratorVoice.activeSentenceIndex : -1}
                                    activeRange={isActiveNarration ? narratorVoice.activeRange : null}
                                    animationClassName={narratorAnimationClass}
                                    voiceEnabled={userSettings.audio.narratorVoiceEnabled && userSettings.audio.tapToNarrate}
                                    requireTapConfirmation={userSettings.audio.askBeforeTapToNarrate}
                                    hasPendingTapConfirmation={narratorVoice.pendingTapRequest?.messageId === msg.id}
                                    onSentenceClick={(sentenceIdx) => {
                                      narratorVoice.narrateFromSentence(msg.content, msg.id, sentenceIdx, buildNarrationPlaybackOptions(msg.metadata));
                                    }}
                                    onConfirmSentenceClick={narratorVoice.confirmTapNarration}
                                    onCancelSentenceClick={narratorVoice.cancelTapNarration}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // Split rendering: narrator segments + NPC dialogue bubbles
                        return (
                          <div key={msg.id} className="space-y-2 animate-fade-in">
                            {segments.map((segment, segIdx) => {
                              if (segment.type === 'narration') {
                                return (
                                  <div key={`${msg.id}-n-${segIdx}`} className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 via-background/80 to-amber-500/10 border border-amber-500/30 mx-2 backdrop-blur-sm">
                                    <div className="flex items-start gap-2">
                                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                                        <BookOpen className="w-4 h-4 text-amber-400" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        {segIdx === 0 && (
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Narrator</span>
                                            <span className="text-[10px] text-muted-foreground">{new Date(msg.created_at).toLocaleTimeString()}</span>
                                            {voiceControls}
                                          </div>
                                        )}
                                        <NarratorMessageContent
                                          content={segment.text}
                                          activeSentenceIndex={-1}
                                          voiceEnabled={false}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              // NPC dialogue segment
                              const displayName = resolveNpcDisplayName(segment.speakerName, knownNpcNames);
                              return (
                                <NpcDialogueBubble
                                  key={`${msg.id}-npc-${segIdx}`}
                                  speakerName={displayName}
                                  dialogue={segment.dialogue}
                                  location={sceneLocation}
                                />
                              );
                            })}
                          </div>
                        );
                      }

                      // Player message — styled like battle chat with combat mechanics
                      const msgDice = msg.dice_result as Record<string, unknown> | null;
                      const hasDiceRoll = msgDice && (msgDice.type === 'attack' || msgDice.type === 'defense');

                      return (
                        <div key={msg.id} className="space-y-1 animate-fade-in">
                          <div
                            className={`env-scope p-3 rounded-lg ${
                              isMe
                                ? `bg-primary/20 border-l-4 border-primary ml-8${(msg as any).isPending ? ' opacity-70' : ''}`
                                : 'bg-muted/50 border-l-4 border-accent mr-8'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={msg.character?.image_url || undefined} />
                                <AvatarFallback className="text-[10px] bg-primary/20">{msg.character?.name?.[0] || '?'}</AvatarFallback>
                              </Avatar>
                              <span className="font-semibold text-sm">{msg.character?.name || 'Unknown'}</span>
                              <span className="text-[10px] text-muted-foreground">{new Date(msg.created_at).toLocaleTimeString()}</span>
                              {(msg as any).isPending && (
                                <span className="text-xs text-muted-foreground italic ml-auto">Sending...</span>
                              )}
                              {/* Sent / Read indicator for own messages */}
                              {isMe && !(msg as any).isPending && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="ml-auto">
                                        {otherParticipantsReadThis(msg.id) ? (
                                          <CheckCheck className="w-3 h-3 text-primary" />
                                        ) : (
                                          <Check className="w-3 h-3 text-muted-foreground" />
                                        )}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {otherParticipantsReadThis(msg.id) ? 'Read' : 'Sent'}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            <p className="text-sm whitespace-pre-wrap break-words pl-8">{msg.content}</p>
                            {isMe && userSettings.audio.intentDebug && (msg.metadata as any)?.intentDebug && (
                              <div className="mt-2 pl-8">
                                <IntentDebugCard payload={(msg.metadata as any).intentDebug} actionResult={(msg.metadata as any).actionResult ?? null} />
                              </div>
                            )}
                          </div>

                          {/* Inline dice roll display */}
                          {hasDiceRoll && msgDice.type === 'attack' && (
                            <div className={isMe ? 'ml-8' : 'mr-8'}>
                              <DiceRollChatMessage
                                hitDetermination={{
                                  attackRoll: msgDice.attackRoll as any,
                                  defenseRoll: msgDice.defenseRoll as any,
                                  wouldHit: msgDice.hit as boolean,
                                  gap: msgDice.gap as number,
                                  isMentalAttack: (msgDice.isMental as boolean) || false,
                                }}
                                attackerName={msg.character?.name || 'Player'}
                                defenderName="Enemy"
                                timestamp={new Date(msg.created_at)}
                              />
                            </div>
                          )}
                          {hasDiceRoll && msgDice.type === 'defense' && (
                            <div className={isMe ? 'ml-8' : 'mr-8'}>
                              <div className="border rounded-lg overflow-hidden bg-background/80 border-border/60 px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-4 h-4 text-blue-400" />
                                  <span className="text-sm font-medium">
                                    🛡️ {(msgDice.defenseType as string) === 'dodge' ? 'Dodge' : 'Block'} Roll
                                  </span>
                                  {(msgDice.success as boolean) ? (
                                    <Badge className="bg-green-500/20 text-green-400 text-xs">Defended!</Badge>
                                  ) : (
                                    <Badge className="bg-red-500/20 text-red-400 text-xs">Failed!</Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    Defense {(msgDice.defenseRoll as any)?.total} vs Incoming {(msgDice.incomingRoll as any)?.total}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Player typing indicators */}
                    {typingParticipants.length > 0 && (
                      <div className="p-3 rounded-lg bg-muted/50 border-l-4 border-accent mr-8 animate-fade-in">
                        <p className="text-xs mb-1 text-muted-foreground">
                          {typingParticipants.map(t => t.name).join(', ')} {typingParticipants.length === 1 ? 'is' : 'are'} thinking…
                        </p>
                        <div className="flex items-center gap-1">
                          <span className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </span>
                        </div>
                      </div>
                    )}

                    {sending && (
                      <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-l-4 border-amber-500 mx-2 animate-fade-in">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-amber-400" />
                          <span className="text-xs text-amber-400 font-semibold">Narrator</span>
                          <span className="text-muted-foreground text-sm">weaving the tale</span>
                          <span className="flex gap-1 ml-1">
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Narrator typing indicator */}
                    {narratorTyping && (
                      <div className="flex items-start gap-3 py-2">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                          <BookOpen className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="bg-muted/50 rounded-lg px-4 py-3 border border-amber-500/20">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Enemy tracker moved to top — remove from here */}

                {/* Status Effects Overlay on input area */}
                {isActive && myParticipant?.is_active && campaignCombat.statusEffects.activeEffects.length > 0 && (
                  <div className="relative mx-3">
                    <CharacterStatusOverlay
                      effects={campaignCombat.statusEffects.activeEffects.filter(
                        e => !shouldSuppressStatus(e.type, battlefieldEffects)
                      )}
                    />
                  </div>
                )}

                {/* Move Validation Warning */}
                {isActive && myParticipant?.is_active && campaignCombat.combatState.pendingValidation && campaignCombat.combatState.lastMoveValidation && (
                  <div className="px-3 pb-2 relative z-10">
                    <MoveValidationWarning
                      validation={campaignCombat.combatState.lastMoveValidation}
                      characterName={myParticipant.character?.name || 'Character'}
                      onExplain={async (explanation) => {
                        // Send explanation to narrator for evaluation
                        const msg = campaignCombat.acceptPendingValidation();
                        if (msg) {
                          setInputMessage(msg);
                          toast.info('Move approved — you can send it now.');
                        }
                      }}
                      onRedo={() => {
                        campaignCombat.clearPendingValidation();
                        toast.info('Redo your move.');
                      }}
                      onAccept={() => {
                        const msg = campaignCombat.acceptPendingValidation();
                        if (msg) {
                          setInputMessage(msg);
                        }
                      }}
                    />
                  </div>
                )}

                {/* Concentration Prompt */}
                {isActive && myParticipant?.is_active && campaignCombat.combatState.concentrationPrompt && (
                  <div className="px-3 pb-2 relative z-10">
                    <ConcentrationButton
                      hitDetermination={campaignCombat.combatState.concentrationPrompt.hitDetermination}
                      attackerStats={(() => {
                        const c = myParticipant.character as any;
                        return c ? {
                          stat_intelligence: c.stat_intelligence ?? 50,
                          stat_strength: c.stat_strength ?? 50,
                          stat_power: c.stat_power ?? 50,
                          stat_speed: c.stat_speed ?? 50,
                          stat_durability: c.stat_durability ?? 50,
                          stat_stamina: c.stat_stamina ?? 50,
                          stat_skill: c.stat_skill ?? 50,
                          stat_luck: c.stat_luck ?? 50,
                          stat_battle_iq: c.stat_battle_iq ?? 50,
                        } as CharacterStats : undefined;
                      })()}
                      defenderStats={(() => {
                        const c = myParticipant.character as any;
                        return c ? {
                          stat_intelligence: c.stat_intelligence ?? 50,
                          stat_strength: c.stat_strength ?? 50,
                          stat_power: c.stat_power ?? 50,
                          stat_speed: c.stat_speed ?? 50,
                          stat_durability: c.stat_durability ?? 50,
                          stat_stamina: c.stat_stamina ?? 50,
                          stat_skill: c.stat_skill ?? 50,
                          stat_luck: c.stat_luck ?? 50,
                          stat_battle_iq: c.stat_battle_iq ?? 50,
                        } as CharacterStats : undefined;
                      })()}
                      usesRemaining={campaignCombat.combatState.concentrationUsesLeft}
                      mode={campaignCombat.combatState.concentrationPrompt.mode === 'offense' ? 'offense' : 'defense'}
                      onUseConcentration={(result) => {
                        const updated = campaignCombat.applyDefensiveConcentration(result);
                        handleConcentrationResult(updated as any);
                      }}
                      onUseOffensiveConcentration={(result) => {
                        const updated = campaignCombat.applyOffensiveConcentration(result);
                        handleConcentrationResult(updated as any);
                      }}
                      onSkip={handleConcentrationSkip}
                      characterName={myParticipant.character?.name}
                      opponentName="Enemy"
                    />
                  </div>
                )}

                {showNewMsgIndicator && (
                  <div className="flex justify-center py-1 relative z-10">
                    <button
                      type="button"
                      onClick={() => {
                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                        setShowNewMsgIndicator(false);
                        userIsNearBottomRef.current = true;
                      }}
                      className="text-xs bg-primary/90 text-primary-foreground px-3 py-1 rounded-full shadow-lg animate-bounce"
                    >
                      New messages ↓
                    </button>
                  </div>
                )}

                {/* Input */}
                {isActive && myParticipant?.is_active && (
                  <div className="p-3 border-t border-border/40 bg-background/60 backdrop-blur-sm relative z-10 shrink-0 space-y-2">
                    <form onSubmit={e => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2 items-end">
                      <VoiceTextarea
                        placeholder={isSoloMode ? "Describe your solo action..." : "Describe your action..."}
                        value={inputMessage}
                        onValueChange={handleCampaignInputChange}
                        disabled={sending}
                        className="flex-1"
                        style={{ maxHeight: '300px' }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                      />
                      {campaignEnemies.filter(e => e.status === 'active' || e.status === 'hiding').length > 0 && (
                        <OverchargeToggle
                          enabled={overchargeEnabled}
                          onToggle={setOverchargeEnabled}
                          disabled={sending}
                        />
                      )}
                      <Button type="submit" disabled={sending || !inputMessage.trim()} size="sm" className="gap-1.5">
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                    <div className="flex gap-2">
                      <AlertDialog>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertDialogTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={narratorTyping || sending}
                                  className="gap-1.5 flex-1 h-8 text-xs"
                                >
                                  <FastForward className="w-3.5 h-3.5" />
                                  Progress Story
                                </Button>
                              </AlertDialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>Move the story forward</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Progress the story?</AlertDialogTitle>
                            <AlertDialogDescription>
                              The narrator will advance the campaign forward. This works best when the party is idle or you're ready for the next scene.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleAdvanceCampaign}>
                              Continue
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={sending}
                              onClick={async () => {
                                await fetchMessages();
                                toast.success('Chat refreshed');
                              }}
                              className="gap-1.5 flex-1 h-8 text-xs"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Refresh Chat
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>Refresh chat</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                )}

                {/* Recruiting state */}
                {campaign.status === 'recruiting' && (
                  <div className="p-6 text-center text-muted-foreground relative z-10">
                    <Clock className="w-8 h-8 mx-auto mb-2" />
                    <p>Waiting for the campaign to start...</p>
                    {isCreator && <p className="text-xs mt-1">Click "Start Campaign" when your party is ready.</p>}
                  </div>
                )}
              </div>
            </TabsContent>

            {isActive && myParticipant?.is_active && (
              <TabsContent value="narrator" className="flex-1 flex flex-col mt-0 min-h-0 data-[state=inactive]:hidden">
                <CampaignNarratorChat
                  campaignId={campaign.id}
                  campaignName={campaign.name}
                  campaignStatus={campaign.status}
                  characterName={myParticipant.character?.name || 'Unknown'}
                  characterPowers={myParticipant.character?.powers || null}
                  characterAbilities={myParticipant.character?.abilities || null}
                  characterWeapons={(myParticipant.character as any)?.weapons_items || null}
                  characterLevel={myParticipant.character?.level}
                  campaignLevel={myParticipant.campaign_level}
                  campaignHp={myParticipant.campaign_hp}
                  campaignHpMax={myParticipant.campaign_hp_max}
                  currentZone={campaign.current_zone}
                  timeOfDay={campaign.time_of_day}
                  dayCount={campaign.day_count}
                  campaignDescription={campaign.description}
                  worldState={(campaign.world_state ?? {}) as Record<string, unknown>}
                  storyContext={(campaign.story_context ?? {}) as Record<string, unknown>}
                  environmentTags={Array.isArray(campaign.environment_tags) ? campaign.environment_tags as string[] : []}
                  chosenLocation={activeSceneLocation || campaign.chosen_location}
                  partyMembers={participants.filter(p => p.is_active).map(p => p.character?.name || 'Unknown')}
                  participants={participants}
                  isSolo={isSoloMode}
                  inventory={inventory}
                  onInventoryUpdate={fetchInventory}
                  isInventoryActive={isActive && myParticipant.is_active}
                  mechanicDiscoveries={pendingDiscoveries}
                  onDiscoveriesShown={() => {
                    setPendingDiscoveries([]);
                    setNarratorTabGlowing(false);
                  }}
                  isCreator={isCreator}
                  maxPlayers={campaign.max_players}
                  canJoin={canJoin}
                  canStart={canStart}
                  characters={characters}
                  joinCharacter={joinCharacter}
                  onJoinCharacterChange={setJoinCharacter}
                  onJoin={handleJoin}
                  onStart={handleStartCampaign}
                  onLeave={handleLeave}
                  myParticipant={myParticipant}
                  swapCharacter={swapCharacter}
                  onSwapCharacterChange={setSwapCharacter}
                  onSwap={handleSwapCharacter}
                  swapping={swapping}
                  narrativeSystemsContext={campaignNarrative.buildNarrativeBlock(
                    '',
                    campaignEnemies.filter(e => e.status === 'active' || e.status === 'hiding').length > 0,
                    campaign.current_zone,
                  )}
                  campaignEndDialog={
                    isCreator && isActive ? (
                      <CampaignEndDialog
                        campaign={campaign}
                        participant={myParticipant}
                        onComplete={() => { fetchCampaign(); fetchParticipants(); }}
                      />
                    ) : null
                  }
                  incomingTrades={campaignTrades.incomingTrades}
                  outgoingTrades={campaignTrades.outgoingTrades}
                  onSendTradeOffer={campaignTrades.sendOffer}
                  onAcceptTrade={campaignTrades.acceptTrade}
                  onDeclineTrade={campaignTrades.declineTrade}
                  onCancelTrade={campaignTrades.cancelTrade}
                />
              </TabsContent>
            )}
          </Tabs>

        {/* Join / Start controls when not in narrator tab (recruiting or not joined yet) */}
        {(!myParticipant || !isActive) && (
          <Card className="bg-card-gradient border-border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="w-4 h-4" />
                Party ({participants.filter(p => p.is_active).length}/{campaign.max_players})
              </div>
              {participants.filter(p => p.is_active).map(p => (
                <div key={p.id} className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={p.character?.image_url || undefined} />
                    <AvatarFallback className="text-[10px]">{p.character?.name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate">{p.character?.name}</span>
                  <Badge variant="outline" className="text-[10px] ml-auto shrink-0">Lv.{p.campaign_level}</Badge>
                </div>
              ))}
              {canJoin && !myJoinRequest && (
                <div className="flex gap-2 pt-2">
                  <Select value={joinCharacter} onValueChange={setJoinCharacter}>
                    <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Select character..." /></SelectTrigger>
                    <SelectContent>
                      {characters.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name} (Tier {c.level})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleJoin}>
                    {isCreator ? 'Join' : 'Request'}
                  </Button>
                </div>
              )}
              {myJoinRequest && (
                <div className="text-center py-2">
                  <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400">
                    <Clock className="w-3 h-3 mr-1" />
                    Join request pending...
                  </Badge>
                </div>
              )}
              {/* Join Request Approvals (creator only) */}
              {isCreator && joinRequests.length > 0 && (
                <div className="space-y-2 pt-2">
                  <Separator />
                  <p className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    Join Requests ({joinRequests.length})
                  </p>
                  {joinRequests.map((req: any) => (
                    <div key={req.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={req.character?.image_url || undefined} />
                        <AvatarFallback className="text-[9px]">{req.character?.name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium truncate block">{req.character?.name || 'Unknown'}</span>
                        <span className="text-[10px] text-muted-foreground">Tier {req.character?.level || '?'}</span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-green-400 border-green-500/30 hover:bg-green-500/10" onClick={() => handleAcceptRequest(req)}>
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleDeclineRequest(req)}>
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {canStart && (
                <Button size="sm" className="w-full gap-1" onClick={handleStartCampaign}>
                  <Play className="w-3 h-3" /> Start Campaign
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
