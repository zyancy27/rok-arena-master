import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  ArrowLeft, Compass, Heart, LogOut, MapPin, Play, Send,
  Shield, Swords, Users, Zap, Clock, Sun, Moon, Backpack,
  Volume2, VolumeX, RefreshCw,
} from 'lucide-react';
import type { Campaign, CampaignParticipant, CampaignMessage } from '@/lib/campaign-types';
import { getTimeEmoji, CAMPAIGN_STARTING_ABILITIES, XP_REWARDS, advanceTime } from '@/lib/campaign-types';
import CampaignInventoryPanel, { type InventoryItem } from '@/components/campaigns/CampaignInventoryPanel';
import CampaignEndDialog from '@/components/campaigns/CampaignEndDialog';
import { useAmbientSound } from '@/hooks/use-ambient-sound';

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
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

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
  }, [messages]);

  const setupRealtime = () => {
    supabase
      .channel(`campaign-${campaignId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'campaign_messages', filter: `campaign_id=eq.${campaignId}` },
        (payload) => {
          const msg = payload.new as CampaignMessage;
          setMessages(prev => [...prev, msg]);
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
          } : null);
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_inventory', filter: `campaign_id=eq.${campaignId}` },
        () => fetchInventory()
      )
      .subscribe();
  };

  const fetchAll = async () => {
    await Promise.all([fetchCampaign(), fetchParticipants(), fetchMessages(), fetchInventory()]);
    setLoading(false);
  };

  const fetchCampaign = async () => {
    const { data } = await supabase.from('campaigns').select('*').eq('id', campaignId!).single();
    if (data) setCampaign({
      ...data,
      environment_tags: Array.isArray(data.environment_tags) ? data.environment_tags as string[] : [],
      story_context: (data.story_context || {}) as Record<string, unknown>,
      world_state: (data.world_state || {}) as Record<string, unknown>,
    });
  };

  const fetchParticipants = async () => {
    const { data } = await supabase
      .from('campaign_participants')
      .select('*, character:characters(name, image_url, level, user_id, powers, abilities, weapons_items)')
      .eq('campaign_id', campaignId!);
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

  const handleJoin = async () => {
    if (!joinCharacter) { toast.error('Select a character'); return; }

    const { error } = await supabase.from('campaign_participants').insert({
      campaign_id: campaignId!,
      character_id: joinCharacter,
      user_id: user!.id,
      power_reset_applied: true,
    });

    if (error) { toast.error(error.message); return; }

    // System message
    const char = characters.find(c => c.id === joinCharacter);
    await supabase.from('campaign_messages').insert({
      campaign_id: campaignId!,
      sender_type: 'system',
      content: `**${char?.name || 'A new adventurer'}** has joined the campaign.`,
      channel: 'in_universe',
    });

    toast.success('Joined campaign!');
    fetchParticipants();
  };

  const handleLeave = async () => {
    if (!myParticipant) return;

    await supabase.from('campaign_participants')
      .update({ is_active: false })
      .eq('id', myParticipant.id);

    await supabase.from('campaign_messages').insert({
      campaign_id: campaignId!,
      character_id: myParticipant.character_id,
      sender_type: 'system',
      content: `**${myParticipant.character?.name || 'An adventurer'}** has left the party.`,
      channel: 'in_universe',
    });

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

      await supabase.from('campaign_messages').insert({
        campaign_id: campaign.id,
        sender_type: 'system',
        content: returning
          ? `🔄 **${oldName}** steps back as **${newChar?.name}** returns to the adventure.`
          : `🔄 **${oldName}** steps back. **${newChar?.name}** enters the campaign for the first time.`,
        channel: 'in_universe',
      });

      setSwapCharacter('');
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
          partyMembers: partyInfo,
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

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !myParticipant || !campaign) return;
    const messageText = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    try {
      // Detect solo/rejoin intent from the player's message
      const soloIntent = detectSoloIntent(messageText);

      // Insert player message
      await supabase.from('campaign_messages').insert({
        campaign_id: campaign.id,
        character_id: myParticipant.character_id,
        sender_type: 'player',
        content: messageText,
        channel: 'in_universe',
      });

      // Call narrator for response
      const activeParticipants = participants.filter(p => p.is_active);
      const partyContext = activeParticipants.map(p =>
        `${p.character?.name} (Campaign Lv.${p.campaign_level}, HP: ${p.campaign_hp}/${p.campaign_hp_max}${(p as any).is_solo ? ', SOLO — away from group' : ''})`
      ).join(', ');

      const equippedCampaignItems = inventory.filter(i => i.is_equipped);

      const { data, error } = await supabase.functions.invoke('battle-narrator', {
        body: {
          type: 'campaign_narration',
          campaignId: campaign.id,
          playerCharacter: {
            name: myParticipant.character?.name,
            campaignLevel: myParticipant.campaign_level,
            originalLevel: myParticipant.character?.level,
            hp: myParticipant.campaign_hp,
            hpMax: myParticipant.campaign_hp_max,
            powers: myParticipant.character?.powers,
            abilities: myParticipant.character?.abilities,
            weaponsItems: (myParticipant.character as any)?.weapons_items,
            isSolo: isSoloMode,
            soloIntent: soloIntent, // hints narrator to narrate the departure/reunion
            equippedCampaignItems: equippedCampaignItems.map(i => ({
              item_name: i.item_name,
              item_type: i.item_type,
              item_rarity: i.item_rarity,
              description: i.description,
            })),
          },
          playerAction: messageText,
          currentZone: campaign.current_zone,
          timeOfDay: campaign.time_of_day,
          dayCount: campaign.day_count,
          partyContext,
          worldState: campaign.world_state,
          storyContext: campaign.story_context,
          campaignDescription: campaign.description,
          maxAllowedTier: CAMPAIGN_STARTING_ABILITIES.maxPowerTierAtLevel(myParticipant.campaign_level),
        },
      });

      if (!error && data?.narration) {
        await supabase.from('campaign_messages').insert({
          campaign_id: campaign.id,
          sender_type: 'narrator',
          content: data.narration,
          channel: 'in_universe',
        });

        // Handle XP / HP changes from narrator response
        if (data.xpGained) {
          const newXp = myParticipant.campaign_xp + data.xpGained;
          const xpNeeded = CAMPAIGN_STARTING_ABILITIES.xpForLevel(myParticipant.campaign_level + 1);
          const levelUp = newXp >= xpNeeded;

          await supabase.from('campaign_participants')
            .update({
              campaign_xp: levelUp ? newXp - xpNeeded : newXp,
              campaign_level: levelUp ? myParticipant.campaign_level + 1 : myParticipant.campaign_level,
              available_stat_points: levelUp ? myParticipant.available_stat_points + 3 : myParticipant.available_stat_points,
            })
            .eq('id', myParticipant.id);

          if (levelUp) {
            await supabase.from('campaign_messages').insert({
              campaign_id: campaign.id,
              sender_type: 'system',
              content: `🎉 **${myParticipant.character?.name}** leveled up to Campaign Level ${myParticipant.campaign_level + 1}!`,
              channel: 'in_universe',
            });
          }
        }

        if (data.hpChange && data.hpChange !== 0) {
          const newHp = Math.max(0, Math.min(myParticipant.campaign_hp_max, myParticipant.campaign_hp + data.hpChange));
          await supabase.from('campaign_participants')
            .update({ campaign_hp: newHp })
            .eq('id', myParticipant.id);
        }

        // Time advancement
        if (data.advanceTime) {
          const { time: newTime, newDay } = advanceTime(campaign.time_of_day, data.advanceTime);
          await supabase.from('campaigns').update({
            time_of_day: newTime,
            day_count: newDay ? campaign.day_count + 1 : campaign.day_count,
          }).eq('id', campaign.id);
        }

        // Zone change
        if (data.newZone) {
          await supabase.from('campaigns').update({
            current_zone: data.newZone,
          }).eq('id', campaign.id);
        }
        // Items found
        if (data.itemsFound && Array.isArray(data.itemsFound) && data.itemsFound.length > 0 && myParticipant) {
          for (const item of data.itemsFound) {
            await supabase.from('campaign_inventory').insert({
              campaign_id: campaign.id,
              participant_id: myParticipant.id,
              user_id: user!.id,
              item_name: item.name || 'Unknown Item',
              item_type: item.type || 'misc',
              item_rarity: item.rarity || 'common',
              description: item.description || null,
              stat_bonus: item.statBonus || {},
              found_at_zone: campaign.current_zone,
              found_at_day: campaign.day_count,
            });
          }
          const itemNames = data.itemsFound.map((i: any) => i.name).join(', ');
          await supabase.from('campaign_messages').insert({
            campaign_id: campaign.id,
            sender_type: 'system',
            content: `🎒 **${myParticipant.character?.name}** found: ${itemNames}`,
            channel: 'in_universe',
          });
          fetchInventory();
        }
      }

      // Apply solo status change if intent was detected
      if (soloIntent) {
        await applySoloStatusChange(soloIntent);
      }

      fetchParticipants();
    } catch (err) {
      console.error('Campaign message error:', err);
      toast.error('Failed to process action');
    } finally {
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

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold flex items-center gap-2 truncate">
              <Compass className="w-5 h-5 text-primary shrink-0" />
              {campaign.name}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{getTimeEmoji(campaign.time_of_day)} {campaign.time_of_day}</span>
              <span>·</span>
              <span>Day {campaign.day_count}</span>
              <span>·</span>
              <MapPin className="w-3 h-3" />
              <span className="truncate">{campaign.current_zone}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleAmbientMute} title={ambientMuted ? 'Unmute ambient' : 'Mute ambient'}>
              {ambientMuted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-primary" />}
            </Button>
          )}
          <Badge className={campaign.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}>
            {campaign.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Party Panel */}
        <Card className="lg:col-span-1 bg-card-gradient border-border">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Party ({participants.filter(p => p.is_active).length}/{campaign.max_players})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {participants.filter(p => p.is_active).map(p => (
              <div key={p.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={p.character?.image_url || undefined} />
                    <AvatarFallback className="text-[10px]">{p.character?.name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">{p.character?.name}</span>
                  {p.is_solo && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-400 shrink-0">Solo</Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] ml-auto shrink-0">Lv.{p.campaign_level}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-3 h-3 text-red-400 shrink-0" />
                  <Progress value={(p.campaign_hp / p.campaign_hp_max) * 100} className="h-1.5 flex-1" />
                  <span className="text-[10px] text-muted-foreground shrink-0">{p.campaign_hp}/{p.campaign_hp_max}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-yellow-400 shrink-0" />
                  <Progress value={(p.campaign_xp / p.xp_to_next_level) * 100} className="h-1.5 flex-1" />
                  <span className="text-[10px] text-muted-foreground shrink-0">{p.campaign_xp}/{p.xp_to_next_level} XP</span>
                </div>
              </div>
            ))}

            {/* Inactive (left) members */}
            {participants.filter(p => !p.is_active).map(p => (
              <div key={p.id} className="flex items-center gap-2 opacity-50">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-[10px]">{p.character?.name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <span className="text-xs truncate">{p.character?.name}</span>
                <Badge variant="outline" className="text-[10px] ml-auto">Left</Badge>
              </div>
            ))}

            {/* Inventory */}
            {myParticipant && (
              <>
                <Separator />
                <CampaignInventoryPanel
                  items={inventory}
                  onUpdate={fetchInventory}
                  isActive={isActive && myParticipant.is_active}
                />
              </>
            )}

            <Separator />

            {/* Join */}
            {canJoin && (
              <div className="space-y-2">
                <Select value={joinCharacter} onValueChange={setJoinCharacter}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select character..." /></SelectTrigger>
                  <SelectContent>
                    {characters.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} (Tier {c.level})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="w-full" onClick={handleJoin}>Join Campaign</Button>
              </div>
            )}

            {/* Start */}
            {canStart && (
              <Button size="sm" className="w-full gap-1" onClick={handleStartCampaign}>
                <Play className="w-3 h-3" /> Start Campaign
              </Button>
            )}


            {/* Leave */}
            {myParticipant?.is_active && (
              <Button variant="ghost" size="sm" className="w-full text-destructive gap-1" onClick={handleLeave}>
                <LogOut className="w-3 h-3" /> Leave Party
              </Button>
            )}

            {/* End Campaign */}
            {isCreator && isActive && myParticipant && (
              <CampaignEndDialog
                campaign={campaign}
                participant={myParticipant}
                onComplete={() => { fetchCampaign(); fetchParticipants(); }}
              />
            )}
          </CardContent>
        </Card>

        {/* Chat */}
        <Card className="lg:col-span-3 bg-card-gradient border-border flex flex-col" style={{ minHeight: '60vh' }}>
          <CardHeader className="py-3 px-4 border-b border-border">
            <CardTitle className="text-sm flex items-center gap-2">
              <Compass className="w-4 h-4" />
              Adventure Log
              {campaign.description && (
                <span className="text-xs text-muted-foreground font-normal ml-2 truncate">{campaign.description}</span>
              )}
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.sender_type === 'narrator' ? 'bg-primary/5 rounded-lg p-3' : msg.sender_type === 'system' ? 'justify-center' : ''}`}>
                  {msg.sender_type === 'system' ? (
                    <p className="text-xs text-muted-foreground italic text-center">{msg.content}</p>
                  ) : (
                    <>
                      <Avatar className="w-8 h-8 shrink-0">
                        {msg.sender_type === 'narrator' ? (
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">📖</AvatarFallback>
                        ) : (
                          <>
                            <AvatarImage src={msg.character?.image_url || undefined} />
                            <AvatarFallback className="text-xs">{msg.character?.name?.[0] || '?'}</AvatarFallback>
                          </>
                        )}
                      </Avatar>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold">
                          {msg.sender_type === 'narrator' ? 'Narrator' : msg.character?.name || 'Unknown'}
                        </span>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          {isActive && myParticipant?.is_active && (
            <div className="p-3 border-t border-border">
              <form onSubmit={e => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
                <Input
                  placeholder={isSoloMode ? "Describe your solo action..." : "Describe your action..."}
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  disabled={sending}
                  className="flex-1"
                />
                <Button type="submit" disabled={sending || !inputMessage.trim()} size="sm">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          )}

          {/* Recruiting state */}
          {campaign.status === 'recruiting' && (
            <div className="p-6 text-center text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2" />
              <p>Waiting for the campaign to start...</p>
              {isCreator && <p className="text-xs mt-1">Click "Start Campaign" when your party is ready.</p>}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
