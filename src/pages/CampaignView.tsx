import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { fromDecrypted } from '@/lib/encrypted-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VoiceTextarea } from '@/components/ui/voice-textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  ArrowLeft, Compass, Heart, LogOut, MapPin, Play, Send,
  Shield, Swords, Users, Zap, Clock, Sun, Moon, Backpack,
  Volume2, VolumeX, RefreshCw, BookOpen, Sparkles, Dices, Trash2, UserCheck,
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
import { useCampaignCombat } from '@/hooks/use-campaign-combat';
import type { CampaignMechanicDiscovery } from '@/components/campaigns/CampaignNarratorChat';
import BagBubble from '@/components/campaigns/BagBubble';
import CampaignEnemyTracker, { type CampaignEnemy } from '@/components/campaigns/CampaignEnemyTracker';
import { useCampaignTrades } from '@/hooks/use-campaign-trades';
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

  const campaignTrades = useCampaignTrades(campaignId, myParticipant?.id);

  // Ambient environment sounds for campaign
  const { muted: ambientMuted, toggleMute: toggleAmbientMute } = useAmbientSound({
    enabled: campaign?.status === 'active',
    location: campaign?.current_zone,
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

  // Combat mechanics integration
  const campaignCombat = useCampaignCombat(
    myParticipant?.character ? {
      characterId: myParticipant.character_id,
      name: myParticipant.character.name,
      level: myParticipant.character.level,
      campaignLevel: myParticipant.campaign_level,
      powers: myParticipant.character.powers || null,
      abilities: myParticipant.character.abilities || null,
    } : null
  );

  // Battlefield environment effects (fire, ice, storm, etc.)
  const { activeEffects: battlefieldEffects, processMessage: processEffectMessage } = useBattlefieldEffects({
    enabled: campaign?.status === 'active',
  });

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, narratorTyping]);

  const setupRealtime = () => {
    supabase
      .channel(`campaign-${campaignId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'campaign_messages', filter: `campaign_id=eq.${campaignId}` },
        async (payload) => {
          const msg = payload.new as any;

          // Detect battlefield effects from narrator messages
          if (msg.sender_type === 'narrator' && msg.content) {
            processEffectMessage(msg.content);
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
                const participant = participants.find(p => p.character_id === msg.character_id);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_participants', filter: `campaign_id=eq.${campaignId}` },
        () => fetchParticipants()
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
      .subscribe();
  };

  const fetchAll = async () => {
    await Promise.all([fetchCampaign(), fetchParticipants(), fetchMessages(), fetchInventory(), fetchJoinRequests(), fetchEnemies()]);
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
      setMyParticipant(parsed.find(p => p.user_id === user!.id && p.is_active) || null);
    }
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('campaign_messages')
      .select('*, character:characters(name, image_url)')
      .eq('campaign_id', campaignId!)
      .order('created_at', { ascending: true })
      .limit(200);
    if (data) {
      setMessages(data.map(m => ({
        ...m,
        metadata: (m.metadata || {}) as Record<string, unknown>,
        dice_result: m.dice_result as Record<string, unknown> | null,
        theme_snapshot: m.theme_snapshot as Record<string, unknown> | null,
        character: Array.isArray(m.character) ? m.character[0] : m.character,
      })) as CampaignMessage[]);
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
      .in('status', ['active', 'hiding'])
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
        await supabase.from('campaign_messages').insert({
          campaign_id: campaign.id,
          sender_type: 'narrator',
          content: data.narration,
          channel: 'in_universe',
        });
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
      ];
      const isInventoryCheck = INVENTORY_CHECK_PATTERNS.some(p => p.test(messageText));

      const { data, error } = await supabase.functions.invoke('battle-narrator', {
        body: {
          type: 'campaign_narration',
          campaignId: snapshotCampaign.id,
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
          playerAction: messageText,
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
          activeEnemies: campaignEnemies.filter(e => e.status === 'active' || e.status === 'hiding'),
        },
      });

      if (!error && data?.narration) {
        // Process narrator response for status effects
        campaignCombat.processNarratorResponse(data.narration);

        // Process narrator response for battlefield environment effects
        processEffectMessage(data.narration);

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

        await supabase.from('campaign_messages').insert({
          campaign_id: snapshotCampaign.id,
          sender_type: 'narrator',
          content: data.narration,
          channel: 'in_universe',
        });

        // Handle XP / HP changes from narrator response
        if (data.xpGained) {
          triggerDiscovery('campaign_xp');
          const newXp = snapshotParticipant.campaign_xp + data.xpGained;
          const xpNeeded = CAMPAIGN_STARTING_ABILITIES.xpForLevel(snapshotParticipant.campaign_level + 1);
          const levelUp = newXp >= xpNeeded;

          await supabase.from('campaign_participants')
            .update({
              campaign_xp: levelUp ? newXp - xpNeeded : newXp,
              campaign_level: levelUp ? snapshotParticipant.campaign_level + 1 : snapshotParticipant.campaign_level,
              available_stat_points: levelUp ? snapshotParticipant.available_stat_points + 3 : snapshotParticipant.available_stat_points,
            })
            .eq('id', snapshotParticipant.id);

          if (levelUp) {
            triggerDiscovery('campaign_level_up');
            await supabase.from('campaign_messages').insert({
              campaign_id: snapshotCampaign.id,
              sender_type: 'system',
              content: `🎉 **${snapshotParticipant.character?.name}** leveled up to Campaign Level ${snapshotParticipant.campaign_level + 1}!`,
              channel: 'in_universe',
            });
          }
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

        // Handle items consumed/used/given away
        if (data.itemsUsed && Array.isArray(data.itemsUsed) && data.itemsUsed.length > 0) {
          for (const usedItem of data.itemsUsed) {
            // Find matching campaign inventory item by name (case-insensitive)
            const match = inventory.find(i =>
              i.item_name.toLowerCase() === (usedItem.name || '').toLowerCase()
            );
            if (match) {
              await supabase.from('campaign_inventory').delete().eq('id', match.id);
            }
          }
          const usedNames = data.itemsUsed.map((i: any) => i.name).join(', ');
          await supabase.from('campaign_messages').insert({
            campaign_id: snapshotCampaign.id,
            sender_type: 'system',
            content: `📦 Items used: ${usedNames}`,
            channel: 'in_universe',
          });
          fetchInventory();
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
              const currentXp = snapshotParticipant.campaign_xp + (data.xpGained || 0);
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

        // Inline bag bubble when player checked inventory
        if (isInventoryCheck) {
          const allItems = inventory;
          const charWeapons = snapshotParticipant.character?.weapons_items;
          const bagContent = buildBagContent(allItems, charWeapons || null);
          await supabase.from('campaign_messages').insert({
            campaign_id: snapshotCampaign.id,
            sender_type: 'system',
            content: `__BAG__${JSON.stringify(bagContent)}`,
            channel: 'in_universe',
          });
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
    const messageText = inputMessage.trim();

    // Move validation — check before sending
    const validation = campaignCombat.validateCampaignMove(messageText);
    if (!validation.isValid) {
      return;
    }

    setInputMessage('');
    setSending(true);

    try {
      // Detect solo/rejoin intent from the player's message
      const soloIntent = detectSoloIntent(messageText);

      // Process combat mechanics (hit detection, dice rolls)
      const combatResult = campaignCombat.processCombatAction(messageText);

      // Build dice metadata for the message
      const diceResult = combatResult.diceMetadata
        ? combatResult.diceMetadata as Record<string, unknown>
        : null;

      // OPTIMISTIC: Add message to UI immediately before DB write
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimisticMessage: CampaignMessage = {
        id: tempId,
        campaign_id: campaign.id,
        character_id: myParticipant.character_id,
        sender_type: 'player',
        channel: 'in_universe',
        content: messageText,
        dice_result: diceResult,
        theme_snapshot: null,
        metadata: {},
        created_at: new Date().toISOString(),
        isPending: true,
        character: myParticipant.character
          ? { name: myParticipant.character.name, image_url: myParticipant.character.image_url }
          : undefined,
      };
      setMessages(prev => [...prev, optimisticMessage]);

      // Insert player message
      const { error: insertError } = await supabase.from('campaign_messages').insert({
        campaign_id: campaign.id,
        character_id: myParticipant.character_id,
        sender_type: 'player',
        content: messageText,
        channel: 'in_universe',
        dice_result: diceResult as any,
      } as any);

      if (insertError) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        toast.error('Failed to send message');
        setSending(false);
        return;
      }

      // Trigger dice mechanic discovery on first combat action
      if (combatResult.hitDetection.shouldTriggerHitCheck || combatResult.hitDetection.shouldTriggerDefenseCheck) {
        triggerDiscovery('dice_roll' as MechanicKey);
      }

      // Release input immediately — narrator runs in background
      setSending(false);

      // Fire narrator response in background (non-blocking)
      fireNarratorResponse(messageText, soloIntent, combatResult, myParticipant, campaign);

    } catch (err) {
      console.error('Campaign message error:', err);
      toast.error('Failed to send message');
      setSending(false);
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
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0">
          <Button variant="ghost" size="sm" className="shrink-0 mt-0.5 sm:mt-0" onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-xl font-bold flex items-center gap-2">
              <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
              <span className="truncate">{campaign.name}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-muted-foreground mt-0.5">
              <span className="whitespace-nowrap">{getTimeEmoji(campaign.time_of_day)} {campaign.time_of_day}</span>
              <span className="hidden sm:inline">·</span>
              <span className="whitespace-nowrap">Day {campaign.day_count}</span>
              <span className="hidden sm:inline">·</span>
              <span className="flex items-center gap-1 min-w-0">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[140px] sm:max-w-[250px]">{campaign.current_zone}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto sm:ml-0 shrink-0">
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

      <div className="space-y-4">
        {/* Chat + Narrator */}
        <Card className={`bg-card-gradient border-border flex flex-col h-[70vh] transition-shadow duration-500 ${
          combatPulse === 'red' ? 'animate-combat-pulse-red' : combatPulse === 'green' ? 'animate-combat-pulse-green' : ''
        }`}>
          <Tabs defaultValue="adventure" className="flex flex-col flex-1 min-h-0">
            <div className="border-b border-border px-4">
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
                {/* Persistent Environment Background — dynamically tracks scene changes */}
                <EnvironmentChatBackground location={activeSceneLocation || campaign.current_zone} />

                {/* Battlefield Effects Overlay */}
                <BattlefieldEffectsOverlay effects={battlefieldEffects} className="z-[1]" />

                <ScrollArea className="flex-1 p-4 relative z-10" style={{ minHeight: 0 }}>
                  <div className="space-y-4">
                    {messages.map(msg => {
                      const isPlayer = msg.sender_type === 'player';
                      const isNarrator = msg.sender_type === 'narrator';
                      const isSystem = msg.sender_type === 'system';
                      const isMe = isPlayer && msg.character_id === myParticipant?.character_id;

                      if (isSystem) {
                        // Bag bubble for inventory checks
                        if (msg.content.startsWith('__BAG__')) {
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
                                </div>
                                <p className="text-sm whitespace-pre-wrap break-words text-foreground/90 italic">{msg.content}</p>
                              </div>
                            </div>
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
                            </div>
                            <p className="text-sm whitespace-pre-wrap break-words pl-8">{msg.content}</p>
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

                    {/* Narrator loading indicator */}
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
                </ScrollArea>

                {/* Active Enemy Tracker */}
                <CampaignEnemyTracker enemies={campaignEnemies} />

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

                {/* Input */}
                {isActive && myParticipant?.is_active && (
                  <div className="p-3 border-t border-border relative z-10">
                    <form onSubmit={e => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
                      <VoiceTextarea
                        placeholder={isSoloMode ? "Describe your solo action..." : "Describe your action..."}
                        value={inputMessage}
                        onValueChange={setInputMessage}
                        disabled={sending}
                        className="flex-1"
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                      />
                      <Button type="submit" disabled={sending || !inputMessage.trim()} size="sm" className="gap-1.5">
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
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
              <TabsContent value="narrator" className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden">
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
                  worldState={campaign.world_state}
                  storyContext={campaign.story_context}
                  environmentTags={campaign.environment_tags}
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
        </Card>

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
