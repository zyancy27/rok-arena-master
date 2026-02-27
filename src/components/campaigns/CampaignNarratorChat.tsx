/**
 * Private Narrator Chat for Campaigns
 * Players can privately ask the narrator about the world, story,
 * their surroundings, NPCs, and get guidance — without the group seeing.
 * Auto-delivers a world-building briefing on first entry.
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Send, Sparkles, Lock, Globe, User, Map, Swords } from 'lucide-react';

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
  isSolo: boolean;
  mechanicDiscoveries?: CampaignMechanicDiscovery[];
  onDiscoveriesShown?: () => void;
}

const QUICK_ASKS = [
  { label: 'World Info', icon: Globe, prompt: 'Give me a detailed briefing about the current world, setting, and lore of this campaign — where we are, what this place is like, and what I should know about the world around me.' },
  { label: 'My Character', icon: User, prompt: 'Summarize my character\'s current state in this campaign — my powers, abilities, weapons, HP, campaign level, and what I have available to me right now.' },
  { label: 'Surroundings', icon: Map, prompt: 'Describe my immediate surroundings in detail — what do I see, hear, smell? What notable features, paths, or points of interest are nearby?' },
  { label: 'Threats', icon: Swords, prompt: 'What potential threats or dangers should I be aware of in the current area? Any hostile creatures, environmental hazards, or suspicious activity?' },
];

export default function CampaignNarratorChat({
  campaignId,
  characterName,
  characterPowers,
  characterAbilities,
  characterWeapons,
  characterLevel,
  campaignLevel,
  campaignHp,
  campaignHpMax,
  currentZone,
  timeOfDay,
  dayCount,
  campaignDescription,
  worldState,
  storyContext,
  environmentTags = [],
  partyMembers,
  isSolo,
  mechanicDiscoveries = [],
  onDiscoveriesShown,
}: CampaignNarratorChatProps) {
  const [messages, setMessages] = useState<NarratorMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [introSent, setIntroSent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // No auto-intro here — world briefing is posted to the public adventure log on campaign start

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

  const sendNarratorQuery = async (queryText: string, isAutoIntro = false) => {
    if (isLoading) return;

    if (!isAutoIntro) {
      const userMsg: NarratorMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: queryText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg]);
    }

    setIsLoading(true);

    try {
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
          campaignContext: {
            campaignId,
            currentZone,
            timeOfDay,
            dayCount,
            campaignDescription,
            worldState,
            storyContext,
            environmentTags,
            partyMembers,
            isSolo,
            isCampaign: true,
            characterWeapons,
            characterLevel,
            campaignLevel,
            campaignHp,
            campaignHpMax,
          },
        },
      });

      if (response.data) {
        const narratorMsg: NarratorMessage = {
          id: `nar-${Date.now()}`,
          role: 'narrator',
          content: response.data.answer || 'The narrator ponders silently...',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, narratorMsg]);
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

  const handleQuickAsk = (prompt: string) => {
    sendNarratorQuery(prompt);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border bg-gradient-to-r from-amber-500/5 to-transparent">
        <BookOpen className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-semibold text-amber-400">Private Narrator</span>
        <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-300 ml-auto">
          <Lock className="w-2.5 h-2.5 mr-1" />
          Only you
        </Badge>
      </div>

      {/* Quick Ask Buttons */}
      <div className="flex flex-wrap gap-1.5 px-3 pt-2 pb-1">
        {QUICK_ASKS.map((qa) => (
          <Button
            key={qa.label}
            variant="outline"
            size="sm"
            className="h-7 text-[11px] gap-1 border-amber-500/20 text-amber-300/80 hover:text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/40"
            onClick={() => handleQuickAsk(qa.prompt)}
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
              The narrator is preparing your world briefing...
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
