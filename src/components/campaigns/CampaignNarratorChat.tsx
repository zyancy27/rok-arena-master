/**
 * Private Narrator Chat for Campaigns
 * Includes campaign info, party panel, inventory, and private narrator queries.
 */

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import {
  BookOpen, Send, Sparkles, Lock, Globe, User, Map, Swords,
  Heart, Zap, Users, ChevronDown, MapPin, RefreshCw, LogOut, Play, Backpack,
} from 'lucide-react';
import CampaignInventoryPanel, { type InventoryItem } from './CampaignInventoryPanel';
import CampaignTradePanel from './CampaignTradePanel';
import type { CampaignTrade } from '@/hooks/use-campaign-trades';
import { getTimeEmoji } from '@/lib/campaign-types';
import type { CampaignParticipant } from '@/lib/campaign-types';

interface NarratorMessage {
  id: string;
  role: 'user' | 'narrator';
  content: string;
  timestamp: Date;
}

export interface CampaignMechanicDiscovery {
  title: string;
  summary: string;
}

interface CampaignNarratorChatProps {
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
  characterName: string;
  characterPowers: string | null;
  characterAbilities: string | null;
  characterWeapons?: string | null;
  characterLevel?: number;
  campaignLevel?: number;
  campaignHp?: number;
  campaignHpMax?: number;
  currentZone: string;
  timeOfDay: string;
  dayCount: number;
  campaignDescription: string | null;
  worldState: Record<string, unknown>;
  storyContext: Record<string, unknown>;
  environmentTags?: string[];
  partyMembers: string[];
  participants: CampaignParticipant[];
  isSolo: boolean;
  inventory: InventoryItem[];
  onInventoryUpdate: () => void;
  isInventoryActive: boolean;
  mechanicDiscoveries?: CampaignMechanicDiscovery[];
  onDiscoveriesShown?: () => void;
  // Campaign controls
  isCreator: boolean;
  maxPlayers: number;
  canJoin: boolean;
  canStart: boolean;
  characters: { id: string; name: string; level: number; image_url: string | null }[];
  joinCharacter: string;
  onJoinCharacterChange: (v: string) => void;
  onJoin: () => void;
  onStart: () => void;
  onLeave: () => void;
  myParticipant: CampaignParticipant | null;
  swapCharacter: string;
  onSwapCharacterChange: (v: string) => void;
  onSwap: () => void;
  swapping: boolean;
  campaignEndDialog: ReactNode;
  // Trade props
  incomingTrades: CampaignTrade[];
  outgoingTrades: CampaignTrade[];
  onSendTradeOffer: (itemId: string, receiverParticipantId: string, message?: string, senderZone?: string, receiverZone?: string) => Promise<boolean>;
  onAcceptTrade: (tradeId: string) => void;
  onDeclineTrade: (tradeId: string) => void;
  onCancelTrade: (tradeId: string) => void;
}

const QUICK_ASKS = [
  { label: 'World Info', icon: Globe, prompt: 'Give me a detailed briefing about the current world, setting, and lore of this campaign — where we are, what this place is like, and what I should know about the world around me.' },
  { label: 'My Character', icon: User, prompt: 'Summarize my character\'s current state in this campaign — my powers, abilities, weapons, HP, campaign level, and what I have available to me right now.' },
  { label: 'Surroundings', icon: Map, prompt: 'Describe my immediate surroundings in detail — what do I see, hear, smell? What notable features, paths, or points of interest are nearby?' },
  { label: 'Threats', icon: Swords, prompt: 'What potential threats or dangers should I be aware of in the current area? Any hostile creatures, environmental hazards, or suspicious activity?' },
];

export default function CampaignNarratorChat({
  campaignId, campaignName, campaignStatus,
  characterName, characterPowers, characterAbilities, characterWeapons,
  characterLevel, campaignLevel, campaignHp, campaignHpMax,
  currentZone, timeOfDay, dayCount, campaignDescription,
  worldState, storyContext, environmentTags = [],
  partyMembers, participants, isSolo,
  inventory, onInventoryUpdate, isInventoryActive,
  mechanicDiscoveries = [], onDiscoveriesShown,
  isCreator, maxPlayers, canJoin, canStart,
  characters, joinCharacter, onJoinCharacterChange, onJoin, onStart, onLeave,
  myParticipant, swapCharacter, onSwapCharacterChange, onSwap, swapping,
  campaignEndDialog,
  incomingTrades, outgoingTrades,
  onSendTradeOffer, onAcceptTrade, onDeclineTrade, onCancelTrade,
}: CampaignNarratorChatProps) {
  const [messages, setMessages] = useState<NarratorMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [partyOpen, setPartyOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Show mechanic discovery messages when queued
  useEffect(() => {
    if (mechanicDiscoveries.length > 0) {
      const discoveryMsgs: NarratorMessage[] = mechanicDiscoveries.map((d, i) => ({
        id: `discovery-${Date.now()}-${i}`,
        role: 'narrator' as const,
        content: `🆕 **New Mechanic Discovered: ${d.title}**\n\n${d.summary}`,
        timestamp: new Date(),
      }));
      setMessages(prev => [...prev, ...discoveryMsgs]);
      onDiscoveriesShown?.();
    }
  }, [mechanicDiscoveries.length]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendNarratorQuery = async (queryText: string) => {
    if (isLoading) return;

    const userMsg: NarratorMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: queryText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Build conversation history from local messages for continuity
      const chatHistory = messages.map(m => ({
        role: m.role === 'user' ? 'player' : 'world',
        content: m.content,
      }));

      const response = await supabase.functions.invoke('battle-narrator', {
        body: {
          type: 'private_query',
          query: queryText,
          characterName,
          characterPowers,
          characterAbilities,
          battleLocation: currentZone,
          opponentNames: [],
          recentPublicActions: '',
          conversationHistory: chatHistory,
          campaignContext: {
            campaignId, currentZone, timeOfDay, dayCount,
            campaignDescription, worldState, storyContext,
            environmentTags, partyMembers, isSolo,
            isCampaign: true, characterWeapons, characterLevel,
            campaignLevel, campaignHp, campaignHpMax,
          },
        },
      });

      if (response.data) {
        setMessages(prev => [...prev, {
          id: `nar-${Date.now()}`,
          role: 'narrator',
          content: response.data.answer || 'The narrator ponders silently...',
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      console.error('Campaign narrator error:', error);
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'narrator',
        content: '*The narrator is momentarily unavailable. Please try again.*',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userInput = input.trim();
    setInput('');
    await sendNarratorQuery(userInput);
  };

  const activeParticipants = participants.filter(p => p.is_active);
  const inactiveParticipants = participants.filter(p => !p.is_active);

  return (
    <div className="flex flex-col h-full">
      {/* Campaign Info Header */}
      <div className="px-3 pt-3 pb-2 border-b border-border space-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-amber-400 truncate">{campaignName}</span>
          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-300 ml-auto shrink-0">
            <Lock className="w-2.5 h-2.5 mr-1" />
            Private
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="whitespace-nowrap">{getTimeEmoji(timeOfDay as any)} {timeOfDay}</span>
          <span className="whitespace-nowrap">Day {dayCount}</span>
          <span className="flex items-center gap-1 min-w-0"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate max-w-[140px] sm:max-w-[200px]">{currentZone}</span></span>
        </div>

        {/* Collapsible Party */}
        <Collapsible open={partyOpen} onOpenChange={setPartyOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-7 text-xs px-2">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Party ({activeParticipants.length}/{maxPlayers})
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${partyOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-1">
            {activeParticipants.map(p => (
              <div key={p.id} className="space-y-1 px-1">
                <div className="flex items-center gap-2">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={p.character?.image_url || undefined} />
                    <AvatarFallback className="text-[9px]">{p.character?.name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium truncate">{p.character?.name}</span>
                  {p.is_solo && <Badge variant="outline" className="text-[9px] border-amber-500/50 text-amber-400 shrink-0">Solo</Badge>}
                  <Badge variant="outline" className="text-[9px] ml-auto shrink-0">Lv.{p.campaign_level}</Badge>
                </div>
                <div className="flex items-center gap-1.5 px-1">
                  <Heart className="w-2.5 h-2.5 text-destructive shrink-0" />
                  <Progress value={(p.campaign_hp / p.campaign_hp_max) * 100} className="h-1 flex-1" />
                  <span className="text-[9px] text-muted-foreground shrink-0">{p.campaign_hp}/{p.campaign_hp_max}</span>
                </div>
                <div className="flex items-center gap-1.5 px-1">
                  <Zap className="w-2.5 h-2.5 text-primary shrink-0" />
                  <Progress value={(p.campaign_xp / p.xp_to_next_level) * 100} className="h-1 flex-1" />
                  <span className="text-[9px] text-muted-foreground shrink-0">{p.campaign_xp}/{p.xp_to_next_level} XP</span>
                </div>
              </div>
            ))}
            {inactiveParticipants.map(p => (
              <div key={p.id} className="flex items-center gap-2 opacity-50 px-1">
                <Avatar className="w-5 h-5">
                  <AvatarFallback className="text-[9px]">{p.character?.name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <span className="text-[11px] truncate">{p.character?.name}</span>
                <Badge variant="outline" className="text-[9px] ml-auto">Left</Badge>
              </div>
            ))}

            {/* Swap Character */}
            {myParticipant?.is_active && characters.length > 1 && (
              <>
                <Separator className="my-1" />
                <div className="flex gap-1.5 px-1">
                  <Select value={swapCharacter} onValueChange={onSwapCharacterChange}>
                    <SelectTrigger className="h-7 text-[11px] flex-1"><SelectValue placeholder="Swap character..." /></SelectTrigger>
                    <SelectContent>
                      {characters.filter(c => c.id !== myParticipant.character_id).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name} (Tier {c.level})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-7 text-[11px]" onClick={onSwap} disabled={!swapCharacter || swapping}>
                    <RefreshCw className={`w-3 h-3 ${swapping ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </>
            )}

            {/* Leave */}
            {myParticipant?.is_active && (
              <Button variant="ghost" size="sm" className="w-full h-7 text-[11px] text-destructive gap-1" onClick={onLeave}>
                <LogOut className="w-3 h-3" /> Leave Party
              </Button>
            )}

            {/* End Campaign */}
            {campaignEndDialog}
          </CollapsibleContent>
        </Collapsible>

        {/* Collapsible Inventory */}
        {myParticipant && (
          <Collapsible open={inventoryOpen} onOpenChange={setInventoryOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between h-7 text-xs px-2">
                <span className="flex items-center gap-1.5">
                  <Backpack className="w-3.5 h-3.5" />
                  Inventory ({inventory.length})
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${inventoryOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-1">
              <CampaignInventoryPanel
                items={inventory}
                onUpdate={onInventoryUpdate}
                isActive={isInventoryActive}
              />
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Trade Panel (multiplayer only) */}
        {myParticipant && participants.filter(p => p.is_active).length > 1 && (
          <div className="px-2 pb-1">
            <CampaignTradePanel
              incomingTrades={incomingTrades}
              outgoingTrades={outgoingTrades}
              inventory={inventory}
              participants={participants}
              myParticipantId={myParticipant.id}
              currentZone={currentZone}
              onSendOffer={onSendTradeOffer}
              onAccept={onAcceptTrade}
              onDecline={onDeclineTrade}
              onCancel={onCancelTrade}
            />
          </div>
        )}
      </div>

      {/* Quick Ask Buttons */}
      <div className="flex flex-wrap gap-1.5 px-3 pt-2 pb-1">
        {QUICK_ASKS.map((qa) => (
          <Button
            key={qa.label}
            variant="outline"
            size="sm"
            className="h-7 text-[11px] gap-1 border-amber-500/20 text-amber-300/80 hover:text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/40"
            onClick={() => sendNarratorQuery(qa.prompt)}
            disabled={isLoading}
          >
            <qa.icon className="w-3 h-3" />
            {qa.label}
          </Button>
        ))}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-[180px] max-h-[35vh] p-3">
        {messages.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-6">
            <Sparkles className="w-6 h-6 text-amber-400/50" />
            <p className="text-xs text-muted-foreground">
              Ask the narrator about the world, your surroundings, NPCs, or get hints about the story.
            </p>
            <p className="text-[10px] text-muted-foreground/60">
              This conversation is private — only you can see it.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-2.5 rounded-lg text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary/10 border-l-2 border-primary ml-6'
                    : 'bg-muted/30 border-l-2 border-amber-500/50 mr-4'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {msg.role === 'narrator' ? (
                    <>
                      <BookOpen className="w-3 h-3 text-amber-400" />
                      <span className="text-[10px] font-medium text-amber-400">Narrator</span>
                    </>
                  ) : (
                    <span className="text-[10px] font-medium text-muted-foreground">You</span>
                  )}
                  <span className="text-[10px] text-muted-foreground/50 ml-auto">
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words text-foreground/90">{msg.content}</p>
              </div>
            ))}
            {isLoading && (
              <div className="p-2.5 rounded-lg text-sm bg-muted/30 border-l-2 border-amber-500/50 mr-4">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] font-medium text-amber-400">Narrator</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the narrator privately..."
            disabled={isLoading}
            className="text-sm"
          />
          <Button type="submit" size="icon" variant="secondary" disabled={isLoading || !input.trim()} className="min-h-[40px] min-w-[40px] shrink-0">
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
