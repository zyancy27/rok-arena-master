/**
 * NpcDialogueBubble
 *
 * Renders a single NPC speech bubble, visually distinct from the narrator,
 * themed by the environment via ChatBoxTheme and expression-driven via
 * ExpressionChatBox.
 */

import { Sparkles, Swords, User, UserCheck } from 'lucide-react';
import ChatBoxTheme from '@/components/battles/ChatBoxTheme';
import ExpressionChatBox from '@/components/chat/ExpressionChatBox';
import LiveTypingText from '@/components/chat/LiveTypingText';
import type { EnvironmentTag } from '@/lib/theme-engine';
import type { SpeakerPresentationProfile } from '@/systems/chat/presentation/SpeakerPresentationProfile';
import type { ExpressionPacket } from '@/systems/expression/ExpressionPacket';
import {
  getChatBoxContentClasses,
  getChatBoxLabelClasses,
  getChatBoxSurfaceClasses,
  getChatBoxWrapperClasses,
} from '@/systems/chat/presentation/chatBoxRenderEffects';

interface NpcDialogueBubbleProps {
  speakerName: string;
  dialogue: string;
  /** Environment tags for theme styling */
  tags?: EnvironmentTag[];
  /** Location string fallback */
  location?: string | null;
  presentationProfile?: SpeakerPresentationProfile | null;
  /** Expression packet for advanced rendering */
  expressionPacket?: ExpressionPacket | null;
  /** Stable id used to suppress typing replay on hydration. */
  messageId?: string;
  /** Server timestamp; older-than-session bubbles render fully without typing. */
  createdAt?: string | number | Date | null;
  /** Disable progressive reveal (e.g. for system or replayed content). */
  liveTypingEnabled?: boolean;
}

export default function NpcDialogueBubble({
  speakerName,
  dialogue,
  tags,
  location,
  presentationProfile,
  expressionPacket,
  messageId,
  createdAt,
  liveTypingEnabled = true,
}: NpcDialogueBubbleProps) {
  const isUnknown = speakerName === '*Name Unknown*';
  const surfaceClassName = getChatBoxSurfaceClasses(presentationProfile);
  const iconContainerClassName = presentationProfile?.iconContainerClassName ?? 'bg-accent/25 text-accent-foreground';
  const labelClassName = getChatBoxLabelClasses(presentationProfile);
  const contentClassName = getChatBoxContentClasses(presentationProfile);
  const wrapperClassName = getChatBoxWrapperClasses(presentationProfile);
  const Icon = presentationProfile?.iconTone === 'enemy'
    ? Swords
    : presentationProfile?.iconTone === 'ally'
      ? UserCheck
      : presentationProfile?.iconTone === 'system'
        ? Sparkles
        : User;

  return (
    <ChatBoxTheme location={location} tags={tags} className={`mx-2 rounded-lg ${wrapperClassName}`}>
      <ExpressionChatBox expression={expressionPacket} className={surfaceClassName}>
        <div className="flex items-start gap-2 relative z-10">
          <div className={`expr-icon w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${iconContainerClassName}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <span
              className={`expr-speaker-name ${isUnknown ? 'text-xs font-semibold uppercase text-muted-foreground italic tracking-wider' : labelClassName}`}
            >
              {speakerName}
            </span>
            <p className={`expr-content mt-1 ${contentClassName}`}>
              &ldquo;
              {messageId && liveTypingEnabled ? (
                <LiveTypingText
                  messageId={`npc-${messageId}`}
                  text={dialogue}
                  createdAt={createdAt}
                  charsPerSecond={95}
                />
              ) : (
                dialogue
              )}
              &rdquo;
            </p>
          </div>
        </div>
      </ExpressionChatBox>
    </ChatBoxTheme>
  );
}
