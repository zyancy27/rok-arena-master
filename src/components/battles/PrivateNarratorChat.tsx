/**
 * Private OOC Narrator Chat
 * Players can privately ask the narrator about battle state, arena events,
 * and get move validation feedback before sending to RP chat.
 * The narrator only reveals publicly-shared info about opponents.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { VoiceTextarea } from '@/components/ui/voice-textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Send, Sparkles, ShieldAlert, Lock, Map } from 'lucide-react';
import TacticalBattleMap from './TacticalBattleMap';
import { generateTacticalMap } from '@/lib/tactical-map-generator';
import type { ArenaState } from '@/lib/living-arena';
import type { DistanceZone } from '@/lib/battle-dice';

interface NarratorMessage {
  id: string;
  role: 'user' | 'narrator';
  content: string;
  timestamp: Date;
  isValidation?: boolean;
}

export interface MechanicDiscoveryMessage {
  title: string;
  summary: string;
}

interface PrivateNarratorChatProps {
  battleId: string;
  characterName: string;
  characterPowers: string | null;
  characterAbilities: string | null;
  battleLocation: string | null;
  opponentNames: string[];
  /** Public RP messages — narrator can reference these */
  publicMessages: Array<{ character_name?: string; content: string }>;
  /** Pending move that failed validation */
  pendingValidation?: {
    moveText: string;
    warningMessage: string;
    suggestedFix?: string;
  } | null;
  onMoveApproved?: (moveText: string, explanation: string) => void;
  onMoveRejected?: () => void;
  /** Callback to add ability to character */
  onAbilityLearned?: (abilityDescription: string) => void;
  glowing?: boolean;
  /** Queued mechanic discovery explanations */
  mechanicDiscoveries?: MechanicDiscoveryMessage[];
  /** Called after discoveries are shown */
  onDiscoveriesShown?: () => void;
}

export default function PrivateNarratorChat({
  battleId,
  characterName,
  characterPowers,
  characterAbilities,
  battleLocation,
  opponentNames,
  publicMessages,
  pendingValidation,
  onMoveApproved,
  onMoveRejected,
  onAbilityLearned,
  glowing = false,
  mechanicDiscoveries = [],
  onDiscoveriesShown,
}: PrivateNarratorChatProps) {
  const [messages, setMessages] = useState<NarratorMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Show mechanic discovery messages when the user navigates to this tab
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
  useEffect(() => {
    if (pendingValidation) {
      const validationMsg: NarratorMessage = {
        id: `val-${Date.now()}`,
        role: 'narrator',
        content: `⚠️ **Move Validation Required**\n\n${pendingValidation.warningMessage}\n\n${pendingValidation.suggestedFix ? `💡 *${pendingValidation.suggestedFix}*\n\n` : ''}Your move: *"${pendingValidation.moveText}"*\n\nPlease explain how ${characterName} can perform this action with their existing abilities, or type "redo" to cancel.`,
        timestamp: new Date(),
        isValidation: true,
      };
      setMessages(prev => [...prev, validationMsg]);
    }
  }, [pendingValidation?.moveText]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: NarratorMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    const userInput = input.trim();
    setInput('');

    // Handle "redo" command for validation
    if (pendingValidation && userInput.toLowerCase() === 'redo') {
      onMoveRejected?.();
      const cancelMsg: NarratorMessage = {
        id: `nar-${Date.now()}`,
        role: 'narrator',
        content: '✅ Move cancelled. You can write a new action.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, cancelMsg]);
      return;
    }

    setIsLoading(true);

    try {
      // Build context for narrator — only public information
      const recentPublicActions = publicMessages.slice(-10).map(m =>
        `${m.character_name || 'Unknown'}: ${m.content}`
      ).join('\n');

      const response = await supabase.functions.invoke('battle-narrator', {
        body: {
          type: 'private_query',
          query: userInput,
          characterName,
          characterPowers,
          characterAbilities,
          battleLocation,
          opponentNames,
          recentPublicActions,
          isValidationResponse: !!pendingValidation,
          pendingMove: pendingValidation?.moveText || null,
          pendingWarning: pendingValidation?.warningMessage || null,
        },
      });

      if (response.data) {
        const { answer, moveApproved, abilityDescription } = response.data;

        const narratorMsg: NarratorMessage = {
          id: `nar-${Date.now()}`,
          role: 'narrator',
          content: answer || 'The narrator ponders silently...',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, narratorMsg]);

        // If this was a validation response and the narrator approved
        if (pendingValidation && moveApproved) {
          onMoveApproved?.(pendingValidation.moveText, userInput);
          // If a new ability was justified, add it
          if (abilityDescription) {
            onAbilityLearned?.(abilityDescription);
          }
        }
      }
    } catch (error) {
      console.error('Private narrator error:', error);
      const errorMsg: NarratorMessage = {
        id: `err-${Date.now()}`,
        role: 'narrator',
        content: '*The narrator is momentarily unavailable. Please try again.*',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-full transition-all duration-500 ${
      glowing ? 'ring-2 ring-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.3)]' : ''
    }`}>
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border bg-gradient-to-r from-amber-500/5 to-transparent">
        <BookOpen className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-semibold text-amber-400">Private Narrator</span>
        <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-300 ml-auto">
          <Lock className="w-2.5 h-2.5 mr-1" />
          Only you see this
        </Badge>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-[200px] max-h-[40vh] p-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-8">
            <Sparkles className="w-6 h-6 text-amber-400/50" />
            <p className="text-xs text-muted-foreground">
              Ask the narrator about the battle, arena conditions, or get help with your moves.
            </p>
            <p className="text-[10px] text-muted-foreground/60">
              The narrator will only share publicly known information about opponents.
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
                    : msg.isValidation
                      ? 'bg-amber-500/10 border-l-2 border-amber-500 mr-4'
                      : 'bg-muted/30 border-l-2 border-amber-500/50 mr-4'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {msg.role === 'narrator' ? (
                    <>
                      {msg.isValidation ? (
                        <ShieldAlert className="w-3 h-3 text-amber-400" />
                      ) : (
                        <BookOpen className="w-3 h-3 text-amber-400" />
                      )}
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
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <VoiceTextarea
            value={input}
            onValueChange={setInput}
            placeholder={pendingValidation ? 'Explain your move or type "redo"...' : 'Ask the narrator...'}
            disabled={isLoading}
            className="text-sm"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <Button type="submit" size="icon" variant="secondary" disabled={isLoading || !input.trim()} className="min-h-[44px] min-w-[44px] shrink-0">
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
